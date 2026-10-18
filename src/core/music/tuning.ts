import { midiToFrequency, noteName, noteNameWithOctave, type NoteNaming } from './notes';

/**
 * Stimmung einer Gitarre. Saite 1 ist die dünnste (hohe E), Saite 6 die dickste (tiefe E).
 * Die MIDI-Werte werden in Reihenfolge Saite 1 … 6 gespeichert.
 */
export interface Tuning {
  id: string;
  name: string;
  /** MIDI-Werte für Saite 1 (Index 0) bis Saite 6 (Index 5). */
  midi: readonly number[];
}

export const STANDARD_TUNING: Tuning = {
  id: 'standard',
  name: 'Standard (E–A–D–G–H–E)',
  midi: [64, 59, 55, 50, 45, 40],
};

export interface TuningString {
  /** Saitennummer 1 (hohe E) … 6 (tiefe E). */
  number: number;
  midi: number;
  frequency: number;
  name: string;
  nameWithOctave: string;
}

/** Liste der Saiten mit Zielfrequenzen (Saite 6 zuerst, so wie Anfänger sie zählen „von dick nach dünn“). */
export function tuningStrings(tuning: Tuning = STANDARD_TUNING, naming: NoteNaming = 'de', a4Hz = 440): TuningString[] {
  return tuning.midi
    .map((midi, i) => ({
      number: i + 1,
      midi,
      frequency: midiToFrequency(midi, a4Hz),
      name: noteName(midi, naming),
      nameWithOctave: noteNameWithOctave(midi, naming),
    }))
    .reverse();
}

/** MIDI-Wert einer leeren Saite (1–6). */
export function openStringMidi(stringNumber: number, tuning: Tuning = STANDARD_TUNING): number {
  const midi = tuning.midi[stringNumber - 1];
  if (midi === undefined) throw new RangeError(`Ungültige Saite: ${stringNumber}`);
  return midi;
}

/**
 * Erkennt automatisch, welche Saite zu einer gemessenen Frequenz am besten passt.
 * Nutzt den Abstand in Halbtönen (logarithmisch), damit tiefe und hohe Saiten gleich behandelt werden.
 */
export function detectClosestString(frequencyHz: number, tuning: Tuning = STANDARD_TUNING, a4Hz = 440): TuningString {
  const strings = tuningStrings(tuning, 'de', a4Hz);
  let best = strings[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const s of strings) {
    const distance = Math.abs(12 * Math.log2(frequencyHz / s.frequency));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = s;
    }
  }
  return best;
}
