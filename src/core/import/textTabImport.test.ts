import { describe, expect, it } from 'vitest';
import { buildPlaybackPlan } from '../music/playback';
import { validateScore } from '../music/score';
import { detectFormat } from './formats';
import { looksLikeTextTab, parseTextTab } from './textTabImport';

const TAB = `Mein Riff
e|-------------------|-------------------|
B|-------------------|-------------------|
G|-------------------|-------------------|
D|-------------------|---------2---------|
A|---------2-------4-|---2h4-------------|
E|-0---0-------------|-------------------|`;

describe('Text-Tab-Import', () => {
  it('erkennt Text-Tabs', () => {
    expect(looksLikeTextTab(TAB)).toBe(true);
    expect(looksLikeTextTab('\\title "x" . 0.1.4 |')).toBe(false);
    expect(detectFormat('riff.txt', new TextEncoder().encode(TAB))).toBe('texttab');
  });

  it('liest Töne, Takte, Techniken und schätzt Dauern aus Abständen', () => {
    const result = parseTextTab(TAB, { tempo: 100 });
    const { score } = result;
    expect(score.title).toBe('Mein Riff');
    expect(validateScore(score)).toEqual([]);
    expect(result.barlineCount).toBeGreaterThan(0);
    expect(score.masterBars).toHaveLength(2);
    const notes = buildPlaybackPlan(score).events.filter((e) => e.kind === 'note');
    expect(notes.map((n) => `${n.string}:${n.fret}`)).toEqual(['6:0', '6:0', '5:2', '5:4', '5:2', '5:4', '4:2']);
    // Häufigster Abstand (4 Zeichen) = Achtel; doppelter Abstand = Viertel; „2h4“ liegt enger → ebenfalls Achtel
    expect(notes[0]!.durationTicks).toBe(480);
    expect(notes[2]!.durationTicks).toBe(960);
    expect(notes[4]!.durationTicks).toBe(480);
    expect(notes[5]!.techniques).toContain('hammer-on');
    expect(notes[6]!.durationTicks).toBe(1440);
    expect(result.warnings[0]).toMatch(/keine Notenlängen/);
    expect(result.durationsEstimated).toBe(true);
  });

  it('kann feste Dauern ohne Taktstriche verwenden', () => {
    const result = parseTextTab(TAB, { estimateFromSpacing: false, useBarlines: false, defaultDuration: 4 });
    const notes = buildPlaybackPlan(result.score).events.filter((e) => e.kind === 'note');
    expect(notes.every((n) => n.durationTicks === 960)).toBe(true);
    expect(result.score.masterBars).toHaveLength(2);
    expect(validateScore(result.score)).toEqual([]);
  });

  it('meldet fehlende Tab-Zeilen verständlich', () => {
    expect(() => parseTextTab('nur Text ohne Tabulatur')).toThrow(/keine Tabulatur-Zeilen/);
  });
});
