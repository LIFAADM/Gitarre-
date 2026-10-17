import type { PlaybackPlan } from '@/core/music/playback';

/**
 * Manuelle Synchronisation zwischen einer Audioaufnahme und dem Abspielplan:
 * Zeitmarken ordnen Taktanfänge Sekunden der Aufnahme zu. Zwischen zwei Marken wird linear
 * interpoliert; mit nur einer Marke gilt das notierte Tempo (Faktor 1).
 */
export interface SyncMarker {
  instanceIndex: number;
  sec: number;
}

export interface SyncMap {
  audioToPlan(audioSec: number): number;
  planToAudio(planSec: number): number;
  /** Geschätzter Tempofaktor der Aufnahme gegenüber der Notation (1 = gleich schnell). */
  tempoFactor: number;
  points: Array<{ audio: number; plan: number }>;
}

type Point = { audio: number; plan: number };

function slopeBetween(a: Point, b: Point): number {
  const dPlan = b.plan - a.plan;
  const dAudio = b.audio - a.audio;
  return dPlan > 1e-6 && dAudio > 1e-6 ? dPlan / dAudio : 1;
}

export function buildSyncMap(plan: PlaybackPlan, markers: SyncMarker[]): SyncMap {
  const points: Point[] = markers
    .map((m) => ({ audio: m.sec, plan: plan.barInstances[m.instanceIndex]?.startSec }))
    .filter((p): p is Point => typeof p.plan === 'number')
    .sort((a, b) => a.plan - b.plan)
    .filter((p, i, arr) => i === arr.length - 1 || arr[i + 1]!.plan !== p.plan);

  const tempoFactor = points.length >= 2 ? slopeBetween(points[0]!, points[points.length - 1]!) : 1;

  const audioToPlan = (audioSec: number): number => {
    if (points.length === 0) return audioSec;
    if (points.length === 1) return points[0]!.plan + (audioSec - points[0]!.audio);
    if (audioSec <= points[0]!.audio) return points[0]!.plan + (audioSec - points[0]!.audio) * slopeBetween(points[0]!, points[1]!);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      if (audioSec <= b.audio) return a.plan + (audioSec - a.audio) * slopeBetween(a, b);
    }
    const a = points[points.length - 2]!;
    const b = points[points.length - 1]!;
    return b.plan + (audioSec - b.audio) * slopeBetween(a, b);
  };

  const planToAudio = (planSec: number): number => {
    if (points.length === 0) return planSec;
    if (points.length === 1) return points[0]!.audio + (planSec - points[0]!.plan);
    if (planSec <= points[0]!.plan) return points[0]!.audio + (planSec - points[0]!.plan) / slopeBetween(points[0]!, points[1]!);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      if (planSec <= b.plan) return a.audio + (planSec - a.plan) / slopeBetween(a, b);
    }
    const a = points[points.length - 2]!;
    const b = points[points.length - 1]!;
    return b.audio + (planSec - b.plan) / slopeBetween(a, b);
  };

  return { audioToPlan, planToAudio, tempoFactor, points };
}

export function formatClock(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, '0')}`;
}
