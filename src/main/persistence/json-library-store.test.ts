import { mkdtemp, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nodeFs, type FsPort } from '../platform/fs-port';
import { JsonLibraryStore } from './json-library-store';
import type { Quote } from '@shared/domain';

const clock = { now: () => new Date('2026-11-04T10:20:30.400Z') };
const noSleep = async () => {};

function quote(text: string): Quote {
  return {
    id: '3f1e7a52-9b1c-4c8e-8d0a-2b7f5e6a1c90',
    text,
    author: null,
    dedupeKey: `${text}\u0000`,
    createdAt: '2026-11-04T10:20:30.400Z',
    lastUsedAt: '2026-11-04T10:20:30.400Z',
  };
}

function errno(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'framer-store-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const make = (fs: FsPort = nodeFs) => new JsonLibraryStore({ fs, clock, dir, sleep: noSleep });

describe('JsonLibraryStore', () => {
  it('starts with an empty library when the file is missing', async () => {
    const { library, notices } = await make().load();
    expect(library).toEqual({ schemaVersion: 1, quotes: [], designs: [] });
    expect(notices).toEqual([]);
  });

  it('persists updates to library.json', async () => {
    const store = make();
    await store.load();
    await store.update((lib) => ({ ...lib, quotes: [quote('a')] }));
    const onDisk = JSON.parse(await readFile(join(dir, 'library.json'), 'utf8'));
    expect(onDisk.quotes).toHaveLength(1);
    const again = make();
    expect((await again.load()).library.quotes[0]?.text).toBe('a');
    expect(again.read().quotes).toHaveLength(1);
  });

  it('writes a temp file, fsyncs it, then renames it', async () => {
    const calls: string[] = [];
    const spy: FsPort = {
      ...nodeFs,
      writeFile: async (p, d) => {
        calls.push(`write ${p.endsWith('.tmp') ? 'tmp' : p}`);
        return nodeFs.writeFile(p, d);
      },
      fsync: async (p) => {
        calls.push(`fsync ${p.endsWith('.tmp') ? 'tmp' : p}`);
        return nodeFs.fsync(p);
      },
      rename: async (a, b) => {
        calls.push(`rename ${a.endsWith('.tmp') ? 'tmp' : a} ${b.endsWith('library.json') ? 'library' : b}`);
        return nodeFs.rename(a, b);
      },
    };
    const store = make(spy);
    await store.load();
    await store.update((lib) => lib);
    expect(calls).toEqual(['write tmp', 'fsync tmp', 'rename tmp library']);
  });

  it('leaves the old file intact when it crashes before the rename', async () => {
    const store = make();
    await store.load();
    await store.update((lib) => ({ ...lib, quotes: [quote('old')] }));
    const crashing = make({
      ...nodeFs,
      rename: async () => {
        throw errno('EIO');
      },
    });
    await crashing.load();
    await expect(crashing.update((lib) => ({ ...lib, quotes: [quote('new')] }))).rejects.toThrow();
    const onDisk = JSON.parse(await readFile(join(dir, 'library.json'), 'utf8'));
    expect(onDisk.quotes[0].text).toBe('old');
    expect(crashing.read().quotes[0]?.text).toBe('old');
  });

  it('serializes concurrent updates in call order', async () => {
    const store = make();
    await store.load();
    const seen: number[] = [];
    await Promise.all([
      store.update((lib) => {
        seen.push(lib.quotes.length);
        return { ...lib, quotes: [...lib.quotes, quote('a')] };
      }),
      store.update((lib) => {
        seen.push(lib.quotes.length);
        return { ...lib, quotes: [...lib.quotes, quote('b')] };
      }),
      store.update((lib) => {
        seen.push(lib.quotes.length);
        return { ...lib, quotes: [...lib.quotes, quote('c')] };
      }),
    ]);
    expect(seen).toEqual([0, 1, 2]);
    expect(store.read().quotes.map((q) => q.text)).toEqual(['a', 'b', 'c']);
  });

  it('keeps working after a failed update', async () => {
    let fail = true;
    const store = make({
      ...nodeFs,
      rename: async (a, b) => {
        if (fail) {
          fail = false;
          throw errno('EIO');
        }
        return nodeFs.rename(a, b);
      },
    });
    await store.load();
    await expect(store.update((lib) => ({ ...lib, quotes: [quote('x')] }))).rejects.toThrow();
    await store.update((lib) => ({ ...lib, quotes: [quote('y')] }));
    expect(store.read().quotes.map((q) => q.text)).toEqual(['y']);
  });

  it('retries a rename that fails with EPERM (Windows)', async () => {
    let attempts = 0;
    const store = make({
      ...nodeFs,
      rename: async (a, b) => {
        attempts++;
        if (attempts < 3) throw errno('EPERM');
        return nodeFs.rename(a, b);
      },
    });
    await store.load();
    await store.update((lib) => ({ ...lib, quotes: [quote('a')] }));
    expect(attempts).toBe(3);
    expect(JSON.parse(await readFile(join(dir, 'library.json'), 'utf8')).quotes).toHaveLength(1);
  });

  it('gives up after 5 EPERM retries', async () => {
    let attempts = 0;
    const store = make({
      ...nodeFs,
      rename: async () => {
        attempts++;
        throw errno('EPERM');
      },
    });
    await store.load();
    await expect(store.update((lib) => lib)).rejects.toThrow();
    expect(attempts).toBe(6);
  });

  it.each([
    ['invalid JSON', '{ not json'],
    ['schema-invalid content', JSON.stringify({ schemaVersion: 1, quotes: 'nope' })],
  ])('moves %s aside and starts empty with a LIBRARY_RECOVERED notice', async (_label, content) => {
    await writeFile(join(dir, 'library.json'), content);
    const { library, notices } = await make().load();
    expect(library).toEqual({ schemaVersion: 1, quotes: [], designs: [] });
    const backupPath = join(dir, 'library.corrupt-2026-11-04T10-20-30-400Z.json');
    expect(notices).toEqual([{ code: 'LIBRARY_RECOVERED', message: expect.any(String), backupPath }]);
    expect(await readFile(backupPath, 'utf8')).toBe(content);
    expect((await readdir(dir)).includes('library.json')).toBe(false);
  });
});
