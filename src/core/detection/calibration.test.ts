import { describe, expect, it } from 'vitest';
import { estimateLatency, levelVerdict, matchClicksToOnsets, noiseVerdict, recommendGate, summarizeNoise, toDb } from './calibration';
import { CalibrationSession } from './calibrationSession';
import type { AnalysisFrame } from './engine';

function frame(time: number, rms: number, onset = false): AnalysisFrame {
  return { index: 0, time, rms, peak: rms * 1.4, pitch: null, flux: 0, onset, onsetTime: time - 0.01, onsetStrength: onset ? 2 : 0, targets: [] };
}

describe('Kalibrierungsrechnung', () => {
  it('bestimmt das Grundrauschen robust gegen einzelne Störungen', () => {
    const values = Array.from({ length: 200 }, (_, i) => 0.001 + (i % 7) * 0.0001);
    values[50] = 0.3; // Husten
    const noise = summarizeNoise(values);
    expect(noise.floorRms).toBeLessThan(0.002);
    expect(noise.floorRms).toBeGreaterThan(0.001);
    expect(noiseVerdict(noise.floorDb)).toBe('ruhig');
    expect(noiseVerdict(toDb(0.03))).toBe('laut');
    expect(noiseVerdict(toDb(0.005))).toBe('ok');
  });

  it('empfiehlt einen Mindestpegel über dem Rauschen und unter dem Anschlag', () => {
    expect(recommendGate(0.001, 0.2)).toBeCloseTo(0.004, 6);
    expect(recommendGate(0.02, 0.1)).toBeCloseTo(0.01, 6); // lautes Rauschen: höchstens ein Zehntel des Anschlags
    expect(recommendGate(0, 0)).toBeCloseTo(0.0015, 6);
    expect(levelVerdict(toDb(0.2))).toBe('gut');
    expect(levelVerdict(toDb(0.01))).toBe('leise');
  });

  it('ordnet Anschläge den Klicks zu und schätzt die Latenz als Median', () => {
    const clicks = [1, 1.5, 2, 2.5, 3];
    const onsets = [1.09, 1.6, 2.1, 2.32, 2.6, 3.12];
    const offsets = matchClicksToOnsets(clicks, onsets);
    expect(offsets.map((o) => Math.round(o))).toEqual([90, 100, 100, 100, 120]);
    const latency = estimateLatency(offsets)!;
    expect(latency.medianMs).toBeCloseTo(100, 6);
    expect(latency.reliable).toBe(true);
    expect(estimateLatency([])).toBeNull();
    expect(estimateLatency([50, 300])!.reliable).toBe(false);
  });
});

describe('CalibrationSession', () => {
  it('durchläuft Stille → Anschlag → Latenz → fertig', () => {
    const session = new CalibrationSession({ noiseSeconds: 1, strumSeconds: 0.5, clickCount: 3, latencyTailSeconds: 0.3 });
    let t = 0;
    const step = (rms: number, onset = false) => {
      t += 0.01;
      return session.push(frame(t, rms, onset));
    };
    for (let i = 0; i < 100; i++) expect(step(0.001).step).toBe('stille');
    expect(step(0.001).step).toBe('anschlag');
    for (let i = 0; i < 20; i++) expect(step(0.001).strumDetected).toBe(false);
    expect(step(0.3).strumDetected).toBe(true);
    for (let i = 0; i < 49; i++) step(0.2);
    step(0.1);
    expect(session.currentStep).toBe('latenz');
    for (let k = 0; k < 3; k++) {
      session.addClick(t + 0.01);
      for (let i = 0; i < 10; i++) step(0.02, i === 9); // Anschlag ≈ 90 ms nach dem Klick
      for (let i = 0; i < 40; i++) step(0.05);
    }
    const state = session.state(t);
    expect(state.step).toBe('fertig');
    expect(state.result.noiseFloorRms).toBeCloseTo(0.001, 4);
    expect(state.result.strumPeakRms).toBeCloseTo(0.3, 4);
    expect(state.result.latency?.samples).toBe(3);
    expect(Math.abs(state.result.latency!.medianMs - 90)).toBeLessThan(15);
  });

  it('lässt sich Schritt für Schritt überspringen', () => {
    const session = new CalibrationSession();
    session.push(frame(0.01, 0.001));
    session.skip();
    expect(session.currentStep).toBe('anschlag');
    session.skip();
    expect(session.currentStep).toBe('latenz');
    session.skip();
    expect(session.currentStep).toBe('fertig');
    expect(session.state().result.latency).toBeNull();
  });
});
