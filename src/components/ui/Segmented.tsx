import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export function Segmented<T extends string | number>({ value, options, onChange, className, size = 'md', ariaLabel }: { value: T; options: SegmentedOption<T>[]; onChange: (v: T) => void; className?: string; size?: 'sm' | 'md'; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('flex w-full rounded-2xl bg-surface-2 p-1 border border-border', className)}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          role="radio"
          aria-checked={opt.value === value}
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-xl font-semibold transition disabled:opacity-40',
            size === 'sm' ? 'h-8 text-xs px-1' : 'h-10 text-sm px-2',
            opt.value === value ? 'bg-gold text-[#1b1507] shadow' : 'text-muted hover:text-text',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
