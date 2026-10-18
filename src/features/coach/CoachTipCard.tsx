import { Lightbulb, Sparkles, Volume2, X } from 'lucide-react';
import { Card, IconButton } from '@/components/ui';
import type { CoachTip } from '@/core/coach/coach';
import { useSpeech } from '@/hooks/useSpeech';
import { cn } from '@/lib/cn';

export interface CoachTipCardProps {
  tip: CoachTip | null;
  label?: string;
  onDismiss?: () => void;
  className?: string;
}

/** Einheitliche Darstellung eines Coach-Tipps mit optionalem Vorlesen und Schließen. */
export function CoachTipCard({ tip, label = 'Coach-Tipp', onDismiss, className }: CoachTipCardProps) {
  const speech = useSpeech();
  if (!tip) return null;
  const praise = tip.kind === 'praise';
  return (
    <Card tone={praise ? 'gold' : 'muted'} padding="sm" className={cn('animate-fade-in', className)} role="status" aria-live="polite" data-testid="coach-tip">
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', praise ? 'bg-gold/20 text-gold' : 'bg-gold/15 text-gold')}>{praise ? <Sparkles size={16} /> : <Lightbulb size={16} />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">{label}</p>
          <p className="text-sm leading-relaxed text-text/90">{tip.text}</p>
        </div>
        <div className="flex shrink-0 items-center">
          {speech.enabled && speech.scopeOn('tips') && (
            <IconButton size="sm" label="Tipp vorlesen" onClick={() => void speech.say('tips', tip.spoken ?? tip.text)}>
              <Volume2 size={16} />
            </IconButton>
          )}
          {onDismiss && (
            <IconButton size="sm" label="Tipp schließen" onClick={onDismiss}>
              <X size={16} />
            </IconButton>
          )}
        </div>
      </div>
    </Card>
  );
}
