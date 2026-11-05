import { describe, expect, it } from 'vitest';
import { err, ok } from '@shared/ipc/result';
import { FakeIpcMain } from './test-helpers';
import { createRegistrar } from './register';
import { registerDesignHandlers } from './designs';
import type { DesignService } from '../services/design-service';

const ID = '11111111-1111-4111-8111-111111111111';
type Svc = Pick<DesignService, 'save' | 'list' | 'thumbnail' | 'reexport' | 'delete'>;

function setup(over: Partial<Svc> = {}) {
  const ipc = new FakeIpcMain();
  const designs: Svc = {
    save: async () => err({ code: 'STORAGE_FAILED', message: 'unused' }),
    list: async () => ok([]),
    thumbnail: async () => ok('data:image/jpeg;base64,AAA'),
    reexport: async () => ok({ exportedPath: '/export/a.jpg' }),
    delete: async () => ok(undefined),
    ...over,
  };
  registerDesignHandlers(createRegistrar(ipc, { isTrustedSender: () => true }), { designs });
  return ipc;
}

describe('design history channels', () => {
  it('returns values matching their schemas', async () => {
    const ipc = setup();
    expect(await ipc.invoke('designs:list')).toEqual({ ok: true, value: [] });
    expect(await ipc.invoke('designs:thumb', { id: ID })).toEqual({
      ok: true,
      value: 'data:image/jpeg;base64,AAA',
    });
    expect(await ipc.invoke('designs:reexport', { id: ID })).toEqual({
      ok: true,
      value: { exportedPath: '/export/a.jpg' },
    });
    expect(await ipc.invoke('designs:delete', { id: ID })).toEqual({ ok: true, value: undefined });
  });

  it.each(['designs:thumb', 'designs:reexport', 'designs:delete'])(
    '%s rejects a non-uuid id',
    async (channel) => {
      expect(await setup().invoke(channel, { id: '../x' })).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION' },
      });
    },
  );

  it('passes documented errors through', async () => {
    const ipc = setup({
      thumbnail: async () => err({ code: 'NOT_FOUND', message: 'gone' }),
      reexport: async () => err({ code: 'EXPORT_FAILED', message: 'x', reason: 'PERMISSION' }),
      list: async () => err({ code: 'STORAGE_FAILED', message: 'x' }),
    });
    expect(await ipc.invoke('designs:thumb', { id: ID })).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(await ipc.invoke('designs:reexport', { id: ID })).toMatchObject({
      ok: false,
      error: { code: 'EXPORT_FAILED' },
    });
    expect(await ipc.invoke('designs:list')).toMatchObject({ ok: false, error: { code: 'STORAGE_FAILED' } });
  });
});
