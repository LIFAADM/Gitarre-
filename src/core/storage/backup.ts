import { getDb, type GuitarCoachDB } from './db';
import { DEFAULT_SETTINGS, replaceSettings, type AppSettings } from './settings';
import type { AchievementRecord, GoalRecord, LessonProgressRecord, PracticeSessionRecord, SongProgressRecord, SongRecord, SongVersionRecord } from './types';

/** Datensicherung: Lerndaten, eigene Songs und Einstellungen als JSON (ohne große Rohdateien). */
export interface BackupFile {
  format: 'guitarcoach-backup';
  version: 1;
  exportedAt: string;
  settings: Partial<AppSettings>;
  songs: SongRecord[];
  songVersions: SongVersionRecord[];
  practiceSessions: PracticeSessionRecord[];
  lessonProgress: LessonProgressRecord[];
  songProgress: SongProgressRecord[];
  achievements: AchievementRecord[];
  goals: GoalRecord[];
}

export async function createBackup(db: GuitarCoachDB = getDb()): Promise<BackupFile> {
  const settingsRecord = await db.settings.get('app');
  const songs = await db.songs.toArray();
  const versions = (await db.songVersions.toArray()).filter((v) => v.kind !== 'arrangement');
  return {
    format: 'guitarcoach-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: (settingsRecord?.value as Partial<AppSettings> | undefined) ?? {},
    // Eingebaute Songs nur mit Nutzerdaten (Favorit, zuletzt gespielt); eigene Songs vollständig
    songs: songs.filter((s) => !s.isBuiltin || s.isFavorite || s.lastPlayedAt),
    songVersions: versions,
    practiceSessions: await db.practiceSessions.toArray(),
    lessonProgress: await db.lessonProgress.toArray(),
    songProgress: await db.songProgress.toArray(),
    achievements: await db.achievements.toArray(),
    goals: await db.goals.toArray(),
  };
}

export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Die Sicherungsdatei enthält kein gültiges JSON.');
  }
  if (typeof data !== 'object' || data === null || (data as { format?: string }).format !== 'guitarcoach-backup') {
    throw new Error('Das ist keine GuitarCoach-Sicherung.');
  }
  const file = data as BackupFile;
  if (file.version !== 1) throw new Error(`Unbekannte Sicherungsversion ${String(file.version)}.`);
  for (const key of ['songs', 'songVersions', 'practiceSessions', 'lessonProgress', 'songProgress', 'goals'] as const) {
    if (!Array.isArray(file[key])) throw new Error(`Die Sicherung ist unvollständig (Abschnitt „${key}“ fehlt).`);
  }
  return file;
}

/** Spielt eine Sicherung ein (zusammenführen: vorhandene Einträge werden überschrieben, Übungssitzungen nicht doppelt angelegt). */
export async function restoreBackup(file: BackupFile, db: GuitarCoachDB = getDb()): Promise<{ sessions: number; songs: number }> {
  let sessions = 0;
  await db.transaction('rw', [db.songs, db.songVersions, db.practiceSessions, db.lessonProgress, db.songProgress, db.achievements, db.goals, db.settings], async () => {
    for (const song of file.songs) {
      const existing = await db.songs.get(song.id);
      if (existing?.isBuiltin) await db.songs.update(song.id, { isFavorite: song.isFavorite, ...(song.lastPlayedAt ? { lastPlayedAt: song.lastPlayedAt } : {}) });
      else await db.songs.put(song);
    }
    await db.songVersions.bulkPut(file.songVersions);
    const existingSessions = await db.practiceSessions.toArray();
    const seen = new Set(existingSessions.map((s) => `${s.startedAt}:${s.kind}:${s.durationSec}`));
    for (const s of file.practiceSessions) {
      const key = `${s.startedAt}:${s.kind}:${s.durationSec}`;
      if (seen.has(key)) continue;
      const { id: _id, ...rest } = s;
      await db.practiceSessions.add(rest);
      sessions++;
    }
    for (const lp of file.lessonProgress) {
      const existing = await db.lessonProgress.get(lp.lessonId);
      if (!existing || (lp.status === 'done' && existing.status !== 'done') || (lp.totalSec ?? 0) > (existing.totalSec ?? 0)) await db.lessonProgress.put(lp);
    }
    for (const sp of file.songProgress) {
      const existing = await db.songProgress.get(sp.songId);
      if (!existing || sp.progressPercent >= existing.progressPercent) await db.songProgress.put(sp);
    }
    if (Array.isArray(file.achievements)) await db.achievements.bulkPut(file.achievements);
    await db.goals.bulkPut(file.goals);
  });
  if (file.settings && typeof file.settings === 'object') await replaceSettings({ ...DEFAULT_SETTINGS, ...file.settings });
  return { sessions, songs: file.songs.length };
}

/** Löscht alle Lerndaten (Songs/Importe bleiben erhalten). */
export async function resetProgress(db: GuitarCoachDB = getDb()): Promise<void> {
  await db.transaction('rw', [db.practiceSessions, db.lessonProgress, db.songProgress, db.achievements, db.goals], async () => {
    await db.practiceSessions.clear();
    await db.lessonProgress.clear();
    await db.songProgress.clear();
    await db.achievements.clear();
    await db.goals.toCollection().modify({ done: false, doneAt: undefined });
  });
}

/** Löscht die komplette Datenbank (alles). */
export async function deleteAllData(db: GuitarCoachDB = getDb()): Promise<void> {
  await db.delete();
}
