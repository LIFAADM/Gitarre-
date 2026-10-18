import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPlaybackPlan } from '../music/playback';
import { validateScore } from '../music/score';
import { detectFormat } from './formats';
import { importFileBytes } from './importFile';
import { createSongFile, parseSongFile } from './gcjson';
import { parseTabNotation } from '../music/tabNotation';
import { importMidi } from './midiImport';

const gp = new Uint8Array(readFileSync('public/samples/guitarcoach-etuede-1.gp'));
const xml = new Uint8Array(readFileSync('public/samples/guitarcoach-etuede-2.musicxml'));

describe('Formaterkennung', () => {
  it('erkennt Formate an Inhalt und Endung', () => {
    expect(detectFormat('a.gp', gp)).toBe('gp7');
    expect(detectFormat('b.musicxml', xml)).toBe('musicxml');
    expect(detectFormat('c.mid', new Uint8Array([0x4d, 0x54, 0x68, 0x64]))).toBe('midi');
    expect(detectFormat('d.gp5', new TextEncoder().encode('\x18FICHIER GUITAR PRO v5.10'))).toBe('gp5');
    expect(detectFormat('e.gp4', new TextEncoder().encode('\x18FICHIER GUITAR PRO v4.06'))).toBe('gp4');
    expect(detectFormat('f.json', new TextEncoder().encode('{"format":"guitarcoach-song"}'))).toBe('gcjson');
    expect(detectFormat('g.atex', new TextEncoder().encode('\\title "x" . 0.1.4 |'))).toBe('alphatex');
    expect(detectFormat('h.bin', new Uint8Array([1, 2, 3]))).toBe('unknown');
  });
});

describe('Import über alphaTab', () => {
  it('importiert eine Guitar-Pro-7-Datei mit zwei Spuren und Wiederholung', async () => {
    const outcome = await importFileBytes('guitarcoach-etuede-1.gp', gp);
    expect(outcome.kind).toBe('score');
    if (outcome.kind !== 'score') return;
    const { score, tracks } = outcome.result;
    expect(score.title).toBe('GuitarCoach Etüde Nr. 1');
    expect(score.tempo).toBe(84);
    expect(tracks).toHaveLength(2);
    expect(tracks[0]!.name).toBe('Melodie');
    expect(score.tracks[0]!.tuning).toEqual([64, 59, 55, 50, 45, 40]);
    expect(validateScore(score)).toEqual([]);
    const firstBeat = score.tracks[0]!.bars[0]!.voices[0]![0]!;
    expect(firstBeat.notes[0]).toMatchObject({ string: 1, fret: 0, midi: 64 });
    expect(score.playbackBarOrder).toEqual([0, 1, 2, 0, 1, 2, 3]);
    const plan = buildPlaybackPlan(score, 0);
    expect(plan.barInstances).toHaveLength(7);
    expect(plan.events.filter((e) => e.kind === 'note').length).toBeGreaterThan(20);
  });

  it('importiert MusicXML mit Tabulaturangaben', async () => {
    const outcome = await importFileBytes('guitarcoach-etuede-2.musicxml', xml);
    expect(outcome.kind).toBe('score');
    if (outcome.kind !== 'score') return;
    const { score } = outcome.result;
    expect(score.title).toBe('GuitarCoach Etüde Nr. 2');
    expect(score.tempo).toBe(92);
    expect(score.masterBars).toHaveLength(4);
    expect(validateScore(score)).toEqual([]);
    const notes = buildPlaybackPlan(score).events.filter((e) => e.kind === 'note');
    expect(notes).toHaveLength(16);
    expect(notes[0]).toMatchObject({ midi: 55, string: 3, fret: 0 });
  });

  it('importiert alphaTex-Text', async () => {
    const tex = '\\title "Tex" \\tempo 100 . 3.2.4 0.1.4 r.2 | (0.3 2.4).1 |';
    const outcome = await importFileBytes('tex.atex', new TextEncoder().encode(tex));
    expect(outcome.kind).toBe('score');
    if (outcome.kind !== 'score') return;
    expect(outcome.result.score.masterBars).toHaveLength(2);
    expect(validateScore(outcome.result.score)).toEqual([]);
  });

  it('meldet unbekannte Formate verständlich', async () => {
    await expect(importFileBytes('x.bin', new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(/nicht erkannt/);
  });
});

describe('GuitarCoach-JSON', () => {
  it('exportiert und importiert Songdateien verlustfrei', () => {
    const score = parseTabNotation('0.1.4 1.2.4 3.2.4 0.1.4 |', { tempo: 90 });
    const file = createSongFile(
      { id: 's', title: 'Eigenes Lied', artist: 'Ich', genre: 'Eigene', difficulty: 1, rightsStatus: 'user-created', isBuiltin: false, isFavorite: false, createdAt: 0, updatedAt: 0 },
      [{ id: 'v', songId: 's', label: 'Eigene', kind: 'user', order: 0, score, createdAt: 0, trackCount: 1, barCount: 1, noteCount: 4, maxFret: 3 }],
    );
    const parsed = parseSongFile(JSON.stringify(file));
    expect(parsed.song.title).toBe('Eigenes Lied');
    expect(parsed.versions[0]!.score.tracks[0]!.bars[0]!.voices[0]).toHaveLength(4);
    expect(() => parseSongFile('{"format":"other"}')).toThrow(/keine GuitarCoach/);
    expect(() => parseSongFile('nope')).toThrow(/JSON/);
  });
});

describe('MIDI-Import', () => {
  function buildMidi(): Uint8Array {
    // Format 0, PPQ 480, 4/4, Tempo 120, vier Viertelnoten E4 G4 C4 D4
    const events: number[] = [];
    const push = (...b: number[]): void => {
      events.push(...b);
    };
    push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
    push(0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20);
    push(0x00, 0xff, 0x03, 0x06, ...'Melody'.split('').map((c) => c.charCodeAt(0)));
    push(0x00, 0xc0, 0x18);
    for (const key of [64, 67, 60, 62]) {
      push(0x00, 0x90, key, 0x60);
      push(0x83, 0x60, 0x80, key, 0x00); // 480 Ticks später
    }
    push(0x00, 0xff, 0x2f, 0x00);
    const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0];
    const len = events.length;
    const track = [0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...events];
    return new Uint8Array([...header, ...track]);
  }

  it('liest Noten, Tempo und Taktart und berechnet Griffpositionen', () => {
    const result = importMidi(buildMidi());
    const { score } = result;
    expect(score.tempo).toBe(120);
    expect(score.masterBars).toHaveLength(1);
    expect(score.masterBars[0]!.timeSignature).toEqual({ numerator: 4, denominator: 4 });
    expect(validateScore(score)).toEqual([]);
    const notes = buildPlaybackPlan(score).events.filter((e) => e.kind === 'note');
    expect(notes.map((n) => n.midi)).toEqual([64, 67, 60, 62]);
    expect(notes[0]).toMatchObject({ string: 1, fret: 0 });
    expect(notes.every((n) => n.durationTicks === 960)).toBe(true);
    expect(result.warnings[0]).toMatch(/automatisch/);
  });
});
