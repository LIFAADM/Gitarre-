import { describe, expect, it } from 'vitest';
import { AnalysisEngine, type AnalysisFrame } from './engine';
import { layer, pluck, silence, whiteNoise, add } from './testSignals';
import { midiToFrequency } from '@/core/music/notes';

const SR = 48000;

function run(signal: Float32Array, options: { targets?: number[]; noise?: number; block?: number } = {}): AnalysisFrame[] {
  const engine = new AnalysisEngine({ sampleRate: SR, noiseFloorRms: options.noise ?? 0 });
  if (options.targets) engine.setTargets(options.targets);
  const frames: AnalysisFrame[] = [];
  engine.onFrame = (f) => frames.push(f);
  const block = options.block ?? 128;
  for (let i = 0; i < signal.length; i += block) engine.process(signal.subarray(i, Math.min(signal.length, i + block)), i / SR);
  return frames;
}

const onsetTimes = (frames: AnalysisFrame[]): number[] => frames.filter((f) => f.onset).map((f) => f.onsetTime);

describe('AnalysisEngine', () => {
  it('liefert lückenlos ein Frame je 10 ms mit fortlaufender Zeit', () => {
    const frames = run(silence(0.5));
    expect(frames.length).toBe(50);
    expect(frames[0]!.time).toBeCloseTo(0.01, 6);
    expect(frames[49]!.time).toBeCloseTo(0.5, 6);
    expect(frames.every((f) => f.pitch === null && !f.onset)).toBe(true);
  });

  it('erkennt zwei Anschläge mit genauer Zeit, auch bei gleichem Ton', () => {
    const a = pluck(midiToFrequency(45), 0.8);
    const signal = layer(
      [
        { at: 0.2, signal: a },
        { at: 0.7, signal: a },
      ],
      1.4,
    );
    const onsets = onsetTimes(run(signal, { block: 480 }));
    expect(onsets.length).toBe(2);
    expect(Math.abs(onsets[0]! - 0.2)).toBeLessThan(0.03);
    expect(Math.abs(onsets[1]! - 0.7)).toBeLessThan(0.03);
  });

  it('meldet bei einem gehaltenen Ton keinen weiteren Anschlag', () => {
    const signal = layer([{ at: 0.1, signal: pluck(midiToFrequency(52), 1.5) }], 1.6);
    expect(onsetTimes(run(signal)).length).toBe(1);
  });

  it('schätzt die Tonhöhe und prüft den Zielton', () => {
    const hz = midiToFrequency(40); // tiefe E-Saite
    const signal = layer([{ at: 0.05, signal: pluck(hz, 1) }], 1);
    const frames = run(signal, { targets: [hz, midiToFrequency(41)] });
    const settled = frames.filter((f) => f.time > 0.2 && f.time < 0.6);
    const pitched = settled.filter((f) => f.pitch !== null);
    expect(pitched.length).toBeGreaterThan(settled.length * 0.9);
    for (const f of pitched) expect(Math.abs(1200 * Math.log2(f.pitch!.hz / hz))).toBeLessThan(20);
    const targetHits = settled.filter((f) => f.targets[0]!.score >= 0.5).length;
    const neighbourHits = settled.filter((f) => f.targets[1]!.score >= 0.5).length;
    expect(targetHits).toBeGreaterThan(settled.length * 0.9);
    expect(neighbourHits).toBe(0);
  });

  it('bleibt bei Rauschen unter dem Mindestpegel stumm', () => {
    const noise = whiteNoise(0.5, 0.002, SR, 5);
    const frames = run(noise, { noise: 0.002, targets: [110] });
    expect(frames.every((f) => f.pitch === null)).toBe(true);
    expect(frames.every((f) => f.targets[0]!.score === 0)).toBe(true);
    expect(onsetTimes(frames).length).toBe(0);
  });

  it('erkennt einen Anschlag auch über leisem Rauschen', () => {
    const signal = add(layer([{ at: 0.3, signal: pluck(220, 0.5, { amplitude: 0.3 }) }], 0.9), whiteNoise(0.9, 0.004, SR, 11));
    const onsets = onsetTimes(run(signal, { noise: 0.004 }));
    expect(onsets.length).toBe(1);
    expect(Math.abs(onsets[0]! - 0.3)).toBeLessThan(0.03);
  });
});
