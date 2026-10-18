import Dexie, { type EntityTable } from 'dexie';
import type {
  AchievementRecord,
  AudioSyncRecord,
  GoalRecord,
  ImportFileRecord,
  LessonProgressRecord,
  MetaRecord,
  PracticeSessionRecord,
  SettingsRecord,
  SongProgressRecord,
  SongRecord,
  SongVersionRecord,
} from './types';

/**
 * IndexedDB-Datenbank (Dexie). Schema-Versionen werden hier fortgeschrieben;
 * Migrationen erfolgen über `.version(n).stores().upgrade()`.
 */
export class GuitarCoachDB extends Dexie {
  songs!: EntityTable<SongRecord, 'id'>;
  songVersions!: EntityTable<SongVersionRecord, 'id'>;
  importFiles!: EntityTable<ImportFileRecord, 'id'>;
  practiceSessions!: EntityTable<PracticeSessionRecord, 'id'>;
  lessonProgress!: EntityTable<LessonProgressRecord, 'lessonId'>;
  songProgress!: EntityTable<SongProgressRecord, 'songId'>;
  settings!: EntityTable<SettingsRecord, 'key'>;
  achievements!: EntityTable<AchievementRecord, 'id'>;
  goals!: EntityTable<GoalRecord, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;
  audioSyncs!: EntityTable<AudioSyncRecord, 'id'>;

  constructor(name = 'guitarcoach') {
    super(name);
    this.version(1).stores({
      songs: 'id, title, artist, genre, rightsStatus, isFavorite, lastPlayedAt, updatedAt, isBuiltin',
      songVersions: 'id, songId, kind, order',
      importFiles: 'id, songId, importedAt',
      practiceSessions: '++id, startedAt, kind, refId',
      lessonProgress: 'lessonId, status, lastPracticedAt',
      songProgress: 'songId, lastPracticedAt, progressPercent',
      settings: 'key',
      achievements: 'id, unlockedAt',
      goals: 'id, group, order, done',
      meta: 'key',
    });
    // v2: Audiodateien mit manuellen Zeitmarken (Mitspielmodus)
    this.version(2).stores({
      audioSyncs: 'id, songId, fileId',
    });
  }
}

let instance: GuitarCoachDB | null = null;

export function getDb(): GuitarCoachDB {
  if (!instance) instance = new GuitarCoachDB();
  return instance;
}

/** Nur für Tests: frische Datenbank mit eigenem Namen. */
export function createTestDb(name: string): GuitarCoachDB {
  return new GuitarCoachDB(name);
}

/** Erzeugt eine eindeutige ID (UUID, Fallback für ältere WebViews). */
export function newId(prefix = ''): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}${uuid}` : uuid;
}
