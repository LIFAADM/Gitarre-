import type { Score } from '../music/score';

/** Musikrichtungen der Bibliothek. */
export type Genre =
  | 'Rock ’n’ Roll'
  | 'Beatles'
  | 'Metal'
  | 'Neue Deutsche Welle'
  | 'Rock'
  | 'Weihnachten'
  | 'Geburtstag'
  | 'Kinderlied / Volkslied'
  | 'Kinder-Hits (Film & Hörspiel)'
  | 'Übung'
  | 'Eigene'
  | 'Sonstiges';

export const GENRES: Genre[] = [
  'Rock ’n’ Roll',
  'Beatles',
  'Metal',
  'Neue Deutsche Welle',
  'Rock',
  'Weihnachten',
  'Geburtstag',
  'Kinderlied / Volkslied',
  'Kinder-Hits (Film & Hörspiel)',
  'Übung',
  'Eigene',
  'Sonstiges',
];

/**
 * Rechte-/Importstatus eines Songs:
 * - public-domain: gemeinfreies Lied, eigenes Arrangement enthalten
 * - own-arrangement: eigene Komposition/Übung (GuitarCoach)
 * - needs-import: urheberrechtlich geschützt – eigene, rechtmäßige Tab-Datei muss importiert werden
 * - user-import: vom Nutzer importierte Datei
 * - user-created: im Tab-Editor erstellt
 */
export type RightsStatus = 'public-domain' | 'own-arrangement' | 'needs-import' | 'user-import' | 'user-created';

export type VersionLabel = 'Anfänger' | 'Leicht' | 'Mittel' | 'Originalnah' | 'Gitarrensolo' | 'Import' | 'Eigene' | 'Vereinfacht';
export type VersionKind = 'arrangement' | 'imported' | 'simplified' | 'user';

export interface SongRecord {
  id: string;
  title: string;
  artist: string;
  genre: Genre;
  /** 1 (sehr leicht) … 5 (sehr schwer). */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Originaltempo in BPM, falls bekannt. */
  originalTempo?: number;
  year?: number;
  rightsStatus: RightsStatus;
  isBuiltin: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastPlayedAt?: number;
  /** Lernziel-Stufe (für Lernplan-Empfehlungen). */
  goalTier?: 'anfaenger' | 'mittel' | 'lang';
  /** IDs eingebauter Vorübungen (für Songs ohne Notendaten). */
  prepExerciseIds?: string[];
  notes?: string;
  tags?: string[];
  /** Im Kinder-Modus (Mitspiel-Bahn) anbieten, sobald Notendaten vorliegen. */
  forKids?: boolean;
}

export interface SongVersionRecord {
  id: string;
  songId: string;
  label: VersionLabel;
  kind: VersionKind;
  order: number;
  description?: string;
  score: Score;
  sourceFileId?: string;
  sourceFormat?: string;
  createdAt: number;
  trackCount: number;
  barCount: number;
  noteCount: number;
  maxFret: number;
}

export interface ImportFileRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  format: string;
  blob: Blob;
  importedAt: number;
  songId?: string;
}

export type PracticeKind = 'tuner' | 'lesson' | 'song' | 'metronome' | 'fretboard' | 'listen' | 'exercise' | 'editor';

export interface PracticeSessionRecord {
  id?: number;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  kind: PracticeKind;
  refId?: string;
  title?: string;
  details?: {
    notesTotal?: number;
    notesCorrect?: number;
    tempoFactor?: number;
    completed?: boolean;
    bpm?: number;
  };
}

export type LessonStatus = 'open' | 'started' | 'done';

export interface LessonProgressRecord {
  lessonId: string;
  status: LessonStatus;
  attempts: number;
  totalSec: number;
  completedAt?: number;
  lastPracticedAt?: number;
  /** Bestes Ergebnis der Mikrofon-Kontrolle in Prozent (falls genutzt). */
  bestAccuracy?: number;
}

export interface SongProgressRecord {
  songId: string;
  /** Lernfortschritt 0–100 (aus Tempo, Durchläufen und Trefferquote abgeleitet). */
  progressPercent: number;
  bestTempoFactor: number;
  practiceCount: number;
  totalSec: number;
  lastPracticedAt: number;
  bestAccuracy?: number;
  completedPlaythroughs: number;
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export interface AchievementRecord {
  id: string;
  unlockedAt: number;
}

export interface GoalRecord {
  id: string;
  title: string;
  group: 'anfaenger' | 'mittel' | 'lang';
  order: number;
  done: boolean;
  doneAt?: number;
  custom?: boolean;
  /** Verknüpfter Song oder Lektion (optional). */
  linkedSongId?: string;
  linkedLessonId?: string;
}

/** Zuordnung einer eigenen Audiodatei zu einem Song inkl. manueller Zeitmarken. */
export interface AudioSyncRecord {
  id: string;
  songId: string;
  fileId: string;
  fileName: string;
  sizeBytes: number;
  /** Zeitmarken: Takt-Instanz (0-basiert) beginnt bei Sekunde `sec` der Aufnahme. */
  markers: Array<{ instanceIndex: number; sec: number }>;
  playbackRate: number;
  versionId?: string;
  durationSec?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}
