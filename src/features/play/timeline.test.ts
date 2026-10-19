import { describe, expect, it } from 'vitest';
import { buildPlaybackPlan } from '@/core/music/playback';
import { parseTabNotation } from '@/core/music/tabNotation';
import { barStats, judgeTiming, timelineFromPlan } from './timeline';

describe('timelineFromPlan', () => {
  const score = parseTabNotation('0.1.4 r.4 (0.3 2.4).4 0.1.4 | 3.2.2 0.1.2~ | 0.1.4 |', { tempo: 60, timeSignature: [4, 4], title: 'Test' });
  const plan = buildPlaybackPlan(score, 0);

  it('überspringt Pausen und Haltebögen, fasst Akkorde zusammen und skaliert mit dem Tempo', () => {
    const t = timelineFromPlan(plan, 1, 2);
    // 0.1.4, Akkord, 0.1.4, 3.2.2, 0.1.2 (gebundene Note im 3. Takt entfällt)
    expect(t.notes).toHaveLength(5);
    expect(t.notes[0]!.time).toBe(2);
    expect(t.notes[1]!.time).toBe(4); // nach Note (1 s) und Pause (1 s)
    expect(t.notes[1]!.midis).toHaveLength(2);
    expect(t.notes[1]!.string).toBe(3); // höchster Ton bestimmt die Spur
    expect(t.instanceOfNote).toEqual([0, 0, 0, 1, 1]);
    const slow = timelineFromPlan(plan, 0.5, 0);
    expect(slow.notes[1]!.time).toBe(4); // doppelt so langsam
    expect(slow.notes[0]!.durationSec).toBe(2);
  });

  it('bewertet den Zeitpunkt', () => {
    expect(judgeTiming(-0.2)).toBe('früh');
    expect(judgeTiming(0.03)).toBe('genau');
    expect(judgeTiming(0.3)).toBe('spät');
  });

  it('berechnet die Trefferquote je Takt, schwächste zuerst', () => {
    const t = timelineFromPlan(plan, 1, 0);
    const stats = barStats(plan, t.instanceOfNote, ['hit', 'hit', 'hit', 'miss', 'hit']);
    expect(stats[0]).toMatchObject({ barIndex: 1, total: 2, hits: 1 });
    expect(stats[1]).toMatchObject({ barIndex: 0, total: 3, hits: 3 });
  });
});
