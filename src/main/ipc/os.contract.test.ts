import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { FakeIpcMain } from './test-helpers';
import { createRegistrar } from './register';
import { registerOsHandlers } from './os';

function setup() {
  const ipc = new FakeIpcMain();
  const shown: string[] = [];
  registerOsHandlers(createRegistrar(ipc, { isTrustedSender: () => true }), {
    exportDir: '/home/u/Pictures/Framer',
    shell: { showItemInFolder: (p) => shown.push(p) },
  });
  return { ipc, shown };
}

describe('os:showInFolder', () => {
  it('shows a file inside the export folder', async () => {
    const { ipc, shown } = setup();
    const path = join('/home/u/Pictures/Framer', 'framer-hi-4x6-portrait.jpg');
    expect(await ipc.invoke('os:showInFolder', { path })).toEqual({ ok: true, value: undefined });
    expect(shown).toEqual([path]);
  });

  it.each([
    '/etc/passwd',
    '/home/u/Pictures/Framer/../secret.txt',
    '/home/u/Pictures/FramerEvil/x.jpg',
    'relative.jpg',
  ])('rejects %s', async (path) => {
    const { ipc, shown } = setup();
    expect(await ipc.invoke('os:showInFolder', { path })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
    expect(shown).toEqual([]);
  });

  it('rejects a malformed payload', async () => {
    const { ipc } = setup();
    expect(await ipc.invoke('os:showInFolder', { nope: 1 })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION' },
    });
  });
});
