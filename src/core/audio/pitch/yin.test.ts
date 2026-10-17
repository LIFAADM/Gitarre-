import { describe, expect, it } from 'vitest';
import { detectPitchYin, rms } from './yin';

const BUFFER_SIZE = 4096;
const SAMPLE_RATES = [44100, 48000];
/** Leersaiten E2 A2 D3 G3 H3 E4 sowie Kammerton A4. */
const STRING_FREQUENCIES = [82.41, 110, 146.83, 196, 246.94, 329.63, 440];

function cents(frequency: number, target: number): number {
  return 1200 * Math.log2(frequency / target);
}

function sine(frequency: number, sampleRate: number, amplitude = 0.5, length = BUFFER_SIZE): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  return out;
}

/** Summe von Obertönen mit frei wählbaren Amplituden (Index 0 = Grundton). */
function harmonics(frequency: number, sampleRate: number, amplitudes: number[], length = BUFFER_SIZE): Float32Array {
  const out = new Float32Array(length);
  const norm = amplitudes.reduce((a, b) => a + b, 0);
  for (let i = 0; i < length; i++) {
    let v = 0;
    amplitudes.forEach((a, k) => {
      // Unterschiedliche Phasen pro Oberton, damit das Signal nicht unnatürlich symmetrisch ist.
      v += a * Math.sin((2 * Math.PI * frequency * (k + 1) * i) / sampleRate + k * 0.7);
    });
    out[i] = (0.6 * v) / norm;
  }
  return out;
}

/** Deterministisches weißes Rauschen (mulberry32), damit der Test reproduzierbar bleibt. */
function noise(length = BUFFER_SIZE, seed = 12345, amplitude = 0.3): Float32Array {
  let a = seed >>> 0;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    out[i] = (r * 2 - 1) * amplitude;
  }
  return out;
}

describe('rms', () => {
  it('berechnet den Effektivwert eines Sinus (A / √2)', () => {
    expect(rms(sine(440, 44100, 0.5))).toBeCloseTo(0.5 / Math.SQRT2, 2);
    expect(rms(new Float32Array(1024))).toBe(0);
    expect(rms(new Float32Array(0))).toBe(0);
  });
});

describe('detectPitchYin – reine Sinustöne', () => {
  for (const sampleRate of SAMPLE_RATES) {
    for (const frequency of STRING_FREQUENCIES) {
      it(`erkennt ${frequency} Hz bei ${sampleRate} Hz Abtastrate auf ±2 Cent`, () => {
        const result = detectPitchYin(sine(frequency, sampleRate), sampleRate);
        expect(result).not.toBeNull();
        expect(Math.abs(cents(result!.frequency, frequency))).toBeLessThanOrEqual(2);
        expect(result!.probability).toBeGreaterThan(0.9);
        expect(result!.rms).toBeCloseTo(0.5 / Math.SQRT2, 2);
      });
    }
  }

  it('funktioniert auch mit sehr leisen Signalen (die Pegelbewertung übernimmt der Tracker)', () => {
    const result = detectPitchYin(sine(196, 48000, 0.002), 48000);
    expect(result).not.toBeNull();
    expect(Math.abs(cents(result!.frequency, 196))).toBeLessThanOrEqual(2);
  });
});

describe('detectPitchYin – obertonreiche Signale (keine Oktavfehler)', () => {
  const SAWTOOTH = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6];
  /** Nylonsaite kurz nach dem Anschlag: der 2. Oberton ist lauter als der Grundton. */
  const NYLON = [0.5, 1, 0.45, 0.25, 0.12];

  for (const sampleRate of SAMPLE_RATES) {
    for (const frequency of [110, 196]) {
      it(`findet den Grundton eines Sägezahns bei ${frequency} Hz (${sampleRate} Hz)`, () => {
        const result = detectPitchYin(harmonics(frequency, sampleRate, SAWTOOTH), sampleRate);
        expect(result).not.toBeNull();
        expect(Math.abs(cents(result!.frequency, frequency))).toBeLessThanOrEqual(2);
      });

      it(`findet den Grundton trotz dominantem 2. Oberton bei ${frequency} Hz (${sampleRate} Hz)`, () => {
        const result = detectPitchYin(harmonics(frequency, sampleRate, NYLON), sampleRate);
        expect(result).not.toBeNull();
        expect(Math.abs(cents(result!.frequency, frequency))).toBeLessThanOrEqual(2);
      });
    }
  }
});

describe('detectPitchYin – ungültige Eingaben', () => {
  it('liefert null bei Stille', () => {
    expect(detectPitchYin(new Float32Array(BUFFER_SIZE), 44100)).toBeNull();
  });

  it('liefert null (oder geringe Zuverlässigkeit) bei weißem Rauschen', () => {
    for (const seed of [1, 2, 3, 99]) {
      const result = detectPitchYin(noise(BUFFER_SIZE, seed), 44100);
      if (result !== null) expect(result.probability).toBeLessThan(0.5);
    }
  });

  it('liefert null außerhalb des Frequenzbereichs', () => {
    expect(detectPitchYin(sine(30, 44100), 44100)).toBeNull();
    expect(detectPitchYin(sine(2000, 44100), 44100)).toBeNull();
  });

  it('respektiert eigene Bereichsgrenzen', () => {
    expect(detectPitchYin(sine(110, 44100), 44100, { minHz: 150 })).toBeNull();
    expect(detectPitchYin(sine(440, 44100), 44100, { maxHz: 300 })).toBeNull();
    const ok = detectPitchYin(sine(440, 44100), 44100, { minHz: 400, maxHz: 500 });
    expect(ok).not.toBeNull();
  });

  it('liefert null bei zu kurzen Puffern oder ungültiger Abtastrate', () => {
    expect(detectPitchYin(new Float32Array(16), 44100)).toBeNull();
    expect(detectPitchYin(sine(440, 44100), 0)).toBeNull();
  });
});
