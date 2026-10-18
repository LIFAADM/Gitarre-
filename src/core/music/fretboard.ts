import { STANDARD_TUNING, type Tuning } from './tuning';

/** Eine Griffposition: Saite 1 (hohe E) … 6 (tiefe E), Bund 0 = leere Saite. */
export interface FretPosition {
  string: number;
  fret: number;
}

export const MAX_FRET = 19;

/** MIDI-Wert einer Griffposition. */
export function midiForPosition(pos: FretPosition, tuning: Tuning = STANDARD_TUNING): number {
  const open = tuning.midi[pos.string - 1];
  if (open === undefined) throw new RangeError(`Ungültige Saite: ${pos.string}`);
  if (pos.fret < 0 || !Number.isInteger(pos.fret)) throw new RangeError(`Ungültiger Bund: ${pos.fret}`);
  return open + pos.fret;
}

/** Alle Griffpositionen, mit denen ein MIDI-Ton bis `maxFret` gespielt werden kann (tiefste Saite zuerst). */
export function positionsForMidi(midi: number, tuning: Tuning = STANDARD_TUNING, maxFret = MAX_FRET): FretPosition[] {
  const result: FretPosition[] = [];
  for (let s = tuning.midi.length; s >= 1; s--) {
    const open = tuning.midi[s - 1]!;
    const fret = midi - open;
    if (fret >= 0 && fret <= maxFret) result.push({ string: s, fret });
  }
  return result;
}

/**
 * Wählt für einen MIDI-Ton die anfängerfreundlichste Position:
 * möglichst nah an `preferredFret` (Standard: erste Lage, Bund 0–4), ansonsten möglichst tiefer Bund.
 */
export function preferredPositionForMidi(
  midi: number,
  options: { tuning?: Tuning; maxFret?: number; preferredMaxFret?: number; previous?: FretPosition | null } = {},
): FretPosition | null {
  const { tuning = STANDARD_TUNING, maxFret = MAX_FRET, preferredMaxFret = 4, previous = null } = options;
  const candidates = positionsForMidi(midi, tuning, maxFret);
  if (candidates.length === 0) return null;
  const score = (p: FretPosition): number => {
    let cost = p.fret;
    if (p.fret > preferredMaxFret) cost += 10;
    if (previous) cost += Math.abs(previous.fret - p.fret) * 0.5 + Math.abs(previous.string - p.string) * 0.25;
    return cost;
  };
  return [...candidates].sort((a, b) => score(a) - score(b))[0] ?? null;
}

/**
 * Empfohlener Finger der Greifhand (1 = Zeigefinger … 4 = kleiner Finger, 0 = leere Saite)
 * für die erste Lage: Bund 1 → Zeigefinger, Bund 2 → Mittelfinger, Bund 3 → Ringfinger, Bund 4 → kleiner Finger.
 * `basePosition` verschiebt das Schema in höhere Lagen (z. B. Lage 5: Bund 5 → Zeigefinger).
 */
export function suggestFinger(fret: number, basePosition = 1): 0 | 1 | 2 | 3 | 4 {
  if (fret <= 0) return 0;
  const rel = fret - basePosition + 1;
  if (rel <= 1) return 1;
  if (rel === 2) return 2;
  if (rel === 3) return 3;
  return 4;
}

export const FINGER_NAMES_DE: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'leere Saite',
  1: 'Zeigefinger',
  2: 'Mittelfinger',
  3: 'Ringfinger',
  4: 'kleiner Finger',
};

/** Standard-Positionen der Bundmarkierungen (Punkte) auf dem Griffbrett. */
export const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19];
