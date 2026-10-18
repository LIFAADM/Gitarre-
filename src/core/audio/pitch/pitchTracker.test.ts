import { describe, expect, it } from 'vitest';
import { PitchTracker, RMS_GATE, smoothCents, type PitchSample } from './pitchTracker';

function sample(frequency: number, rms = 0.05, probability = 0.95): PitchSample {
  return { frequency, probability, rms };
}

describe('PitchTracker – Pegel-Gate', () => {
  it('verwirft zu leise Messungen je nach Empfindlichkeit', () => {
    const normal = new PitchTracker({ sensitivity: 'normal' });
    normal.push(sample(110, 0.005), 0);
    expect(normal.current()).toBeNull();
    expect(normal.level).toBeCloseTo(0.005);

    const hoch = new PitchTracker({ sensitivity: 'hoch' });
    hoch.push(sample(110, 0.005), 0);
    expect(hoch.current()?.frequency).toBeCloseTo(110);

    const niedrig = new PitchTracker({ sensitivity: 'niedrig' });
    niedrig.push(sample(110, 0.015), 0);
    expect(niedrig.current()).toBeNull();
    niedrig.push(sample(110, 0.03), 40);
    expect(niedrig.current()).not.toBeNull();
  });

  it('kennt die Schwellen der drei Stufen', () => {
    expect(RMS_GATE.hoch).toBeLessThan(RMS_GATE.normal);
    expect(RMS_GATE.normal).toBeLessThan(RMS_GATE.niedrig);
    const t = new PitchTracker({ sensitivity: 'normal' });
    expect(t.gate).toBe(RMS_GATE.normal);
    t.setOptions({ sensitivity: 'hoch' });
    expect(t.gate).toBe(RMS_GATE.hoch);
  });

  it('verwirft unzuverlässige und ungültige Messungen', () => {
    const t = new PitchTracker({ sensitivity: 'normal' });
    t.push(sample(110, 0.05, 0.2), 0);
    expect(t.current()).toBeNull();
    t.push(sample(Number.NaN), 40);
    expect(t.current()).toBeNull();
    t.push(sample(-5), 80);
    expect(t.current()).toBeNull();
  });
});

describe('PitchTracker – Median-Glättung', () => {
  it('ignoriert einen einzelnen Ausreißer', () => {
    const t = new PitchTracker({ sensitivity: 'normal' });
    const freqs = [110, 110.2, 220, 109.9, 110.1];
    freqs.forEach((f, i) => t.push(sample(f), i * 40));
    const current = t.current();
    expect(current).not.toBeNull();
    expect(current!.frequency).toBeCloseTo(110.1, 5);
    expect(current!.midi).toBe(45);
    expect(Math.abs(current!.cents)).toBeLessThan(5);
  });

  it('verschmilzt bei gerader Anzahl keine Werte zu einer Zwischenfrequenz', () => {
    const t = new PitchTracker({ sensitivity: 'normal' });
    t.push(sample(110), 0);
    t.push(sample(220), 40);
    expect(t.current()!.frequency).toBeCloseTo(220);
  });

  it('berechnet Note und Cent-Abweichung relativ zum Kammerton', () => {
    const t = new PitchTracker({ sensitivity: 'normal', a4Hz: 442 });
    t.push(sample(442), 0);
    const c = t.current()!;
    expect(c.midi).toBe(69);
    expect(c.cents).toBeCloseTo(0, 6);
    expect(c.level).toBeCloseTo(0.05);
  });
});

describe('PitchTracker – Stabilität', () => {
  it('meldet stable erst nach minStableMs unveränderter Note', () => {
    const t = new PitchTracker({ sensitivity: 'normal', minStableMs: 100 });
    t.push(sample(196), 0);
    expect(t.current()!.stable).toBe(false);
    t.push(sample(196.2), 50);
    expect(t.current()!.stable).toBe(false);
    t.push(sample(195.9), 100);
    expect(t.current()!.stable).toBe(true);
  });

  it('setzt die Stabilität zurück, wenn sich die Note ändert', () => {
    const t = new PitchTracker({ sensitivity: 'normal', minStableMs: 100, medianWindow: 1 });
    t.push(sample(196), 0);
    t.push(sample(196), 120);
    expect(t.current()!.stable).toBe(true);
    t.push(sample(246.94), 160);
    expect(t.current()!.midi).toBe(59);
    expect(t.current()!.stable).toBe(false);
    t.push(sample(246.94), 260);
    expect(t.current()!.stable).toBe(true);
  });
});

describe('PitchTracker – Zeitüberschreitung', () => {
  it('hält den letzten Wert kurz und vergisst ihn nach 400 ms', () => {
    const t = new PitchTracker({ sensitivity: 'normal' });
    t.push(sample(110), 0);
    t.push(null, 200);
    expect(t.current()).not.toBeNull();
    expect(t.current()!.level).toBe(0);
    t.push(null, 401);
    expect(t.current()).toBeNull();
  });

  it('berücksichtigt einen explizit übergebenen Zeitpunkt', () => {
    const t = new PitchTracker({ sensitivity: 'normal', holdMs: 300 });
    t.push(sample(110), 1000);
    expect(t.current(1299)).not.toBeNull();
    expect(t.current(1301)).toBeNull();
  });

  it('startet nach einer Pause mit einem leeren Fenster', () => {
    const t = new PitchTracker({ sensitivity: 'normal' });
    for (let i = 0; i < 5; i++) t.push(sample(110), i * 40);
    for (let i = 5; i < 20; i++) t.push(null, i * 40);
    expect(t.current()).toBeNull();
    t.push(sample(220), 800);
    expect(t.current()!.frequency).toBeCloseTo(220);
    expect(t.current()!.midi).toBe(57);
  });

  it('reset() vergisst alles', () => {
    const t = new PitchTracker({ sensitivity: 'normal' });
    t.push(sample(110), 0);
    t.reset();
    expect(t.current()).toBeNull();
    expect(t.level).toBe(0);
  });
});

describe('smoothCents', () => {
  it('übernimmt den ersten Wert direkt und glättet danach', () => {
    expect(smoothCents(null, 12)).toBe(12);
    expect(smoothCents(0, 10, 0.5)).toBe(5);
    expect(smoothCents(10, 10, 0.3)).toBe(10);
    expect(smoothCents(Number.NaN, 4)).toBe(4);
  });
});
