import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { Button } from '../../ui/Button';
import styles from './History.module.css';

type Props = { open: boolean; title: string; onConfirm(): void; onCancel(): void };

/**
 * A modal confirmation built on the native <dialog>. Focus starts on Cancel, Tab stays inside, and
 * closing returns focus to whatever opened it.
 */
export function ConfirmDialog(props: Props) {
  return props.open ? <OpenDialog {...props} /> : null;
}

function OpenDialog({ title, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = dialog.current;
    if (el && typeof el.showModal === 'function' && !el.open) el.showModal();
    else el?.setAttribute('open', '');
    cancel.current?.focus();
    return () => opener?.focus();
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;
    const first = cancel.current;
    const last = confirm.current;
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={styles.dialog}
      onKeyDown={onKeyDown}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId} className={styles.dialogTitle}>
        {title}
      </h2>
      <div className={styles.dialogActions}>
        <Button ref={cancel} onClick={onCancel}>
          Cancel
        </Button>
        <Button ref={confirm} variant="danger" onClick={onConfirm}>
          Delete
        </Button>
      </div>
    </dialog>
  );
}
