import { describe, expect, it } from 'vitest';
import { midiForPosition, positionsForMidi, preferredPositionForMidi, suggestFinger } from './fretboard';

describe('Griffbrett', () => {
  it('berechnet Töne aus Saite und Bund', () => {
    expect(midiForPosition({ string: 3, fret: 2 })).toBe(57); // A3
    expect(midiForPosition({ string: 1, fret: 0 })).toBe(64);
    expect(midiForPosition({ string: 6, fret: 5 })).toBe(45); // = leere A-Saite
    expect(() => midiForPosition({ string: 0, fret: 1 })).toThrow();
  });

  it('findet alle Positionen eines Tons', () => {
    const positions = positionsForMidi(64); // E4
    expect(positions).toContainEqual({ string: 1, fret: 0 });
    expect(positions).toContainEqual({ string: 2, fret: 5 });
    expect(positions).toContainEqual({ string: 3, fret: 9 });
    expect(positions).toContainEqual({ string: 4, fret: 14 });
  });

  it('bevorzugt die erste Lage', () => {
    expect(preferredPositionForMidi(64)).toEqual({ string: 1, fret: 0 });
    expect(preferredPositionForMidi(60)).toEqual({ string: 2, fret: 1 });
    expect(preferredPositionForMidi(20)).toBeNull();
  });

  it('schlägt Finger der ersten Lage vor', () => {
    expect(suggestFinger(0)).toBe(0);
    expect(suggestFinger(1)).toBe(1);
    expect(suggestFinger(2)).toBe(2);
    expect(suggestFinger(3)).toBe(3);
    expect(suggestFinger(4)).toBe(4);
    expect(suggestFinger(5)).toBe(4);
    expect(suggestFinger(7, 5)).toBe(3);
  });
});
