import { useEffect, useRef } from 'react';
import type { HighwayNote, NoteResult } from './highwayEngine';
import { KIDS_STRINGS, kidString } from './kidsData';
import { cn } from '@/lib/cn';

export interface NoteHighwayProps {
  notes: readonly HighwayNote[];
  results: readonly NoteResult[];
  /** Liefert die aktuelle Liedzeit in Sekunden (wird pro Bild abgefragt). */
  getTime: () => number;
  currentIndex: number | null;
  pxPerSec?: number;
}

const LANE_H = 46;
const HIT_X = 84;

/**
 * Mitspiel-Bahn: sechs farbige Spuren (dicke rote Saite oben), Noten laufen von rechts auf die Trefflinie zu.
 * Nur die Verschiebung wird pro Bild gesetzt (transform), die Noten selbst werden nicht neu gerendert.
 */
export function NoteHighway({ notes, results, getTime, currentIndex, pxPerSec = 150 }: NoteHighwayProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const loop = (): void => {
      const t = getTime();
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${(-t * pxPerSec).toFixed(1)}px, 0, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getTime, pxPerSec]);

  const laneTop = (string: number): number => (6 - string) * LANE_H;

  return (
    <div className="relative -mx-4 overflow-hidden rounded-[1.5rem] border-2 border-white/10 bg-black/30" style={{ height: LANE_H * 6 + 8 }} aria-label="Mitspiel-Bahn">
      {/* Spuren */}
      {KIDS_STRINGS.map((s) => (
        <div key={s.number} className="absolute inset-x-0 flex items-center" style={{ top: laneTop(s.number) + 4, height: LANE_H - 4, background: `${s.color}22`, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="ml-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold text-white shadow" style={{ backgroundColor: s.color }} aria-hidden>
            {s.number}
          </span>
        </div>
      ))}
      {/* Trefflinie */}
      <div className="absolute inset-y-0 w-1.5 rounded-full bg-white/90 shadow-[0_0_18px_4px_rgba(255,255,255,0.35)]" style={{ left: HIT_X - 3 }} aria-hidden />
      {/* Notenspur */}
      <div ref={trackRef} className="absolute inset-y-0" style={{ left: HIT_X, willChange: 'transform' }}>
        {notes.map((n) => {
          const s = kidString(n.string);
          const r = results[n.index] ?? 'pending';
          const width = Math.max(44, n.durationSec * pxPerSec - 8);
          const isCurrent = currentIndex === n.index;
          return (
            <div
              key={n.index}
              className={cn('absolute flex items-center justify-start rounded-full pl-2 text-xl font-extrabold text-white shadow-lg transition-opacity', r === 'miss' && 'opacity-30 grayscale', isCurrent && r === 'pending' && 'ring-4 ring-white animate-pulse-soft')}
              style={{ left: n.time * pxPerSec - 22, top: laneTop(n.string) + 6, width, height: LANE_H - 8, backgroundColor: s.color, marginLeft: 0 }}
              data-testid={`highway-note-${n.index}`}
              data-result={r}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/25">{n.fret > 0 ? n.fret : ''}</span>
              {r === 'hit' && (
                <span className="ml-1 text-lg" aria-hidden>
                  ⭐
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
