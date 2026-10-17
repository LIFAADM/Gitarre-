import { describe, expect, it } from 'vitest';
import { detectClosestString, openStringMidi, tuningStrings } from './tuning';

describe('Stimmung', () => {
  it('liefert sechs Saiten von dick nach dünn mit deutschen Namen', () => {
    const s = tuningStrings();
    expect(s.map((x) => x.number)).toEqual([6, 5, 4, 3, 2, 1]);
    expect(s.map((x) => x.nameWithOctave)).toEqual(['E2', 'A2', 'D3', 'G3', 'H3', 'E4']);
    expect(s[0]!.frequency).toBeCloseTo(82.41, 2);
    expect(s[5]!.frequency).toBeCloseTo(329.63, 2);
  });

  it('erkennt die passende Saite automatisch', () => {
    expect(detectClosestString(84).number).toBe(6);
    expect(detectClosestString(112).number).toBe(5);
    expect(detectClosestString(150).number).toBe(4);
    expect(detectClosestString(190).number).toBe(3);
    expect(detectClosestString(250).number).toBe(2);
    expect(detectClosestString(320).number).toBe(1);
  });

  it('kennt die leeren Saiten', () => {
    expect(openStringMidi(1)).toBe(64);
    expect(openStringMidi(6)).toBe(40);
    expect(() => openStringMidi(7)).toThrow();
  });
});
