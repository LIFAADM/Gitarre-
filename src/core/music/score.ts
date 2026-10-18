import { durationToTicks, type Duration } from './durations';

/**
 * Internes Datenmodell für Songs, Übungen und importierte Tabulaturen.
 *
 * Konventionen:
 * - Saite 1 = dünnste Saite (hohe E), Saite 6 = dickste Saite (tiefe E) – so wie Gitarristen zählen.
 * - Zeiten in Ticks (960 Ticks = Viertelnote), Tempo in BPM bezogen auf Viertel.
 * - Ein Beat ist eine rhythmische Einheit (eine Note, ein Akkord oder eine Pause).
 */

export type Technique =
  | 'hammer-on'
  | 'pull-off'
  | 'slide'
  | 'bend'
  | 'vibrato'
  | 'palm-mute'
  | 'dead'
  | 'harmonic'
  | 'let-ring'
  | 'staccato';

export type Finger = 0 | 1 | 2 | 3 | 4;

export interface Note {
  /** Saite 1 (hohe E) … 6 (tiefe E). */
  string: number;
  /** Bund (0 = leere Saite). */
  fret: number;
  /** Klingende Tonhöhe als MIDI-Nummer. */
  midi: number;
  /** Diese Note ist mit der nächsten Note auf derselben Saite übergebunden (wird nicht neu angeschlagen). */
  tieToNext?: boolean;
  /** Diese Note setzt eine Bindung fort (kein erneuter Anschlag). */
  tieFromPrevious?: boolean;
  /** Empfohlener Finger der Greifhand. */
  finger?: Finger;
  techniques?: Technique[];
  /** Anschlagstärke 0–1 (optional). */
  velocity?: number;
}

export interface Beat {
  /** Startzeit relativ zum Taktanfang in Ticks. */
  startTick: number;
  durationTicks: number;
  duration: Duration;
  notes: Note[];
  isRest: boolean;
  /** Textmarke (z. B. Silbe, Akkordname oder Hinweis), optional. */
  text?: string;
}

export interface Bar {
  index: number;
  /** Stimmen (Voice 0 = Hauptstimme). Die meisten Übungen haben genau eine Stimme. */
  voices: Beat[][];
}

export interface MasterBar {
  index: number;
  timeSignature: { numerator: number; denominator: number };
  /** Tempo ab diesem Takt (BPM), falls es sich ändert. */
  tempo?: number;
  repeatStart?: boolean;
  /** > 0: Wiederholungsende; Anzahl der Durchläufe insgesamt (2 = „x2“). */
  repeatCount?: number;
  /** Alternative Schlüsse als Bitmaske (Bit 0 = 1. Klammer, Bit 1 = 2. Klammer …). */
  alternateEndings?: number;
  /** Abschnittsname, z. B. „Intro“, „Strophe“, „Refrain“. */
  section?: string;
}

export interface Track {
  id: string;
  name: string;
  /** MIDI-Werte der leeren Saiten, Saite 1 zuerst. */
  tuning: number[];
  capo: number;
  bars: Bar[];
  /** General-MIDI-Programm (24 = Nylon-Gitarre), nur informativ. */
  program?: number;
  isPercussion?: boolean;
}

export interface Score {
  title: string;
  artist?: string;
  /** Grundtempo in BPM (Viertel). */
  tempo: number;
  masterBars: MasterBar[];
  tracks: Track[];
  /**
   * Abspielreihenfolge der Takte (Indizes), falls beim Import bereits entrollt (Wiederholungen, Sprünge).
   * Fehlt die Liste, wird sie aus den Wiederholungszeichen der MasterBars berechnet.
   */
  playbackBarOrder?: number[];
  /** Hinweise zur Herkunft/Bearbeitung (z. B. „vereinfacht“, „eigenes Arrangement“). */
  notes?: string;
}

/** Hilfsfunktion: Beat mit Dauer anlegen. */
export function makeBeat(startTick: number, duration: Duration, notes: Note[], text?: string): Beat {
  const beat: Beat = {
    startTick,
    durationTicks: durationToTicks(duration),
    duration,
    notes,
    isRest: notes.length === 0,
  };
  if (text) beat.text = text;
  return beat;
}

/** Zählt alle angeschlagenen Noten (ohne gebundene Fortsetzungen) in einem Track. */
export function countPlayableNotes(track: Track): number {
  let n = 0;
  for (const bar of track.bars) for (const voice of bar.voices) for (const beat of voice) for (const note of beat.notes) if (!note.tieFromPrevious) n++;
  return n;
}

/** Tonumfang eines Tracks (MIDI min/max) oder null, wenn keine Noten vorhanden sind. */
export function trackRange(track: Track): { min: number; max: number } | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const bar of track.bars) for (const voice of bar.voices) for (const beat of voice) for (const note of beat.notes) {
    min = Math.min(min, note.midi);
    max = Math.max(max, note.midi);
  }
  return Number.isFinite(min) ? { min, max } : null;
}

/** Höchster verwendeter Bund eines Tracks. */
export function trackMaxFret(track: Track): number {
  let max = 0;
  for (const bar of track.bars) for (const voice of bar.voices) for (const beat of voice) for (const note of beat.notes) max = Math.max(max, note.fret);
  return max;
}

/** Prüft die Konsistenz eines Scores (Taktlängen, Saitenbereiche) und liefert Fehlermeldungen (leer = ok). */
export function validateScore(score: Score): string[] {
  const errors: string[] = [];
  if (!(score.tempo > 0)) errors.push('Tempo muss größer als 0 sein.');
  if (score.tracks.length === 0) errors.push('Der Song enthält keine Gitarrenspur.');
  score.tracks.forEach((track, ti) => {
    if (track.bars.length !== score.masterBars.length) {
      errors.push(`Spur ${ti + 1} hat ${track.bars.length} Takte, erwartet werden ${score.masterBars.length}.`);
    }
    track.bars.forEach((bar, bi) => {
      const mb = score.masterBars[bi];
      if (!mb) return;
      const expected = Math.round(mb.timeSignature.numerator * ((960 * 4) / mb.timeSignature.denominator));
      bar.voices.forEach((voice, vi) => {
        let total = 0;
        for (const beat of voice) {
          total += beat.durationTicks;
          for (const note of beat.notes) {
            if (note.string < 1 || note.string > track.tuning.length) {
              errors.push(`Spur ${ti + 1}, Takt ${bi + 1}: ungültige Saite ${note.string}.`);
            }
            if (note.fret < 0 || note.fret > 24) errors.push(`Spur ${ti + 1}, Takt ${bi + 1}: ungültiger Bund ${note.fret}.`);
          }
        }
        if (vi === 0 && total !== expected) {
          errors.push(`Spur ${ti + 1}, Takt ${bi + 1}: Länge ${total} Ticks, erwartet ${expected} (Taktart ${mb.timeSignature.numerator}/${mb.timeSignature.denominator}).`);
        }
      });
    });
  });
  return errors;
}
