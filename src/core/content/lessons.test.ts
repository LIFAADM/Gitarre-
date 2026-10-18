import { describe, expect, it } from 'vitest';
import { getExercise } from './exercises';
import { ALL_LESSONS, CHAPTERS, getLesson, levelLabel, nextLesson } from './lessons';
import { BUILTIN_SONGS } from './songs';
import { parseTabNotation } from '../music/tabNotation';
import { validateScore } from '../music/score';

describe('Gitarrenschule', () => {
  it('hat sieben Kapitel mit echten Lektionen', () => {
    expect(CHAPTERS).toHaveLength(7);
    expect(ALL_LESSONS.length).toBeGreaterThanOrEqual(40);
    const ids = new Set<string>();
    for (const lesson of ALL_LESSONS) {
      expect(ids.has(lesson.id), `doppelte ID ${lesson.id}`).toBe(false);
      ids.add(lesson.id);
      expect(lesson.content.length, lesson.id).toBeGreaterThan(200);
      expect(lesson.practice.length, lesson.id).toBeGreaterThan(30);
      expect(lesson.goal.length).toBeGreaterThan(10);
      expect(lesson.minutes).toBeGreaterThan(0);
    }
  });

  it('verweist nur auf existierende Übungen und Songs', () => {
    for (const lesson of ALL_LESSONS) {
      const ex = lesson.exercise;
      if (ex.kind === 'exercise') expect(getExercise(ex.exerciseId), `${lesson.id}: ${ex.exerciseId}`).toBeDefined();
      if (ex.kind === 'song') {
        const song = BUILTIN_SONGS.find((s) => s.id === ex.songId);
        expect(song, `${lesson.id}: ${ex.songId}`).toBeDefined();
        expect(song!.versions.length).toBeGreaterThan(0);
        if (ex.versionLabel) expect(song!.versions.some((v) => v.label === ex.versionLabel)).toBe(true);
      }
      if (ex.kind === 'tab') {
        const score = parseTabNotation(ex.notation, { tempo: ex.tempo, timeSignature: ex.timeSignature });
        expect(validateScore(score), lesson.id).toEqual([]);
      }
    }
  });

  it('kennt Reihenfolge und Lernniveau', () => {
    expect(getLesson('k1-l1-aufbau')).toBeDefined();
    expect(nextLesson('k1-l1-aufbau')?.id).toBe('k1-l2-nylonsaiten');
    expect(levelLabel(new Set()).label).toBe('Einsteiger');
    const done = new Set(CHAPTERS[0]!.lessons.map((l) => l.id));
    expect(levelLabel(done).chapterNumber).toBe(1);
  });
});
