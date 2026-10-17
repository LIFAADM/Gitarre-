import { describe, expect, it } from 'vitest';
import { buildPlaybackPlan } from '@/core/music/playback';
import { parseTabNotation } from '@/core/music/tabNotation';
import { beatBaseWidth, layoutTab } from './tabLayout';

describe('Tab-Layout', () => {
  it('bricht Takte in Systeme um und streckt sie auf die Breite', () => {
    const score = parseTabNotation(Array.from({ length: 8 }, () => '0.1.8 1.2.8 3.2.8 0.1.8 0.1.4 r.4 |').join(' '), { tempo: 100 });
    const plan = buildPlaybackPlan(score);
    const layout = layoutTab(plan, { width: 360, zoom: 1 });
    expect(layout.systems.length).toBeGreaterThan(1);
    for (const system of layout.systems.slice(0, -1)) {
      const last = system.bars[system.bars.length - 1]!;
      expect(last.x + last.width).toBeCloseTo(360 - layout.metrics.margin, 0);
    }
    expect(layout.beatPositions.size).toBe(plan.beats.length);
    const x = plan.beats.map((b) => layout.beatPositions.get(b.index)!);
    expect(x[1]!.x).toBeGreaterThan(x[0]!.x);
  });

  it('gibt längeren Noten mehr Platz', () => {
    expect(beatBaseWidth(960, 1, false)).toBeGreaterThan(beatBaseWidth(480, 1, false));
    expect(beatBaseWidth(240, 2, false)).toBeGreaterThanOrEqual(26);
  });

  it('zeigt die Taktart nur am Anfang und bei Wechseln', () => {
    const score = parseTabNotation('0.1.4 0.1.4 0.1.4 0.1.4 | 0.1.4 0.1.4 0.1.4 0.1.4 | [ts 3/4] 0.1.4 0.1.4 0.1.4 |', { tempo: 100 });
    const layout = layoutTab(buildPlaybackPlan(score), { width: 800, zoom: 1 });
    const bars = layout.systems.flatMap((s) => s.bars);
    expect(bars.map((b) => b.showTimeSignature)).toEqual([true, false, true]);
  });
});
