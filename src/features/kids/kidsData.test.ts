import { describe, expect, it } from 'vitest';
import { noteName } from '@/core/music/notes';
import { KIDS_SONGS, KIDS_STRINGS, makeListenRound, midiOf, mulberry32, parentQuestion, positionPhrase, rhythmScore, starsFor } from './kidsData';

describe('Kinderlieder', () => {
  it('liegen alle in der ersten Lage (Bünde 0–3) und auf gültigen Saiten', () => {
    for (const song of KIDS_SONGS) {
      expect(song.notes.length).toBeGreaterThan(5);
      for (const note of song.notes) {
        expect(note.string).toBeGreaterThanOrEqual(1);
        expect(note.string).toBeLessThanOrEqual(6);
        expect(note.fret).toBeGreaterThanOrEqual(0);
        expect(note.fret).toBeLessThanOrEqual(3);
        expect(note.beats).toBeGreaterThan(0);
      }
    }
  });

  it('„Alle meine Entchen“ beginnt mit C D E F G G', () => {
    const song = KIDS_SONGS.find((s) => s.id === 'alle-meine-entchen')!;
    expect(song.notes.slice(0, 6).map((x) => noteName(midiOf(x.string, x.fret), 'de'))).toEqual(['C', 'D', 'E', 'F', 'G', 'G']);
  });

  it('„Bruder Jakob“ endet auf C, tiefes G, C', () => {
    const song = KIDS_SONGS.find((s) => s.id === 'bruder-jakob')!;
    expect(song.notes.slice(-3).map((x) => noteName(midiOf(x.string, x.fret), 'de'))).toEqual(['C', 'G', 'C']);
    expect(song.notes[song.notes.length - 2]!.string).toBe(6);
  });

  it('kennt sechs Farben mit eindeutigen Saiten', () => {
    expect(new Set(KIDS_STRINGS.map((s) => s.number)).size).toBe(6);
    expect(positionPhrase(4, 0)).toBe('Gelbe Saite.');
    expect(positionPhrase(4, 2)).toBe('Gelbe Saite, zweiter Bund.');
    expect(positionPhrase(6, 3)).toBe('Rote Saite, dritter Bund.');
  });
});

describe('Spielrunden', () => {
  it('sind reproduzierbar und wiederholen die vorige Saite nicht direkt', () => {
    const a = makeListenRound(1, mulberry32(7));
    const b = makeListenRound(1, mulberry32(7));
    expect(a).toEqual(b);
    expect(a).toHaveLength(1);
    const two = makeListenRound(4, mulberry32(3));
    expect(two).toHaveLength(2);
    expect(two[0]).not.toBe(two[1]);
    for (let seed = 0; seed < 50; seed++) expect(makeListenRound(2, mulberry32(seed), [6])[0]).not.toBe(6);
  });
});

describe('Rhythmus', () => {
  it('zählt Treffer innerhalb der Toleranz, jeden Anschlag nur einmal', () => {
    const beats = [0, 1, 2, 3];
    expect(rhythmScore(beats, [0.05, 1.1, 2.9, 3.02]).hits).toBe(3);
    expect(rhythmScore(beats, [0.05, 0.1, 0.15]).hits).toBe(1);
    expect(rhythmScore(beats, []).hits).toBe(0);
    expect(rhythmScore(beats, [0, 1, 2, 3]).meanOffsetSec).toBe(0);
  });
  it('vergibt Sterne nach Anteil', () => {
    expect(starsFor(16, 16)).toBe(3);
    expect(starsFor(10, 16)).toBe(2);
    expect(starsFor(3, 16)).toBe(1);
    expect(starsFor(0, 16)).toBe(0);
  });
});

describe('Elternfrage', () => {
  it('stellt Summen zweier Zahlen zwischen 4 und 9', () => {
    for (let s = 0; s < 20; s++) {
      const q = parentQuestion(mulberry32(s));
      expect(q.a).toBeGreaterThanOrEqual(4);
      expect(q.b).toBeLessThanOrEqual(9);
      expect(q.answer).toBe(q.a + q.b);
      expect(q.text).toContain(`${q.a} + ${q.b}`);
    }
  });
});
