import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'default' | 'gold' | 'muted';
  children?: ReactNode;
}

const PADDING = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' } as const;
const TONE = {
  default: 'bg-surface border-border/70',
  gold: 'bg-gradient-to-br from-gold/20 via-surface to-surface border-gold/30',
  muted: 'bg-surface-2/60 border-border/50',
} as const;

export function Card({ padding = 'md', tone = 'default', className, children, ...rest }: CardProps) {
  return (
    <div className={cn('rounded-card border shadow-card', TONE[tone], PADDING[padding], className)} {...rest}>
      {children}
    </div>
  );
}

export interface PressableCardProps extends HTMLAttributes<HTMLButtonElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'default' | 'gold' | 'muted';
  children?: ReactNode;
  disabled?: boolean;
}

/** Karte, die als Schaltfläche fungiert (große Touch-Fläche). */
export function PressableCard({ padding = 'md', tone = 'default', className, children, ...rest }: PressableCardProps) {
  return (
    <button
      type="button"
      className={cn('block w-full text-left rounded-card border shadow-card transition active:scale-[0.985] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50', TONE[tone], PADDING[padding], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
