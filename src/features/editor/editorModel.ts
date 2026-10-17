import { barTicks, durationToTicks, type Duration, type DurationBase } from '@/core/music/durations';
import { midiForPosition, suggestFinger } from '@/core/music/fretboard';
import type { Bar, Beat, MasterBar, Note, Score, Track } from '@/core/music/score';
import { STANDARD_TUNING } from '@/core/music/tuning';

/** Bearbeitbares Modell des Tab-Editors (eine Stimme, Standardstimmung). */
export interface EditorBeat {
  duration: Duration;
  notes: Array<{ string: number; fret: number }>;
}

export interface EditorDoc {
  title: string;
  tempo: number;
  timeSignature: [number, number];
  beats: EditorBeat[];
}

export const DURATION_OPTIONS: Array<{ base: DurationBase; label: string }> = [
  { base: 1, label: 'Ganze' },
  { base: 2, label: 'Halbe' },
  { base: 4, label: 'Viertel' },
  { base: 8, label: 'Achtel' },
  { base: 16, label: '16tel' },
];

export function emptyDoc(): EditorDoc {
  return { title: 'Meine Melodie', tempo: 90, timeSignature: [4, 4], beats: [] };
}

/** Baut aus der Beat-Liste einen Score; Takte werden automatisch gefüllt (Pausen am Ende). */
export function docToScore(doc: EditorDoc): Score {
  const barLength = barTicks(doc.timeSignature[0], doc.timeSignature[1]);
  const bars: Bar[] = [];
  const masterBars: MasterBar[] = [];
  let current: Beat[] = [];
  let tick = 0;
  const flush = (): void => {
    if (tick < barLength) {
      let remaining = barLength - tick;
      let t = tick;
      for (const size of [3840, 2880, 1920, 1440, 960, 720, 480, 240, 120]) {
        while (remaining >= size) {
          const d = ticksToSimpleDuration(size);
          current.push({ startTick: t, durationTicks: size, duration: d, notes: [], isRest: true });
          t += size;
          remaining -= size;
        }
      }
    }
    const index = bars.length;
    bars.push({ index, voices: [current] });
    masterBars.push({ index, timeSignature: { numerator: doc.timeSignature[0], denominator: doc.timeSignature[1] } });
    current = [];
    tick = 0;
  };
  for (const eb of doc.beats) {
    let ticks = durationToTicks(eb.duration);
    if (tick + ticks > barLength) {
      // Note passt nicht mehr in den Takt: Takt mit Pausen auffüllen und neu beginnen
      flush();
    }
    if (ticks > barLength) ticks = barLength;
    const notes: Note[] = eb.notes.map((n) => ({ string: n.string, fret: n.fret, midi: midiForPosition({ string: n.string, fret: n.fret }), finger: suggestFinger(n.fret) }));
    current.push({ startTick: tick, durationTicks: ticks, duration: eb.duration, notes, isRest: notes.length === 0 });
    tick += ticks;
    if (tick >= barLength) flush();
  }
  if (current.length > 0 || bars.length === 0) flush();
  const track: Track = { id: 'track-1', name: 'Gitarre', tuning: [...STANDARD_TUNING.midi], capo: 0, bars, program: 24 };
  return { title: doc.title, artist: 'Eigene Melodie', tempo: doc.tempo, masterBars, tracks: [track], notes: 'Im GuitarCoach-Tab-Editor erstellt.' };
}

function ticksToSimpleDuration(ticks: number): Duration {
  const map: Record<number, Duration> = { 3840: { base: 1 }, 2880: { base: 2, dots: 1 }, 1920: { base: 2 }, 1440: { base: 4, dots: 1 }, 960: { base: 4 }, 720: { base: 8, dots: 1 }, 480: { base: 8 }, 240: { base: 16 }, 120: { base: 32 } };
  return map[ticks] ?? { base: 16 };
}

/** Rekonstruiert ein Editor-Dokument aus einem Score (Stimme 1 der ersten Spur). */
export function scoreToDoc(score: Score): EditorDoc {
  const track = score.tracks[0];
  const beats: EditorBeat[] = [];
  if (track) {
    for (const bar of track.bars) for (const beat of bar.voices[0] ?? []) beats.push({ duration: beat.duration, notes: beat.notes.map((n) => ({ string: n.string, fret: n.fret })) });
  }
  // Auffüll-Pausen am Taktende entfernen? Nein – sie sind Teil der Melodie; der Nutzer kann sie löschen.
  const ts = score.masterBars[0]?.timeSignature;
  return { title: score.title, tempo: score.tempo, timeSignature: ts ? [ts.numerator, ts.denominator] : [4, 4], beats };
}

/** Index des Beats im Score (Stimme 1, fortlaufend) → Index in doc.beats (identisch, da 1:1 inkl. Auffüllpausen nicht im Doc). */
export function beatIndexToDocIndex(doc: EditorDoc, score: Score, planBeatOrdinal: number): number {
  // Score-Beats enthalten zusätzliche Auffüll-Pausen; wir zählen nur „echte“ Doc-Beats.
  let docIdx = 0;
  let ordinal = 0;
  const barLength = barTicks(doc.timeSignature[0], doc.timeSignature[1]);
  let tick = 0;
  for (const eb of doc.beats) {
    const ticks = Math.min(barLength, durationToTicks(eb.duration));
    if (tick + ticks > barLength) {
      // Auffüllpausen überspringen
      let remaining = barLength - tick;
      for (const size of [3840, 2880, 1920, 1440, 960, 720, 480, 240, 120]) while (remaining >= size) {
        ordinal++;
        remaining -= size;
      }
      tick = 0;
    }
    if (ordinal === planBeatOrdinal) return docIdx;
    ordinal++;
    docIdx++;
    tick += ticks;
    if (tick >= barLength) tick = 0;
  }
  void score;
  return -1;
}
