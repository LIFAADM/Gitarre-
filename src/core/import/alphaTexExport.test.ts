import { describe, expect, it } from 'vitest';
import { BUILTIN_SONGS } from '../content/songs';
import { buildPlaybackPlan } from '../music/playback';
import { parseTabNotation } from '../music/tabNotation';
import { importAlphaTex } from './alphaTabImport';
import { exportAlphaTex } from './alphaTexExport';

describe('alphaTex-Export', () => {
  it('exportiert Noten, Pausen, Akkorde, Punktierungen, Bindungen und Techniken alphaTab-kompatibel', async () => {
    const score = parseTabNotation('{Intro} [ts 3/4] 3.2.4d"Hap" 0.1.8 (0.3 2.4).4~ | (0.3 2.4).4 2.3.8h 4.3.8 r.4 | [tempo 60] 2.3.8t3 2.3.8t3 2.3.8t3 0.6.4m 0.1.4v |', { tempo: 90, title: 'Test "Export"', artist: 'GuitarCoach' });
    const tex = exportAlphaTex(score);
    expect(tex).toContain('\\title "Test \\"Export\\""');
    expect(tex).toContain('\\ts 3 4');
    expect(tex).toContain('\\section "Intro"');
    const result = await importAlphaTex(tex);
    const back = result.score;
    expect(back.title).toBe('Test "Export"');
    expect(back.tempo).toBe(90);
    expect(back.masterBars).toHaveLength(3);
    expect(back.masterBars[2]!.tempo).toBe(60);
    const a = buildPlaybackPlan(score).events.filter((e) => e.kind === 'note').map((e) => `${e.midi}:${e.tick}:${e.durationTicks}`);
    const b = buildPlaybackPlan(back).events.filter((e) => e.kind === 'note').map((e) => `${e.midi}:${e.tick}:${e.durationTicks}`);
    expect(b).toEqual(a);
    const flat = back.tracks[0]!.bars.flatMap((bar) => bar.voices[0]!);
    expect(flat[0]!.text).toBe('Hap');
    expect(flat[4]!.notes[0]!.techniques).toContain('hammer-on');
    expect(flat[10]!.notes[0]!.techniques).toContain('palm-mute');
  });

  it('alle eingebauten Arrangements überleben den Export/Import-Zyklus', async () => {
    for (const song of BUILTIN_SONGS.filter((s) => s.versions.length > 0)) {
      for (const v of song.versions) {
        const score = parseTabNotation(v.notation, { tempo: v.tempo, timeSignature: v.timeSignature, title: song.title });
        const back = (await importAlphaTex(exportAlphaTex(score))).score;
        const a = buildPlaybackPlan(score).events.filter((e) => e.kind === 'note').map((e) => `${e.midi}:${e.tick}`);
        const b = buildPlaybackPlan(back).events.filter((e) => e.kind === 'note').map((e) => `${e.midi}:${e.tick}`);
        expect(b, `${song.title} – ${v.label}`).toEqual(a);
      }
    }
  });
});
