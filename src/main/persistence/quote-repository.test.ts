import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Quote } from '@shared/domain';
import { nodeFs } from '../platform/fs-port';
import { JsonLibraryStore } from './json-library-store';
import { InMemoryQuoteRepository, JsonQuoteRepository, type QuoteRepository } from './quote-repository';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const at = (s: number) => new Date(Date.UTC(2026, 10, 4, 12, 0, s)).toISOString();
const quote = (n: number, key: string, time: number): Quote => ({
  id: uuid(n),
  text: key,
  author: null,
  dedupeKey: `${key}\u0000`,
  createdAt: at(time),
  lastUsedAt: at(time),
});

const dirs: string[] = [];
afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true });
});

async function jsonRepo(dir?: string): Promise<{ repo: QuoteRepository; dir: string }> {
  const d = dir ?? (await mkdtemp(join(tmpdir(), 'framer-quotes-')));
  if (!dir) dirs.push(d);
  const store = new JsonLibraryStore({ fs: nodeFs, clock: { now: () => new Date() }, dir: d });
  await store.load();
  return { repo: new JsonQuoteRepository(store), dir: d };
}

const implementations: Array<[string, () => Promise<QuoteRepository>]> = [
  ['JsonQuoteRepository', async () => (await jsonRepo()).repo],
  ['InMemoryQuoteRepository', async () => new InMemoryQuoteRepository()],
];

describe.each(implementations)('%s', (_name, make) => {
  it('inserts a new quote', async () => {
    const repo = await make();
    expect(await repo.upsert(quote(1, 'a', 1))).toEqual(quote(1, 'a', 1));
    expect(await repo.list()).toEqual([quote(1, 'a', 1)]);
    expect(await repo.get(uuid(1))).toEqual(quote(1, 'a', 1));
  });

  it('updates lastUsedAt instead of adding a duplicate', async () => {
    const repo = await make();
    await repo.upsert(quote(1, 'a', 1));
    const again = await repo.upsert(quote(2, 'a', 5));
    expect(again).toEqual({ ...quote(1, 'a', 1), lastUsedAt: at(5) });
    expect(await repo.list()).toHaveLength(1);
  });

  it('lists newest first by lastUsedAt', async () => {
    const repo = await make();
    await repo.upsert(quote(1, 'a', 1));
    await repo.upsert(quote(2, 'b', 2));
    await repo.upsert(quote(3, 'a', 3));
    expect((await repo.list()).map((q) => q.text)).toEqual(['a', 'b']);
  });

  it('deletes a quote, and reports NOT_FOUND for unknown ids', async () => {
    const repo = await make();
    await repo.upsert(quote(1, 'a', 1));
    expect(await repo.delete(uuid(1))).toEqual({ ok: true, value: undefined });
    expect(await repo.list()).toEqual([]);
    expect(await repo.delete(uuid(9))).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});

describe('JsonQuoteRepository persistence', () => {
  it('survives a new repository over the same file', async () => {
    const { repo, dir } = await jsonRepo();
    await repo.upsert(quote(1, 'a', 1));
    const { repo: again } = await jsonRepo(dir);
    expect(await again.list()).toEqual([quote(1, 'a', 1)]);
  });
});
