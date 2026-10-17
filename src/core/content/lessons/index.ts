import { CHAPTER_1, CHAPTER_2, CHAPTER_3, CHAPTER_4 } from './chapters1to4';
import { CHAPTER_5, CHAPTER_6, CHAPTER_7 } from './chapters5to7';
import type { ChapterDef, LessonDef } from './types';

export type { ChapterDef, LessonDef, LessonExercise } from './types';

export const CHAPTERS: ChapterDef[] = [CHAPTER_1, CHAPTER_2, CHAPTER_3, CHAPTER_4, CHAPTER_5, CHAPTER_6, CHAPTER_7];

export const ALL_LESSONS: LessonDef[] = CHAPTERS.flatMap((c) => c.lessons);

export function getLesson(id: string): LessonDef | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}

export function chapterOfLesson(id: string): ChapterDef | undefined {
  return CHAPTERS.find((c) => c.lessons.some((l) => l.id === id));
}

export function nextLesson(id: string): LessonDef | undefined {
  const idx = ALL_LESSONS.findIndex((l) => l.id === id);
  return idx >= 0 ? ALL_LESSONS[idx + 1] : undefined;
}

export function previousLesson(id: string): LessonDef | undefined {
  const idx = ALL_LESSONS.findIndex((l) => l.id === id);
  return idx > 0 ? ALL_LESSONS[idx - 1] : undefined;
}

/** Lernniveau anhand abgeschlossener Kapitel. */
export function levelLabel(doneLessonIds: Set<string>): { label: string; chapterNumber: number } {
  let completedChapters = 0;
  for (const chapter of CHAPTERS) {
    const done = chapter.lessons.filter((l) => doneLessonIds.has(l.id)).length;
    if (done >= Math.ceil(chapter.lessons.length * 0.8)) completedChapters = chapter.number;
    else break;
  }
  const labels = ['Einsteiger', 'Kennt die Gitarre', 'Spielt erste Töne', 'Liest Tabs & Rhythmus', 'Spielt ganze Lieder', 'Rockt erste Riffs', 'Fingerpicker', 'Fortgeschritten'];
  return { label: labels[completedChapters] ?? 'Fortgeschritten', chapterNumber: completedChapters };
}
