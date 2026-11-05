import { CHANNELS } from '@shared/ipc/channels';
import { IdPayload, SaveDesignInput } from '@shared/ipc/payloads';
import type { DesignService } from '../services/design-service';
import type { Registrar } from './register';

export function registerDesignHandlers(
  register: Registrar,
  deps: { designs: Pick<DesignService, 'save' | 'list' | 'thumbnail' | 'reexport' | 'delete'> },
): void {
  const { designs } = deps;
  register(CHANNELS.designsSave, SaveDesignInput, (input) => designs.save(input));
  register(CHANNELS.designsList, null, () => designs.list());
  register(CHANNELS.designsThumb, IdPayload, ({ id }) => designs.thumbnail(id));
  register(CHANNELS.designsReexport, IdPayload, ({ id }) => designs.reexport(id));
  register(CHANNELS.designsDelete, IdPayload, ({ id }) => designs.delete(id));
}
