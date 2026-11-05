import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './Status.module.css';

type Props = {
  tone: 'polite' | 'alert';
  variant?: 'plain' | 'success';
  children: ReactNode;
  className?: string;
};

/** A live region: role="status" (polite) for progress and results, role="alert" for errors. */
export function Status({ tone, variant = 'plain', children, className }: Props) {
  if (tone === 'alert') {
    return (
      <div role="alert" className={cx(styles.alert, className)}>
        {children}
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(styles.status, variant === 'success' && styles.success, className)}
    >
      {children}
    </div>
  );
}
