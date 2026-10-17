import { describe, expect, it } from 'vitest';
import { parseTabNotation } from './tabNotation';
import { validateScore } from './score';

describe('Tab-Notation', () => {
  it('parst Noten, Pausen und Akkorde mit Dauern', () => {
    const score = parseTabNotation('0.1.4 1.2.8 r.8 (0.3 2.4).2 |', { tempo: 100 });
    const beats = score.tracks[0]!.bars[0]!.voices[0]!;
    expect(beats).toHaveLength(4);
    expect(beats[0]!.notes[0]).toMatchObject({ string: 1, fret: 0, midi: 64, finger: 0 });
    expect(beats[0]!.durationTicks).toBe(960);
    expect(beats[1]!.notes[0]).toMatchObject({ string: 2, fret: 1, midi: 60, finger: 1 });
    expect(beats[1]!.startTick).toBe(960);
    expect(beats[2]!.isRest).toBe(true);
    expect(beats[3]!.notes).toHaveLength(2);
    expect(beats[3]!.notes[1]).toMatchObject({ string: 4, fret: 2, midi: 52 });
    expect(validateScore(score)).toEqual([]);
  });

  it('unterstützt Punktierungen, Triolen, Bindungen und Techniken', () => {
    const score = parseTabNotation('3.2.4d 0.1.8 2.3.8t3 2.3.8t3 2.3.8t3 0.1.4~ | 0.1.4 2.3.8h 4.3.8 r.2 |', { tempo: 80 });
    const [bar1, bar2] = score.tracks[0]!.bars;
    const b1 = bar1!.voices[0]!;
    expect(b1[0]!.durationTicks).toBe(1440);
    expect(b1[2]!.durationTicks).toBe(320);
    expect(b1[5]!.notes[0]!.tieToNext).toBe(true);
    const b2 = bar2!.voices[0]!;
    expect(b2[0]!.notes[0]!.tieFromPrevious).toBe(true);
    expect(b2[1]!.notes[0]!.techniques).toEqual(['hammer-on']);
    expect(validateScore(score)).toEqual([]);
  });

  it('verarbeitet Abschnitte, Taktart-, Tempo- und Wiederholungsanweisungen', () => {
    const score = parseTabNotation('{Intro} [ts 3/4] [ro] 0.1.4 0.1.4 0.1.4 | [rc 2] 1.2.2 r.4 | [tempo 60] [ts 4/4] 3.1.1 |', {
      tempo: 90,
      title: 'Test',
    });
    expect(score.masterBars).toHaveLength(3);
    expect(score.masterBars[0]).toMatchObject({ section: 'Intro', repeatStart: true, timeSignature: { numerator: 3, denominator: 4 } });
    expect(score.masterBars[1]!.repeatCount).toBe(2);
    expect(score.masterBars[2]).toMatchObject({ tempo: 60, timeSignature: { numerator: 4, denominator: 4 } });
    expect(validateScore(score)).toEqual([]);
  });

  it('meldet Fehler verständlich', () => {
    expect(() => parseTabNotation('9.9.4 |', { tempo: 100 })).toThrow(/Griffposition/);
    expect(() => parseTabNotation('3.2.5 |', { tempo: 100 })).toThrow(/Notendauer/);
    expect(() => parseTabNotation('[foo] 3.2.4 |', { tempo: 100 })).toThrow(/Unbekannte Anweisung/);
  });

  it('erkennt falsche Taktlängen bei der Validierung', () => {
    const score = parseTabNotation('0.1.4 0.1.4 |', { tempo: 100, timeSignature: [4, 4] });
    expect(validateScore(score)[0]).toMatch(/Takt 1/);
  });
});
