/**
 * Reine Logik des Spiel-mit-Modus (testbar): Vergleich erkannter Tonhöhe mit erwarteten Noten.
 */

export type Verdict =
  | { kind: 'match'; midi: number; cents: number }
  | { kind: 'near'; direction: 'tief' | 'hoch'; midi: number; cents: number; expected: number }
  | { kind: 'octave'; midi: number; expected: number }
  | { kind: 'wrong'; midi: number; expected: number };

export function evaluatePitch(expectedMidis: number[], detected: { midi: number; cents: number }, toleranceCents: number): Verdict {
  if (expectedMidis.length === 0) return { kind: 'wrong', midi: detected.midi, expected: -1 };
  const detectedCents = detected.midi * 100 + detected.cents;
  let best = expectedMidis[0]!;
  let bestDiff = Infinity;
  for (const e of expectedMidis) {
    const diff = detectedCents - e * 100;
    if (Math.abs(diff) < Math.abs(bestDiff)) {
      bestDiff = diff;
      best = e;
    }
  }
  if (Math.abs(bestDiff) <= toleranceCents) return { kind: 'match', midi: best, cents: bestDiff };
  const octaveDiff = Math.abs(Math.abs(bestDiff) - 1200);
  if (octaveDiff <= toleranceCents + 20) return { kind: 'octave', midi: detected.midi, expected: best };
  if (Math.abs(bestDiff) <= 150) return { kind: 'near', direction: bestDiff < 0 ? 'tief' : 'hoch', midi: detected.midi, cents: bestDiff, expected: best };
  return { kind: 'wrong', midi: detected.midi, expected: best };
}

export interface ListenStep {
  beatRef: number;
  midis: number[];
  positions: Array<{ string: number; fret: number; midi: number; finger?: number }>;
}

export type StepResult = 'correct' | 'skipped' | 'pending';

export interface ListenSummary {
  total: number;
  correct: number;
  skipped: number;
  accuracy: number;
}

export function summarizeResults(results: StepResult[]): ListenSummary {
  const total = results.length;
  const correct = results.filter((r) => r === 'correct').length;
  const skipped = results.filter((r) => r === 'skipped').length;
  return { total, correct, skipped, accuracy: total > 0 ? (correct / total) * 100 : 0 };
}

/**
 * Erkennung eines neuen Anschlags (Onset) über den Pegelverlauf:
 * Nach einem Treffer wird erst wieder gewertet, wenn der Pegel deutlich gefallen ist oder sprunghaft steigt.
 */
export class OnsetGate {
  private armed = true;
  private referenceLevel = 0;
  private lastLevel = 0;
  private silentSince: number | null = null;

  constructor(private readonly options: { dropRatio?: number; jumpRatio?: number; silenceMs?: number } = {}) {}

  get isArmed(): boolean {
    return this.armed;
  }

  /** Nach einem Treffer aufrufen. */
  disarm(level: number): void {
    this.armed = false;
    this.referenceLevel = Math.max(level, 1e-6);
    this.lastLevel = level;
    this.silentSince = null;
  }

  reset(): void {
    this.armed = true;
    this.silentSince = null;
  }

  /** Mit jedem Pegelwert aufrufen; liefert true, sobald wieder gewertet werden darf. */
  update(level: number, nowMs: number, pitchPresent: boolean): boolean {
    if (this.armed) return true;
    const drop = this.options.dropRatio ?? 0.45;
    const jump = this.options.jumpRatio ?? 1.8;
    const silenceMs = this.options.silenceMs ?? 150;
    if (level < this.referenceLevel * drop || !pitchPresent) {
      if (this.silentSince === null) this.silentSince = nowMs;
      if (nowMs - this.silentSince >= silenceMs || level < this.referenceLevel * 0.2) this.armed = true;
    } else {
      this.silentSince = null;
      if (level > this.lastLevel * jump && level > this.referenceLevel * 0.6) this.armed = true;
    }
    this.lastLevel = level;
    return this.armed;
  }
}
