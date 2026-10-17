import { describe, expect, it } from 'vitest';
import { defaultT60ForMidi, estimateFrequencyByAutocorrelation, renderDeadNote, renderPluck } from './pluckSynthesis';

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('Karplus-Strong-Synthese', () => {
  it('erzeugt ein abklingendes Signal mit der gewünschten Grundfrequenz', () => {
    const sr = 44100;
    for (const freq of [82.41, 110, 196, 329.63, 440]) {
      const signal = renderPluck(freq, sr, { seconds: 1.0, t60: 2, random: seeded(42) });
      // Analyse im eingeschwungenen Bereich (nach dem Anschlag)
      const window = signal.subarray(Math.floor(sr * 0.1), Math.floor(sr * 0.1) + 8192);
      const measured = estimateFrequencyByAutocorrelation(window, sr, 60, 1000);
      const cents = 1200 * Math.log2(measured / freq);
      expect(Math.abs(cents)).toBeLessThan(5);
    }
  });

  it('klingt ab', () => {
    const sr = 44100;
    const signal = renderPluck(220, sr, { seconds: 1.5, t60: 1.0, random: seeded(7) });
    const rms = (from: number, len: number): number => {
      let sum = 0;
      for (let i = from; i < from + len; i++) sum += signal[i]! * signal[i]!;
      return Math.sqrt(sum / len);
    };
    const early = rms(Math.floor(sr * 0.05), 4096);
    const late = rms(Math.floor(sr * 1.2), 4096);
    expect(late).toBeLessThan(early * 0.2);
    expect(Math.max(...Array.from(signal.subarray(0, 2000)).map(Math.abs))).toBeLessThanOrEqual(1.0001);
  });

  it('liefert sinnvolle Ausklingzeiten und tote Noten', () => {
    expect(defaultT60ForMidi(40)).toBeGreaterThan(defaultT60ForMidi(70));
    expect(renderDeadNote(44100).length).toBeGreaterThan(1000);
  });
});
