import { useId, type ReactNode } from 'react';
import { Status } from '../../ui/Status';
import { cx } from '../../ui/cx';
import type { SessionAlert } from '../../state/session-reducer';
import { QuoteInput } from './QuoteInput';
import { GenerateButton } from './GenerateButton';
import styles from './ComposePanel.module.css';

export type ComposePanelProps = {
  text: string;
  author: string;
  onTextChange(text: string): void;
  onAuthorChange(author: string): void;
  onGenerate(): void;
  generateLabel: string;
  alert: SessionAlert | null;
  disabled?: boolean;
  /** Print settings sit between Author and Generate, so tab order follows the task. */
  children?: ReactNode;
};

const COMPOSE_ALERTS = new Set<SessionAlert['kind']>(['QUOTE_EMPTY', 'QUOTE_TOO_LONG', 'AUTHOR_TOO_LONG']);

export function ComposePanel(props: ComposePanelProps) {
  const authorId = useId();
  const alert = props.alert && COMPOSE_ALERTS.has(props.alert.kind) ? props.alert : null;
  return (
    <div className={styles.panel}>
      <QuoteInput value={props.text} onChange={props.onTextChange} onSubmit={props.onGenerate} />
      <div className={styles.field}>
        <label htmlFor={authorId} className={styles.label}>
          Author (optional)
        </label>
        <input
          id={authorId}
          className={cx('focus-ring', styles.input)}
          value={props.author}
          autoComplete="off"
          onChange={(e) => props.onAuthorChange(e.target.value)}
        />
      </div>
      {props.children}
      <div className={styles.actions}>
        <GenerateButton label={props.generateLabel} onClick={props.onGenerate} disabled={props.disabled} />
        {alert && <Status tone="alert">{alert.message}</Status>}
      </div>
    </div>
  );
}
