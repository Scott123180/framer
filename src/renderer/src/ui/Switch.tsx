import { cx } from './cx';
import styles from './Switch.module.css';

type Props = { label: string; checked: boolean; onChange(checked: boolean): void };

export function Switch({ label, checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cx('focus-ring', styles.switch, checked && styles.on)}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <span>{label}</span>
    </button>
  );
}
