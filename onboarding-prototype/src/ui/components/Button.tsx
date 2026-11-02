// Shared UI component: button.
import type { ButtonHTMLAttributes } from 'react';
import { focusRing } from './styles';

type Variant = 'primary' | 'secondary' | 'danger' | 'link';
type Size = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: 'border border-brand bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-ink bg-white text-ink hover:bg-neutral-bg',
  danger: 'border border-overdue-bar bg-white text-red-text hover:bg-overdue-bg',
  link: 'text-brand underline underline-offset-2 hover:text-brand-dark',
};

// Buttons are at least 44px tall on phone widths.
const sizeClasses: Record<Size, string> = {
  md: 'min-h-11 sm:min-h-10 px-4 text-base',
  sm: 'min-h-11 sm:min-h-8 px-3 text-sm',
};

/** The standard button. Defaults to type="button" so it never submits a form by accident. */
export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  const sizing = variant === 'link' ? 'min-h-11 sm:min-h-0 text-left' : sizeClasses[size];
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${sizing} ${focusRing} ${className}`}
      {...rest}
    />
  );
}
