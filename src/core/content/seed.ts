import { parseTabNotation } from '../music/tabNotation';
import { getDb, type GuitarCoachDB } from '../storage/db';
import { scoreStats } from '../storage/repositories';
import type { SongRecord, SongVersionRecord } from '../storage/types';
import { DEFAULT_GOALS } from './goals';
import { BUILTIN_SONGS, type BuiltinSongDef, type BuiltinVersionDef } from './songs';

/** Bei Änderungen an eingebauten Inhalten erhöhen – vorhandene Einträge werden dann aktualisiert (Nutzerdaten bleiben erhalten). */
export const CONTENT_VERSION = 2;

export function buildVersionRecord(song: BuiltinSongDef, v: BuiltinVersionDef, order: number): SongVersionRecord {
  const score = parseTabNotation(v.notation, {
    title: song.title,
    artist: song.artist,
    tempo: v.tempo,
    timeSignature: v.timeSignature,
    notes: `${v.label}: ${v.description}`,
  });
  return {
    id: v.id,
    songId: song.id,
    label: v.label,
    kind: v.kind,
    order,
    description: v.description,
    score,
    createdAt: 0,
    ...scoreStats(score),
  };
}

function buildSongRecord(def: BuiltinSongDef, existing?: SongRecord): SongRecord {
  const now = Date.now();
  const record: SongRecord = {
    id: def.id,
    title: def.title,
    artist: def.artist,
    genre: def.genre,
    difficulty: def.difficulty,
    rightsStatus: def.rightsStatus,
    isBuiltin: true,
    isFavorite: existing?.isFavorite ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (def.originalTempo) record.originalTempo = def.originalTempo;
  if (def.year) record.year = def.year;
  if (def.goalTier) record.goalTier = def.goalTier;
  if (def.prepExerciseIds) record.prepExerciseIds = def.prepExerciseIds;
  if (def.notes) record.notes = def.notes;
  if (existing?.forKids !== undefined) record.forKids = existing.forKids;
  else if (def.forKids) record.forKids = true;
  if (existing?.lastPlayedAt) record.lastPlayedAt = existing.lastPlayedAt;
  if (existing?.tags) record.tags = existing.tags;
  return record;
}

/**
 * Legt eingebaute Songs, Versionen und Lernziele an. Idempotent:
 * - fehlende Einträge werden ergänzt,
 * - bei neuer CONTENT_VERSION werden eingebaute Versionen aktualisiert,
 * - Favoriten, Fortschritt und eigene Importe bleiben unangetastet.
 */
export async function seedDatabase(db: GuitarCoachDB = getDb()): Promise<{ created: number; updated: number }> {
  const meta = await db.meta.get('contentVersion');
  const installed = typeof meta?.value === 'number' ? meta.value : 0;
  const needsUpdate = installed < CONTENT_VERSION;
  let created = 0;
  let updated = 0;

  await db.transaction('rw', [db.songs, db.songVersions, db.goals, db.meta], async () => {
    for (const def of BUILTIN_SONGS) {
      const existing = await db.songs.get(def.id);
      if (!existing) {
        await db.songs.put(buildSongRecord(def));
        created++;
      } else if (needsUpdate) {
        await db.songs.put(buildSongRecord(def, existing));
        updated++;
      }
      for (let i = 0; i < def.versions.length; i++) {
        const v = def.versions[i]!;
        const existingVersion = await db.songVersions.get(v.id);
        if (!existingVersion || needsUpdate) {
          const record = buildVersionRecord(def, v, i);
          record.createdAt = existingVersion?.createdAt ?? Date.now();
          await db.songVersions.put(record);
        }
      }
    }
    for (const goal of DEFAULT_GOALS) {
      const existing = await db.goals.get(goal.id);
      if (!existing) await db.goals.put({ ...goal, done: false });
    }
    await db.meta.put({ key: 'contentVersion', value: CONTENT_VERSION });
  });
  return { created, updated };
}
