import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  full?: boolean;
  loading?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-gold text-[#1b1507] hover:bg-gold-soft shadow-[0_8px_24px_-10px_rgba(217,169,78,0.9)]',
  secondary: 'bg-surface-2 text-text border border-border hover:bg-surface-3',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
  outline: 'border border-gold/60 text-gold hover:bg-gold/10',
  danger: 'bg-bad/15 text-bad border border-bad/40 hover:bg-bad/25',
  success: 'bg-ok text-[#06160e] hover:brightness-110',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-4 text-[15px] rounded-2xl gap-2',
  lg: 'h-13 px-5 text-base rounded-2xl gap-2',
  xl: 'h-16 px-6 text-lg rounded-3xl gap-3',
};

export function Button({ variant = 'secondary', size = 'md', icon, iconRight, full, loading, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-[transform,background-color,opacity] duration-150 select-none active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-gold',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'secondary' | 'primary';
  active?: boolean;
}

export function IconButton({ label, size = 'md', variant = 'ghost', active, className, children, type = 'button', ...rest }: IconButtonProps) {
  const sizes = { sm: 'h-9 w-9 rounded-xl', md: 'h-11 w-11 rounded-2xl', lg: 'h-14 w-14 rounded-2xl' } as const;
  const variants = {
    ghost: active ? 'bg-gold/15 text-gold' : 'text-text hover:bg-surface-2',
    secondary: active ? 'bg-gold text-[#1b1507]' : 'bg-surface-2 border border-border text-text hover:bg-surface-3',
    primary: 'bg-gold text-[#1b1507] hover:bg-gold-soft',
  } as const;
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn('inline-flex items-center justify-center transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-gold', sizes[size], variants[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
