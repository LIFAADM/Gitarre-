import { describe, expect, it } from 'vitest';
import { OnsetGate, evaluatePitch, summarizeResults } from './listenLogic';

describe('Spiel-mit-Logik', () => {
  it('erkennt Treffer innerhalb der Toleranz', () => {
    expect(evaluatePitch([64], { midi: 64, cents: 12 }, 30)).toMatchObject({ kind: 'match', midi: 64 });
    expect(evaluatePitch([64], { midi: 64, cents: 40 }, 30)).toMatchObject({ kind: 'near', direction: 'hoch' });
    expect(evaluatePitch([64], { midi: 63, cents: 10 }, 30)).toMatchObject({ kind: 'near', direction: 'tief' });
  });

  it('unterscheidet Oktavfehler und falsche Töne', () => {
    expect(evaluatePitch([64], { midi: 52, cents: 0 }, 30)).toMatchObject({ kind: 'octave' });
    expect(evaluatePitch([64], { midi: 57, cents: 0 }, 30)).toMatchObject({ kind: 'wrong', expected: 64 });
  });

  it('wertet bei Akkorden den nächstgelegenen erwarteten Ton', () => {
    expect(evaluatePitch([52, 59, 64], { midi: 59, cents: -5 }, 30)).toMatchObject({ kind: 'match', midi: 59 });
  });

  it('fasst Ergebnisse zusammen', () => {
    expect(summarizeResults(['correct', 'correct', 'skipped', 'pending'])).toEqual({ total: 4, correct: 2, skipped: 1, accuracy: 50 });
  });

  it('Onset-Gate wertet erst nach Pegelabfall oder neuem Anschlag erneut', () => {
    const gate = new OnsetGate();
    expect(gate.isArmed).toBe(true);
    gate.disarm(0.1);
    expect(gate.update(0.09, 0, true)).toBe(false);
    expect(gate.update(0.08, 50, true)).toBe(false);
    // Abfall unter 45 % für 150 ms
    expect(gate.update(0.03, 100, true)).toBe(false);
    expect(gate.update(0.03, 260, true)).toBe(true);
    // neuer Anschlag: Pegelsprung
    const gate2 = new OnsetGate();
    gate2.disarm(0.1);
    gate2.update(0.07, 0, true);
    expect(gate2.update(0.2, 40, true)).toBe(true);
  });
});
