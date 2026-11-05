import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FakeIpcMain } from './test-helpers';
import { createRegistrar } from './register';
import { registerAppHandlers } from './app';
import { FontAssetService } from '../services/font-asset-service';
import { StartupService } from '../services/startup-service';
import type { FsPort } from '../platform/fs-port';
import type { AppError } from '@shared/ipc/result';

const fontsDir = '/fonts';
const manifest = [
  {
    id: 'lora-400',
    family: 'Lora',
    category: 'serif',
    weight: 400,
    style: 'normal',
    file: 'lora/Lora.ttf',
    license: 'OFL-1.1',
    caseTransform: 'none',
  },
  {
    id: 'bebas-neue-400',
    family: 'Bebas Neue',
    category: 'display',
    weight: 400,
    style: 'normal',
    file: 'bebas/Bebas.ttf',
    license: 'OFL-1.1',
    caseTransform: 'uppercase',
  },
  {
    id: 'broken-400',
    family: 'Broken',
    category: 'sans',
    weight: 400,
    style: 'normal',
    file: 'broken/Broken.ttf',
    license: 'OFL-1.1',
    caseTransform: 'none',
  },
];

function fakeFs(): FsPort & { reads: string[] } {
  const files = new Map<string, Uint8Array>([
    [join(fontsDir, 'fonts.manifest.json'), new TextEncoder().encode(JSON.stringify(manifest))],
    [join(fontsDir, 'lora/Lora.ttf'), new Uint8Array([1, 2, 3])],
    [join(fontsDir, 'bebas/Bebas.ttf'), new Uint8Array([4, 5])],
  ]);
  const reads: string[] = [];
  const missing = () => Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
  return {
    reads,
    readFile: async (p) => {
      reads.push(p);
      const f = files.get(p);
      if (!f) return missing();
      return f;
    },
    writeFile: missing,
    fsync: missing,
    rename: missing,
    copyFile: missing,
    rm: missing,
    mkdir: missing,
    stat: missing,
    access: missing,
  };
}

function setup(notices: AppError[] = []) {
  const ipc = new FakeIpcMain();
  const fs = fakeFs();
  const register = createRegistrar(ipc, { isTrustedSender: () => true });
  registerAppHandlers(register, {
    fonts: new FontAssetService({ fs, fontsDir }),
    startup: new StartupService({ notices, exportDir: '/export' }),
  });
  return { ipc, fs };
}

describe('fonts:load', () => {
  it('returns bytes for each requested catalog id', async () => {
    const { ipc, fs } = setup();
    const res = (await ipc.invoke('fonts:load', { ids: ['lora-400', 'bebas-neue-400'] })) as {
      ok: true;
      value: Array<{ id: string; bytes: ArrayBuffer }>;
    };
    expect(res.ok).toBe(true);
    expect(res.value.map((f) => f.id)).toEqual(['lora-400', 'bebas-neue-400']);
    expect(res.value[0]?.bytes).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(res.value[0]!.bytes)]).toEqual([1, 2, 3]);
    await ipc.invoke('fonts:load', { ids: ['lora-400'] });
    expect(fs.reads.filter((p) => p.endsWith('fonts.manifest.json'))).toHaveLength(1);
  });

  it('rejects ids that are not in the catalog', async () => {
    const { ipc } = setup();
    expect(await ipc.invoke('fonts:load', { ids: ['nope'] })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
    expect(await ipc.invoke('fonts:load', { ids: 'lora-400' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
  });

  it('reports STORAGE_FAILED when a font file cannot be read', async () => {
    const { ipc } = setup();
    expect(await ipc.invoke('fonts:load', { ids: ['broken-400'] })).toMatchObject({
      ok: false,
      error: { code: 'STORAGE_FAILED', message: expect.any(String) },
    });
  });
});

describe('app:startupInfo', () => {
  it('returns exactly notices and exportDir', async () => {
    const { ipc } = setup();
    const res = (await ipc.invoke('app:startupInfo')) as { ok: true; value: object };
    expect(res).toEqual({ ok: true, value: { notices: [], exportDir: '/export' } });
  });

  it('returns a recovery notice only once', async () => {
    const notice: AppError = {
      code: 'LIBRARY_RECOVERED',
      message: 'm',
      backupPath: '/ud/library.corrupt-x.json',
    };
    const { ipc } = setup([notice]);
    expect(await ipc.invoke('app:startupInfo')).toEqual({
      ok: true,
      value: { notices: [notice], exportDir: '/export' },
    });
    expect(await ipc.invoke('app:startupInfo')).toEqual({
      ok: true,
      value: { notices: [], exportDir: '/export' },
    });
  });
});
