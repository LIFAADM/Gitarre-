import { describe, expect, it } from 'vitest';
import { KIDS_SONGS, mulberry32 } from './kidsData';
import { KIDS_LESSONS, isLessonUnlocked, lessonAfter, nextKidsLesson, pickCheckTarget } from './kidsCurriculum';

describe('Kinder-Schule', () => {
  it('folgt dem Prinzip Erklären → Vormachen → Nachmachen → Üben/Verstehen', () => {
    expect(KIDS_LESSONS.length).toBeGreaterThanOrEqual(10);
    for (const l of KIDS_LESSONS) {
      const kinds = l.steps.map((s) => s.kind);
      expect(kinds[0]).toBe('explain');
      expect(kinds).toContain('show');
      expect(kinds).toContain('imitate');
      expect(kinds.indexOf('show')).toBeLessThan(kinds.indexOf('imitate'));
      expect(kinds.some((k) => k === 'practice' || k === 'check' || k === 'song')).toBe(true);
      for (const s of l.steps) {
        expect(s.speak.length).toBeGreaterThan(10);
        if (s.kind === 'song') expect(KIDS_SONGS.some((song) => song.id === s.songId)).toBe(true);
        if (s.kind === 'imitate' || s.kind === 'show' || s.kind === 'practice') for (const tg of s.targets) expect(tg.fret).toBeLessThanOrEqual(3);
      }
    }
    expect(new Set(KIDS_LESSONS.map((l) => l.id)).size).toBe(KIDS_LESSONS.length);
  });

  it('schaltet Lektionen nacheinander frei', () => {
    expect(isLessonUnlocked('start', [])).toBe(true);
    expect(isLessonUnlocked('saite-6', [])).toBe(false);
    expect(isLessonUnlocked('saite-6', ['start'])).toBe(true);
    expect(isLessonUnlocked('saite-5', ['start'])).toBe(false);
    expect(nextKidsLesson([])?.id).toBe('start');
    expect(nextKidsLesson(['start', 'saite-6'])?.id).toBe('saite-5');
    expect(lessonAfter('start')?.id).toBe('saite-6');
    expect(lessonAfter('jakob')).toBeUndefined();
  });

  it('wählt beim Verstehen nicht zweimal dasselbe Ziel', () => {
    const pool = [
      { string: 6, fret: 0 },
      { string: 5, fret: 0 },
    ];
    const rng = mulberry32(5);
    let prev = pickCheckTarget(pool, rng);
    for (let i = 0; i < 20; i++) {
      const next = pickCheckTarget(pool, rng, prev);
      expect(next).not.toEqual(prev);
      prev = next;
    }
  });
});
