import { describe, expect, it } from 'vitest';
import { buildPlaybackPlan, findBarInstanceAtSec, findBeatAtSec, secToTick, tickToSec, unrollBarOrder } from './playback';
import { parseTabNotation } from './tabNotation';

describe('Abspielplan', () => {
  it('entrollt Wiederholungen', () => {
    const score = parseTabNotation('[ro] 0.1.4 | [rc 2] 1.2.4 | 3.2.4 |', { tempo: 60, timeSignature: [1, 4] });
    expect(unrollBarOrder(score.masterBars)).toEqual([0, 1, 0, 1, 2]);
  });

  it('entrollt alternative Schlüsse', () => {
    const score = parseTabNotation('[ro] 0.1.4 | [ae 1] [rc 2] 1.2.4 | [ae 2] 3.2.4 | 0.3.4 |', { tempo: 60, timeSignature: [1, 4] });
    expect(unrollBarOrder(score.masterBars)).toEqual([0, 1, 0, 2, 3]);
  });

  it('berechnet Sekunden aus Ticks und Tempo', () => {
    const score = parseTabNotation('0.1.4 0.1.4 0.1.4 0.1.4 | [tempo 120] 0.1.4 0.1.4 0.1.4 0.1.4 |', { tempo: 60 });
    const plan = buildPlaybackPlan(score);
    expect(plan.barInstances).toHaveLength(2);
    expect(plan.barInstances[0]!.endSec).toBeCloseTo(4, 9);
    expect(plan.barInstances[1]!.endSec).toBeCloseTo(6, 9);
    expect(plan.totalSec).toBeCloseTo(6, 9);
    expect(plan.events.filter((e) => e.kind === 'note')).toHaveLength(8);
    expect(plan.metronome).toHaveLength(8);
    expect(plan.metronome[4]!.sec).toBeCloseTo(4, 9);
    expect(plan.metronome[5]!.sec).toBeCloseTo(4.5, 9);
  });

  it('verlängert gebundene Noten und erzeugt keine Doppel-Anschläge', () => {
    const score = parseTabNotation('0.1.2~ 0.1.2 | 0.1.1 |', { tempo: 60 });
    const plan = buildPlaybackPlan(score);
    const notes = plan.events.filter((e) => e.kind === 'note');
    expect(notes).toHaveLength(2);
    expect(notes[0]!.durationSec).toBeCloseTo(4, 9);
  });

  it('erzeugt Pausen-Ereignisse und findet Beats/Takte nach Zeit', () => {
    const score = parseTabNotation('0.1.4 r.4 2.2.2 | 3.1.1 |', { tempo: 120 });
    const plan = buildPlaybackPlan(score);
    expect(plan.events.some((e) => e.kind === 'rest')).toBe(true);
    expect(findBeatAtSec(plan, 0.6)!.isRest).toBe(true);
    expect(findBeatAtSec(plan, 1.2)!.beat.notes[0]!.fret).toBe(2);
    expect(findBarInstanceAtSec(plan, 2.1)!.barIndex).toBe(1);
    expect(secToTick(plan, 1)).toBeCloseTo(1920, 6);
    expect(tickToSec(plan, 3840)).toBeCloseTo(2, 9);
  });

  it('nutzt eine vorgegebene Abspielreihenfolge', () => {
    const score = parseTabNotation('0.1.4 | 1.2.4 | 3.2.4 |', { tempo: 60, timeSignature: [1, 4] });
    score.playbackBarOrder = [2, 1, 0, 0];
    const plan = buildPlaybackPlan(score);
    expect(plan.barInstances.map((b) => b.barIndex)).toEqual([2, 1, 0, 0]);
    expect(plan.totalSec).toBeCloseTo(4, 9);
  });
});

describe('Mehrspurige Wiedergabe', () => {
  it('mischt Begleitspuren leiser dazu, ohne Darstellung und Einzelton-Modus zu verändern', async () => {
    const { buildMixPlan } = await import('./playback');
    const main = parseTabNotation('0.1.4 1.2.4 3.2.4 0.1.4 |', { tempo: 60 });
    const bass = parseTabNotation('0.6.2 0.5.2 |', { tempo: 60 });
    const score = { ...main, tracks: [main.tracks[0]!, { ...bass.tracks[0]!, id: 'track-2', name: 'Bass' }] };
    const plan = buildMixPlan(score, 0, [{ trackIndex: 1, gain: 0.5 }]);
    const notes = plan.events.filter((e) => e.kind === 'note');
    expect(notes).toHaveLength(6);
    expect(plan.beats.every((b) => b.instanceIndex >= 0)).toBe(true);
    expect(plan.beats).toHaveLength(4);
    const bassNotes = notes.filter((n) => n.trackIndex === 1);
    expect(bassNotes).toHaveLength(2);
    expect(bassNotes[0]!.velocity).toBeCloseTo(0.425, 6);
    expect(bassNotes.every((n) => n.beatRef === -1)).toBe(true);
    expect(plan.accompanimentTracks).toEqual([1]);
    expect(buildMixPlan(score, 0, []).accompanimentTracks).toBeUndefined();
  });
});
