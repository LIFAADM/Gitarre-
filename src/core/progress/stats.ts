import type { LessonProgressRecord, PracticeSessionRecord, SongProgressRecord } from '../storage/types';

/** Reine Statistik-Funktionen über gespeicherte Übungssitzungen (keine erfundenen Werte). */

export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function minutesOf(sessions: PracticeSessionRecord[]): number {
  return sessions.reduce((sum, s) => sum + s.durationSec, 0) / 60;
}

export function sessionsOnDay(sessions: PracticeSessionRecord[], timestamp: number): PracticeSessionRecord[] {
  const key = dayKey(timestamp);
  return sessions.filter((s) => dayKey(s.startedAt) === key);
}

export interface DayMinutes {
  key: string;
  date: number;
  minutes: number;
  weekdayShort: string;
}

/** Minuten pro Tag für die letzten `days` Tage (ältester zuerst). */
export function minutesPerDay(sessions: PracticeSessionRecord[], days: number, now = Date.now()): DayMinutes[] {
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(dayKey(s.startedAt), (byDay.get(dayKey(s.startedAt)) ?? 0) + s.durationSec / 60);
  const result: DayMinutes[] = [];
  const today = startOfDay(now);
  for (let i = days - 1; i >= 0; i--) {
    const date = today - i * 86_400_000;
    const key = dayKey(date);
    result.push({ key, date, minutes: byDay.get(key) ?? 0, weekdayShort: new Date(date).toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '') });
  }
  return result;
}

/** Anzahl aufeinanderfolgender Übungstage bis heute (oder gestern, wenn heute noch nicht geübt wurde). */
export function computeStreak(sessions: PracticeSessionRecord[], now = Date.now(), minMinutes = 1): number {
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(dayKey(s.startedAt), (byDay.get(dayKey(s.startedAt)) ?? 0) + s.durationSec / 60);
  let day = startOfDay(now);
  if ((byDay.get(dayKey(day)) ?? 0) < minMinutes) day -= 86_400_000;
  let streak = 0;
  while ((byDay.get(dayKey(day)) ?? 0) >= minMinutes) {
    streak++;
    day -= 86_400_000;
  }
  return streak;
}

export function practiceDays(sessions: PracticeSessionRecord[], minMinutes = 1): number {
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(dayKey(s.startedAt), (byDay.get(dayKey(s.startedAt)) ?? 0) + s.durationSec / 60);
  return [...byDay.values()].filter((m) => m >= minMinutes).length;
}

export interface Summary {
  totalMinutes: number;
  todayMinutes: number;
  weekMinutes: number;
  streak: number;
  practiceDays: number;
  lessonsDone: number;
  songsCompleted: number;
  bestAccuracy: number | null;
}

export function summarize(sessions: PracticeSessionRecord[], lessons: LessonProgressRecord[], songs: SongProgressRecord[], now = Date.now()): Summary {
  const weekStart = startOfDay(now) - 6 * 86_400_000;
  const accuracies = sessions
    .filter((s) => s.details?.notesTotal && s.details.notesTotal > 0)
    .map((s) => ((s.details!.notesCorrect ?? 0) / s.details!.notesTotal!) * 100);
  return {
    totalMinutes: minutesOf(sessions),
    todayMinutes: minutesOf(sessionsOnDay(sessions, now)),
    weekMinutes: minutesOf(sessions.filter((s) => s.startedAt >= weekStart)),
    streak: computeStreak(sessions, now),
    practiceDays: practiceDays(sessions),
    lessonsDone: lessons.filter((l) => l.status === 'done').length,
    songsCompleted: songs.filter((s) => s.completedPlaythroughs > 0).length,
    bestAccuracy: accuracies.length ? Math.max(...accuracies) : null,
  };
}

/** Schwierige Passagen: Übungen/Songs mit niedriger Trefferquote in der Mikrofon-Kontrolle. */
export function difficultItems(sessions: PracticeSessionRecord[], limit = 5): Array<{ refId: string; title: string; accuracy: number; attempts: number; lastAt: number }> {
  const map = new Map<string, { refId: string; title: string; correct: number; total: number; attempts: number; lastAt: number }>();
  for (const s of sessions) {
    if (s.kind !== 'listen' || !s.refId || !s.details?.notesTotal) continue;
    const entry = map.get(s.refId) ?? { refId: s.refId, title: s.title ?? s.refId, correct: 0, total: 0, attempts: 0, lastAt: 0 };
    entry.correct += s.details.notesCorrect ?? 0;
    entry.total += s.details.notesTotal;
    entry.attempts++;
    entry.lastAt = Math.max(entry.lastAt, s.startedAt);
    map.set(s.refId, entry);
  }
  return [...map.values()]
    .map((e) => ({ refId: e.refId, title: e.title, accuracy: e.total > 0 ? (e.correct / e.total) * 100 : 0, attempts: e.attempts, lastAt: e.lastAt }))
    .filter((e) => e.accuracy < 80)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}
