import { durationToTicks, ticksToDuration, type Duration } from './durations';
import type { Bar, Beat, Note, Score, Track } from './score';

/**
 * Automatische Vereinfachung einer Gitarrenspur für Anfänger:
 * - monophon: pro Beat bleibt nur ein Ton (standardmäßig der höchste = Melodie),
 * - Spieltechniken (Bends, Slides, Vibrato …) werden entfernt, Bindungen bleiben erhalten,
 * - optional: Sechzehntel zu Achteln zusammenfassen (zwei 16tel → ein 8tel, erster Ton bleibt),
 * - nur Stimme 1.
 * Das Ergebnis ist ausdrücklich keine originalgetreue Transkription und wird so gekennzeichnet.
 */

export interface SimplifyOptions {
  /** 'highest' = Melodie (höchster Ton), 'lowest' = Bassstimme. */
  pick?: 'highest' | 'lowest';
  /** Sechzehntel zu Achteln zusammenfassen. */
  mergeSixteenths?: boolean;
  /** Techniken entfernen (Standard: ja). */
  stripTechniques?: boolean;
  /** Töne oberhalb dieses Bunds auf eine tiefere Lage verschieben, falls möglich (null = aus). */
  maxFret?: number | null;
  trackIndex?: number;
}

function pickNote(notes: Note[], pick: 'highest' | 'lowest'): Note | undefined {
  if (notes.length === 0) return undefined;
  return [...notes].sort((a, b) => (pick === 'highest' ? b.midi - a.midi : a.midi - b.midi))[0];
}

function cleanNote(note: Note, strip: boolean): Note {
  const n: Note = { string: note.string, fret: note.fret, midi: note.midi };
  if (note.tieToNext) n.tieToNext = true;
  if (note.tieFromPrevious) n.tieFromPrevious = true;
  if (note.finger !== undefined) n.finger = note.finger;
  if (!strip && note.techniques?.length) n.techniques = [...note.techniques];
  if (strip && note.techniques?.includes('dead')) n.techniques = ['dead'];
  return n;
}

function relocateNote(note: Note, tuning: number[], maxFret: number): Note {
  if (note.fret <= maxFret) return note;
  // tiefere Lage auf einer höheren Saite suchen (gleiche Tonhöhe)
  for (let s = 1; s <= tuning.length; s++) {
    const open = tuning[s - 1]!;
    const fret = note.midi - open;
    if (fret >= 0 && fret <= maxFret) return { ...note, string: s, fret };
  }
  return note;
}

function mergeSixteenthBeats(beats: Beat[]): Beat[] {
  const result: Beat[] = [];
  let i = 0;
  while (i < beats.length) {
    const a = beats[i]!;
    const b = beats[i + 1];
    const isSixteenth = (x: Beat): boolean => x.duration.base === 16 && !x.duration.dots && !x.duration.tuplet && x.durationTicks === 240;
    if (b && isSixteenth(a) && isSixteenth(b) && a.startTick % 480 === 0) {
      const duration: Duration = { base: 8 };
      const notes = a.isRest ? b.notes.map((n) => ({ ...n })) : a.notes.map((n) => ({ ...n }));
      for (const n of notes) {
        // Bindung an eine entfernte 16tel auflösen
        if (n.tieToNext && b.notes.some((x) => x.string === n.string && x.tieFromPrevious)) delete n.tieToNext;
      }
      result.push({ startTick: a.startTick, durationTicks: durationToTicks(duration), duration, notes, isRest: notes.length === 0 });
      i += 2;
      continue;
    }
    result.push(a);
    i++;
  }
  return result;
}

export function simplifyScore(score: Score, options: SimplifyOptions = {}): Score {
  const { pick = 'highest', mergeSixteenths = true, stripTechniques = true, maxFret = 5, trackIndex = 0 } = options;
  const source = score.tracks[trackIndex];
  if (!source) throw new Error(`Spur ${trackIndex + 1} existiert nicht.`);
  const bars: Bar[] = source.bars.map((bar) => {
    const voice = bar.voices[0] ?? [];
    let beats: Beat[] = voice.map((beat) => {
      const chosen = pickNote(beat.notes, pick);
      const notes = chosen ? [cleanNote(chosen, stripTechniques)] : [];
      const relocated = maxFret !== null ? notes.map((n) => relocateNote(n, source.tuning, maxFret)) : notes;
      const out: Beat = { startTick: beat.startTick, durationTicks: beat.durationTicks, duration: beat.duration, notes: relocated, isRest: relocated.length === 0 };
      if (beat.text) out.text = beat.text;
      return out;
    });
    if (mergeSixteenths) beats = mergeSixteenthBeats(beats);
    // Dauern für zusammengefasste Pausen/Noten konsistent halten
    for (const b of beats) {
      if (durationToTicks(b.duration) !== b.durationTicks) {
        const d = ticksToDuration(b.durationTicks);
        if (d) b.duration = d;
      }
    }
    return { index: bar.index, voices: [beats] };
  });
  // Bindungen bereinigen: tieFromPrevious nur, wenn die Vorgängernote auf derselben Saite noch existiert und tieToNext hat
  const flat = bars.flatMap((b) => b.voices[0] ?? []);
  for (let i = 0; i < flat.length; i++) {
    for (const n of flat[i]!.notes) {
      if (n.tieFromPrevious) {
        let prevHasTie = false;
        for (let j = i - 1; j >= 0; j--) {
          const prev = flat[j]!;
          if (prev.isRest) break;
          const pn = prev.notes.find((x) => x.string === n.string);
          if (pn) {
            prevHasTie = Boolean(pn.tieToNext) && pn.midi === n.midi;
            break;
          }
        }
        if (!prevHasTie) delete n.tieFromPrevious;
      }
      if (n.tieToNext) {
        const next = flat[i + 1];
        const target = next && !next.isRest ? next.notes.find((x) => x.string === n.string && x.midi === n.midi) : undefined;
        if (!target) delete n.tieToNext;
        else target.tieFromPrevious = true;
      }
    }
  }
  const track: Track = { id: `${source.id}-vereinfacht`, name: `${source.name} (vereinfacht)`, tuning: [...source.tuning], capo: source.capo, bars, program: source.program };
  const result: Score = {
    title: score.title,
    tempo: score.tempo,
    masterBars: score.masterBars.map((mb) => ({ ...mb })),
    tracks: [track],
    notes: 'Automatisch vereinfachte Übungsstimme (monophon, ohne Spieltechniken) – keine originalgetreue Transkription.',
  };
  if (score.artist) result.artist = score.artist;
  if (score.playbackBarOrder) result.playbackBarOrder = [...score.playbackBarOrder];
  return result;
}
