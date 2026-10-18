import { describe, expect, it } from 'vitest';
import { centsBetween, frequencyToMidi, midiToFrequency, nearestNote, noteName, noteNameWithOctave, parseNoteName } from './notes';

describe('Frequenz ↔ Note', () => {
  it('berechnet die Standardfrequenzen der Gitarrensaiten', () => {
    expect(midiToFrequency(40)).toBeCloseTo(82.41, 2);
    expect(midiToFrequency(45)).toBeCloseTo(110.0, 2);
    expect(midiToFrequency(50)).toBeCloseTo(146.83, 2);
    expect(midiToFrequency(55)).toBeCloseTo(196.0, 2);
    expect(midiToFrequency(59)).toBeCloseTo(246.94, 2);
    expect(midiToFrequency(64)).toBeCloseTo(329.63, 2);
  });

  it('rechnet Frequenzen zurück in MIDI-Nummern', () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 6);
    expect(frequencyToMidi(82.41)).toBeCloseTo(40, 2);
    expect(() => frequencyToMidi(0)).toThrow();
  });

  it('berechnet Cent-Abweichungen', () => {
    expect(centsBetween(440, 440)).toBeCloseTo(0, 6);
    expect(centsBetween(440 * Math.pow(2, 1 / 12), 440)).toBeCloseTo(100, 6);
    expect(centsBetween(435, 440)).toBeLessThan(0);
  });

  it('findet die nächste Note inkl. Abweichung', () => {
    const n = nearestNote(330.5);
    expect(n.midi).toBe(64);
    expect(n.nameWithOctave).toBe('E4');
    expect(n.cents).toBeGreaterThan(0);
    expect(Math.abs(n.cents)).toBeLessThan(10);
    const low = nearestNote(81.0);
    expect(low.midi).toBe(40);
    expect(low.cents).toBeLessThan(0);
  });

  it('verwendet deutsche Notennamen mit H', () => {
    expect(noteName(59, 'de')).toBe('H');
    expect(noteName(59, 'intl')).toBe('B');
    expect(noteNameWithOctave(59)).toBe('H3');
    expect(noteNameWithOctave(60)).toBe('C4');
    expect(noteName(61)).toBe('C#');
  });

  it('parst Notennamen', () => {
    expect(parseNoteName('E2')).toBe(40);
    expect(parseNoteName('H3')).toBe(59);
    expect(parseNoteName('B3', 'intl')).toBe(59);
    expect(parseNoteName('B3', 'de')).toBe(58);
    expect(parseNoteName('F#4')).toBe(66);
    expect(() => parseNoteName('X9')).toThrow();
  });
});
