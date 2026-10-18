import { buildPlaybackPlan } from '@/core/music/playback';
import type { Score } from '@/core/music/score';
import type { KidSong } from './kidsData';

/**
 * Macht aus einer Songversion der Bibliothek (Import, Editor, Arrangement) ein Kinderlied für die
 * Mitspiel-Bahn: Stimme 1, pro Schlag der höchste Ton, Dauern in Vierteln.
 */
export function kidSongFromScore(id: string, title: string, score: Score, emoji = '🎶'): KidSong {
  const plan = buildPlaybackPlan(score, 0);
  const notes: KidSong['notes'] = [];
  for (const b of plan.beats) {
    if (b.voice !== 0 || b.isRest) continue;
    const struck = b.beat.notes.filter((n) => !n.tieFromPrevious);
    if (struck.length === 0) continue;
    const top = struck.reduce((a, n) => (n.midi > a.midi ? n : a), struck[0]!);
    notes.push({ string: top.string, fret: top.fret, beats: Math.max(0.125, (b.endTick - b.tick) / 960) });
  }
  return { id, title, emoji, tempo: Math.round(plan.barInstances[0]?.tempo ?? score.tempo), notes };
}
