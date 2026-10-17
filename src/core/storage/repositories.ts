import { countPlayableNotes, trackMaxFret, type Score } from '../music/score';
import { getDb, newId, type GuitarCoachDB } from './db';
import type {
  ImportFileRecord,
  LessonProgressRecord,
  PracticeKind,
  PracticeSessionRecord,
  SongProgressRecord,
  SongRecord,
  SongVersionRecord,
  VersionKind,
  VersionLabel,
} from './types';

/** Kennzahlen eines Scores für die Versionsliste. */
export function scoreStats(score: Score): Pick<SongVersionRecord, 'trackCount' | 'barCount' | 'noteCount' | 'maxFret'> {
  return {
    trackCount: score.tracks.length,
    barCount: score.masterBars.length,
    noteCount: score.tracks.reduce((sum, t) => sum + countPlayableNotes(t), 0),
    maxFret: score.tracks.reduce((max, t) => Math.max(max, trackMaxFret(t)), 0),
  };
}

export class SongRepository {
  constructor(private readonly db: GuitarCoachDB = getDb()) {}

  async all(): Promise<SongRecord[]> {
    return this.db.songs.orderBy('title').toArray();
  }

  async get(id: string): Promise<SongRecord | undefined> {
    return this.db.songs.get(id);
  }

  async versionsOf(songId: string): Promise<SongVersionRecord[]> {
    const versions = await this.db.songVersions.where('songId').equals(songId).toArray();
    return versions.sort((a, b) => a.order - b.order);
  }

  async versionCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    await this.db.songVersions.each((v) => counts.set(v.songId, (counts.get(v.songId) ?? 0) + 1));
    return counts;
  }

  async getVersion(id: string): Promise<SongVersionRecord | undefined> {
    return this.db.songVersions.get(id);
  }

  async create(input: Omit<SongRecord, 'id' | 'createdAt' | 'updatedAt' | 'isFavorite' | 'isBuiltin'> & { id?: string; isFavorite?: boolean; isBuiltin?: boolean }): Promise<SongRecord> {
    const now = Date.now();
    const record: SongRecord = {
      ...input,
      id: input.id ?? newId('song-'),
      isFavorite: input.isFavorite ?? false,
      isBuiltin: input.isBuiltin ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.songs.put(record);
    return record;
  }

  async update(id: string, patch: Partial<SongRecord>): Promise<void> {
    await this.db.songs.update(id, { ...patch, updatedAt: Date.now() });
  }

  async toggleFavorite(id: string): Promise<boolean> {
    const song = await this.db.songs.get(id);
    if (!song) return false;
    const next = !song.isFavorite;
    await this.db.songs.update(id, { isFavorite: next, updatedAt: Date.now() });
    return next;
  }

  async markPlayed(id: string): Promise<void> {
    await this.db.songs.update(id, { lastPlayedAt: Date.now() });
  }

  async addVersion(input: {
    songId: string;
    label: VersionLabel;
    kind: VersionKind;
    score: Score;
    description?: string;
    sourceFileId?: string;
    sourceFormat?: string;
    id?: string;
    order?: number;
  }): Promise<SongVersionRecord> {
    const existing = await this.versionsOf(input.songId);
    const record: SongVersionRecord = {
      id: input.id ?? newId('ver-'),
      songId: input.songId,
      label: input.label,
      kind: input.kind,
      order: input.order ?? existing.length,
      score: input.score,
      createdAt: Date.now(),
      ...scoreStats(input.score),
    };
    if (input.description) record.description = input.description;
    if (input.sourceFileId) record.sourceFileId = input.sourceFileId;
    if (input.sourceFormat) record.sourceFormat = input.sourceFormat;
    await this.db.songVersions.put(record);
    await this.db.songs.update(input.songId, { updatedAt: Date.now() });
    return record;
  }

  async updateVersionScore(versionId: string, score: Score): Promise<void> {
    await this.db.songVersions.update(versionId, { score, ...scoreStats(score) });
  }

  async deleteVersion(versionId: string): Promise<void> {
    const version = await this.db.songVersions.get(versionId);
    await this.db.songVersions.delete(versionId);
    if (version?.sourceFileId) {
      const stillUsed = await this.db.songVersions.where('songId').equals(version.songId).filter((v) => v.sourceFileId === version.sourceFileId).count();
      if (stillUsed === 0) await this.db.importFiles.delete(version.sourceFileId);
    }
  }

  /** Löscht einen Song samt Versionen, Importdateien und Fortschritt. */
  async delete(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.songs, this.db.songVersions, this.db.importFiles, this.db.songProgress], async () => {
      await this.db.songVersions.where('songId').equals(id).delete();
      await this.db.importFiles.where('songId').equals(id).delete();
      await this.db.songProgress.delete(id);
      await this.db.songs.delete(id);
    });
  }

  async saveImportFile(file: Omit<ImportFileRecord, 'id' | 'importedAt'> & { id?: string }): Promise<ImportFileRecord> {
    const record: ImportFileRecord = { ...file, id: file.id ?? newId('file-'), importedAt: Date.now() };
    await this.db.importFiles.put(record);
    return record;
  }

  async getImportFile(id: string): Promise<ImportFileRecord | undefined> {
    return this.db.importFiles.get(id);
  }
}

export class ProgressRepository {
  constructor(private readonly db: GuitarCoachDB = getDb()) {}

  async recordSession(input: {
    kind: PracticeKind;
    startedAt: number;
    endedAt?: number;
    refId?: string;
    title?: string;
    details?: PracticeSessionRecord['details'];
  }): Promise<PracticeSessionRecord | null> {
    const endedAt = input.endedAt ?? Date.now();
    const durationSec = Math.max(0, Math.round((endedAt - input.startedAt) / 1000));
    // Sehr kurze Sitzungen (< 5 s) sind kein Üben
    if (durationSec < 5 && !input.details?.completed) return null;
    const record: PracticeSessionRecord = {
      startedAt: input.startedAt,
      endedAt,
      durationSec,
      kind: input.kind,
    };
    if (input.refId) record.refId = input.refId;
    if (input.title) record.title = input.title;
    if (input.details) record.details = input.details;
    const id = await this.db.practiceSessions.add(record);
    return { ...record, id: id as number };
  }

  async sessions(sinceMs = 0): Promise<PracticeSessionRecord[]> {
    return this.db.practiceSessions.where('startedAt').aboveOrEqual(sinceMs).toArray();
  }

  async allSessions(): Promise<PracticeSessionRecord[]> {
    return this.db.practiceSessions.orderBy('startedAt').toArray();
  }

  async lessonProgress(lessonId: string): Promise<LessonProgressRecord | undefined> {
    return this.db.lessonProgress.get(lessonId);
  }

  async allLessonProgress(): Promise<LessonProgressRecord[]> {
    return this.db.lessonProgress.toArray();
  }

  async touchLesson(lessonId: string, addSec = 0): Promise<LessonProgressRecord> {
    const existing = await this.db.lessonProgress.get(lessonId);
    const record: LessonProgressRecord = existing ?? { lessonId, status: 'started', attempts: 0, totalSec: 0 };
    if (record.status === 'open') record.status = 'started';
    record.attempts += 1;
    record.totalSec += addSec;
    record.lastPracticedAt = Date.now();
    await this.db.lessonProgress.put(record);
    return record;
  }

  async completeLesson(lessonId: string, accuracy?: number): Promise<LessonProgressRecord> {
    const existing = await this.db.lessonProgress.get(lessonId);
    const record: LessonProgressRecord = existing ?? { lessonId, status: 'started', attempts: 1, totalSec: 0 };
    record.status = 'done';
    record.completedAt = record.completedAt ?? Date.now();
    record.lastPracticedAt = Date.now();
    if (accuracy !== undefined) record.bestAccuracy = Math.max(record.bestAccuracy ?? 0, accuracy);
    await this.db.lessonProgress.put(record);
    return record;
  }

  async resetLesson(lessonId: string): Promise<void> {
    await this.db.lessonProgress.delete(lessonId);
  }

  async songProgress(songId: string): Promise<SongProgressRecord | undefined> {
    return this.db.songProgress.get(songId);
  }

  async allSongProgress(): Promise<SongProgressRecord[]> {
    return this.db.songProgress.toArray();
  }

  /**
   * Aktualisiert den Lernfortschritt eines Songs. Der Prozentwert leitet sich aus echten Daten ab:
   * erreichtes Tempo (bis 60 %), vollständige Durchläufe (bis 25 %) und Trefferquote (bis 15 %).
   */
  async updateSongProgress(
    songId: string,
    input: { addSec: number; tempoFactor: number; completedPlaythrough?: boolean; accuracy?: number },
  ): Promise<SongProgressRecord> {
    const existing = await this.db.songProgress.get(songId);
    const record: SongProgressRecord = existing ?? {
      songId,
      progressPercent: 0,
      bestTempoFactor: 0,
      practiceCount: 0,
      totalSec: 0,
      lastPracticedAt: 0,
      completedPlaythroughs: 0,
    };
    record.practiceCount += 1;
    record.totalSec += Math.max(0, input.addSec);
    record.lastPracticedAt = Date.now();
    if (input.completedPlaythrough) {
      record.completedPlaythroughs += 1;
      record.bestTempoFactor = Math.max(record.bestTempoFactor, input.tempoFactor);
    }
    if (input.accuracy !== undefined) record.bestAccuracy = Math.max(record.bestAccuracy ?? 0, input.accuracy);
    record.progressPercent = computeSongProgressPercent(record);
    await this.db.songProgress.put(record);
    return record;
  }
}

/** Berechnet den Fortschritt (0–100) aus den gespeicherten Kennzahlen. */
export function computeSongProgressPercent(p: Pick<SongProgressRecord, 'bestTempoFactor' | 'completedPlaythroughs' | 'bestAccuracy' | 'practiceCount'>): number {
  const tempoPart = Math.min(1, p.bestTempoFactor) * 60;
  const playthroughPart = Math.min(1, p.completedPlaythroughs / 5) * 25;
  const accuracyPart = ((p.bestAccuracy ?? 0) / 100) * 15;
  const started = p.practiceCount > 0 ? 2 : 0;
  return Math.round(Math.min(100, Math.max(started, tempoPart + playthroughPart + accuracyPart)));
}
