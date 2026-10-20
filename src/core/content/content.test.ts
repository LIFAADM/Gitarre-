import { describe, expect, it } from 'vitest';
import { buildPlaybackPlan } from '../music/playback';
import { parseTabNotation } from '../music/tabNotation';
import { trackMaxFret, validateScore } from '../music/score';
import { EXERCISES } from './exercises';
import { BUILTIN_SONGS } from './songs';

describe('Eingebaute Stücke', () => {
  it('sind ausschließlich gemeinfrei mit eigenem Arrangement', () => {
    expect(BUILTIN_SONGS.length).toBeGreaterThanOrEqual(6);
    for (const s of BUILTIN_SONGS) expect(s.rightsStatus).toBe('public-domain');
    const titles = BUILTIN_SONGS.map((s) => s.title);
    for (const t of ['Happy Birthday', 'Jingle Bells', 'Stille Nacht']) expect(titles).toContain(t);
  });

  it('alle Stücke haben gültige, vollständige Arrangements', () => {
    for (const song of BUILTIN_SONGS) {
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
});
