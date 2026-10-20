/**
 * Synthetische Testsignale (nylonähnliche Zupftöne, Akkorde, Rauschen) für Unit-Tests und
 * als Ergänzung zum Benchmark mit echten Aufnahmen. Keine Browser-APIs.
 */

export interface PluckOptions {
  sampleRate?: number;
  amplitude?: number;
  /** Relative Amplituden der Teiltöne 1…n. Standard: nylonähnlich. */
  harmonics?: readonly number[];
  /** Einschwingzeit in Sekunden. Standard 0,004. */
  attackSec?: number;
  /** Grunddämpfung (1/s); höhere Teiltöne klingen schneller ab. Standard 1,6. */
  decay?: number;
  /** Ausblendzeit am Ende in Sekunden (kein Knacken beim Abschneiden). Standard 0,04. */
  releaseSec?: number;
}

export const NYLON_HARMONICS = [1, 0.7, 0.45, 0.3, 0.18, 0.1] as const;

/** Abklingender Ton aus Grundton und Obertönen – ähnlich einer gezupften Nylonsaite. */
export function pluck(frequency: number, seconds: number, options: PluckOptions = {}): Float32Array {
  const sr = options.sampleRate ?? 48000;
  const amplitude = options.amplitude ?? 0.5;
  const harmonics = options.harmonics ?? NYLON_HARMONICS;
  const attack = options.attackSec ?? 0.004;
  const decay = options.decay ?? 1.6;
  const release = Math.round((options.releaseSec ?? 0.04) * sr);
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = 0;
    for (let k = 0; k < harmonics.length; k++) {
      const f = frequency * (k + 1);
      if (f >= sr / 2) break;
      v += harmonics[k]! * Math.exp(-t * (decay + k * 1.1)) * Math.sin(2 * Math.PI * f * t);
    }
    let env = attack > 0 ? Math.min(1, t / attack) : 1;
    if (release > 0 && i >= n - release) env *= 0.5 - 0.5 * Math.cos((Math.PI * (n - i)) / release);
    out[i] = v * amplitude * env;
  }
  return out;
}

/** Akkord: mehrere Töne, leicht versetzt angeschlagen (Strum von tief nach hoch). */
export function chord(frequencies: readonly number[], seconds: number, options: PluckOptions & { strumDelaySec?: number } = {}): Float32Array {
  const sr = options.sampleRate ?? 48000;
  const delay = options.strumDelaySec ?? 0.015;
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n);
  frequencies.forEach((f, i) => {
    const start = Math.floor(i * delay * sr);
    const tone = pluck(f, seconds - i * delay, { ...options, amplitude: (options.amplitude ?? 0.5) / Math.sqrt(frequencies.length) });
    for (let j = 0; j < tone.length && start + j < n; j++) out[start + j]! += tone[j]!;
  });
  return out;
}

/** Deterministisches weißes Rauschen (linearer Kongruenzgenerator) mit gegebenem Effektivwert. */
export function whiteNoise(seconds: number, rms: number, sampleRate = 48000, seed = 1): Float32Array {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  let state = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    // Gleichverteilt in [−1, 1) hat den Effektivwert 1/√3.
    out[i] = ((state / 4294967296) * 2 - 1) * rms * Math.sqrt(3);
  }
  return out;
}

export function silence(seconds: number, sampleRate = 48000): Float32Array {
  return new Float32Array(Math.floor(seconds * sampleRate));
}

/** Legt Signale zeitlich versetzt übereinander (Nachklang bleibt erhalten). */
export function layer(parts: readonly { at: number; signal: Float32Array }[], seconds: number, sampleRate = 48000): Float32Array {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  for (const part of parts) {
    const start = Math.round(part.at * sampleRate);
    for (let j = 0; j < part.signal.length && start + j < n; j++) out[start + j]! += part.signal[j]!;
  }
  return out;
}

/** Addiert zwei gleich lange Signale (z. B. Ton + Rauschen). */
export function add(a: Float32Array, b: Float32Array): Float32Array {
  const n = Math.max(a.length, b.length);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return out;
}
