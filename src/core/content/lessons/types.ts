export type LessonExercise =
  | { kind: 'tuner' }
  | { kind: 'fretboard'; mode?: 'explore' | 'find' }
  | { kind: 'metronome'; bpm?: number; timeSignature?: [number, number] }
  | { kind: 'tab-reading' }
  | { kind: 'exercise'; exerciseId: string; tempoPercent?: number }
  | { kind: 'song'; songId: string; versionLabel?: string }
  | { kind: 'tab'; title: string; notation: string; tempo: number; timeSignature: [number, number]; tempoPercent?: number };

export interface LessonDef {
  id: string;
  title: string;
  /** Lernziel in einem Satz. */
  goal: string;
  /** Geschätzte Dauer in Minuten. */
  minutes: number;
  /** Erklärung (Markdown-lite). */
  content: string;
  /** Konkrete Übungsanweisung. */
  practice: string;
  exercise: LessonExercise;
  tips?: string[];
  /** Selbstkontrolle vor dem Abschließen. */
  checklist?: string[];
}

export interface ChapterDef {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  lessons: LessonDef[];
}
