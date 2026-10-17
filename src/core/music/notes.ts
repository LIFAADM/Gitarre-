/**
 * Grundlegende Musiktheorie: Tonhöhen, MIDI-Nummern, Frequenzen, Cent-Abweichungen
 * und Notennamen (deutsch mit „H“ / international mit „B“).
 */

export type NoteNaming = 'de' | 'intl';

export const A4_MIDI = 69;
export const DEFAULT_A4_HZ = 440;

const NAMES_INTL = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const NAMES_DE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'H'] as const;

/** Pitch-Klasse (0–11) einer MIDI-Nummer. */
export function pitchClass(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12;
}

/** Oktave nach wissenschaftlicher Zählung (C4 = mittleres C = MIDI 60). */
export function octaveOf(midi: number): number {
  return Math.floor(Math.round(midi) / 12) - 1;
}

/** Notenname ohne Oktave, z. B. „H“ (de) oder „B“ (intl). */
export function noteName(midi: number, naming: NoteNaming = 'de'): string {
  const names = naming === 'de' ? NAMES_DE : NAMES_INTL;
  return names[pitchClass(midi)] ?? 'C';
}

/** Notenname mit Oktave, z. B. „E2“, „H3“, „E4“. */
export function noteNameWithOctave(midi: number, naming: NoteNaming = 'de'): string {
  return `${noteName(midi, naming)}${octaveOf(midi)}`;
}

/** Frequenz in Hz für eine (auch gebrochene) MIDI-Nummer. */
export function midiToFrequency(midi: number, a4Hz: number = DEFAULT_A4_HZ): number {
  return a4Hz * Math.pow(2, (midi - A4_MIDI) / 12);
}

/** Gebrochene MIDI-Nummer für eine Frequenz (z. B. 69.0 für 440 Hz). */
export function frequencyToMidi(frequencyHz: number, a4Hz: number = DEFAULT_A4_HZ): number {
  if (!(frequencyHz > 0)) throw new RangeError('Frequenz muss größer als 0 sein');
  return A4_MIDI + 12 * Math.log2(frequencyHz / a4Hz);
}

/** Abweichung von `frequencyHz` gegenüber `targetHz` in Cent (positiv = zu hoch). */
export function centsBetween(frequencyHz: number, targetHz: number): number {
  if (!(frequencyHz > 0) || !(targetHz > 0)) throw new RangeError('Frequenzen müssen größer als 0 sein');
  return 1200 * Math.log2(frequencyHz / targetHz);
}

export interface NearestNote {
  midi: number;
  name: string;
  nameWithOctave: string;
  targetFrequency: number;
  cents: number;
}

/** Nächstgelegene temperierte Note zu einer Frequenz inkl. Cent-Abweichung. */
export function nearestNote(frequencyHz: number, naming: NoteNaming = 'de', a4Hz: number = DEFAULT_A4_HZ): NearestNote {
  const midiFloat = frequencyToMidi(frequencyHz, a4Hz);
  const midi = Math.round(midiFloat);
  const targetFrequency = midiToFrequency(midi, a4Hz);
  return {
    midi,
    name: noteName(midi, naming),
    nameWithOctave: noteNameWithOctave(midi, naming),
    targetFrequency,
    cents: centsBetween(frequencyHz, targetFrequency),
  };
}

/** Parst Notennamen wie „E2“, „H3“, „Bb3“, „F#4“, „B3“ (intl) in eine MIDI-Nummer. */
export function parseNoteName(name: string, naming: NoteNaming = 'de'): number {
  const m = /^([A-Ha-h])([#b]?)(-?\d)$/.exec(name.trim());
  if (!m) throw new Error(`Ungültiger Notenname: „${name}“`);
  const letter = (m[1] ?? 'C').toUpperCase();
  const accidental = m[2] ?? '';
  const octave = Number(m[3]);
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: naming === 'de' ? 10 : 11, H: 11 };
  const pc = base[letter];
  if (pc === undefined) throw new Error(`Ungültiger Notenname: „${name}“`);
  const acc = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return (octave + 1) * 12 + pc + acc;
}

/** Begrenzt einen Wert auf [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
