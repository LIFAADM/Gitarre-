import { cn } from '@/lib/cn';

export function ProgressBar({ value, max = 100, tone = 'gold', className, label }: { value: number; max?: number; tone?: 'gold' | 'ok' | 'warn' | 'bad'; className?: string; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const colors = { gold: 'bg-gold', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' } as const;
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-surface-3', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', colors[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
