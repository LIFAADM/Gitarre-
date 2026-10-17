import { ALL_LESSONS, type LessonDef } from '../content/lessons';
import type { LessonProgressRecord, PracticeSessionRecord, SongProgressRecord, SongRecord } from '../storage/types';
import { difficultItems, sessionsOnDay } from './stats';

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  href: string;
  kind: 'tune' | 'lesson' | 'song' | 'repeat' | 'exercise';
  minutes: number;
}

/** Nächste offene Lektion (erste nicht abgeschlossene in Reihenfolge). */
export function nextOpenLesson(progress: LessonProgressRecord[]): LessonDef | undefined {
  const done = new Set(progress.filter((p) => p.status === 'done').map((p) => p.lessonId));
  return ALL_LESSONS.find((l) => !done.has(l.id));
}

/**
 * Regelbasierte Empfehlungen aus echten Daten:
 * Stimmen (falls heute noch nicht), nächste Lektion, Song in Arbeit, Wiederholung schwacher Passagen.
 */
export function buildRecommendations(input: {
  sessions: PracticeSessionRecord[];
  lessonProgress: LessonProgressRecord[];
  songProgress: SongProgressRecord[];
  songs: SongRecord[];
  playableSongIds: Set<string>;
  now?: number;
}): Recommendation[] {
  const now = input.now ?? Date.now();
  const result: Recommendation[] = [];
  const today = sessionsOnDay(input.sessions, now);

  if (!today.some((s) => s.kind === 'tuner')) {
    result.push({ id: 'tune', kind: 'tune', title: 'Gitarre stimmen', reason: 'Heute noch nicht gestimmt – 2 Minuten, die alles besser klingen lassen.', href: '/werkzeuge/stimmgeraet', minutes: 3 });
  }

  const lesson = nextOpenLesson(input.lessonProgress);
  if (lesson) {
    const started = input.lessonProgress.find((p) => p.lessonId === lesson.id)?.status === 'started';
    result.push({ id: `lesson-${lesson.id}`, kind: 'lesson', title: `${started ? 'Weiter mit' : 'Nächste Lektion'}: ${lesson.title}`, reason: lesson.goal, href: `/lernen/${lesson.id}`, minutes: lesson.minutes });
  }

  const inProgress = input.songProgress
    .filter((p) => p.progressPercent > 0 && p.progressPercent < 100 && input.playableSongIds.has(p.songId))
    .sort((a, b) => b.lastPracticedAt - a.lastPracticedAt)[0];
  const songById = new Map(input.songs.map((s) => [s.id, s]));
  if (inProgress && songById.get(inProgress.songId)) {
    const song = songById.get(inProgress.songId)!;
    result.push({
      id: `song-${song.id}`,
      kind: 'song',
      title: `Weiter üben: ${song.title}`,
      reason: `${inProgress.progressPercent} % gelernt · bestes Tempo ${Math.round(inProgress.bestTempoFactor * 100)} %`,
      href: `/songs/${song.id}`,
      minutes: 7,
    });
  } else {
    const firstSong = input.songs.filter((s) => input.playableSongIds.has(s.id) && s.goalTier === 'anfaenger').sort((a, b) => a.difficulty - b.difficulty)[0];
    if (firstSong) result.push({ id: `song-${firstSong.id}`, kind: 'song', title: `Lied lernen: ${firstSong.title}`, reason: 'Dein erstes vollständiges Lied – komplett spielbar in der ersten Lage.', href: `/songs/${firstSong.id}`, minutes: 7 });
  }

  const weak = difficultItems(input.sessions, 1)[0];
  if (weak) {
    const href = weak.refId.startsWith('ex-') ? `/ueben/uebung/${weak.refId}` : weak.refId.startsWith('k') && weak.refId.includes('-l') ? `/lernen/${weak.refId}` : `/songs/${weak.refId}`;
    result.push({ id: `repeat-${weak.refId}`, kind: 'repeat', title: `Wiederholen: ${weak.title}`, reason: `Trefferquote bisher ${Math.round(weak.accuracy)} % – noch einmal langsam üben.`, href, minutes: 5 });
  }

  const weakLesson = input.lessonProgress.filter((p) => p.status === 'done' && p.bestAccuracy !== undefined && p.bestAccuracy < 70).sort((a, b) => (a.bestAccuracy ?? 0) - (b.bestAccuracy ?? 0))[0];
  if (weakLesson && !result.some((r) => r.id === `repeat-${weakLesson.lessonId}`)) {
    const def = ALL_LESSONS.find((l) => l.id === weakLesson.lessonId);
    if (def) result.push({ id: `repeat-${def.id}`, kind: 'repeat', title: `Lektion wiederholen: ${def.title}`, reason: `Beste Trefferquote ${Math.round(weakLesson.bestAccuracy ?? 0)} %.`, href: `/lernen/${def.id}`, minutes: def.minutes });
  }

  return result.slice(0, 4);
}
