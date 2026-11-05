import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MemoryFs } from '../platform/memory-fs';
import { InMemoryDesignRepository } from '../persistence/design-repository';
import { DesignService } from './design-service';
import type { ImageResizer } from '../platform/image-resizer';
import { SavedDesign, type DesignSpec } from '@shared/domain';

const paths = { userData: '/ud', designsDir: '/ud/designs', exportDir: '/export/Framer' };
const ID = '11111111-1111-4111-8111-111111111111';

const spec: DesignSpec = {
  specVersion: 1,
  engineVersion: '1.0.0',
  quote: { text: 'Be the change you wish to see in the world.', author: 'Gandhi' },
  print: { size: '4x6', orientation: 'portrait', margin: { enabled: false } },
  style: {
    fontId: 'lora-500',
    fontFamily: 'Lora',
    background: { kind: 'solid', color: '#ffffff' },
    backgroundId: 'solid-white',
    textColor: '#111111',
    attributionColor: '#333333',
    comboKey: 'lora-500|solid-white',
  },
};

const jpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
const THUMB = new Uint8Array([9, 9, 9]);

function setup(size = { width: 1200, height: 1800 }) {
  const fs = new MemoryFs();
  const repo = new InMemoryDesignRepository();
  const resizeCalls: Array<[number, number]> = [];
  const resizer: ImageResizer = {
    size: () => size,
    resizeJpeg: (_b, longSide, quality) => {
      resizeCalls.push([longSide, quality]);
      return THUMB;
    },
  };
  let n = 0;
  const service = new DesignService({
    fs,
    repo,
    resizer,
    paths,
    clock: { now: () => new Date('2026-11-04T12:00:00.000Z') },
    ids: { next: () => (n++ === 0 ? ID : `22222222-2222-4222-8222-22222222222${n}`) },
  });
  return { fs, repo, service, resizeCalls };
}

const exported = 'framer-be-the-change-you-wish-to-see-4x6-portrait.jpg';

describe('DesignService.save', () => {
  it('writes the original, a thumbnail, an export copy, then records the design', async () => {
    const { fs, repo, service, resizeCalls } = setup();
    const res = await service.save({ spec, jpeg, quoteId: null });
    if (!res.ok) throw new Error(JSON.stringify(res.error));
    expect([...fs.files.get(`/ud/designs/${ID}.jpg`)!]).toEqual([...jpeg]);
    expect([...fs.files.get(`/ud/designs/${ID}.thumb.jpg`)!]).toEqual([...THUMB]);
    expect(resizeCalls).toEqual([[400, 85]]);
    expect([...fs.files.get(`/export/Framer/${exported}`)!]).toEqual([...jpeg]);

    const { exportedPath, ...design } = res.value;
    expect(exportedPath).toBe(`/export/Framer/${exported}`);
    expect(SavedDesign.parse(design)).toEqual(design);
    expect(design).toMatchObject({
      id: ID,
      quoteId: null,
      fileName: exported,
      imagePath: `designs/${ID}.jpg`,
      thumbPath: `designs/${ID}.thumb.jpg`,
      pixelWidth: 1200,
      pixelHeight: 1800,
      byteSize: jpeg.byteLength,
      sha256: createHash('sha256').update(jpeg).digest('hex'),
      savedAt: '2026-11-04T12:00:00.000Z',
    });
    expect(await repo.list()).toEqual([design]);
  });

  it('adds a counter when the export name is taken', async () => {
    const { fs, service } = setup();
    await fs.mkdir('/export/Framer');
    await fs.writeFile(`/export/Framer/${exported}`, 'old');
    await fs.writeFile(`/export/Framer/${exported.replace('.jpg', '-2.jpg')}`, 'old');
    const res = await service.save({ spec, jpeg, quoteId: null });
    expect(res.ok && res.value.exportedPath).toBe(`/export/Framer/${exported.replace('.jpg', '-3.jpg')}`);
    expect(res.ok && res.value.fileName).toBe(exported.replace('.jpg', '-3.jpg'));
  });

  it('rejects a JPEG whose size does not match the print', async () => {
    const { fs, repo, service } = setup({ width: 1000, height: 1800 });
    expect(await service.save({ spec, jpeg, quoteId: null })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
    expect(fs.files.size).toBe(0);
    expect(await repo.list()).toEqual([]);
  });

  it.each([
    ['image write', 'writeFile', (p: string) => p.endsWith(`${ID}.jpg`)],
    ['thumbnail write', 'writeFile', (p: string) => p.endsWith('.thumb.jpg')],
    ['export copy', 'copyFile', (p: string) => p.startsWith('/export')],
  ] as const)('cleans up and records nothing when the %s fails', async (_label, op, match) => {
    const { fs, repo, service } = setup();
    fs.failOn(op, match, 'EIO');
    const res = await service.save({ spec, jpeg, quoteId: null });
    expect(res).toMatchObject({
      ok: false,
      error: { code: 'EXPORT_FAILED', reason: 'UNKNOWN', message: expect.any(String) },
    });
    expect([...fs.files.keys()]).toEqual([]);
    expect(await repo.list()).toEqual([]);
  });

  it('cleans up every file when recording in the library fails', async () => {
    const { fs, repo, service } = setup();
    repo.failNextAdd(new Error('disk gone'));
    const res = await service.save({ spec, jpeg, quoteId: null });
    expect(res.ok).toBe(false);
    expect([...fs.files.keys()]).toEqual([]);
    expect(await repo.list()).toEqual([]);
  });

  it.each([
    ['ENOSPC', 'NO_SPACE'],
    ['EACCES', 'PERMISSION'],
    ['EPERM', 'PERMISSION'],
    ['EROFS', 'PERMISSION'],
    ['EBUSY', 'UNKNOWN'],
  ])('maps %s to reason %s with a plain-language message', async (code, reason) => {
    const { fs, service } = setup();
    fs.failOn('copyFile', (p) => p.startsWith('/export'), code);
    const res = await service.save({ spec, jpeg, quoteId: null });
    expect(res).toMatchObject({ ok: false, error: { code: 'EXPORT_FAILED', reason } });
    if (!res.ok) {
      expect(res.error.message).toMatch(/^Couldn't save: /);
      expect(res.error.message).not.toContain(code);
    }
  });

  it('maps a failure to create the export folder too', async () => {
    const { fs, service } = setup();
    fs.failOn('mkdir', (p) => p.startsWith('/export'), 'EACCES');
    expect(await service.save({ spec, jpeg, quoteId: null })).toMatchObject({
      ok: false,
      error: { code: 'EXPORT_FAILED', reason: 'PERMISSION' },
    });
    expect([...fs.files.keys()]).toEqual([]);
  });
});
