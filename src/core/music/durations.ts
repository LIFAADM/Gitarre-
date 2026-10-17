/**
 * Zeitraster: Alle Noten werden in Ticks gespeichert. 960 Ticks = eine Viertelnote
 * (identisch mit alphaTab, dadurch verlustfreier Import).
 */
export const TICKS_PER_QUARTER = 960;

export type DurationBase = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export interface Duration {
  base: DurationBase;
  dots?: 0 | 1 | 2;
  /** Triolen etc.: `tuplet: 3` bedeutet drei Noten in der Zeit von zwei. */
  tuplet?: 3 | 5 | 6 | 7;
}

export const DURATION_NAMES_DE: Record<DurationBase, string> = {
  1: 'Ganze',
  2: 'Halbe',
  4: 'Viertel',
  8: 'Achtel',
  16: 'Sechzehntel',
  32: 'Zweiunddreißigstel',
  64: 'Vierundsechzigstel',
};

/** Länge einer Notendauer in Ticks. */
export function durationToTicks(d: Duration): number {
  let ticks = (TICKS_PER_QUARTER * 4) / d.base;
  const dots = d.dots ?? 0;
  if (dots === 1) ticks *= 1.5;
  if (dots === 2) ticks *= 1.75;
  if (d.tuplet) {
    // n Noten in der Zeit von (n-1) bzw. für 5/7: in der Zeit von 4, 6: in der Zeit von 4
    const inTimeOf = d.tuplet === 3 ? 2 : d.tuplet === 5 || d.tuplet === 7 ? 4 : d.tuplet === 6 ? 4 : d.tuplet - 1;
    ticks = (ticks * inTimeOf) / d.tuplet;
  }
  return Math.round(ticks);
}

/** Ticks → Sekunden bei gegebenem Tempo (BPM bezogen auf Viertel). */
export function ticksToSeconds(ticks: number, bpm: number): number {
  if (!(bpm > 0)) throw new RangeError('Tempo muss größer als 0 sein');
  return (ticks / TICKS_PER_QUARTER) * (60 / bpm);
}

/** Sekunden → Ticks bei gegebenem Tempo. */
export function secondsToTicks(seconds: number, bpm: number): number {
  if (!(bpm > 0)) throw new RangeError('Tempo muss größer als 0 sein');
  return (seconds / (60 / bpm)) * TICKS_PER_QUARTER;
}

/** Länge eines Takts in Ticks (z. B. 3/4 → 2880, 6/8 → 2880, 4/4 → 3840). */
export function barTicks(numerator: number, denominator: number): number {
  return Math.round(numerator * ((TICKS_PER_QUARTER * 4) / denominator));
}

/** Ticks eines Grundschlags (Beat) laut Taktart (bei 6/8 wird die punktierte Viertel als Puls genutzt). */
export function beatTicks(numerator: number, denominator: number): number {
  if (denominator === 8 && numerator % 3 === 0 && numerator > 3) return (TICKS_PER_QUARTER * 4 * 3) / 8;
  return (TICKS_PER_QUARTER * 4) / denominator;
}

/**
 * Zerlegt eine Tick-Länge in eine darstellbare Dauer (bestmögliche Näherung).
 * Gibt null zurück, wenn keine Standarddauer passt.
 */
export function ticksToDuration(ticks: number): Duration | null {
  const bases: DurationBase[] = [1, 2, 4, 8, 16, 32, 64];
  for (const base of bases) {
    for (const dots of [0, 1, 2] as const) {
      if (durationToTicks({ base, dots }) === ticks) return { base, dots };
    }
  }
  for (const base of bases) {
    if (durationToTicks({ base, tuplet: 3 }) === ticks) return { base, tuplet: 3 };
  }
  return null;
}

/** Formatiert Sekunden als m:ss. */
export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
