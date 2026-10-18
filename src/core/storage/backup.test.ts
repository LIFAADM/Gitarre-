import { describe, expect, it } from 'vitest';
import { parseTabNotation } from '../music/tabNotation';
import { createBackup, parseBackup, restoreBackup } from './backup';
import { createTestDb } from './db';
import { ProgressRepository, SongRepository } from './repositories';

describe('Datensicherung', () => {
  it('exportiert und stellt Lerndaten und eigene Songs wieder her', async () => {
    const source = createTestDb(`backup-src-${Date.now()}`);
    const songs = new SongRepository(source);
    const song = await songs.create({ title: 'Mein Lied', artist: 'Ich', genre: 'Eigene', difficulty: 1, rightsStatus: 'user-created' });
    await songs.addVersion({ songId: song.id, label: 'Eigene', kind: 'user', score: parseTabNotation('0.1.4 1.2.4 3.2.4 0.1.4 |', { tempo: 90 }) });
    const progress = new ProgressRepository(source);
    await progress.recordSession({ kind: 'lesson', startedAt: Date.now() - 120_000, refId: 'k1-l1-aufbau' });
    await progress.completeLesson('k1-l1-aufbau');
    const backup = await createBackup(source);
    const text = JSON.stringify(backup);

    const target = createTestDb(`backup-dst-${Date.now()}`);
    const parsed = parseBackup(text);
    const result = await restoreBackup(parsed, target);
    expect(result.sessions).toBe(1);
    expect(await target.songs.count()).toBe(1);
    expect(await target.songVersions.count()).toBe(1);
    expect((await target.lessonProgress.get('k1-l1-aufbau'))!.status).toBe('done');
    // zweites Einspielen erzeugt keine doppelten Sitzungen
    const again = await restoreBackup(parsed, target);
    expect(again.sessions).toBe(0);
    expect(await target.practiceSessions.count()).toBe(1);
  });

  it('weist ungültige Dateien ab', () => {
    expect(() => parseBackup('{}')).toThrow(/keine GuitarCoach/);
    expect(() => parseBackup('x')).toThrow(/JSON/);
  });
});
