import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { DesignSpec, SavedDesign } from '@shared/domain';
import { MemoryFs } from '../platform/memory-fs';
import { InMemoryDesignRepository } from '../persistence/design-repository';
import { DesignService } from './design-service';

const paths = { userData: '/ud', designsDir: '/ud/designs', exportDir: '/export' };
const id = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const bytes = new Uint8Array([0xff, 0xd8, 7, 7, 0xff, 0xd9]);
const sha = createHash('sha256').update(bytes).digest('hex');

const design = (n: number, savedAt: string): SavedDesign => ({
  id: id(n),
  quoteId: null,
  spec: { quote: { text: 'Hi', author: null } } as DesignSpec,
  fileName: 'framer-hi-4x6-portrait.jpg',
  imagePath: `designs/${id(n)}.jpg`,
  thumbPath: `designs/${id(n)}.thumb.jpg`,
  pixelWidth: 1200,
  pixelHeight: 1800,
  byteSize: bytes.byteLength,
  sha256: sha,
  savedAt,
});

async function setup() {
  const fs = new MemoryFs();
  const repo = new InMemoryDesignRepository();
  await fs.mkdir('/ud/designs');
  for (const [n, t] of [
    [1, '2026-11-04T10:00:00.000Z'],
    [2, '2026-11-04T11:00:00.000Z'],
  ] as const) {
    await repo.add(design(n, t));
    await fs.writeFile(`/ud/designs/${id(n)}.jpg`, bytes);
    await fs.writeFile(`/ud/designs/${id(n)}.thumb.jpg`, new Uint8Array([1, 2, 3]));
  }
  const service = new DesignService({
    fs,
    repo,
    resizer: { size: () => ({ width: 0, height: 0 }), resizeJpeg: () => new Uint8Array() },
    clock: { now: () => new Date() },
    ids: { next: () => id(99) },
    paths,
  });
  return { fs, repo, service };
}

describe('DesignService history', () => {
  it('lists newest first', async () => {
    const { service } = await setup();
    const res = await service.list();
    expect(res.ok && res.value.map((d) => d.id)).toEqual([id(2), id(1)]);
  });

  it('returns the thumbnail as a data URL', async () => {
    const { service } = await setup();
    expect(await service.thumbnail(id(1))).toEqual({
      ok: true,
      value: `data:image/jpeg;base64,${btoa('\x01\x02\x03')}`,
    });
  });

  it('re-exports byte-identical copies under the original name, with a counter when taken', async () => {
    const { fs, service } = await setup();
    const first = await service.reexport(id(1));
    expect(first).toEqual({ ok: true, value: { exportedPath: '/export/framer-hi-4x6-portrait.jpg' } });
    const second = await service.reexport(id(1));
    expect(second).toEqual({ ok: true, value: { exportedPath: '/export/framer-hi-4x6-portrait-2.jpg' } });
    expect([...fs.files.get('/export/framer-hi-4x6-portrait-2.jpg')!]).toEqual([...bytes]);
  });

  it('refuses to re-export a stored image that no longer matches its hash', async () => {
    const { fs, service } = await setup();
    await fs.writeFile(`/ud/designs/${id(1)}.jpg`, new Uint8Array([0xff, 0xd8, 0]));
    expect(await service.reexport(id(1))).toMatchObject({ ok: false, error: { code: 'STORAGE_FAILED' } });
    expect([...fs.files.keys()].some((k) => k.startsWith('/export/'))).toBe(false);
  });

  it('maps export failures like save does', async () => {
    const { fs, service } = await setup();
    fs.failOn('copyFile', (p) => p.startsWith('/export'), 'ENOSPC');
    expect(await service.reexport(id(1))).toMatchObject({
      ok: false,
      error: { code: 'EXPORT_FAILED', reason: 'NO_SPACE' },
    });
  });

  it('deletes both files and the record', async () => {
    const { fs, repo, service } = await setup();
    expect(await service.delete(id(1))).toEqual({ ok: true, value: undefined });
    expect(fs.files.has(`/ud/designs/${id(1)}.jpg`)).toBe(false);
    expect(fs.files.has(`/ud/designs/${id(1)}.thumb.jpg`)).toBe(false);
    expect((await repo.list()).map((d) => d.id)).toEqual([id(2)]);
  });

  it('reports NOT_FOUND for unknown ids', async () => {
    const { service } = await setup();
    for (const call of [service.thumbnail(id(7)), service.reexport(id(7)), service.delete(id(7))]) {
      expect(await call).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    }
  });
});
