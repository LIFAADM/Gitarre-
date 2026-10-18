import { describe, expect, it } from 'vitest';
import { buildPlaybackPlan } from './playback';
import { validateScore } from './score';
import { simplifyScore } from './simplify';
import { parseTabNotation } from './tabNotation';

describe('Automatische Vereinfachung', () => {
  it('macht Akkorde monophon, entfernt Techniken und fasst Sechzehntel zusammen', () => {
    const score = parseTabNotation('(0.1 0.2 0.3).4 2.3.16 4.3.16 2.3.8h 3.2.4v 5.2.4 |', { tempo: 100 });
    const simple = simplifyScore(score, { maxFret: 4 });
    expect(validateScore(simple)).toEqual([]);
    const beats = simple.tracks[0]!.bars[0]!.voices[0]!;
    expect(beats[0]!.notes).toHaveLength(1);
    expect(beats[0]!.notes[0]!.midi).toBe(64); // höchster Ton des Akkords
    expect(beats[1]!.duration.base).toBe(8); // zwei 16tel → ein 8tel
    expect(beats[1]!.notes[0]!.fret).toBe(2);
    expect(beats.every((b) => b.notes.every((n) => !n.techniques || n.techniques.length === 0))).toBe(true);
    const relocated = beats[beats.length - 1]!.notes[0]!;
    expect(relocated).toMatchObject({ string: 1, fret: 0, midi: 64 }); // E4 von Saite 2/Bund 5 auf die leere hohe E-Saite verlegt
    // unerreichbare Töne bleiben, wo sie sind
    const high = simplifyScore(parseTabNotation('10.1.1 |', { tempo: 100 }), { maxFret: 4 }).tracks[0]!.bars[0]!.voices[0]![0]!.notes[0]!;
    expect(high).toMatchObject({ string: 1, fret: 10 });
    expect(simple.tracks[0]!.name).toMatch(/vereinfacht/);
    expect(simple.notes).toMatch(/keine originalgetreue/);
    expect(buildPlaybackPlan(simple).totalSec).toBeCloseTo(buildPlaybackPlan(score).totalSec, 9);
  });

  it('behält Bindungen zwischen gleichen Tönen und entfernt verwaiste', () => {
    const score = parseTabNotation('0.1.2~ 0.1.4 (0.1 1.2).4~ | 1.2.1 |', { tempo: 100 });
    const simple = simplifyScore(score);
    expect(validateScore(simple)).toEqual([]);
    const [bar1, bar2] = simple.tracks[0]!.bars;
    expect(bar1!.voices[0]![1]!.notes[0]!.tieFromPrevious).toBe(true);
    // Akkord (0.1 1.2) → höchster Ton E4 bleibt; Bindung zu C4 im nächsten Takt verfällt
    expect(bar1!.voices[0]![2]!.notes[0]!.tieToNext).toBeUndefined();
    expect(bar2!.voices[0]![0]!.notes[0]!.tieFromPrevious).toBeUndefined();
  });
});
