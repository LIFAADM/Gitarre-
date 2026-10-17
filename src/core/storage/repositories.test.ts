import { beforeEach, describe, expect, it } from 'vitest';
import { parseTabNotation } from '../music/tabNotation';
import { createTestDb, type GuitarCoachDB } from './db';
import { ProgressRepository, SongRepository, computeSongProgressPercent } from './repositories';

let db: GuitarCoachDB;
let counter = 0;

beforeEach(() => {
  db = createTestDb(`test-${Date.now()}-${counter++}`);
});

describe('SongRepository', () => {
  it('speichert Songs und Versionen und liest sie wieder', async () => {
    const repo = new SongRepository(db);
    const song = await repo.create({ title: 'Test', artist: 'Ich', genre: 'Eigene', difficulty: 1, rightsStatus: 'user-created' });
    const score = parseTabNotation('0.1.4 1.2.4 3.2.4 0.1.4 |', { tempo: 90, title: 'Test' });
    const version = await repo.addVersion({ songId: song.id, label: 'Eigene', kind: 'user', score });
    expect(version.noteCount).toBe(4);
    expect(version.barCount).toBe(1);
    expect(version.maxFret).toBe(3);
    const loaded = await repo.versionsOf(song.id);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.score.tracks[0]!.bars[0]!.voices[0]![1]!.notes[0]!.fret).toBe(1);
    expect(await repo.toggleFavorite(song.id)).toBe(true);
    expect((await repo.get(song.id))!.isFavorite).toBe(true);
    await repo.delete(song.id);
    expect(await repo.get(song.id)).toBeUndefined();
    expect(await repo.versionsOf(song.id)).toHaveLength(0);
  });
});

describe('ProgressRepository', () => {
  it('speichert Übungssitzungen und Lektionsfortschritt dauerhaft', async () => {
    const repo = new ProgressRepository(db);
    const start = Date.now() - 65_000;
    const session = await repo.recordSession({ kind: 'lesson', startedAt: start, refId: 'l1', title: 'Lektion 1' });
    expect(session?.durationSec).toBe(65);
    expect(await repo.recordSession({ kind: 'tuner', startedAt: Date.now() - 1000 })).toBeNull();
    await repo.touchLesson('l1', 65);
    const done = await repo.completeLesson('l1', 90);
    expect(done.status).toBe('done');
    expect(done.attempts).toBe(1);
    expect(done.bestAccuracy).toBe(90);
    // „App neu öffnen“: neues Repository auf derselben Datenbank
    const again = new ProgressRepository(db);
    expect((await again.lessonProgress('l1'))!.status).toBe('done');
    expect(await again.sessions(0)).toHaveLength(1);
  });

  it('berechnet Songfortschritt aus echten Kennzahlen', async () => {
    const repo = new ProgressRepository(db);
    let p = await repo.updateSongProgress('s1', { addSec: 60, tempoFactor: 0.5 });
    expect(p.progressPercent).toBe(2);
    p = await repo.updateSongProgress('s1', { addSec: 60, tempoFactor: 0.5, completedPlaythrough: true });
    expect(p.bestTempoFactor).toBe(0.5);
    expect(p.progressPercent).toBe(35);
    p = await repo.updateSongProgress('s1', { addSec: 60, tempoFactor: 1, completedPlaythrough: true, accuracy: 100 });
    expect(p.progressPercent).toBe(85);
    expect(computeSongProgressPercent({ bestTempoFactor: 1, completedPlaythroughs: 5, bestAccuracy: 100, practiceCount: 1 })).toBe(100);
  });
});
