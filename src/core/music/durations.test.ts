import { describe, expect, it } from 'vitest';
import { barTicks, beatTicks, durationToTicks, formatSeconds, secondsToTicks, ticksToDuration, ticksToSeconds } from './durations';

describe('Notendauern und Timing', () => {
  it('rechnet Dauern in Ticks um', () => {
    expect(durationToTicks({ base: 4 })).toBe(960);
    expect(durationToTicks({ base: 8 })).toBe(480);
    expect(durationToTicks({ base: 1 })).toBe(3840);
    expect(durationToTicks({ base: 4, dots: 1 })).toBe(1440);
    expect(durationToTicks({ base: 8, dots: 1 })).toBe(720);
    expect(durationToTicks({ base: 8, tuplet: 3 })).toBe(320);
  });

  it('rechnet Ticks in Sekunden um', () => {
    expect(ticksToSeconds(960, 60)).toBeCloseTo(1, 9);
    expect(ticksToSeconds(960, 120)).toBeCloseTo(0.5, 9);
    expect(ticksToSeconds(3840, 90)).toBeCloseTo(4 * (60 / 90), 9);
    expect(secondsToTicks(1, 60)).toBeCloseTo(960, 9);
  });

  it('kennt Taktlängen', () => {
    expect(barTicks(4, 4)).toBe(3840);
    expect(barTicks(3, 4)).toBe(2880);
    expect(barTicks(6, 8)).toBe(2880);
    expect(beatTicks(6, 8)).toBe(1440);
    expect(beatTicks(3, 4)).toBe(960);
  });

  it('erkennt Dauern aus Ticks', () => {
    expect(ticksToDuration(960)).toEqual({ base: 4, dots: 0 });
    expect(ticksToDuration(1440)).toEqual({ base: 4, dots: 1 });
    expect(ticksToDuration(320)).toEqual({ base: 8, tuplet: 3 });
    expect(ticksToDuration(7)).toBeNull();
  });

  it('formatiert Sekunden', () => {
    expect(formatSeconds(65)).toBe('1:05');
    expect(formatSeconds(0)).toBe('0:00');
  });
});
