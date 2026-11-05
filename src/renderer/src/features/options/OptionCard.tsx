import { forwardRef, useEffect, useRef, type KeyboardEvent } from 'react';
import { cx } from '../../ui/cx';
import styles from './OptionGallery.module.css';

type Props = {
  name: string;
  comboKey: string;
  caption: string;
  selected: boolean;
  aspectRatio: number;
  bitmap: ImageBitmap | undefined;
  tabIndex: number;
  onToggle(): void;
  onFocus(): void;
  onKeyDown(e: KeyboardEvent<HTMLInputElement>): void;
};

/** One design option: a visually hidden checkbox over its rendered preview. */
export const OptionCard = forwardRef<HTMLInputElement, Props>(function OptionCard(props, ref) {
  return (
    <label className={cx('focus-ring', styles.card, props.selected && styles.selected)}>
      <input
        ref={ref}
        type="checkbox"
        className={styles.checkbox}
        aria-label={props.name}
        data-combo-key={props.comboKey}
        checked={props.selected}
        tabIndex={props.tabIndex}
        onChange={props.onToggle}
        onFocus={props.onFocus}
        onKeyDown={props.onKeyDown}
      />
      <Preview name={props.name} bitmap={props.bitmap} aspectRatio={props.aspectRatio} />
      <span className={styles.badge} aria-hidden="true">
        {props.selected ? '✓' : ''}
      </span>
      <span className={styles.caption} aria-hidden="true">
        {props.caption}
      </span>
    </label>
  );
});

function Preview({
  name,
  bitmap,
  aspectRatio,
}: {
  name: string;
  bitmap: ImageBitmap | undefined;
  aspectRatio: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el || !bitmap) return;
    el.width = bitmap.width;
    el.height = bitmap.height;
    el.getContext('2d')?.drawImage(bitmap, 0, 0);
  }, [bitmap]);
  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={name}
      data-ready={bitmap ? 'true' : 'false'}
      className={cx(styles.preview, !bitmap && styles.loading)}
      style={{ aspectRatio }}
    />
  );
}
