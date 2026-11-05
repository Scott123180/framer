import { useId, type KeyboardEvent } from 'react';
import { MAX_QUOTE_GRAPHEMES, countGraphemes } from '@shared/domain/quote';
import { cx } from '../../ui/cx';
import styles from './ComposePanel.module.css';

type Props = { value: string; onChange(value: string): void; onSubmit(): void };

/** The multiline quote box with a live character count; Ctrl/Cmd+Enter generates. */
export function QuoteInput({ value, onChange, onSubmit }: Props) {
  const id = useId();
  const count = countGraphemes(value);
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit();
    }
  }
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          Quote
        </label>
        <span
          id={`${id}-count`}
          className={cx(styles.counter, count > MAX_QUOTE_GRAPHEMES && styles.over)}
        >{`${count} / ${MAX_QUOTE_GRAPHEMES}`}</span>
      </div>
      <textarea
        id={id}
        className={cx('focus-ring', styles.textarea)}
        value={value}
        rows={5}
        aria-describedby={`${id}-count`}
        placeholder="Type or paste a quote…"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
