import { CHANNELS } from '@shared/ipc/channels';
import { LoadFontsInput } from '@shared/ipc/payloads';
import { ok } from '@shared/ipc/result';
import type { FontAssetService } from '../services/font-asset-service';
import type { StartupService } from '../services/startup-service';
import type { Registrar } from './register';

export function registerAppHandlers(
  register: Registrar,
  deps: { fonts: Pick<FontAssetService, 'load'>; startup: Pick<StartupService, 'info'> },
): void {
  register(CHANNELS.fontsLoad, LoadFontsInput, ({ ids }) => deps.fonts.load(ids));
  register(CHANNELS.appStartupInfo, null, () => ok(deps.startup.info()));
}
