import { describe, expect, it } from 'vitest';
import { buildPlaybackPlan } from '@/core/music/playback';
import { parseTabNotation } from '@/core/music/tabNotation';
import { buildSyncMap, formatClock } from './syncMap';

// 8 Takte zu je 4 Sekunden
const plan = buildPlaybackPlan(parseTabNotation(Array.from({ length: 8 }, () => '0.1.1 |').join(' '), { tempo: 60 }));

describe('Audio-Synchronisation', () => {
  it('ohne Marken laufen Aufnahme und Notation gleich', () => {
    const map = buildSyncMap(plan, []);
    expect(map.audioToPlan(5)).toBe(5);
    expect(map.planToAudio(7)).toBe(7);
  });

  it('eine Marke verschiebt den Start', () => {
    const map = buildSyncMap(plan, [{ instanceIndex: 0, sec: 3.5 }]);
    expect(map.audioToPlan(3.5)).toBeCloseTo(0, 9);
    expect(map.audioToPlan(7.5)).toBeCloseTo(4, 9);
    expect(map.planToAudio(8)).toBeCloseTo(11.5, 9);
    expect(map.tempoFactor).toBe(1);
  });

  it('zwei Marken ergeben das Tempo der Aufnahme mit Interpolation und Extrapolation', () => {
    // Takt 1 bei 2 s, Takt 5 (Plan 16 s) bei 22 s: die Aufnahme ist langsamer (20 s fuer 16 s Notation)
    const map = buildSyncMap(plan, [{ instanceIndex: 4, sec: 22 }, { instanceIndex: 0, sec: 2 }]);
    expect(map.tempoFactor).toBeCloseTo(0.8, 9);
    expect(map.audioToPlan(12)).toBeCloseTo(8, 9);
    expect(map.planToAudio(8)).toBeCloseTo(12, 9);
    expect(map.audioToPlan(32)).toBeCloseTo(24, 9);
    expect(map.audioToPlan(0)).toBeCloseTo(-1.6, 9);
  });

  it('formatiert Zeiten', () => {
    expect(formatClock(65.25)).toBe('1:05.3');
    expect(formatClock(0)).toBe('0:00.0');
  });
});
