import { Check } from 'lucide-react';
import { KIDS_STRINGS } from './kidsData';
import { cn } from '@/lib/cn';

export interface StringBarsProps {
  onTap?: (stringNumber: number) => void;
  /** Hervorgehobene Saite (pulsiert). */
  active?: number | null;
  /** Saiten mit Haken (z. B. schon gefunden). */
  done?: ReadonlySet<number>;
  disabled?: boolean;
  compact?: boolean;
}

/** Sechs dicke farbige Balken, von der dicken roten (oben) bis zur dünnen lila Saite (unten) – wie der Blick auf die eigene Gitarre. */
export function StringBars({ onTap, active = null, done, disabled, compact }: StringBarsProps) {
  return (
    <div className={cn('flex flex-col', compact ? 'gap-2' : 'gap-3')} role="group" aria-label="Saiten">
      {KIDS_STRINGS.map((s) => {
        const thickness = compact ? 36 + (s.number - 1) * 4 : 48 + (s.number - 1) * 6;
        const isActive = active === s.number;
        return (
          <button
            key={s.number}
            type="button"
            disabled={disabled}
            onClick={() => onTap?.(s.number)}
            aria-label={`${s.colorName} – Saite ${s.number}`}
            data-testid={`kids-string-${s.number}`}
            className={cn('relative flex w-full items-center rounded-full px-4 text-left shadow-lg transition active:scale-[0.98] disabled:opacity-60', isActive && 'ring-4 ring-white animate-pulse-soft')}
            style={{ height: thickness, backgroundColor: s.color }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-lg font-extrabold text-white">{s.number}</span>
            <span className="ml-3 flex-1 text-lg font-extrabold text-white drop-shadow">{s.colorName}</span>
            {done?.has(s.number) && (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ok">
                <Check size={22} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
