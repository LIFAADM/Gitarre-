import { describe, expect, it } from 'vitest';
import type { Summary } from '../progress/stats';
import { DAILY_TIPS, LISTEN_TIPS, ListenCoach, TipGate, TunerCoach, dailyTip, listenResultTip, playthroughTip, startTip } from './coach';

const E6 = [{ string: 6, fret: 0, midi: 40 }];
const C5 = [{ string: 5, fret: 3, midi: 48 }];

describe('TipGate', () => {
  it('hält Mindestabstand ein und gibt jede ID nur einmal', () => {
    const g = new TipGate(1000);
    const a = { id: 'a', text: 'A', kind: 'hint' as const };
    const b = { id: 'b', text: 'B', kind: 'hint' as const };
    expect(g.offer(a, 0)).toBe(a);
    expect(g.offer(b, 500)).toBeNull();
    expect(g.offer(b, 1200)).toBe(b);
    expect(g.offer(a, 5000)).toBeNull();
    expect(g.offer(a, 5000, true)).toBe(a);
  });
});

describe('ListenCoach', () => {
  it('reagiert nicht auf einen einzelnen Fehler, aber auf wiederholte Muster', () => {
    const c = new ListenCoach();
    expect(c.observe({ verdict: { kind: 'near', direction: 'tief', cents: -100 }, expected: C5 }, 0)).toBeNull();
    expect(c.observe({ verdict: { kind: 'near', direction: 'tief', cents: -95 }, expected: C5 }, 1000)?.id).toBe(LISTEN_TIPS.oneFret.id);
  });

  it('erkennt Nachbarsaite, Oktave, Druckprobleme und verstimmte Leersaiten', () => {
    const c = new ListenCoach();
    expect(c.observe({ verdict: { kind: 'wrong', midi: 53 }, expected: C5 }, 0)).toBeNull();
    expect(c.observe({ verdict: { kind: 'wrong', midi: 43 }, expected: C5 }, 100)?.id).toBe(LISTEN_TIPS.neighbour.id);
    c.reset();
    c.observe({ verdict: { kind: 'octave' }, expected: C5 }, 0);
    expect(c.observe({ verdict: { kind: 'octave' }, expected: C5 }, 100)?.id).toBe(LISTEN_TIPS.octave.id);
    c.reset();
    c.observe({ verdict: { kind: 'near', direction: 'tief', cents: -40 }, expected: C5 }, 0);
    expect(c.observe({ verdict: { kind: 'near', direction: 'tief', cents: -35 }, expected: C5 }, 100)?.id).toBe(LISTEN_TIPS.pressLow.id);
    c.reset();
    c.observe({ verdict: { kind: 'near', direction: 'hoch', cents: 40 }, expected: C5 }, 0);
    expect(c.observe({ verdict: { kind: 'near', direction: 'hoch', cents: 45 }, expected: C5 }, 100)?.id).toBe(LISTEN_TIPS.pressHigh.id);
    c.reset();
    c.observe({ verdict: { kind: 'near', direction: 'tief', cents: -40 }, expected: E6 }, 0);
    expect(c.observe({ verdict: { kind: 'near', direction: 'hoch', cents: 35 }, expected: E6 }, 100)?.id).toBe(LISTEN_TIPS.retune.id);
  });

  it('rät nach drei Fehlern in Folge zur Pause und lobt Serien', () => {
    const c = new ListenCoach();
    c.observe({ verdict: { kind: 'wrong', midi: 60 }, expected: C5 }, 0);
    c.observe({ verdict: { kind: 'octave' }, expected: C5 }, 100);
    expect(c.observe({ verdict: { kind: 'wrong', midi: 61 }, expected: C5 }, 200)?.id).toBe(LISTEN_TIPS.slowDown.id);
    // Abstand: direkt danach kein weiterer Tipp
    expect(c.observe({ verdict: { kind: 'wrong', midi: 61 }, expected: C5 }, 300)).toBeNull();
    c.reset();
    for (let i = 0; i < 4; i++) expect(c.observe({ verdict: { kind: 'match' }, expected: C5 }, i * 100)).toBeNull();
    expect(c.observe({ verdict: { kind: 'match' }, expected: C5 }, 500)?.kind).toBe('praise');
  });

  it('meldet fehlendes Signal erst nach sechs Sekunden', () => {
    const c = new ListenCoach();
    expect(c.noSignal(3000, 0)).toBeNull();
    expect(c.noSignal(6500, 0)?.id).toBe(LISTEN_TIPS.noSignal.id);
  });

  it('bewertet das Ergebnis mit Taktangaben', () => {
    expect(listenResultTip(0, 0)).toBeNull();
    expect(listenResultTip(10, 10)?.kind).toBe('praise');
    expect(listenResultTip(7, 10, [5, 5, 2])?.text).toContain('die Takte 2, 5');
    expect(listenResultTip(2, 10, [3])?.text).toContain('Takt 3');
  });
});

describe('TunerCoach', () => {
  const reading = (over: Partial<Parameters<TunerCoach['update']>[0] & object>) => ({ stringNumber: 6, name: 'E', direction: 'low' as const, cents: -20, farOff: false, nearestName: 'E2', ...over });

  it('erklärt weit entfernte Töne nach kurzer Stabilität', () => {
    const c = new TunerCoach();
    expect(c.update(reading({ farOff: true, nearestName: 'D3', cents: 500 }), 0)).toBeNull();
    const tip = c.update(reading({ farOff: true, nearestName: 'D3', cents: 500 }), 1600);
    expect(tip?.text).toContain('klingt nach D3');
  });

  it('erkennt Überdrehen (zu tief, zu hoch, zu tief)', () => {
    const c = new TunerCoach();
    expect(c.update(reading({ direction: 'low' }), 0)).toBeNull();
    expect(c.update(reading({ direction: 'high', cents: 20 }), 3000)).toBeNull();
    expect(c.update(reading({ direction: 'low' }), 6000)?.id).toBe('tuner-overshoot-6');
  });

  it('erkennt zurückrutschende Saiten und rät bei langem Abstand zu mutigerem Drehen', () => {
    const c = new TunerCoach();
    c.update(reading({ direction: 'ok', cents: 0 }), 0);
    expect(c.update(reading({ direction: 'low', cents: -25 }), 20_000)?.id).toBe('tuner-slip-6');
    const d = new TunerCoach();
    expect(d.update(reading({ cents: -45 }), 0)).toBeNull();
    expect(d.update(reading({ cents: -44 }), 6000)).toBeNull();
    expect(d.update(reading({ cents: -46 }), 13_000)?.id).toBe('tuner-bolder-6');
  });
});

describe('Player-Tipps', () => {
  it('schlägt den nächsten Temposchritt vor', () => {
    expect(playthroughTip(0.5).text).toContain('75 %');
    expect(playthroughTip(0.75).text).toContain('Originaltempo');
    expect(playthroughTip(1).kind).toBe('praise');
    expect(startTip({ completedPlaythroughs: 0, tempoFactor: 1, bars: 12 })?.id).toBe('play-start-slow');
    expect(startTip({ completedPlaythroughs: 1, tempoFactor: 1, bars: 12 })).toBeNull();
    expect(startTip({ completedPlaythroughs: 0, tempoFactor: 0.5, bars: 12 })).toBeNull();
  });
});

describe('dailyTip', () => {
  const base: Summary = { totalMinutes: 0, todayMinutes: 0, weekMinutes: 0, streak: 0, practiceDays: 0, lessonsDone: 0, songsCompleted: 0, bestAccuracy: null };
  it('ist pro Tag stabil und wechselt täglich', () => {
    const day = 86_400_000;
    const a = dailyTip({ now: 20_000 * day + 1000, summary: base });
    const b = dailyTip({ now: 20_000 * day + 50_000_000, summary: base });
    const c = dailyTip({ now: 20_001 * day + 1000, summary: base });
    expect(a.id).toBe(b.id);
    expect(a.id).not.toBe(c.id);
    expect(DAILY_TIPS).toContain(a.text);
  });
  it('bevorzugt Hinweise aus echten Daten', () => {
    expect(dailyTip({ now: 0, summary: { ...base, practiceDays: 4, streak: 0 } }).id).toBe('daily-habit');
    expect(dailyTip({ now: 0, summary: { ...base, todayMinutes: 50, streak: 1 } }).id).toBe('daily-break');
    expect(dailyTip({ now: 0, summary: { ...base, practiceDays: 2, streak: 1, bestAccuracy: 40 } }).id).toBe('daily-slow');
    expect(dailyTip({ now: 0, summary: { ...base, practiceDays: 7, streak: 7 } }).id).toBe('daily-streak');
  });
});
