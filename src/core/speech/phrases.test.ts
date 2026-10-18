import { describe, expect, it } from 'vitest';
import { TunerAnnouncer, chunkText, countWords, expandForSpeech, listenResultPhrase, listenTargetPhrase, listenVerdictPhrase, markdownToSpeech, ordinal, spokenNoteName, tunerPhrase } from './phrases';

describe('spokenNoteName', () => {
  it('spricht Vorzeichen deutsch aus und entfernt Oktaven', () => {
    expect(spokenNoteName('F#')).toBe('Fis');
    expect(spokenNoteName('A#3')).toBe('Ais');
    expect(spokenNoteName('Eb')).toBe('Es');
    expect(spokenNoteName('Ab')).toBe('As');
    expect(spokenNoteName('Db')).toBe('Des');
    expect(spokenNoteName('H')).toBe('H');
    expect(spokenNoteName('E2')).toBe('E');
    expect(spokenNoteName('B')).toBe('B');
  });
});

describe('ordinal / countWords', () => {
  it('bildet Ordnungszahlen mit passender Endung', () => {
    expect(ordinal(1, 'f')).toBe('erste');
    expect(ordinal(3, 'm')).toBe('dritter');
    expect(ordinal(6, 'f')).toBe('sechste');
    expect(ordinal(12, 'm')).toBe('zwölfter');
    expect(ordinal(15, 'm')).toBe('fünfzehnter');
  });
  it('zählt ein', () => {
    expect(countWords(4)).toEqual(['eins', 'zwei', 'drei', 'vier']);
    expect(countWords(3)).toEqual(['eins', 'zwei', 'drei']);
    expect(countWords(6)).toHaveLength(6);
  });
});

describe('markdownToSpeech', () => {
  it('wandelt Überschriften, Listen, Hinweise und Hervorhebungen in Sätze', () => {
    const md = ['## Haltung', '', 'Setz dich **aufrecht** hin.', 'Die Gitarre liegt auf dem *rechten* Bein.', '', '- Daumen hinter dem Hals', '- Finger gekrümmt', '', '> Nicht verkrampfen'].join('\n');
    expect(markdownToSpeech(md)).toBe('Haltung. Setz dich aufrecht hin. Die Gitarre liegt auf dem rechten Bein. Daumen hinter dem Hals. Finger gekrümmt. Hinweis: Nicht verkrampfen.');
  });
  it('setzt Abkürzungen und Sonderzeichen in Worte um', () => {
    expect(expandForSpeech('Stimmung E–A–D–G–H–E, ca. 5 Min., 60 BPM, ±5 Cent')).toBe('Stimmung E, A, D, G, H, E, circa 5 Minuten, 60 Schläge pro Minute, plus minus 5 Cent');
    expect(expandForSpeech('z. B. Takt 2 → Takt 3 bei 50 %')).toBe('zum Beispiel Takt 2, dann Takt 3 bei 50 Prozent');
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
  it('zerlegt überlange Sätze an Kommata', () => {
    const long = `${'Wort '.repeat(30).trim()}, ${'noch '.repeat(30).trim()}.`;
    const chunks = chunkText(long, 100);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(100);
  });
  it('liefert für leeren Text nichts', () => {
    expect(chunkText('   ')).toEqual([]);
  });
});

describe('Stimmgerät-Ansagen', () => {
  it('formuliert Zustand und Richtung', () => {
    expect(tunerPhrase({ name: 'E', stringNumber: 6, direction: 'ok', farOff: false })).toBe('E stimmt.');
    expect(tunerPhrase({ name: 'A', stringNumber: 5, direction: 'low', farOff: false })).toBe('A-Saite, zu tief.');
    expect(tunerPhrase({ name: 'H', stringNumber: 2, direction: 'high', farOff: true })).toBe('H-Saite, weit zu hoch.');
  });

  it('spricht erst nach stabiler Messung, nicht doppelt und nach Pause erneut', () => {
    const a = new TunerAnnouncer(500, 1500, 500);
    const low = { name: 'E', stringNumber: 6, direction: 'low' as const, farOff: false };
    expect(a.update(low, 0)).toBeNull();
    expect(a.update(low, 300)).toBeNull();
    expect(a.update(low, 600)).toBe('E-Saite, zu tief.');
    expect(a.update(low, 900)).toBeNull();
    expect(a.update(low, 3000)).toBeNull();
    // Richtung ändert sich → neue Ansage nach Stabilität und Mindestabstand
    const ok = { ...low, direction: 'ok' as const };
    expect(a.update(ok, 3100)).toBeNull();
    expect(a.update(ok, 3700)).toBe('E stimmt.');
    // Stille (neuer Anschlag) erlaubt dieselbe Ansage erneut
    expect(a.update(null, 4000)).toBeNull();
    expect(a.update(null, 4600)).toBeNull();
    expect(a.update(ok, 5000)).toBeNull();
    expect(a.update(ok, 5600)).toBe('E stimmt.');
  });

  it('hält den Mindestabstand zwischen Ansagen ein', () => {
    const a = new TunerAnnouncer(100, 2000, 500);
    const low = { name: 'E', stringNumber: 6, direction: 'low' as const, farOff: false };
    expect(a.update(low, 0)).toBeNull();
    expect(a.update(low, 150)).toBe('E-Saite, zu tief.');
    const high = { ...low, direction: 'high' as const };
    expect(a.update(high, 200)).toBeNull();
    expect(a.update(high, 400)).toBeNull(); // zu früh
    expect(a.update(high, 2200)).toBe('E-Saite, zu hoch.');
  });
});

describe('Spiel-mit-Ansagen', () => {
  it('beschreibt Ziel-Ton mit Saite und Bund', () => {
    expect(listenTargetPhrase([{ string: 6, fret: 0, name: 'E' }])).toBe('E, sechste Saite, leer.');
    expect(listenTargetPhrase([{ string: 5, fret: 3, name: 'C' }])).toBe('C, fünfte Saite, dritter Bund.');
    expect(listenTargetPhrase([{ string: 1, fret: 2, name: 'F#' }])).toBe('Fis, erste Saite, zweiter Bund.');
    expect(listenTargetPhrase([
      { string: 6, fret: 0, name: 'E' },
      { string: 2, fret: 0, name: 'H' },
    ])).toBe('Akkord: E und H.');
  });
  it('formuliert Bewertungen und Ergebnis', () => {
    expect(listenVerdictPhrase({ kind: 'match' })).toBe('Richtig.');
    expect(listenVerdictPhrase({ kind: 'near', direction: 'tief' })).toBe('Fast, etwas zu tief.');
    expect(listenVerdictPhrase({ kind: 'octave' })).toBe('Richtiger Ton, falsche Oktave.');
    expect(listenVerdictPhrase({ kind: 'wrong', played: 'G#', expected: 'A' })).toBe('Falsch, das war Gis. Erwartet: A.');
    expect(listenResultPhrase(9, 10)).toBe('Fertig. 9 von 10 Tönen richtig. Sehr gut!');
    expect(listenResultPhrase(0, 0)).toBe('Fertig.');
  });
});
