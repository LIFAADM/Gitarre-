import type { LessonProgressRecord } from '@/core/storage/types';
import type { ChapterDef } from '@/core/content/lessons';

export function progressMap(records: LessonProgressRecord[] | undefined): Map<string, LessonProgressRecord> {
  return new Map((records ?? []).map((r) => [r.lessonId, r]));
}

export function chapterStats(chapter: ChapterDef, map: Map<string, LessonProgressRecord>): { done: number; total: number; started: number } {
  let done = 0;
  let started = 0;
  for (const l of chapter.lessons) {
    const s = map.get(l.id)?.status;
    if (s === 'done') done++;
    else if (s === 'started') started++;
  }
  return { done, total: chapter.lessons.length, started };
}
