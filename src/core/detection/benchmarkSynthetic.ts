import { midiToFrequency } from '@/core/music/notes';
import type { ExpectedNote } from '@/core/storage/types';
import type { BenchmarkClip } from './benchmark';
import { add, chord, layer, pluck, whiteNoise } from './testSignals';

/**
 * Deterministischer synthetischer Clip-Satz für den Benchmark: dieselben Aufgaben wie die
 * Vorgaben im Erkennungs-Labor (Leersaiten, wiederholter Ton, Tonleiter, Akkorde, Stille), in drei
 * Varianten (normal, leise, lauter Raum). Er beweist die Messkette und fängt Rückschritte ab –
 * die Zielwerte gelten aber erst mit echten Aufnahmen als erreicht.
 */

const SR = 48000;

interface Variant {
  id: string;
  label: string;
  amplitude: number;
  noiseRms: number;
}

const VARIANTS: Variant[] = [
  { id: 'normal', label: 'normal', amplitude: 0.45, noiseRms: 0.002 },
  { id: 'leise', label: 'leise', amplitude: 0.12, noiseRms: 0.002 },
  { id: 'raum', label: 'lauter Raum', amplitude: 0.4, noiseRms: 0.01 },
];

const OPEN_STRINGS: { string: number; midi: number; name: string }[] = [
  { string: 6, midi: 40, name: 'E' },
  { string: 5, midi: 45, name: 'A' },
  { string: 4, midi: 50, name: 'D' },
  { string: 3, midi: 55, name: 'G' },
  { string: 2, midi: 59, name: 'H' },
  { string: 1, midi: 64, name: 'E' },
];

const CHORDS: { id: string; label: string; expected: ExpectedNote[] }[] = [
  { id: 'am', label: 'a-Moll', expected: [45, 52, 57, 60, 64].map((midi) => ({ midi })) },
  { id: 'e', label: 'E-Dur', expected: [40, 47, 52, 56, 59, 64].map((midi) => ({ midi })) },
  { id: 'em', label: 'e-Moll', expected: [40, 47, 52, 55, 59, 64].map((midi) => ({ midi })) },
  { id: 'c', label: 'C-Dur', expected: [48, 52, 55, 60, 64].map((midi) => ({ midi })) },
  { id: 'g', label: 'G-Dur', expected: [43, 47, 50, 55, 59, 67].map((midi) => ({ midi })) },
  { id: 'd', label: 'D-Dur', expected: [50, 57, 62, 66].map((midi) => ({ midi })) },
];

const SCALE: number[] = [48, 50, 52, 53, 55, 57, 59, 60];

let seedCounter = 1;
function noisy(signal: Float32Array, rms: number): Float32Array {
  seedCounter += 1;
  return add(signal, whiteNoise(signal.length / SR, rms, SR, seedCounter));
}

function clip(id: string, label: string, kind: BenchmarkClip['kind'], expected: ExpectedNote[], samples: Float32Array, variant: Variant): BenchmarkClip {
  return { id: `${id}-${variant.id}`, label: `${label} (${variant.label})`, kind, expected, sampleRate: SR, samples, source: 'synthetisch', noiseFloorRms: variant.noiseRms };
}

export function syntheticBenchmarkClips(): BenchmarkClip[] {
  seedCounter = 1;
  const clips: BenchmarkClip[] = [];
  for (const variant of VARIANTS) {
    const amp = variant.amplitude;
    // Leersaiten, dreimal angeschlagen
    for (const s of OPEN_STRINGS) {
      const tone = () => pluck(midiToFrequency(s.midi), 1.1, { amplitude: amp });
      const signal = layer(
        [
          { at: 0.4, signal: tone() },
          { at: 1.6, signal: tone() },
          { at: 2.8, signal: tone() },
        ],
        4,
      );
      clips.push(clip(`leersaite-${s.string}`, `Leersaite ${s.name} (${s.string})`, 'einzelton', [{ midi: s.midi, string: s.string, fret: 0 }], noisy(signal, variant.noiseRms), variant));
    }
    // Wiederholter Ton A, achtmal im Sekundentakt – jeder Anschlag auf dem Nachklang des vorherigen
    const repeated = layer(
      Array.from({ length: 8 }, (_, i) => ({ at: 0.5 + i, signal: pluck(midiToFrequency(45), 1.4, { amplitude: amp }) })),
      9.5,
    );
    clips.push(clip('wiederholt-a', 'Wiederholter Ton A (5)', 'folge', Array.from({ length: 8 }, () => ({ midi: 45, string: 5, fret: 0 })), noisy(repeated, variant.noiseRms), variant));
    // Tonleiter C-Dur, 0,7 s je Ton, Töne klingen ineinander
    const scale = layer(
      SCALE.map((midi, i) => ({ at: 0.4 + i * 0.7, signal: pluck(midiToFrequency(midi), 1.2, { amplitude: amp }) })),
      0.4 + SCALE.length * 0.7 + 1,
    );
    clips.push(clip('tonleiter-c', 'Tonleiter C-Dur', 'folge', SCALE.map((midi) => ({ midi })), noisy(scale, variant.noiseRms), variant));
    // Akkorde, dreimal angeschlagen
    for (const c of CHORDS) {
      const strum = () => chord(c.expected.map((e) => midiToFrequency(e.midi)), 1.6, { amplitude: amp * 1.4, strumDelaySec: 0.02 });
      const signal = layer(
        [
          { at: 0.4, signal: strum() },
          { at: 2.2, signal: strum() },
          { at: 4.0, signal: strum() },
        ],
        6,
      );
      clips.push(clip(`akkord-${c.id}`, `Akkord ${c.label}`, 'akkord', c.expected, noisy(signal, variant.noiseRms), variant));
    }
    // Stille: nur Rauschen, 10 s
    clips.push(clip('stille', 'Stille', 'stille', [], noisy(new Float32Array(10 * SR), variant.noiseRms), variant));
  }
  return clips;
}
