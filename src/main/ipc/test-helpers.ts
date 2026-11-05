import type { IpcMainLike, IpcHandlerEvent } from './register';

/** A tiny in-memory stand-in for Electron's ipcMain, used by handler and contract tests. */
export class FakeIpcMain implements IpcMainLike {
  private readonly handlers = new Map<string, (event: IpcHandlerEvent, payload: unknown) => unknown>();

  handle(channel: string, listener: (event: IpcHandlerEvent, payload: unknown) => unknown): void {
    this.handlers.set(channel, listener);
  }

  channels(): string[] {
    return [...this.handlers.keys()];
  }

  async invoke(channel: string, payload?: unknown, senderUrl = 'app://trusted/index.html'): Promise<unknown> {
    const listener = this.handlers.get(channel);
    if (!listener) throw new Error(`No handler for ${channel}`);
    return listener({ senderFrame: { url: senderUrl } }, payload);
  }
}
