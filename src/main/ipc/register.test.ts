import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { FakeIpcMain } from './test-helpers';
import { createOriginCheck, registerHandler } from './register';
import { ok } from '@shared/ipc/result';

const trusted = { isTrustedSender: (url: string) => url.startsWith('app://trusted') };

describe('registerHandler', () => {
  it('returns VALIDATION and skips the handler when the payload fails its schema', async () => {
    const ipc = new FakeIpcMain();
    const handler = vi.fn(async () => ok(1));
    registerHandler(ipc, 'x:do', z.object({ id: z.string().uuid() }), handler, trusted);
    const res = await ipc.invoke('x:do', { id: 'nope' });
    expect(res).toMatchObject({ ok: false, error: { code: 'VALIDATION', field: 'id' } });
    expect((res as { error: { message: string } }).error.message).toEqual(expect.any(String));
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes a valid payload to the handler and returns its result', async () => {
    const ipc = new FakeIpcMain();
    registerHandler(ipc, 'x:do', z.object({ n: z.number() }), async ({ n }) => ok(n * 2), trusted);
    expect(await ipc.invoke('x:do', { n: 2 })).toEqual({ ok: true, value: 4 });
  });

  it('calls handlers with no schema without a payload', async () => {
    const ipc = new FakeIpcMain();
    registerHandler(ipc, 'x:list', null, async () => ok([]), trusted);
    expect(await ipc.invoke('x:list')).toEqual({ ok: true, value: [] });
  });

  it('rejects senders outside the app origin', async () => {
    const ipc = new FakeIpcMain();
    const handler = vi.fn(async () => ok(1));
    registerHandler(ipc, 'x:list', null, handler, trusted);
    const res = await ipc.invoke('x:list', undefined, 'https://evil.example.com/');
    expect(res).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    expect(handler).not.toHaveBeenCalled();
  });

  it('converts a thrown error into STORAGE_FAILED with a plain message', async () => {
    const ipc = new FakeIpcMain();
    registerHandler(
      ipc,
      'x:list',
      null,
      async () => {
        throw new Error('EIO: low-level detail');
      },
      trusted,
    );
    const res = (await ipc.invoke('x:list')) as { ok: false; error: { code: string; message: string } };
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('STORAGE_FAILED');
    expect(res.error.message).not.toContain('EIO');
  });
});

describe('createOriginCheck', () => {
  it('trusts the app origin', () => {
    const check = createOriginCheck({ appOrigin: 'app://framer' });
    expect(check('app://framer/index.html')).toBe(true);
    expect(check('app://framer/index.html#x')).toBe(true);
  });

  it('trusts the dev server origin when one is configured', () => {
    const check = createOriginCheck({ appOrigin: 'app://framer', devServerUrl: 'http://localhost:5173' });
    expect(check('http://localhost:5173/')).toBe(true);
    expect(check('http://localhost:5174/')).toBe(false);
  });

  it('rejects other origins and local files', () => {
    const check = createOriginCheck({ appOrigin: 'app://framer' });
    expect(check('https://example.com/')).toBe(false);
    expect(check('app://evil/index.html')).toBe(false);
    expect(check('file:///etc/passwd')).toBe(false);
    expect(check('http://localhost:5173/')).toBe(false);
    expect(check('not a url')).toBe(false);
  });
});
