import { isAbsolute, relative, resolve } from 'node:path';
import { CHANNELS } from '@shared/ipc/channels';
import { ShowInFolderInput } from '@shared/ipc/payloads';
import { err, ok } from '@shared/ipc/result';
import type { Shell } from '../platform/shell';
import type { Registrar } from './register';

/** True when `path` is the folder itself or something inside it (no `..` escapes). */
export function isInside(folder: string, path: string): boolean {
  if (!isAbsolute(path)) return false;
  const rel = relative(resolve(folder), resolve(path));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function registerOsHandlers(register: Registrar, deps: { exportDir: string; shell: Shell }): void {
  register(CHANNELS.osShowInFolder, ShowInFolderInput, ({ path }) => {
    if (!isInside(deps.exportDir, path)) {
      return err({
        code: 'VALIDATION',
        field: 'path',
        message: 'Only files in the Framer export folder can be shown.',
      });
    }
    deps.shell.showItemInFolder(resolve(path));
    return ok(undefined);
  });
}
