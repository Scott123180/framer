import { useId, useRef, type KeyboardEvent } from 'react';
import { cx } from './cx';
import styles from './RadioGroup.module.css';

type Option<V extends string> = { value: V; label: string };

type Props<V extends string> = {
  label: string;
  name: string;
  options: ReadonlyArray<Option<V>>;
  value: V;
  onChange(value: V): void;
};

const NEXT = new Set(['ArrowRight', 'ArrowDown']);
const PREV = new Set(['ArrowLeft', 'ArrowUp']);

/** A labelled radio group of native radios. Arrow keys move and select, like the platform control. */
export function RadioGroup<V extends string>({ label, name, options, value, onChange }: Props<V>) {
  const labelId = useId();
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    const step = NEXT.has(e.key) ? 1 : PREV.has(e.key) ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-labelledby={labelId} className={styles.group}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <div className={styles.options}>
        {options.map((o, i) => (
          <label
            key={o.value}
            className={cx('focus-ring', styles.option, o.value === value && styles.checked)}
          >
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}
