// Erzeugt WAV-Dateien mit synthetischen Gitarrentönen für die Mikrofon-Simulation in Playwright
// (Chromium: --use-file-for-fake-audio-capture). Nylon-ähnlicher Klang: Grundton + abklingende Obertöne.
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 48000;

function pluck(freq, seconds, amplitude = 0.5) {
  const n = Math.floor(seconds * SR);
  const out = new Float32Array(n);
  const harmonics = [1, 0.7, 0.45, 0.3, 0.18, 0.1];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (let k = 0; k < harmonics.length; k++) {
      const decay = Math.exp(-t * (1.6 + k * 1.1));
      v += harmonics[k] * decay * Math.sin(2 * Math.PI * freq * (k + 1) * t);
    }
    const attack = Math.min(1, i / (SR * 0.004));
    out[i] = v * amplitude * attack;
  }
  return out;
}

function silence(seconds) {
  return new Float32Array(Math.floor(seconds * SR));
}

function concat(parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function writeWav(path, samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SR, 24);
  buffer.writeUInt32LE(SR * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(path, buffer);
  console.info('✓', path, (samples.length / SR).toFixed(1) + ' s');
}

mkdirSync('e2e/fixtures', { recursive: true });
// A2 = 110 Hz, exakt gestimmt, wiederholt angeschlagen
writeWav('e2e/fixtures/a2-110hz.wav', concat([pluck(110, 2.5), silence(0.2), pluck(110, 2.5), silence(0.2), pluck(110, 2.5)]));
// A2 um 48 Cent zu tief (≈ 107 Hz)
writeWav('e2e/fixtures/a2-flat.wav', concat([pluck(110 * Math.pow(2, -48 / 1200), 2.5), silence(0.2), pluck(110 * Math.pow(2, -48 / 1200), 2.5)]));
// Übung „Die sechs leeren Saiten“: abwärts E2 A2 D3 G3 H3 E4, dann aufwärts
const open = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
const seq = [...open, ...[...open].reverse()];
writeWav('e2e/fixtures/open-strings.wav', concat([silence(1.0), ...seq.flatMap((f) => [pluck(f, 1.2, 0.55), silence(0.35)]), silence(2)]));
