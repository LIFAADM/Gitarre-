import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:opacity-40"
    >
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <span className={cn('relative h-8 w-14 shrink-0 rounded-full transition-colors', checked ? 'bg-gold' : 'bg-surface-3')}>
        <span className={cn('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-7' : 'translate-x-1')} />
      </span>
    </button>
  );
}
