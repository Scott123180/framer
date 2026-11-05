import { useCallback, type Dispatch } from 'react';
import { EXPORT_REASON_TEXT, MSG } from '@shared/ipc/messages';
import type { AppError } from '@shared/ipc/result';
import type { RenderService } from '@engine/output/render-service';
import { useFramerApi } from '../../app/framer-api-context';
import type { SessionAction } from '../../state/actions';
import { selectSelectedOptions, type SessionState } from '../../state/session-reducer';

export function saveFailedMessage(error: AppError | null): string {
  const reason = error?.code === 'EXPORT_FAILED' ? error.reason : 'UNKNOWN';
  return MSG.saveFailed(EXPORT_REASON_TEXT[reason]);
}

/** The folder part of a path, on any OS. */
export function folderOf(path: string): string {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i > 0 ? path.slice(0, i) : path;
}

/** Renders each selected option at print size and saves it, in order, stopping at the first failure. */
export function useSaveSelected(
  state: SessionState,
  dispatch: Dispatch<SessionAction>,
  renderService: RenderService,
  onSaved?: () => void,
): () => Promise<void> {
  const api = useFramerApi();
  return useCallback(async () => {
    const selected = selectSelectedOptions(state);
    if (selected.length === 0) return;
    dispatch({ type: 'SAVE_STARTED' });
    let lastPath = '';
    for (const option of selected) {
      let jpeg: ArrayBuffer;
      try {
        jpeg = await renderService.renderPrint(option.spec);
      } catch (e) {
        console.error('[save] render failed', e);
        dispatch({ type: 'SAVE_FAILED', message: saveFailedMessage(null) });
        return;
      }
      const res = await api.saveDesign({ spec: option.spec, jpeg, quoteId: state.quoteId });
      if (!res.ok) {
        dispatch({ type: 'SAVE_FAILED', message: saveFailedMessage(res.error) });
        onSaved?.();
        return;
      }
      lastPath = res.value.exportedPath;
    }
    dispatch({ type: 'SAVE_SUCCEEDED', count: selected.length, folder: folderOf(lastPath), lastPath });
    onSaved?.();
  }, [api, dispatch, renderService, state, onSaved]);
}
