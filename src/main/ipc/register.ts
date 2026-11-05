import type { ZodType } from 'zod';
import { err, type Result } from '@shared/ipc/result';
import { STORAGE_FAILED_TEXT } from '@shared/ipc/messages';

export type IpcHandlerEvent = { senderFrame: { url: string } | null };

/** The slice of Electron's ipcMain this module uses. */
export interface IpcMainLike {
  handle(channel: string, listener: (event: IpcHandlerEvent, payload: unknown) => unknown): void;
}

export type TrustOptions = { isTrustedSender(url: string): boolean };

type Handler<P, T> = (payload: P) => Promise<Result<T>> | Result<T>;

/**
 * Registers one IPC handler that checks the sender, validates the payload, and never throws:
 * every outcome is a Result.
 */
export function registerHandler<P, T>(
  ipc: IpcMainLike,
  channel: string,
  schema: ZodType<P> | null,
  handler: Handler<P, T>,
  { isTrustedSender }: TrustOptions,
): void {
  ipc.handle(channel, async (event, payload): Promise<Result<T>> => {
    const url = event.senderFrame?.url ?? '';
    if (!isTrustedSender(url)) {
      return err({ code: 'VALIDATION', message: 'This request did not come from Framer.' });
    }
    let input = undefined as P;
    if (schema) {
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue?.path.map(String).join('.') || undefined;
        return err({
          code: 'VALIDATION',
          message: issue?.message ?? 'Invalid request.',
          ...(field ? { field } : {}),
        });
      }
      input = parsed.data;
    }
    try {
      return await handler(input);
    } catch (e) {
      console.error(`[ipc] ${channel} failed`, e);
      return err({ code: 'STORAGE_FAILED', message: STORAGE_FAILED_TEXT });
    }
  });
}

export type Registrar = <P, T>(channel: string, schema: ZodType<P> | null, handler: Handler<P, T>) => void;

/** Binds ipcMain and the sender check once, so each feature's handler module stays small. */
export function createRegistrar(ipc: IpcMainLike, trust: TrustOptions): Registrar {
  return (channel, schema, handler) => registerHandler(ipc, channel, schema, handler, trust);
}

/** Trusts only the app's own origin (app://framer), or the dev server's origin in development. */
export function createOriginCheck(opts: {
  appOrigin: string;
  devServerUrl?: string;
}): (url: string) => boolean {
  const app = new URL(opts.appOrigin);
  const devOrigin = opts.devServerUrl ? new URL(opts.devServerUrl).origin : null;
  return (raw) => {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return false;
    }
    if (devOrigin && url.origin === devOrigin) return true;
    return url.protocol === app.protocol && url.host === app.host;
  };
}
