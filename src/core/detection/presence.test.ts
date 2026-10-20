import { describe, expect, it } from 'vitest';
import { applyWindow, hannWindow, windowSum } from './fft';
import { PRESENCE_THRESHOLD, targetPresence } from './presence';
import { add, chord, pluck, whiteNoise } from './testSignals';
import { midiToFrequency } from '@/core/music/notes';

const SR = 48000;
const N = 4096;
const window = hannWindow(N);
const sum = windowSum(window);

/** Fenster ab `atSec` (Standard: 50 ms nach dem Anschlag, wenn der Ton eingeschwungen ist). */
let sumSquares = 0;
for (let i = 0; i < N; i++) sumSquares += window[i]! ** 2;

function presence(signal: Float32Array, hz: number, atSec = 0.05, noiseRms = 0.001, otherExpectedHz: number[] = []) {
  const start = Math.round(atSec * SR);
  const windowed = applyWindow(signal.subarray(start, start + N), window, new Float32Array(N));
  let power = 0;
  for (let i = 0; i < N; i++) power += windowed[i]! ** 2;
  return targetPresence(windowed, sum, hz, { sampleRate: SR, noiseRms, otherExpectedHz, signalPower: (2 * power) / sumSquares });
}

const A2 = midiToFrequency(45);
const E2 = midiToFrequency(40);
const F2 = midiToFrequency(41);
const A3 = midiToFrequency(57);

describe('targetPresence', () => {
  it('erkennt A2 und verwirft die Nachbarhalbtöne', () => {
    const tone = pluck(A2, 0.5);
    expect(presence(tone, A2).score).toBeGreaterThanOrEqual(0.9);
    expect(presence(tone, midiToFrequency(44)).score).toBeLessThan(PRESENCE_THRESHOLD);
    expect(presence(tone, midiToFrequency(46)).score).toBeLessThan(PRESENCE_THRESHOLD);
  });

  it('trennt die tiefe E-Saite (82 Hz) von F2', () => {
    const tone = pluck(E2, 0.5);
    expect(presence(tone, E2).score).toBeGreaterThanOrEqual(0.9);
    expect(presence(tone, F2).score).toBeLessThan(PRESENCE_THRESHOLD);
    expect(presence(tone, midiToFrequency(39)).score).toBeLessThan(PRESENCE_THRESHOLD);
  });

  it('meldet Oktavfehler in beide Richtungen', () => {
    const low = pluck(A2, 0.5);
    const lowAsHigh = presence(low, A3);
    expect(lowAsHigh.octave).toBe('tiefer');
    expect(lowAsHigh.score).toBeLessThan(PRESENCE_THRESHOLD);

    const high = pluck(A3, 0.5);
    const highAsLow = presence(high, A2);
    expect(highAsLow.octave).toBe('hoeher');
    expect(highAsLow.score).toBeLessThan(PRESENCE_THRESHOLD);
    expect(presence(high, A3).score).toBeGreaterThanOrEqual(0.9);
  });

  it('findet jeden Akkordton von a-Moll und keinen fremden Ton', () => {
    const am = [45, 52, 57, 60, 64].map((m) => midiToFrequency(m));
    const signal = chord(am, 0.8);
    // A3 hat A2 als erwartete untere Oktave im Akkord – kein Oktavfehler.
    for (const hz of am) expect(presence(signal, hz, 0.12, 0.001, am.filter((o) => o !== hz)).score).toBeGreaterThanOrEqual(PRESENCE_THRESHOLD);
    // F#3 (66) und D#4 (63) gehören nicht dazu.
    expect(presence(signal, midiToFrequency(54), 0.12).score).toBeLessThan(PRESENCE_THRESHOLD);
    expect(presence(signal, midiToFrequency(63), 0.12).score).toBeLessThan(PRESENCE_THRESHOLD);
  });

  it('erkennt den neuen Ton trotz Nachklang des vorherigen', () => {
    const first = pluck(A2, 1.2);
    const second = pluck(midiToFrequency(50), 0.6); // D3
    const signal = add(first, new Float32Array(first.length));
    const offset = Math.round(0.6 * SR);
    for (let i = 0; i < second.length && offset + i < signal.length; i++) signal[offset + i]! += second[i]!;
    expect(presence(signal, midiToFrequency(50), 0.66).score).toBeGreaterThanOrEqual(0.9);
    expect(presence(signal, A2, 0.66).score).toBeGreaterThan(0); // klingt noch nach – erwartungsgeführt ist das in Ordnung
    // Die Oktave über dem Nachklang (A3) darf nicht als gespielt gelten.
    expect(presence(signal, A3, 0.66).score).toBeLessThan(PRESENCE_THRESHOLD);
  });

  it('verwirft Duodezime und leisen Nachklang', () => {
    // C3 gespielt: G4 (Duodezime, 3. Teilton) ist nicht „da“.
    const c3 = pluck(midiToFrequency(48), 0.5);
    expect(presence(c3, midiToFrequency(67)).score).toBeLessThan(PRESENCE_THRESHOLD);
    // E4 im a-Moll-Akkord ist erwartet und bleibt trotz A2 (dessen 3. Teilton 330 Hz ist) ein Treffer.
    const am = [45, 52, 57, 60, 64].map((m) => midiToFrequency(m));
    const signal = chord(am, 0.8);
    expect(presence(signal, midiToFrequency(64), 0.12, 0.001, am.slice(0, 4)).score).toBeGreaterThanOrEqual(PRESENCE_THRESHOLD);
    // Leiser Nachklang (−30 dB) neben einem lauten anderen Ton zählt nicht.
    const quiet = add(pluck(A2, 1, { amplitude: 0.01 }), pluck(midiToFrequency(50), 1, { amplitude: 0.5 }));
    expect(presence(quiet, A2, 0.1).score).toBeLessThan(PRESENCE_THRESHOLD);
  });

  it('liefert bei Rauschen und Stille keinen Treffer', () => {
    const noise = whiteNoise(0.3, 0.02, SR, 3);
    expect(presence(noise, A2, 0.01, 0.02).score).toBeLessThan(PRESENCE_THRESHOLD);
    expect(presence(new Float32Array(SR), A2).score).toBe(0);
  });

  it('bleibt robust, wenn leises Rauschen über dem Ton liegt', () => {
    const tone = add(pluck(A2, 0.5, { amplitude: 0.2 }), whiteNoise(0.5, 0.005, SR, 9));
    expect(presence(tone, A2, 0.05, 0.005).score).toBeGreaterThanOrEqual(0.8);
    expect(presence(tone, midiToFrequency(46), 0.05, 0.005).score).toBeLessThan(PRESENCE_THRESHOLD);
  });
});
