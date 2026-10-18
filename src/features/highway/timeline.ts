import type { PlaybackPlan } from '@/core/music/playback';
import type { HighwayNote } from '@/features/kids/highwayEngine';

export interface PlanTimeline {
  notes: HighwayNote[];
  /** Takt-Instanz je Note (für Auswertung pro Takt). */
  instanceOfNote: number[];
  /** Beat-Index im Plan je Note (für Tab-Hervorhebung). */
  beatRefOfNote: number[];
}

/**
 * Zeitleiste der Mitspiel-Bahn aus einem Abspielplan: Stimme 1, keine Pausen, keine Haltebögen.
 * Akkorde werden eine Note mit mehreren zulässigen Tönen; die Spur bestimmt der höchste Ton.
 */
export function timelineFromPlan(plan: PlaybackPlan, tempoFactor: number, leadInSec: number): PlanTimeline {
  const notes: HighwayNote[] = [];
  const instanceOfNote: number[] = [];
  const beatRefOfNote: number[] = [];
  const f = Math.max(0.1, tempoFactor);
  for (const b of plan.beats) {
    if (b.voice !== 0 || b.isRest) continue;
    const struck = b.beat.notes.filter((n) => !n.tieFromPrevious);
    if (struck.length === 0) continue;
    const top = struck.reduce((a, n) => (n.midi > a.midi ? n : a), struck[0]!);
    const index = notes.length;
    notes.push({
      index,
      time: leadInSec + b.sec / f,
      durationSec: Math.max(0.05, (b.endSec - b.sec) / f),
      midi: top.midi,
      midis: struck.map((n) => n.midi),
      string: top.string,
      fret: top.fret,
    });
    instanceOfNote.push(b.instanceIndex);
    beatRefOfNote.push(b.index);
  }
  return { notes, instanceOfNote, beatRefOfNote };
}

export type TimingJudgement = 'früh' | 'genau' | 'spät';

/** Urteil zum Zeitpunkt eines Treffers (Sekunden relativ zur Trefflinie). */
export function judgeTiming(offsetSec: number, windowSec = 0.08): TimingJudgement {
  if (offsetSec < -windowSec) return 'früh';
  if (offsetSec > windowSec) return 'spät';
  return 'genau';
}

export interface BarStat {
  instanceIndex: number;
  barIndex: number;
  total: number;
  hits: number;
}

/** Trefferquote je Takt, schwächste zuerst. */
export function barStats(plan: PlaybackPlan, instanceOfNote: readonly number[], results: readonly ('pending' | 'hit' | 'miss')[]): BarStat[] {
  const map = new Map<number, BarStat>();
  instanceOfNote.forEach((inst, i) => {
    const entry = map.get(inst) ?? { instanceIndex: inst, barIndex: plan.barInstances[inst]?.barIndex ?? inst, total: 0, hits: 0 };
    entry.total += 1;
    if (results[i] === 'hit') entry.hits += 1;
    map.set(inst, entry);
  });
  return [...map.values()].sort((a, b) => a.hits / a.total - b.hits / b.total || a.instanceIndex - b.instanceIndex);
}
