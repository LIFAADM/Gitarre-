import { describe, expect, it } from 'vitest';
import { buildPlaybackPlan } from '../music/playback';
import { parseTabNotation } from '../music/tabNotation';
import { trackMaxFret, validateScore } from '../music/score';
import { createTestDb } from '../storage/db';
import { EXERCISES } from './exercises';
import { seedDatabase } from './seed';
import { BUILTIN_SONGS } from './songs';

describe('Eingebaute Songs', () => {
  it('enthält alle gewünschten Titel', () => {
    const titles = BUILTIN_SONGS.map((s) => s.title);
    for (const t of ['Love Me Tender', 'Jailhouse Rock', 'Yesterday', 'Come Together', 'Nothing Else Matters', 'One', '99 Luftballons', 'Der Kommissar', 'Sweet Child o’ Mine', 'Wonderwall', 'Jingle Bells', 'Stille Nacht', 'Last Christmas', 'Happy Birthday']) {
      expect(titles).toContain(t);
    }
    expect(BUILTIN_SONGS).toHaveLength(59);
  });

  it('alle gemeinfreien Lieder haben gültige, vollständige Arrangements', () => {
    const playable = BUILTIN_SONGS.filter((s) => s.rightsStatus === 'public-domain');
    expect(playable).toHaveLength(6);
    for (const song of playable) {
      expect(song.versions.length).toBeGreaterThanOrEqual(2);
      for (const v of song.versions) {
        const score = parseTabNotation(v.notation, { tempo: v.tempo, timeSignature: v.timeSignature, title: song.title });
        expect(validateScore(score), `${song.title} – ${v.label}`).toEqual([]);
        const plan = buildPlaybackPlan(score);
        expect(plan.events.filter((e) => e.kind === 'note').length, `${song.title} – ${v.label}`).toBeGreaterThan(12);
        expect(plan.totalSec).toBeGreaterThan(10);
        if (v.label === 'Anfänger') expect(trackMaxFret(score.tracks[0]!), `${song.title} Anfänger max. Bund`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('geschützte Songs haben Importstatus und Vorübungen', () => {
    const protectedSongs = BUILTIN_SONGS.filter((s) => s.rightsStatus === 'needs-import');
    expect(protectedSongs).toHaveLength(53);
    const exerciseIds = new Set(EXERCISES.map((e) => e.id));
    for (const s of protectedSongs) {
      expect(s.versions).toHaveLength(0);
      expect(s.prepExerciseIds?.length ?? 0).toBeGreaterThan(0);
      for (const id of s.prepExerciseIds ?? []) expect(exerciseIds.has(id), `${s.title}: ${id}`).toBe(true);
    }
  });

  it('alle Übungen sind gültig', () => {
    for (const ex of EXERCISES) {
      const score = parseTabNotation(ex.notation, { tempo: ex.tempo, timeSignature: ex.timeSignature, title: ex.title });
      expect(validateScore(score), ex.title).toEqual([]);
      expect(buildPlaybackPlan(score).events.filter((e) => e.kind === 'note').length).toBeGreaterThan(4);
    }
  });

  it('Happy Birthday beginnt mit der richtigen Melodie (G G A G C H)', () => {
    const song = BUILTIN_SONGS.find((s) => s.id === 'happy-birthday')!;
    const v = song.versions.find((x) => x.label === 'Leicht')!;
    const score = parseTabNotation(v.notation, { tempo: v.tempo, timeSignature: v.timeSignature });
    const midis = buildPlaybackPlan(score).events.filter((e) => e.kind === 'note').slice(0, 6).map((e) => (e.kind === 'note' ? e.midi : 0));
    expect(midis).toEqual([55, 55, 57, 55, 60, 59]);
  });

  it('Seeding legt Songs an und ist idempotent', async () => {
    const db = createTestDb(`seed-${Date.now()}`);
    const first = await seedDatabase(db);
    expect(first.created).toBe(59);
    expect(await db.songVersions.count()).toBe(14);
    await db.songs.update('happy-birthday', { isFavorite: true });
    const second = await seedDatabase(db);
    expect(second.created).toBe(0);
    expect((await db.songs.get('happy-birthday'))!.isFavorite).toBe(true);
    expect(await db.goals.count()).toBeGreaterThan(10);
  });
});
