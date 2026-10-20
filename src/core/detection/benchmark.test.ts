import { describe, expect, it } from 'vitest';
import { midiToFrequency } from '@/core/music/notes';
import { analyseClip, formatReport, probeSet, referenceOnsets, summarize, type BenchmarkClip } from './benchmark';
import { syntheticBenchmarkClips } from './benchmarkSynthetic';
import { chord, layer, pluck, whiteNoise, add } from './testSignals';

const SR = 48000;

function makeClip(partial: Partial<BenchmarkClip> & Pick<BenchmarkClip, 'kind' | 'expected' | 'samples'>): BenchmarkClip {
  return { id: 'test', label: 'Test', sampleRate: SR, source: 'synthetisch', noiseFloorRms: 0.002, ...partial };
}

describe('Benchmark-Kern', () => {
  it('bildet Prüftöne: erwartete zuerst, dann Köder ohne Dopplungen', () => {
    const { midis, expectedCount } = probeSet([{ midi: 45 }, { midi: 57 }]);
    expect(expectedCount).toBe(2);
    expect(midis.slice(0, 2)).toEqual([45, 57]);
    expect(midis.filter((m) => m === 57).length).toBe(1); // 57 ist erwartet, nicht noch einmal als Köder
    expect(new Set(midis).size).toBe(midis.length);
    expect(midis).toContain(44);
    expect(midis).toContain(69);
  });

  it('findet Referenz-Anschläge offline auf ±10 ms genau', () => {
    const signal = add(
      layer(
        [
          { at: 0.3, signal: pluck(110, 1, { amplitude: 0.4 }) },
          { at: 1.0, signal: pluck(110, 1, { amplitude: 0.4 }) },
          { at: 1.7, signal: pluck(220, 1, { amplitude: 0.1 }) },
        ],
        3,
      ),
      whiteNoise(3, 0.002, SR, 4),
    );
    const onsets = referenceOnsets(signal, SR, 0.002);
    expect(onsets.length).toBe(3);
    expect(Math.abs(onsets[0]! - 0.3)).toBeLessThan(0.01);
    expect(Math.abs(onsets[1]! - 1.0)).toBeLessThan(0.01);
    expect(Math.abs(onsets[2]! - 1.7)).toBeLessThan(0.01);
  });

  it('bewertet einen Einzelton-Clip: drei Treffer, keine Fehlalarme, Timing unter 30 ms', () => {
    const tone = () => pluck(midiToFrequency(45), 1, { amplitude: 0.4 });
    const samples = add(layer([{ at: 0.3, signal: tone() }, { at: 1.3, signal: tone() }, { at: 2.3, signal: tone() }], 3.5), whiteNoise(3.5, 0.002, SR, 5));
    const result = analyseClip(makeClip({ kind: 'einzelton', expected: [{ midi: 45 }], samples }));
    expect(result.events).toBe(3);
    expect(result.hits).toBe(3);
    expect(result.falseAlarms).toBe(0);
    expect(result.timingDeltasMs.length).toBe(3);
    for (const d of result.timingDeltasMs) expect(Math.abs(d)).toBeLessThan(30);
  });

  it('zählt falsche Töne nicht als Treffer', () => {
    const samples = add(layer([{ at: 0.3, signal: pluck(midiToFrequency(47), 1, { amplitude: 0.4 }) }], 1.5), whiteNoise(1.5, 0.002, SR, 6));
    const result = analyseClip(makeClip({ kind: 'einzelton', expected: [{ midi: 45 }], samples }));
    expect(result.events).toBe(1);
    expect(result.hits).toBe(0);
  });

  it('bewertet eine Folge in Reihenfolge und einen Akkord je Ton', () => {
    const seq = [48, 50, 52];
    const folge = add(layer(seq.map((m, i) => ({ at: 0.3 + i * 0.6, signal: pluck(midiToFrequency(m), 1, { amplitude: 0.4 }) })), 2.5), whiteNoise(2.5, 0.002, SR, 7));
    const r1 = analyseClip(makeClip({ kind: 'folge', expected: seq.map((midi) => ({ midi })), samples: folge }));
    expect(r1.hits).toBe(3);
    expect(r1.expectedCount).toBe(3);

    const am = [45, 52, 57, 60, 64];
    const akkord = add(layer([{ at: 0.3, signal: chord(am.map((m) => midiToFrequency(m)), 1.5, { amplitude: 0.6 }) }], 2), whiteNoise(2, 0.002, SR, 8));
    const r2 = analyseClip(makeClip({ kind: 'akkord', expected: am.map((midi) => ({ midi })), samples: akkord }));
    expect(r2.events).toBe(1);
    expect(r2.hits).toBe(5);
  });

  it('zählt in Stille jedes Ereignis als Fehlalarm', () => {
    const result = analyseClip(makeClip({ kind: 'stille', expected: [], samples: whiteNoise(5, 0.003, SR, 9), noiseFloorRms: 0.003 }));
    expect(result.falseAlarmChecks).toBe(5);
    expect(result.falseAlarms).toBe(0);
  });

  it('fasst zusammen und prüft gegen die Zielwerte', () => {
    const good = { id: 'a', label: 'A', kind: 'einzelton' as const, source: 'synthetisch' as const, durationSec: 3, events: 3, expectedCount: 3, hits: 3, falseAlarms: 0, falseAlarmChecks: 18, timingDeltasMs: [10, -12, 15], referenceOnsets: 3, notes: [] };
    const bad = { ...good, id: 'b', hits: 1, falseAlarms: 3 };
    expect(summarize([good], 'synthetisch').passed).toBe(true);
    const s = summarize([good, bad], 'synthetisch');
    expect(s.passed).toBe(false);
    expect(s.failures.join(' ')).toMatch(/Einzeltöne/);
    expect(s.failures.join(' ')).toMatch(/Fehlalarme/);
    expect(summarize([], 'echt').passed).toBe(true);
    expect(formatReport([good, bad], [s])).toContain('NICHT bestanden');
  });

  it('erzeugt den synthetischen Satz deterministisch', () => {
    const a = syntheticBenchmarkClips();
    const b = syntheticBenchmarkClips();
    expect(a.length).toBe(3 * (6 + 2 + 6 + 1));
    expect(a[0]!.samples[20000]).toBe(b[0]!.samples[20000]);
    expect(a[10]!.samples[30000]).toBe(b[10]!.samples[30000]);
    expect(new Set(a.map((c) => c.id)).size).toBe(a.length);
  }, 60_000);
});
