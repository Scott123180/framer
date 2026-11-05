import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet';
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('focus-ring', styles.button, variant !== 'secondary' && styles[variant], className)}
      {...rest}
    />
  );
});
