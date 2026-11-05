import type { IpcMain } from 'electron';
import { nodeFs } from './platform/fs-port';
import { systemClock } from './platform/clock';
import type { AppPaths } from './platform/paths';
import { JsonLibraryStore } from './persistence/json-library-store';
import { FontAssetService } from './services/font-asset-service';
import { StartupService } from './services/startup-service';
import { createOriginCheck, createRegistrar, type IpcMainLike } from './ipc/register';
import { registerAppHandlers } from './ipc/app';
import { registerDesignHandlers } from './ipc/designs';
import { registerOsHandlers } from './ipc/os';
import { uuidIds } from './platform/ids';
import { nativeImageResizer } from './platform/image-resizer';
import { electronShell } from './platform/shell';
import { JsonDesignRepository } from './persistence/design-repository';
import { DesignService } from './services/design-service';
import { QuoteService } from './services/quote-service';
import { JsonQuoteRepository } from './persistence/quote-repository';
import { registerQuoteHandlers } from './ipc/quotes';
import { APP_ORIGIN } from './security';

/** Composition root: the only place that builds real implementations and wires IPC handlers. */
export async function composeMain(deps: { ipcMain: IpcMain; paths: AppPaths; devServerUrl?: string }) {
  const { paths } = deps;
  const fs = nodeFs;
  const clock = systemClock;

  const store = new JsonLibraryStore({ fs, clock, dir: paths.userData });
  const { notices } = await store.load();

  const register = createRegistrar(deps.ipcMain as unknown as IpcMainLike, {
    isTrustedSender: createOriginCheck({ appOrigin: APP_ORIGIN, devServerUrl: deps.devServerUrl }),
  });

  registerAppHandlers(register, {
    fonts: new FontAssetService({ fs, fontsDir: paths.fontsDir }),
    startup: new StartupService({ notices, exportDir: paths.exportDir }),
  });

  const designRepo = new JsonDesignRepository(store);
  const designs = new DesignService({
    fs,
    repo: designRepo,
    resizer: nativeImageResizer,
    clock,
    ids: uuidIds,
    paths,
  });
  registerDesignHandlers(register, { designs });
  const quotes = new QuoteService({
    quotes: new JsonQuoteRepository(store),
    designs: designRepo,
    clock,
    ids: uuidIds,
  });
  registerQuoteHandlers(register, { quotes });
  registerOsHandlers(register, { exportDir: paths.exportDir, shell: electronShell });
}
