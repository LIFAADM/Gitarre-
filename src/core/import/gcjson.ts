import { validateScore, type Score } from '../music/score';
import type { SongRecord, SongVersionRecord, VersionKind, VersionLabel } from '../storage/types';

/** Eigenes Austauschformat für Songs (inkl. aller Versionen). */
export interface GuitarCoachSongFile {
  format: 'guitarcoach-song';
  version: 1;
  exportedAt: string;
  song: Pick<SongRecord, 'title' | 'artist' | 'genre' | 'difficulty' | 'originalTempo' | 'year' | 'rightsStatus' | 'notes' | 'tags'>;
  versions: Array<{ label: VersionLabel; kind: VersionKind; description?: string; score: Score }>;
}

export function createSongFile(song: SongRecord, versions: SongVersionRecord[]): GuitarCoachSongFile {
  const file: GuitarCoachSongFile = {
    format: 'guitarcoach-song',
    version: 1,
    exportedAt: new Date().toISOString(),
    song: {
      title: song.title,
      artist: song.artist,
      genre: song.genre,
      difficulty: song.difficulty,
      rightsStatus: song.rightsStatus,
    },
    versions: versions.map((v) => {
      const entry: GuitarCoachSongFile['versions'][number] = { label: v.label, kind: v.kind, score: v.score };
      if (v.description) entry.description = v.description;
      return entry;
    }),
  };
  if (song.originalTempo) file.song.originalTempo = song.originalTempo;
  if (song.year) file.song.year = song.year;
  if (song.notes) file.song.notes = song.notes;
  if (song.tags) file.song.tags = song.tags;
  return file;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Prüft und parst eine GuitarCoach-Song-Datei. Wirft verständliche Fehler. */
export function parseSongFile(text: string): GuitarCoachSongFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Die Datei enthält kein gültiges JSON.');
  }
  if (!isObject(data) || data.format !== 'guitarcoach-song') throw new Error('Das ist keine GuitarCoach-Songdatei (Feld „format“ fehlt).');
  if (data.version !== 1) throw new Error(`Unbekannte Dateiversion ${String(data.version)}.`);
  if (!isObject(data.song) || typeof data.song.title !== 'string') throw new Error('Die Songinformationen fehlen oder sind unvollständig.');
  if (!Array.isArray(data.versions) || data.versions.length === 0) throw new Error('Die Datei enthält keine Songversion mit Noten.');
  for (const v of data.versions) {
    if (!isObject(v) || !isObject(v.score)) throw new Error('Eine Songversion ist beschädigt (keine Notendaten).');
    const score = v.score as unknown as Score;
    if (!Array.isArray(score.tracks) || !Array.isArray(score.masterBars)) throw new Error('Notendaten unvollständig (Spuren oder Takte fehlen).');
    const errors = validateScore(score);
    if (errors.length > 0) throw new Error(`Notendaten fehlerhaft: ${errors[0]}`);
  }
  return data as unknown as GuitarCoachSongFile;
}
