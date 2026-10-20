import type { ClipKind, ExpectedNote } from '@/core/storage/types';

/**
 * Vorgaben für beschriftete Aufnahmen im Erkennungs-Labor. Die erwarteten Töne landen in der
 * JSON-Beschriftung und sind die Grundlage des Benchmarks (Phase 2).
 */
export interface ClipPreset {
  id: string;
  label: string;
  kind: ClipKind;
  expected: ExpectedNote[];
  /** Kurze Anweisung, was gespielt werden soll. */
  instruction: string;
}

const open = (string: number, midi: number, name: string): ClipPreset => ({
  id: `leersaite-${string}`,
  label: `Leersaite ${name} (${string})`,
  kind: 'einzelton',
  expected: [{ midi, string, fret: 0 }],
  instruction: `Saite ${string} (${name}) leer anschlagen, ausklingen lassen, dreimal wiederholen.`,
});

const chordPreset = (id: string, label: string, expected: ExpectedNote[]): ClipPreset => ({
  id,
  label: `Akkord ${label}`,
  kind: 'akkord',
  expected,
  instruction: `${label} greifen, alle Saiten langsam von unten nach oben anschlagen, dreimal wiederholen.`,
});

export const CLIP_PRESETS: ClipPreset[] = [
  open(6, 40, 'E'),
  open(5, 45, 'A'),
  open(4, 50, 'D'),
  open(3, 55, 'G'),
  open(2, 59, 'H'),
  open(1, 64, 'E'),
  {
    id: 'tonleiter-c-dur',
    label: 'Tonleiter C-Dur (1. Lage)',
    kind: 'folge',
    expected: [
      { midi: 48, string: 5, fret: 3 },
      { midi: 50, string: 4, fret: 0 },
      { midi: 52, string: 4, fret: 2 },
      { midi: 53, string: 4, fret: 3 },
      { midi: 55, string: 3, fret: 0 },
      { midi: 57, string: 3, fret: 2 },
      { midi: 59, string: 2, fret: 0 },
      { midi: 60, string: 2, fret: 1 },
    ],
    instruction: 'C-Dur aufwärts, ein Ton pro Sekunde, jeder Ton einzeln und deutlich.',
  },
  {
    id: 'wiederholter-ton',
    label: 'Wiederholter Ton A (5)',
    kind: 'folge',
    expected: Array.from({ length: 8 }, () => ({ midi: 45, string: 5, fret: 0 })),
    instruction: 'Leere A-Saite achtmal hintereinander im Sekundentakt anschlagen (prüft die Anschlagerkennung).',
  },
  chordPreset('akkord-am', 'a-Moll', [
    { midi: 45, string: 5, fret: 0 },
    { midi: 52, string: 4, fret: 2 },
    { midi: 57, string: 3, fret: 2 },
    { midi: 60, string: 2, fret: 1 },
    { midi: 64, string: 1, fret: 0 },
  ]),
  chordPreset('akkord-e', 'E-Dur', [
    { midi: 40, string: 6, fret: 0 },
    { midi: 47, string: 5, fret: 2 },
    { midi: 52, string: 4, fret: 2 },
    { midi: 56, string: 3, fret: 1 },
    { midi: 59, string: 2, fret: 0 },
    { midi: 64, string: 1, fret: 0 },
  ]),
  chordPreset('akkord-em', 'e-Moll', [
    { midi: 40, string: 6, fret: 0 },
    { midi: 47, string: 5, fret: 2 },
    { midi: 52, string: 4, fret: 2 },
    { midi: 55, string: 3, fret: 0 },
    { midi: 59, string: 2, fret: 0 },
    { midi: 64, string: 1, fret: 0 },
  ]),
  chordPreset('akkord-c', 'C-Dur', [
    { midi: 48, string: 5, fret: 3 },
    { midi: 52, string: 4, fret: 2 },
    { midi: 55, string: 3, fret: 0 },
    { midi: 60, string: 2, fret: 1 },
    { midi: 64, string: 1, fret: 0 },
  ]),
  chordPreset('akkord-g', 'G-Dur', [
    { midi: 43, string: 6, fret: 3 },
    { midi: 47, string: 5, fret: 2 },
    { midi: 50, string: 4, fret: 0 },
    { midi: 55, string: 3, fret: 0 },
    { midi: 59, string: 2, fret: 0 },
    { midi: 67, string: 1, fret: 3 },
  ]),
  chordPreset('akkord-d', 'D-Dur', [
    { midi: 50, string: 4, fret: 0 },
    { midi: 57, string: 3, fret: 2 },
    { midi: 62, string: 2, fret: 3 },
    { midi: 66, string: 1, fret: 2 },
  ]),
  { id: 'etuede', label: 'Etüde Takt 1–4', kind: 'frei', expected: [], instruction: 'Die ersten vier Takte eines Stücks im Übetempo; Stück und Takte in die Notiz schreiben.' },
  { id: 'stille', label: 'Stille (Raum)', kind: 'stille', expected: [], instruction: 'Zehn Sekunden nichts spielen – nur der Raum mit seinen Geräuschen.' },
  { id: 'frei', label: 'Freie Aufnahme', kind: 'frei', expected: [], instruction: 'Beliebig; bitte in die Notiz schreiben, was gespielt wurde.' },
];

/** Zieltöne (Hz) für die Live-Anzeige der Zieltonprüfung zu einer Vorgabe. */
export function presetTargetMidis(preset: ClipPreset): number[] {
  const unique = new Set(preset.expected.map((e) => e.midi));
  return [...unique].sort((a, b) => a - b);
}
