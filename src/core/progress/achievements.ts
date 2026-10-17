import type { AchievementRecord, LessonProgressRecord, PracticeSessionRecord, SongProgressRecord } from '../storage/types';
import { computeStreak, minutesOf } from './stats';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-tuned', title: 'Erste gestimmte Gitarre', description: 'Alle sechs Saiten mit dem Stimmgerät gestimmt.' },
  { id: 'first-10-minutes', title: 'Erste zehn Minuten', description: 'Insgesamt zehn Minuten geübt.' },
  { id: 'first-melody', title: 'Erste Melodie geschafft', description: 'Die Lektion „Meine erste Melodie“ abgeschlossen.' },
  { id: 'first-song', title: 'Erster vollständiger Song', description: 'Ein Lied einmal komplett durchgespielt.' },
  { id: 'seven-days', title: 'Sieben Übungstage', description: 'Sieben Tage hintereinander geübt.' },
  { id: 'first-riff', title: 'Erstes Rock-Riff', description: 'Die erste Riff-Lektion abgeschlossen.' },
  { id: 'full-tempo', title: 'Volles Tempo', description: 'Einen Song bei 100 % Tempo komplett gespielt.' },
  { id: 'listener', title: 'GuitarCoach hat zugehört', description: 'Eine Übung im Spiel-mit-Modus mit mindestens 80 % Trefferquote.' },
];

/** Ermittelt aus echten Daten, welche Erfolge erfüllt sind. */
export function evaluateAchievements(input: { sessions: PracticeSessionRecord[]; lessons: LessonProgressRecord[]; songs: SongProgressRecord[]; now?: number }): Set<string> {
  const unlocked = new Set<string>();
  const doneLessons = new Set(input.lessons.filter((l) => l.status === 'done').map((l) => l.lessonId));
  if (input.sessions.some((s) => s.kind === 'tuner' && s.details?.completed)) unlocked.add('first-tuned');
  if (minutesOf(input.sessions) >= 10) unlocked.add('first-10-minutes');
  if (doneLessons.has('k2-l7-tonfolgen')) unlocked.add('first-melody');
  if (input.songs.some((s) => s.completedPlaythroughs > 0)) unlocked.add('first-song');
  if (computeStreak(input.sessions, input.now) >= 7) unlocked.add('seven-days');
  if (doneLessons.has('k5-l1-was-ist-ein-riff')) unlocked.add('first-riff');
  if (input.songs.some((s) => s.completedPlaythroughs > 0 && s.bestTempoFactor >= 1)) unlocked.add('full-tempo');
  if (input.sessions.some((s) => s.kind === 'listen' && s.details?.notesTotal && s.details.notesTotal >= 8 && (s.details.notesCorrect ?? 0) / s.details.notesTotal >= 0.8)) unlocked.add('listener');
  return unlocked;
}

/** Neue Erfolge gegenüber den gespeicherten ermitteln. */
export function newlyUnlocked(evaluated: Set<string>, stored: AchievementRecord[]): string[] {
  const have = new Set(stored.map((a) => a.id));
  return [...evaluated].filter((id) => !have.has(id));
}
