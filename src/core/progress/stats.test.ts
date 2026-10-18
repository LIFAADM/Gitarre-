import { describe, expect, it } from 'vitest';
import type { PracticeSessionRecord } from '../storage/types';
import { evaluateAchievements } from './achievements';
import { buildRecommendations } from './recommendations';
import { computeStreak, difficultItems, minutesPerDay, summarize } from './stats';

const DAY = 86_400_000;
const now = new Date(2026, 9, 17, 18, 0, 0).getTime();

function session(daysAgo: number, minutes: number, kind: PracticeSessionRecord['kind'] = 'song', extra: Partial<PracticeSessionRecord> = {}): PracticeSessionRecord {
  const startedAt = now - daysAgo * DAY - minutes * 60_000;
  return { startedAt, endedAt: startedAt + minutes * 60_000, durationSec: minutes * 60, kind, ...extra };
}

describe('Statistiken', () => {
  it('berechnet Serie, Tagesminuten und Zusammenfassung aus echten Sitzungen', () => {
    const sessions = [session(0, 12), session(1, 5), session(2, 20), session(4, 10)];
    expect(computeStreak(sessions, now)).toBe(3);
    const days = minutesPerDay(sessions, 7, now);
    expect(days).toHaveLength(7);
    expect(days[6]!.minutes).toBeCloseTo(12);
    expect(days[5]!.minutes).toBeCloseTo(5);
    const summary = summarize(sessions, [{ lessonId: 'a', status: 'done', attempts: 1, totalSec: 0 }], [{ songId: 's', progressPercent: 50, bestTempoFactor: 0.5, practiceCount: 1, totalSec: 0, lastPracticedAt: now, completedPlaythroughs: 1 }], now);
    expect(summary.totalMinutes).toBeCloseTo(47);
    expect(summary.todayMinutes).toBeCloseTo(12);
    expect(summary.lessonsDone).toBe(1);
    expect(summary.songsCompleted).toBe(1);
    expect(summary.practiceDays).toBe(4);
  });

  it('Serie bricht ab, wenn gestern nicht geübt wurde', () => {
    expect(computeStreak([session(2, 10), session(3, 10)], now)).toBe(0);
    expect(computeStreak([session(1, 10), session(2, 10)], now)).toBe(2);
  });

  it('findet schwierige Passagen aus Spiel-mit-Sitzungen', () => {
    const sessions = [
      session(0, 3, 'listen', { refId: 'ex-a', title: 'Übung A', details: { notesTotal: 20, notesCorrect: 8 } }),
      session(1, 3, 'listen', { refId: 'ex-b', title: 'Übung B', details: { notesTotal: 20, notesCorrect: 19 } }),
    ];
    const items = difficultItems(sessions);
    expect(items).toHaveLength(1);
    expect(items[0]!.refId).toBe('ex-a');
    expect(items[0]!.accuracy).toBeCloseTo(40);
  });

  it('empfiehlt Stimmen, nächste Lektion und ein Lied', () => {
    const recs = buildRecommendations({
      sessions: [],
      lessonProgress: [{ lessonId: 'k1-l1-aufbau', status: 'done', attempts: 1, totalSec: 60 }],
      songProgress: [],
      songs: [{ id: 'happy-birthday', title: 'Happy Birthday', artist: 'x', genre: 'Geburtstag', difficulty: 1, rightsStatus: 'public-domain', isBuiltin: true, isFavorite: false, createdAt: 0, updatedAt: 0, goalTier: 'anfaenger' }],
      playableSongIds: new Set(['happy-birthday']),
      now,
    });
    expect(recs.map((r) => r.kind)).toEqual(['tune', 'lesson', 'song']);
    expect(recs[1]!.href).toBe('/lernen/k1-l2-nylonsaiten');
  });

  it('wertet Erfolge nur aus echten Daten', () => {
    expect(evaluateAchievements({ sessions: [], lessons: [], songs: [], now }).size).toBe(0);
    const unlocked = evaluateAchievements({
      sessions: [session(0, 12, 'tuner', { details: { completed: true } })],
      lessons: [{ lessonId: 'k2-l7-tonfolgen', status: 'done', attempts: 1, totalSec: 0 }],
      songs: [{ songId: 's', progressPercent: 85, bestTempoFactor: 1, practiceCount: 3, totalSec: 0, lastPracticedAt: now, completedPlaythroughs: 2 }],
      now,
    });
    expect([...unlocked].sort()).toEqual(['first-10-minutes', 'first-melody', 'first-song', 'first-tuned', 'full-tempo']);
  });
});
