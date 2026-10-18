import { describe, expect, it } from 'vitest';
import { buildPlaybackPlan } from '../music/playback';
import { parseTabNotation } from '../music/tabNotation';
import { TabPlayer, type PlayerSink } from './tabPlayer';

interface Recorded {
  kind: 'note' | 'click' | 'damp';
  time: number;
  midi?: number;
  dur?: number;
  accent?: boolean;
}

function setup(src: string, tempo: number, timeSignature: [number, number] = [4, 4]) {
  const plan = buildPlaybackPlan(parseTabNotation(src, { tempo, timeSignature }));
  const log: Recorded[] = [];
  let now = 0;
  const timers: Array<() => void> = [];
  const sink: PlayerSink = {
    noteOn: (ev, time, dur) => log.push({ kind: 'note', time, midi: ev.midi, dur }),
    damp: (time) => log.push({ kind: 'damp', time }),
    click: (time, accent) => log.push({ kind: 'click', time, accent }),
    stopAll: () => undefined,
  };
  const player = new TabPlayer({
    clock: { now: () => now },
    sink,
    setTimer: (cb) => {
      timers.push(cb);
      return timers.length;
    },
    clearTimer: () => {
      timers.length = 0;
    },
  });
  player.load(plan);
  const advance = (seconds: number, step = 0.04): void => {
    const target = now + seconds;
    while (now < target - 1e-9) {
      now = Math.min(target, now + step);
      for (const t of [...timers]) t();
    }
  };
  return { plan, player, log, advance, now: () => now };
}

describe('TabPlayer', () => {
  it('plant Noten im richtigen zeitlichen Abstand (100 %)', () => {
    const { player, log, advance } = setup('0.1.4 1.2.4 3.2.4 0.1.4 |', 60);
    player.play();
    advance(5);
    const notes = log.filter((e) => e.kind === 'note');
    expect(notes.map((n) => n.midi)).toEqual([64, 60, 62, 64]);
    const diffs = notes.slice(1).map((n, i) => n.time - notes[i]!.time);
    for (const d of diffs) expect(d).toBeCloseTo(1, 6);
    expect(player.getStatus()).toBe('stopped');
  });

  it('spielt bei 50 % Tempo tatsächlich doppelt so langsam', () => {
    const { player, log, advance } = setup('0.1.4 1.2.4 3.2.4 0.1.4 |', 60);
    player.setTempoFactor(0.5);
    player.play();
    advance(9);
    const notes = log.filter((e) => e.kind === 'note');
    expect(notes).toHaveLength(4);
    expect(notes[1]!.time - notes[0]!.time).toBeCloseTo(2, 6);
    expect(notes[0]!.dur).toBeCloseTo(2, 6);
  });

  it('wiederholt ausschließlich den gewählten Abschnitt', () => {
    const { player, log, advance } = setup('0.1.4 | 1.2.4 | 3.2.4 | 0.3.4 |', 60, [1, 4]);
    player.setLoop({ startInstance: 1, endInstance: 2 });
    player.play();
    advance(6.5);
    const notes = log.filter((e) => e.kind === 'note');
    expect(notes.length).toBeGreaterThanOrEqual(6);
    expect(new Set(notes.map((n) => n.midi))).toEqual(new Set([60, 62]));
    const diffs = notes.slice(1).map((n, i) => n.time - notes[i]!.time);
    for (const d of diffs) expect(d).toBeCloseTo(1, 6);
    expect(player.getStatus()).toBe('playing');
    const pos = player.getPositionSec();
    expect(pos).toBeGreaterThanOrEqual(1);
    expect(pos).toBeLessThanOrEqual(3);
  });

  it('plant Metronom-Klicks mit Akzent auf der Eins und Einzähler', () => {
    const { player, log, advance } = setup('0.1.4 0.1.4 0.1.4 | 0.1.4 0.1.4 0.1.4 |', 120, [3, 4]);
    player.setMetronome(true);
    player.setCountIn(true);
    player.play();
    expect(player.getStatus()).toBe('counting');
    advance(5);
    const clicks = log.filter((e) => e.kind === 'click');
    expect(clicks).toHaveLength(3 + 6);
    expect(clicks[0]!.accent).toBe(true);
    expect(clicks[3]!.accent).toBe(true);
    expect(clicks[4]!.accent).toBe(false);
    const firstNote = log.find((e) => e.kind === 'note')!;
    expect(firstNote.time).toBeCloseTo(clicks[3]!.time, 6);
    expect(clicks[3]!.time - clicks[0]!.time).toBeCloseTo(1.5, 6);
  });

  it('Einzelton-Modus spielt genau den nächsten Beat', () => {
    const { player, log } = setup('0.1.4 r.4 (1.2 0.3).4 3.2.4 |', 60);
    const first = player.stepNext();
    expect(first?.beat.notes[0]?.midi).toBe(64);
    expect(log.filter((e) => e.kind === 'note')).toHaveLength(1);
    const second = player.stepNext();
    expect(second?.beat.notes).toHaveLength(2);
    expect(log.filter((e) => e.kind === 'note')).toHaveLength(3);
    const third = player.stepNext();
    expect(third?.beat.notes[0]?.fret).toBe(3);
    expect(player.stepNext()).toBeNull();
    expect(player.stepPrev()?.beat.notes).toHaveLength(2);
    expect(player.getStatus()).toBe('paused');
  });

  it('pausiert und setzt an der gleichen Stelle fort', () => {
    const { player, log, advance } = setup('0.1.4 1.2.4 3.2.4 0.1.4 |', 60);
    player.play();
    advance(1.3);
    player.pause();
    const pos = player.getPositionSec();
    expect(pos).toBeGreaterThan(1.1);
    expect(pos).toBeLessThan(1.5);
    const before = log.filter((e) => e.kind === 'note').length;
    player.play();
    advance(4);
    const notes = log.filter((e) => e.kind === 'note');
    expect(notes.length).toBe(before + 2);
  });
});
