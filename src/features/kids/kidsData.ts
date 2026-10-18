/**
 * Kinder-Modus: Daten und reine Logik (Saitenfarben, Kinderlieder in erster Lage, Spielrunden,
 * Rhythmus-Bewertung, Elternfrage). Keine React-Abhängigkeit, vollständig testbar.
 */

import { openStringMidi } from '@/core/music/tuning';

export interface KidString {
  /** Saitennummer 1 (dünn) … 6 (dick). */
  number: number;
  color: string;
  colorName: string;
  /** Adjektivform für Ansagen: „die rote Saite“. */
  word: string;
  noteName: string;
}

/** Regenbogen von dick nach dünn: Rot = tiefe E-Saite, Lila = hohe E-Saite. */
export const KIDS_STRINGS: readonly KidString[] = [
  { number: 6, color: '#e5484d', colorName: 'Rot', word: 'rote', noteName: 'E' },
  { number: 5, color: '#f08c2e', colorName: 'Orange', word: 'orange', noteName: 'A' },
  { number: 4, color: '#f2c94c', colorName: 'Gelb', word: 'gelbe', noteName: 'D' },
  { number: 3, color: '#3fbf7f', colorName: 'Grün', word: 'grüne', noteName: 'G' },
  { number: 2, color: '#3b8be8', colorName: 'Blau', word: 'blaue', noteName: 'H' },
  { number: 1, color: '#a66ce0', colorName: 'Lila', word: 'lila', noteName: 'E' },
];

export function kidString(number: number): KidString {
  const s = KIDS_STRINGS.find((k) => k.number === number);
  if (!s) throw new RangeError(`Ungültige Saite: ${number}`);
  return s;
}

export function midiOf(string: number, fret: number): number {
  return openStringMidi(string) + fret;
}

/** Ansage einer Griffposition für Kinder: „Gelbe Saite“ oder „Gelbe Saite, zweiter Bund“. */
export function positionPhrase(string: number, fret: number): string {
  const s = kidString(string);
  const name = `${s.colorName.charAt(0)}${s.word.slice(1)} Saite`;
  if (fret === 0) return `${name}.`;
  const ordinals = ['', 'erster', 'zweiter', 'dritter', 'vierter', 'fünfter'];
  return `${name}, ${ordinals[fret] ?? `${fret}.`} Bund.`;
}

export interface KidNote {
  string: number;
  fret: number;
  /** Dauer in Vierteln. */
  beats: number;
}

export interface KidSong {
  id: string;
  title: string;
  emoji: string;
  /** Viertel pro Minute für „Vorspielen“ (bewusst langsam). */
  tempo: number;
  notes: KidNote[];
}

const n = (string: number, fret: number, beats = 1): KidNote => ({ string, fret, beats });
// Erste Lage in C-Dur: C = Saite 5 Bund 3, D = Saite 4 leer, E = Saite 4 Bund 2, F = Saite 4 Bund 3,
// G = Saite 3 leer, A = Saite 3 Bund 2, tiefes G = Saite 6 Bund 3.
const C = (b = 1) => n(5, 3, b);
const D = (b = 1) => n(4, 0, b);
const E = (b = 1) => n(4, 2, b);
const F = (b = 1) => n(4, 3, b);
const G = (b = 1) => n(3, 0, b);
const A = (b = 1) => n(3, 2, b);
const Glow = (b = 1) => n(6, 3, b);

export const KIDS_SONGS: readonly KidSong[] = [
  {
    id: 'regenbogen',
    title: 'Regenbogen rauf und runter',
    emoji: '🌈',
    tempo: 66,
    notes: [n(6, 0), n(5, 0), n(4, 0), n(3, 0), n(2, 0), n(1, 0, 2), n(1, 0), n(2, 0), n(3, 0), n(4, 0), n(5, 0), n(6, 0, 2)],
  },
  {
    id: 'alle-meine-entchen',
    title: 'Alle meine Entchen',
    emoji: '🦆',
    tempo: 76,
    notes: [
      C(0.5), D(0.5), E(0.5), F(0.5), G(1), G(1),
      A(0.5), A(0.5), A(0.5), A(0.5), G(2),
      A(0.5), A(0.5), A(0.5), A(0.5), G(2),
      F(0.5), F(0.5), F(0.5), F(0.5), E(1), E(1),
      G(0.5), G(0.5), G(0.5), G(0.5), C(2),
    ],
  },
  {
    id: 'haenschen-klein',
    title: 'Hänschen klein',
    emoji: '🎒',
    tempo: 76,
    notes: [
      G(), E(), E(2), F(), D(), D(2), C(), D(), E(), F(), G(), G(), G(2),
      G(), E(), E(2), F(), D(), D(2), C(), E(), G(), G(), C(4),
    ],
  },
  {
    id: 'bruder-jakob',
    title: 'Bruder Jakob',
    emoji: '🔔',
    tempo: 80,
    notes: [
      C(), D(), E(), C(), C(), D(), E(), C(),
      E(), F(), G(2), E(), F(), G(2),
      G(0.5), A(0.5), G(0.5), F(0.5), E(), C(), G(0.5), A(0.5), G(0.5), F(0.5), E(), C(),
      C(), Glow(), C(2), C(), Glow(), C(2),
    ],
  },
  {
    id: 'weihnachtsmann',
    title: 'Morgen kommt der Weihnachtsmann',
    emoji: '🎅',
    tempo: 80,
    notes: [
      C(), C(), G(), G(), A(), A(), G(2),
      F(), F(), E(), E(), D(), D(), C(2),
      G(), G(), F(), F(), E(), E(), D(2),
      G(), G(), F(), F(), E(), E(), D(2),
      C(), C(), G(), G(), A(), A(), G(2),
      F(), F(), E(), E(), D(), D(), C(2),
    ],
  },
  {
    id: 'freude',
    title: 'Freude, schöner Götterfunken',
    emoji: '🎼',
    tempo: 84,
    notes: [
      E(), E(), F(), G(), G(), F(), E(), D(), C(), C(), D(), E(), E(1.5), D(0.5), D(2),
      E(), E(), F(), G(), G(), F(), E(), D(), C(), C(), D(), E(), D(1.5), C(0.5), C(2),
    ],
  },
];

export function kidSong(id: string): KidSong | undefined {
  return KIDS_SONGS.find((s) => s.id === id);
}

/* ------------------------------ Zufall (reproduzierbar) ------------------------------ */

/** Kleiner deterministischer Zufallsgenerator (für Tests reproduzierbar). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Runde im Spiel „Welche Saite?“: Runden 1–3 eine Saite, danach zwei verschiedene nacheinander. */
export function makeListenRound(round: number, rng: () => number, previous: readonly number[] = []): number[] {
  const count = round <= 3 ? 1 : 2;
  const pick = (exclude: number[]): number => {
    const candidates = KIDS_STRINGS.map((s) => s.number).filter((x) => !exclude.includes(x));
    return candidates[Math.floor(rng() * candidates.length)]!;
  };
  const result: number[] = [];
  for (let i = 0; i < count; i++) result.push(pick(i === 0 ? [previous[0] ?? -1] : [result[i - 1]!]));
  return result;
}

/* ------------------------------------ Rhythmus ------------------------------------ */

export interface RhythmResult {
  hits: number;
  total: number;
  /** Mittlerer Betrag der Abweichung getroffener Schläge in Sekunden. */
  meanOffsetSec: number;
}

/** Zählt, wie viele Schläge einen Anschlag innerhalb der Toleranz haben (jeder Anschlag zählt nur einmal). */
export function rhythmScore(beatTimes: readonly number[], hitTimes: readonly number[], toleranceSec = 0.18): RhythmResult {
  const used = new Set<number>();
  let hits = 0;
  let offsetSum = 0;
  for (const beat of beatTimes) {
    let bestIdx = -1;
    let bestDiff = Number.POSITIVE_INFINITY;
    hitTimes.forEach((h, i) => {
      if (used.has(i)) return;
      const d = Math.abs(h - beat);
      if (d < bestDiff) {
        bestDiff = d;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0 && bestDiff <= toleranceSec) {
      used.add(bestIdx);
      hits += 1;
      offsetSum += bestDiff;
    }
  }
  return { hits, total: beatTimes.length, meanOffsetSec: hits ? offsetSum / hits : 0 };
}

/** Sterne (0–3) aus Trefferanteil. */
export function starsFor(correct: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0 || correct <= 0) return 0;
  const pct = correct / total;
  if (pct >= 0.9) return 3;
  if (pct >= 0.6) return 2;
  return 1;
}

/* ------------------------------------ Elternsperre ------------------------------------ */

export interface ParentQuestion {
  a: number;
  b: number;
  answer: number;
  text: string;
}

/** Einfache Rechenaufgabe, die Vierjährige noch nicht lösen: Summe zweier Zahlen zwischen 4 und 9. */
export function parentQuestion(rng: () => number = Math.random): ParentQuestion {
  const a = 4 + Math.floor(rng() * 6);
  const b = 4 + Math.floor(rng() * 6);
  return { a, b, answer: a + b, text: `Wie viel ist ${a} + ${b}?` };
}
