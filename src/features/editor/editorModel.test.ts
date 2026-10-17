import { describe, expect, it } from 'vitest';
import { validateScore } from '@/core/music/score';
import { docToScore, scoreToDoc, type EditorDoc } from './editorModel';

describe('Tab-Editor-Modell', () => {
  it('erzeugt gültige Takte und füllt mit Pausen auf', () => {
    const doc: EditorDoc = {
      title: 'Test',
      tempo: 100,
      timeSignature: [4, 4],
      beats: [
        { duration: { base: 4 }, notes: [{ string: 1, fret: 0 }] },
        { duration: { base: 4 }, notes: [{ string: 2, fret: 1 }] },
        { duration: { base: 2 }, notes: [] },
        { duration: { base: 2 }, notes: [{ string: 3, fret: 2 }] },
        { duration: { base: 1 }, notes: [{ string: 1, fret: 3 }] },
      ],
    };
    const score = docToScore(doc);
    expect(validateScore(score)).toEqual([]);
    expect(score.masterBars).toHaveLength(3);
    expect(score.tracks[0]!.bars[1]!.voices[0]!.map((b) => b.durationTicks)).toEqual([1920, 1920]);
    expect(score.tracks[0]!.bars[1]!.voices[0]![1]!.isRest).toBe(true);
    const back = scoreToDoc(score);
    expect(back.beats.length).toBeGreaterThanOrEqual(5);
    expect(back.beats[0]!.notes[0]).toEqual({ string: 1, fret: 0 });
  });

  it('liefert auch ohne Noten einen gültigen leeren Takt', () => {
    const score = docToScore({ title: 'Leer', tempo: 80, timeSignature: [3, 4], beats: [] });
    expect(validateScore(score)).toEqual([]);
    expect(score.masterBars).toHaveLength(1);
  });
});
