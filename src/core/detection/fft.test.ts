import { describe, expect, it } from 'vitest';
import { applyWindow, binFrequency, hannWindow, RealFFT, windowSum } from './fft';
import { goertzelPower, noisePowerHann } from './goertzel';
import { whiteNoise } from './testSignals';

function sine(hz: number, n: number, sr: number, amplitude = 1): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / sr);
  return out;
}

describe('RealFFT', () => {
  it('findet den Bin eines Sinus und stimmt mit einer direkten DFT überein', () => {
    const n = 256;
    const sr = 48000;
    const fft = new RealFFT(n);
    const hz = binFrequency(10, n, sr);
    const input = sine(hz, n, sr);
    const mags = fft.magnitudes(input);
    let best = 0;
    for (let i = 1; i < mags.length; i++) if (mags[i]! > mags[best]!) best = i;
    expect(best).toBe(10);
    expect(mags[10]!).toBeCloseTo(n / 2, 0);
    // Direkte DFT zum Vergleich
    for (const k of [3, 10, 50]) {
      let re = 0;
      let im = 0;
      for (let i = 0; i < n; i++) {
        re += input[i]! * Math.cos((-2 * Math.PI * k * i) / n);
        im += input[i]! * Math.sin((-2 * Math.PI * k * i) / n);
      }
      expect(mags[k]!).toBeCloseTo(Math.hypot(re, im), 2);
    }
  });

  it('lehnt Größen ab, die keine Zweierpotenz sind', () => {
    expect(() => new RealFFT(1000)).toThrow();
  });
});

describe('Goertzel', () => {
  it('schätzt die Amplitude eines Sinus auch zwischen den FFT-Bins', () => {
    const n = 4096;
    const sr = 48000;
    const window = hannWindow(n);
    const sum = windowSum(window);
    const windowed = applyWindow(sine(82.41, n, sr, 0.3), window, new Float32Array(n));
    expect(Math.sqrt(goertzelPower(windowed, sr, 82.41, sum))).toBeCloseTo(0.3, 2);
    // Ein Halbton daneben (F2 = 87,31 Hz) liegt bei 4096 Samples noch in der Hauptkeule – aber beim 5. Teilton nicht mehr.
    expect(goertzelPower(windowed, sr, 82.41 * 5 * 2 ** (1 / 12), sum)).toBeLessThan(goertzelPower(windowed, sr, 82.41, sum) * 0.01);
  });

  it('liefert 0 für Frequenzen außerhalb des Bereichs', () => {
    expect(goertzelPower(new Float32Array(64), 48000, 100, 32)).toBe(0);
    expect(goertzelPower(new Float32Array(64).fill(0.1), 48000, 30000, 32)).toBe(0);
  });

  it('die Rauschformel passt zum gemessenen Mittelwert', () => {
    const n = 4096;
    const sr = 48000;
    const window = hannWindow(n);
    const sum = windowSum(window);
    const rms = 0.01;
    let total = 0;
    const trials = 20;
    for (let t = 0; t < trials; t++) {
      const noise = whiteNoise(n / sr, rms, sr, 7 + t);
      const windowed = applyWindow(noise, window, new Float32Array(n));
      total += goertzelPower(windowed, sr, 440 + t * 37, sum);
    }
    const measured = total / trials;
    const expected = noisePowerHann(rms, n);
    expect(measured).toBeGreaterThan(expected * 0.5);
    expect(measured).toBeLessThan(expected * 2);
  });
});
