import { describe, expect, it } from 'vitest';
import { OnsetGate, evaluatePitch } from './pitchMatch';

describe('evaluatePitch', () => {
  it('erkennt Treffer, Oktave, knapp daneben und falsch', () => {
    expect(evaluatePitch([40], { midi: 40, cents: 12 }, 30)).toMatchObject({ kind: 'match', cents: 12 });
    expect(evaluatePitch([40], { midi: 52, cents: 0 }, 30)).toMatchObject({ kind: 'octave', expected: 40 });
    expect(evaluatePitch([40], { midi: 41, cents: 0 }, 30)).toMatchObject({ kind: 'near', direction: 'hoch' });
    expect(evaluatePitch([40], { midi: 47, cents: 0 }, 30)).toMatchObject({ kind: 'wrong', expected: 40 });
    expect(evaluatePitch([40, 45, 50], { midi: 45, cents: -5 }, 30)).toMatchObject({ kind: 'match', midi: 45 });
  });
});

describe('OnsetGate', () => {
  it('sperrt nach einem Treffer und gibt bei Pegelabfall oder Sprung wieder frei', () => {
    const g = new OnsetGate();
    expect(g.update(0.1, 0, true)).toBe(true);
    g.disarm(0.1);
    expect(g.update(0.09, 10, true)).toBe(false);
    expect(g.update(0.3, 20, true)).toBe(true); // sprunghafter Anstieg = neuer Anschlag
    g.disarm(0.3);
    expect(g.update(0.1, 30, true)).toBe(false);
    expect(g.update(0.1, 200, true)).toBe(true); // lange unter der Schwelle
  });
});
