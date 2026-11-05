import { describe, expect, it } from 'vitest';
import { FakeIpcMain } from './test-helpers';
import { createRegistrar } from './register';
import { registerDesignHandlers } from './designs';
import { SavedDesign, type DesignSpec } from '@shared/domain';
import { ok, err } from '@shared/ipc/result';
import type { DesignService } from '../services/design-service';

const ID = '11111111-1111-4111-8111-111111111111';
const spec: DesignSpec = {
  specVersion: 1,
  engineVersion: '1.0.0',
  quote: { text: 'Hi', author: null },
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
const saved: SavedDesign = {
  id: ID,
  quoteId: null,
  spec,
  fileName: 'framer-hi-4x6-portrait.jpg',
  imagePath: `designs/${ID}.jpg`,
  thumbPath: `designs/${ID}.thumb.jpg`,
  pixelWidth: 1200,
  pixelHeight: 1800,
  byteSize: 3,
  sha256: 'a'.repeat(64),
  savedAt: '2026-11-04T12:00:00.000Z',
};

type SaveFn = DesignService['save'];

function setup(save: SaveFn) {
  const ipc = new FakeIpcMain();
  registerDesignHandlers(createRegistrar(ipc, { isTrustedSender: () => true }), {
    designs: {
      save,
      list: async () => ok([]),
      thumbnail: async () => ok(''),
      reexport: async () => ok({ exportedPath: '' }),
      delete: async () => ok(undefined),
    },
  });
  return ipc;
}

describe('designs:save', () => {
  it('returns a SavedDesign plus exportedPath for a valid payload', async () => {
    const calls: unknown[] = [];
    const ipc = setup(async (input) => {
      calls.push(input);
      return ok({ ...saved, exportedPath: '/export/framer-hi-4x6-portrait.jpg' });
    });
    const res = (await ipc.invoke('designs:save', { spec, jpeg: new ArrayBuffer(3), quoteId: null })) as {
      ok: true;
      value: SavedDesign & { exportedPath: string };
    };
    expect(res.ok).toBe(true);
    const { exportedPath, ...design } = res.value;
    expect(exportedPath).toBe('/export/framer-hi-4x6-portrait.jpg');
    expect(SavedDesign.safeParse(design).success).toBe(true);
    expect((calls[0] as { jpeg: Uint8Array }).jpeg).toBeInstanceOf(Uint8Array);
  });

  it('accepts a Uint8Array as the jpeg', async () => {
    const ipc = setup(async () => ok({ ...saved, exportedPath: '/x' }));
    expect(await ipc.invoke('designs:save', { spec, jpeg: new Uint8Array(3), quoteId: null })).toMatchObject({
      ok: true,
    });
  });

  it.each([
    ['missing spec', { jpeg: new ArrayBuffer(3), quoteId: null }],
    ['a jpeg over 40 MB', { spec, jpeg: new ArrayBuffer(40 * 1024 * 1024 + 1), quoteId: null }],
    ['an empty jpeg', { spec, jpeg: new ArrayBuffer(0), quoteId: null }],
    ['a bad quoteId', { spec, jpeg: new ArrayBuffer(3), quoteId: 'nope' }],
  ])('rejects %s with VALIDATION', async (_label, payload) => {
    const ipc = setup(async () => ok({ ...saved, exportedPath: '/x' }));
    expect(await ipc.invoke('designs:save', payload)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
  });

  it('passes EXPORT_FAILED through', async () => {
    const error = {
      code: 'EXPORT_FAILED',
      message: "Couldn't save: the disk is full.",
      reason: 'NO_SPACE',
    } as const;
    const ipc = setup(async () => err(error));
    expect(await ipc.invoke('designs:save', { spec, jpeg: new ArrayBuffer(3), quoteId: null })).toEqual({
      ok: false,
      error,
    });
  });
});
