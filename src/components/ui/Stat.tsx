import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Stat({ label, value, hint, icon, className, tone = 'default' }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; className?: string; tone?: 'default' | 'gold' | 'ok' }) {
  return (
    <div className={cn('rounded-2xl border border-border/70 bg-surface p-3', className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        {icon && <span className={cn(tone === 'gold' ? 'text-gold' : tone === 'ok' ? 'text-ok' : 'text-muted')}>{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-1 text-2xl font-bold tabular-nums tracking-tight', tone === 'gold' && 'text-gold', tone === 'ok' && 'text-ok')}>{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-muted">{hint}</div>}
    </div>
  );
}
