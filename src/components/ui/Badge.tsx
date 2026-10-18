import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'gold' | 'ok' | 'warn' | 'bad' | 'neutral' | 'info';

const TONES: Record<BadgeTone, string> = {
  gold: 'bg-gold/15 text-gold border-gold/30',
  ok: 'bg-ok/15 text-ok border-ok/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  bad: 'bg-bad/15 text-bad border-bad/30',
  neutral: 'bg-surface-3 text-muted border-border',
  info: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
};

export function Badge({ tone = 'neutral', children, className, icon }: { tone?: BadgeTone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', TONES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
