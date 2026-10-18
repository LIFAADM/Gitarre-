import { describe, expect, it } from 'vitest';
import { parseTabNotation } from '@/core/music/tabNotation';
import { kidSongFromScore } from './kidsLibrary';

describe('kidSongFromScore', () => {
  it('übernimmt Stimme 1 mit höchstem Ton je Schlag und Dauern in Vierteln', () => {
    const score = parseTabNotation('0.1.4 r.4 (0.3 2.4).8 0.1.8 | 3.2.2 0.1.2~ | 0.1.4 |', { tempo: 90, timeSignature: [4, 4], title: 'T' });
    const song = kidSongFromScore('x', 'Test', score);
    expect(song.tempo).toBe(90);
    expect(song.notes.map((n) => [n.string, n.fret, n.beats])).toEqual([
      [1, 0, 1],
      [3, 0, 0.5],
      [1, 0, 0.5],
      [2, 3, 2],
      [1, 0, 2],
    ]);
  });
});
