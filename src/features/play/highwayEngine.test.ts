import { describe, expect, it } from 'vitest';
import { HighwayEngine, timelineFromBeats, type HighwayNote } from './highwayEngine';

const notes: HighwayNote[] = timelineFromBeats(
  [
    { string: 6, fret: 0, beats: 1, midi: 40 },
    { string: 5, fret: 0, beats: 1, midi: 45 },
    { string: 4, fret: 2, beats: 2, midi: 52 },
  ],
  60,
  1,
);

describe('timelineFromBeats', () => {
  it('reiht Noten nach Schlägen auf', () => {
    expect(notes.map((n) => n.time)).toEqual([1, 2, 3]);
    expect(notes[2]!.durationSec).toBe(2);
  });
});

describe('HighwayEngine im Wartemodus', () => {
  it('hält an der Note an, bis der richtige Ton kommt, und läuft dann weiter', () => {
    const e = new HighwayEngine(notes, { mode: 'wait' });
    expect(e.tick(0)).toEqual([]);
    expect(e.tick(0.5)).toEqual([]);
    expect(e.time).toBeCloseTo(0.5);
    const ev = e.tick(1.2);
    expect(ev).toEqual([{ type: 'wait', index: 0 }]);
    expect(e.isWaiting).toBe(true);
    expect(e.time).toBeCloseTo(1);
    e.tick(3);
    expect(e.time).toBeCloseTo(1); // Zeit steht
    expect(e.onPitch(45, 0)).toBeNull(); // falscher Ton
    const hit = e.onPitch(40, 10);
    expect(hit?.type).toBe('hit');
    expect(e.isWaiting).toBe(false);
    expect(e.results[0]).toBe('hit');
    e.tick(3.5);
    e.tick(4.6); // 1,1 s später → Note 2 (bei t = 2) erreicht
    expect(e.isWaiting).toBe(true);
    expect(e.currentIndex).toBe(1);
  });

  it('akzeptiert einen Ton kurz vor der Linie und eine Oktave daneben', () => {
    const e = new HighwayEngine(notes, { mode: 'wait', earlySec: 0.3 });
    e.tick(0);
    e.tick(0.8); // 0,2 s vor Note 1
    expect(e.onPitch(52, 0)?.type).toBe('hit'); // 40 + 12
    expect(e.results[0]).toBe('hit');
  });

  it('kann eine Note überspringen und endet nach der letzten Note', () => {
    const e = new HighwayEngine(notes, { mode: 'wait' });
    e.tick(0);
    e.tick(1.5);
    expect(e.skip()?.type).toBe('miss');
    expect(e.results[0]).toBe('miss');
    e.tick(1.6);
    e.tick(3); // bis Note 2
    expect(e.onPitch(45, 0)?.type).toBe('hit');
    e.tick(3.1);
    e.tick(4.2);
    expect(e.onPitch(52, 0)?.type).toBe('hit');
    e.tick(4.3);
    const ev = e.tick(10);
    expect(ev.at(-1)).toEqual({ type: 'end' });
    expect(e.hits).toBe(2);
  });
});

describe('HighwayEngine im Durchlaufmodus', () => {
  it('wertet verpasste Noten als Fehler und trifft im Zeitfenster', () => {
    const e = new HighwayEngine(notes, { mode: 'flow', earlySec: 0.3, lateSec: 0.45 });
    e.tick(0);
    expect(e.tick(1.9)).toEqual([{ type: 'miss', index: 0 }]);
    expect(e.onPitch(45, 0)?.type).toBe('hit'); // Note 2 bei t = 2, wir sind bei 1,9
    expect(e.tick(2.5)).toEqual([]);
    expect(e.onPitch(40, 0)).toBeNull(); // zu spät für Note 1, falsch für Note 3
    e.tick(3.2);
    expect(e.onPitch(52, 0)?.type).toBe('hit');
    expect(e.tick(6).at(-1)).toEqual({ type: 'end' });
    expect(e.results).toEqual(['miss', 'hit', 'hit']);
  });

  it('zählt denselben Ton nicht doppelt', () => {
    const e = new HighwayEngine(notes, { mode: 'flow' });
    e.tick(0);
    e.tick(1);
    expect(e.onPitch(40, 0)?.type).toBe('hit');
    expect(e.onPitch(40, 0)).toBeNull();
  });
});
