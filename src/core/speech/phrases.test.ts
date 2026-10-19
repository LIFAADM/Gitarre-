import { describe, expect, it } from 'vitest';
import { chunkText, countWords, numberWord } from './phrases';

describe('Einzähler-Worte', () => {
  it('zählt ein', () => {
    expect(countWords(4)).toEqual(['eins', 'zwei', 'drei', 'vier']);
    expect(countWords(3)).toEqual(['eins', 'zwei', 'drei']);
    expect(countWords(6)).toHaveLength(6);
    expect(numberWord(20)).toBe('20');
  });
});

describe('chunkText', () => {
  it('teilt an Satzgrenzen und hält die Höchstlänge ein', () => {
    const text = Array.from({ length: 12 }, (_, i) => `Satz Nummer ${i + 1} ist nicht besonders lang.`).join(' ');
    const chunks = chunkText(text, 120);
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(120);
    expect(chunks.join(' ')).toBe(text);
  });
  it('liefert für leeren Text nichts', () => {
    expect(chunkText('   ')).toEqual([]);
  });
});
