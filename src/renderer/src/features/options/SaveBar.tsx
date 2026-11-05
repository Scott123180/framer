import { useId, type Dispatch } from 'react';
import { MSG } from '@shared/ipc/messages';
import type { RenderService } from '@engine/output/render-service';
import { Button } from '../../ui/Button';
import { Status } from '../../ui/Status';
import { useFramerApi } from '../../app/framer-api-context';
import type { SessionAction } from '../../state/actions';
import { selectCanSave, selectSelectedOptions, type SessionState } from '../../state/session-reducer';
import { useSaveSelected } from './useSaveSelected';
import styles from './SaveBar.module.css';

type Props = {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  renderService: RenderService;
  onSaved?: () => void;
};

export function SaveBar({ state, dispatch, renderService, onSaved }: Props) {
  const api = useFramerApi();
  const save = useSaveSelected(state, dispatch, renderService, onSaved);
  const helperId = useId();
  const count = selectSelectedOptions(state).length;
  const { save: status } = state;
  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <Button
          disabled={!selectCanSave(state)}
          aria-describedby={count === 0 ? helperId : undefined}
          onClick={() => void save()}
        >
          {`Save selected (${count})`}
        </Button>
        {count === 0 && (
          <p id={helperId} className={styles.helper}>
            {MSG.selectToSave}
          </p>
        )}
      </div>
      {status.phase === 'saved' && (
        <Status tone="polite" variant="success">
          <span className={styles.saved}>
            {MSG.saved(status.count, status.folder)}
            <Button variant="quiet" onClick={() => void api.showInFolder(status.lastPath)}>
              Show in folder
            </Button>
          </span>
        </Status>
      )}
      {status.phase === 'failed' && <Status tone="alert">{status.message}</Status>}
    </div>
  );
}
