import { barTicks, beatTicks, ticksToSeconds } from './durations';
import type { Beat, MasterBar, Score, Technique } from './score';

/**
 * Wandelt einen Score in einen linearen Abspielplan um:
 * Wiederholungen werden entrollt, Ticks in Sekunden (bei 100 % Tempo) umgerechnet.
 * Der Player skaliert die Sekundenwerte anschließend mit dem Tempofaktor.
 */

export interface BarInstance {
  /** Laufende Nummer in der Abspielreihenfolge. */
  instanceIndex: number;
  barIndex: number;
  startTick: number;
  endTick: number;
  startSec: number;
  endSec: number;
  tempo: number;
  timeSignature: { numerator: number; denominator: number };
  beatTicks: number;
  section?: string;
}

export interface NoteEvent {
  kind: 'note';
  tick: number;
  sec: number;
  durationTicks: number;
  durationSec: number;
  midi: number;
  string: number;
  fret: number;
  velocity: number;
  techniques: Technique[];
  instanceIndex: number;
  barIndex: number;
  voice: number;
  beatIndex: number;
  /** Index in `plan.beats`. */
  beatRef: number;
}

export interface RestEvent {
  kind: 'rest';
  tick: number;
  sec: number;
  instanceIndex: number;
  beatRef: number;
}

export type PlaybackEvent = NoteEvent | RestEvent;

export interface BeatRef {
  index: number;
  instanceIndex: number;
  barIndex: number;
  voice: number;
  beatIndex: number;
  tick: number;
  sec: number;
  endTick: number;
  endSec: number;
  isRest: boolean;
  beat: Beat;
}

export interface MetronomeTick {
  tick: number;
  sec: number;
  accent: boolean;
  instanceIndex: number;
  beatInBar: number;
}

export interface PlaybackPlan {
  trackIndex: number;
  events: PlaybackEvent[];
  beats: BeatRef[];
  barInstances: BarInstance[];
  metronome: MetronomeTick[];
  totalTicks: number;
  totalSec: number;
}

/** Entrollt Wiederholungszeichen in eine Abspielreihenfolge von Takt-Indizes. */
export function unrollBarOrder(masterBars: MasterBar[]): number[] {
  const order: number[] = [];
  const guard = masterBars.length * 64 + 1000;
  let i = 0;
  let activeRepeatStart = 0;
  let iteration = 1;
  while (i < masterBars.length && order.length < guard) {
    const mb = masterBars[i]!;
    if (mb.repeatStart && i !== activeRepeatStart) {
      activeRepeatStart = i;
      iteration = 1;
    }
    if (mb.alternateEndings && !(mb.alternateEndings & (1 << (iteration - 1)))) {
      i++;
      continue;
    }
    order.push(i);
    const repeatCount = mb.repeatCount ?? 0;
    if (repeatCount > 1) {
      if (iteration < repeatCount) {
        iteration++;
        i = activeRepeatStart;
        continue;
      }
      iteration = 1;
      activeRepeatStart = i + 1;
    } else if (mb.alternateEndings) {
      // letzte Klammer ohne Wiederholungsende: Abschnitt abgeschlossen
      iteration = 1;
      activeRepeatStart = i + 1;
    }
    i++;
  }
  return order;
}

interface TieInfo {
  extraTicks: number;
  extraSec: number;
}

/** Erzeugt den Abspielplan für eine Spur. */
export function buildPlaybackPlan(score: Score, trackIndex = 0): PlaybackPlan {
  const track = score.tracks[trackIndex];
  if (!track) throw new Error(`Spur ${trackIndex + 1} existiert nicht.`);
  const order = score.playbackBarOrder && score.playbackBarOrder.length > 0 ? score.playbackBarOrder : unrollBarOrder(score.masterBars);

  const barInstances: BarInstance[] = [];
  let tick = 0;
  let sec = 0;
  let tempo = score.tempo;
  for (const barIndex of order) {
    const mb = score.masterBars[barIndex];
    if (!mb) continue;
    if (mb.tempo && mb.tempo > 0) tempo = mb.tempo;
    const ts = mb.timeSignature;
    const length = barTicks(ts.numerator, ts.denominator);
    const inst: BarInstance = {
      instanceIndex: barInstances.length,
      barIndex,
      startTick: tick,
      endTick: tick + length,
      startSec: sec,
      endSec: sec + ticksToSeconds(length, tempo),
      tempo,
      timeSignature: ts,
      beatTicks: beatTicks(ts.numerator, ts.denominator),
    };
    if (mb.section) inst.section = mb.section;
    barInstances.push(inst);
    tick = inst.endTick;
    sec = inst.endSec;
  }

  // Beats in Abspielreihenfolge sammeln
  const beats: BeatRef[] = [];
  for (const inst of barInstances) {
    const bar = track.bars[inst.barIndex];
    if (!bar) continue;
    bar.voices.forEach((voice, voiceIndex) => {
      voice.forEach((beat, beatIndex) => {
        const bTick = inst.startTick + beat.startTick;
        const bSec = inst.startSec + ticksToSeconds(beat.startTick, inst.tempo);
        beats.push({
          index: 0,
          instanceIndex: inst.instanceIndex,
          barIndex: inst.barIndex,
          voice: voiceIndex,
          beatIndex,
          tick: bTick,
          sec: bSec,
          endTick: bTick + beat.durationTicks,
          endSec: bSec + ticksToSeconds(beat.durationTicks, inst.tempo),
          isRest: beat.isRest,
          beat,
        });
      });
    });
  }
  beats.sort((a, b) => a.tick - b.tick || a.voice - b.voice);
  beats.forEach((b, i) => (b.index = i));

  // Bindungen: Dauer der Ursprungsnote um die gebundenen Folgenoten verlängern
  const tieExtra = new Map<string, TieInfo>();
  const keyOf = (beatRef: number, string: number): string => `${beatRef}:${string}`;
  for (let i = beats.length - 1; i >= 0; i--) {
    const ref = beats[i]!;
    for (const note of ref.beat.notes) {
      if (!note.tieToNext) continue;
      for (let j = i + 1; j < beats.length; j++) {
        const next = beats[j]!;
        if (next.voice !== ref.voice || next.isRest) continue;
        const target = next.beat.notes.find((n) => n.string === note.string);
        if (!target) break;
        const chained = tieExtra.get(keyOf(j, note.string));
        tieExtra.set(keyOf(i, note.string), {
          extraTicks: next.endTick - next.tick + (chained?.extraTicks ?? 0),
          extraSec: next.endSec - next.sec + (chained?.extraSec ?? 0),
        });
        break;
      }
    }
  }

  const events: PlaybackEvent[] = [];
  for (const ref of beats) {
    if (ref.isRest) {
      events.push({ kind: 'rest', tick: ref.tick, sec: ref.sec, instanceIndex: ref.instanceIndex, beatRef: ref.index });
      continue;
    }
    for (const note of ref.beat.notes) {
      if (note.tieFromPrevious) continue;
      const extra = tieExtra.get(keyOf(ref.index, note.string));
      events.push({
        kind: 'note',
        tick: ref.tick,
        sec: ref.sec,
        durationTicks: ref.endTick - ref.tick + (extra?.extraTicks ?? 0),
        durationSec: ref.endSec - ref.sec + (extra?.extraSec ?? 0),
        midi: note.midi,
        string: note.string,
        fret: note.fret,
        velocity: note.velocity ?? 0.85,
        techniques: note.techniques ?? [],
        instanceIndex: ref.instanceIndex,
        barIndex: ref.barIndex,
        voice: ref.voice,
        beatIndex: ref.beatIndex,
        beatRef: ref.index,
      });
    }
  }
  events.sort((a, b) => a.tick - b.tick);

  const metronome: MetronomeTick[] = [];
  for (const inst of barInstances) {
    const count = Math.max(1, Math.round((inst.endTick - inst.startTick) / inst.beatTicks));
    for (let b = 0; b < count; b++) {
      const t = inst.startTick + b * inst.beatTicks;
      metronome.push({
        tick: t,
        sec: inst.startSec + ticksToSeconds(b * inst.beatTicks, inst.tempo),
        accent: b === 0,
        instanceIndex: inst.instanceIndex,
        beatInBar: b,
      });
    }
  }

  const last = barInstances[barInstances.length - 1];
  return {
    trackIndex,
    events,
    beats,
    barInstances,
    metronome,
    totalTicks: last ? last.endTick : 0,
    totalSec: last ? last.endSec : 0,
  };
}

/** Findet den Beat, der zu einer Abspielposition (Sekunden bei 100 % Tempo) gehört. */
export function findBeatAtSec(plan: PlaybackPlan, sec: number, voice = 0): BeatRef | null {
  let result: BeatRef | null = null;
  // Beats sind nach Tick sortiert; lineare Suche über Stimme 0 reicht für UI-Zwecke (wenige tausend Beats).
  for (const b of plan.beats) {
    if (b.voice !== voice) continue;
    if (b.sec <= sec + 1e-6) result = b;
    else break;
  }
  return result;
}

/** Findet die Takt-Instanz zu einer Abspielposition. */
export function findBarInstanceAtSec(plan: PlaybackPlan, sec: number): BarInstance | null {
  let lo = 0;
  let hi = plan.barInstances.length - 1;
  let result: BarInstance | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const inst = plan.barInstances[mid]!;
    if (inst.startSec <= sec + 1e-6) {
      result = inst;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return result;
}

/** Sekundenposition (100 % Tempo) → Tick, unter Berücksichtigung von Tempowechseln. */
export function secToTick(plan: PlaybackPlan, sec: number): number {
  const inst = findBarInstanceAtSec(plan, sec);
  if (!inst) return 0;
  const rel = Math.max(0, sec - inst.startSec);
  return inst.startTick + (rel / Math.max(1e-9, inst.endSec - inst.startSec)) * (inst.endTick - inst.startTick);
}

/** Tick → Sekundenposition (100 % Tempo). */
export function tickToSec(plan: PlaybackPlan, tick: number): number {
  let lo = 0;
  let hi = plan.barInstances.length - 1;
  let inst: BarInstance | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const candidate = plan.barInstances[mid]!;
    if (candidate.startTick <= tick) {
      inst = candidate;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (!inst) return 0;
  const rel = Math.max(0, tick - inst.startTick);
  return inst.startSec + (rel / Math.max(1, inst.endTick - inst.startTick)) * (inst.endSec - inst.startSec);
}
