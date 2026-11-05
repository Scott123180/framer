import { useState } from 'react';
import type { Quote } from '@shared/domain';
import { MSG } from '@shared/ipc/messages';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { ConfirmDialog } from './ConfirmDialog';
import { excerpt } from './excerpt';
import styles from './History.module.css';

type Props = { quotes: Quote[]; onSelect(quote: Quote): void; onDelete(quote: Quote): void };

export function PreviousQuotes({ quotes, onSelect, onDelete }: Props) {
  const [pending, setPending] = useState<Quote | null>(null);
  if (quotes.length === 0) return <p className={styles.empty}>{MSG.emptyQuotes}</p>;
  return (
    <>
      <ul className={styles.list}>
        {quotes.map((q) => {
          const name = excerpt(q.text);
          return (
            <li key={q.id} className={styles.quoteItem}>
              <button
                type="button"
                className={cx('focus-ring', styles.quoteButton)}
                title={q.author ? `${q.text} — ${q.author}` : q.text}
                onClick={() => onSelect(q)}
              >
                {name}
              </button>
              <Button
                variant="quiet"
                className={styles.small}
                aria-label={`Delete quote: ${name}`}
                onClick={() => setPending(q)}
              >
                Delete
              </Button>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={pending !== null}
        title="Delete this quote?"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) onDelete(pending);
          setPending(null);
        }}
      />
    </>
  );
}
