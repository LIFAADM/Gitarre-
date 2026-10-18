/**
 * Reine Textbausteine für die Sprachbegleitung (ohne Browser-APIs, daher vollständig testbar):
 * Markdown der Lektionen in vorlesbaren Text wandeln, Notennamen aussprechbar machen,
 * Ansagen für Stimmgerät, Spiel-mit-Modus und Einzähler bilden.
 */

const NUMBER_WORDS = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig'] as const;
const ORDINAL_STEMS = ['nullt', 'erst', 'zweit', 'dritt', 'viert', 'fünft', 'sechst', 'siebt', 'acht', 'neunt', 'zehnt', 'elft', 'zwölft'] as const;

/** Zahlwort 0–20, darüber Ziffern. */
export function numberWord(n: number): string {
  const i = Math.round(n);
  return i >= 0 && i < NUMBER_WORDS.length ? NUMBER_WORDS[i]! : String(i);
}

/** Ordnungszahl mit Endung: „dritte Saite“ (feminin), „dritter Bund“ (maskulin). */
export function ordinal(n: number, gender: 'f' | 'm' = 'f'): string {
  const i = Math.round(n);
  let stem: string;
  if (i >= 0 && i < ORDINAL_STEMS.length) stem = ORDINAL_STEMS[i]!;
  else if (i < 20) stem = `${numberWord(i)}t`;
  else if (i === 20) stem = 'zwanzigst';
  else stem = `${i}.`;
  if (stem.endsWith('.')) return stem;
  return gender === 'f' ? `${stem}e` : `${stem}er`;
}

/** Zählworte für den Einzähler („eins, zwei, drei, vier“). */
export function countWords(beats: number): string[] {
  const n = Math.max(1, Math.min(16, Math.round(beats)));
  return Array.from({ length: n }, (_, i) => numberWord(i + 1));
}

/** „F#“ → „Fis“, „A#3“ → „Ais“, „H“ bleibt „H“; Oktavziffern werden entfernt. */
export function spokenNoteName(name: string): string {
  const base = name.replace(/\d+$/, '').trim();
  const m = /^([A-Ha-h])([#♯b♭]?)$/.exec(base);
  if (!m) return base;
  const letter = m[1]!.toUpperCase();
  const acc = m[2] ?? '';
  if (acc === '#' || acc === '♯') return `${letter}is`;
  if (acc === 'b' || acc === '♭') {
    if (letter === 'E') return 'Es';
    if (letter === 'A') return 'As';
    if (letter === 'H' || letter === 'B') return 'B';
    return `${letter}es`;
  }
  return letter;
}

/** Normalisiert Leerraum und sorgt für ein Satzende. */
function sentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return /[.!?:;]$/.test(t) ? t : `${t}.`;
}

/** Zeichen und Abkürzungen, die Sprachausgaben schlecht lesen, in Worte umsetzen. */
export function expandForSpeech(text: string): string {
  return (
    text
      // Saitenfolgen wie „E–A–D–G–H–E“ werden einzeln gesprochen.
      .replace(/\b([A-Ha-h][#♯b♭]?)(?:\s?[-–]\s?([A-Ha-h][#♯b♭]?))+\b/g, (m) => m.split(/\s?[-–]\s?/).map(spokenNoteName).join(', '))
      .replace(/\bz\.\s?B\./g, 'zum Beispiel')
      .replace(/\bbzw\./g, 'beziehungsweise')
      .replace(/\bca\./g, 'circa')
      .replace(/\bevtl\./g, 'eventuell')
      .replace(/\bMin\./g, 'Minuten')
      .replace(/\bSek\./g, 'Sekunden')
      .replace(/\bBPM\b/g, 'Schläge pro Minute')
      .replace(/\bHz\b/g, 'Hertz')
      .replace(/♩/g, 'Viertel')
      .replace(/%/g, ' Prozent')
      .replace(/±\s?/g, 'plus minus ')
      .replace(/→/g, ', dann ')
      .replace(/\s?[–—]\s?/g, ', ')
      .replace(/\s+,/g, ',')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/**
 * Wandelt den Markdown-lite der Lektionen (`## Überschrift`, `- Punkt`, `> Hinweis`, **fett**, *kursiv*, `code`)
 * in fortlaufenden, vorlesbaren Text.
 */
export function markdownToSpeech(markdown: string): string {
  const out: string[] = [];
  let paragraph: string[] = [];
  const flush = (): void => {
    if (paragraph.length) out.push(sentence(paragraph.join(' ')));
    paragraph = [];
  };
  for (const raw of markdown.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith('## ')) {
      flush();
      out.push(sentence(line.slice(3)));
      continue;
    }
    if (line.startsWith('- ')) {
      flush();
      out.push(sentence(line.slice(2)));
      continue;
    }
    if (line.startsWith('> ')) {
      flush();
      out.push(sentence(`Hinweis: ${line.slice(2)}`));
      continue;
    }
    paragraph.push(line);
  }
  flush();
  const plain = out
    .join(' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
  return expandForSpeech(plain);
}

/** Teilt Text in kurze Abschnitte (Satzgrenzen), damit Browser lange Ausgaben nicht abbrechen. */
export function chunkText(text: string, maxLength = 220): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?;:])\s+/);
  const chunks: string[] = [];
  let current = '';
  const push = (): void => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };
  for (const s of sentences) {
    if (s.length > maxLength) {
      push();
      // Überlange Sätze an Kommata bzw. Wörtern teilen.
      let rest = s;
      while (rest.length > maxLength) {
        let cut = rest.lastIndexOf(', ', maxLength);
        if (cut < maxLength / 2) cut = rest.lastIndexOf(' ', maxLength);
        if (cut <= 0) cut = maxLength;
        chunks.push(rest.slice(0, cut + (rest[cut] === ',' ? 1 : 0)).trim());
        rest = rest.slice(cut).replace(/^[,\s]+/, '');
      }
      current = rest;
      continue;
    }
    if ((current + ' ' + s).trim().length > maxLength) push();
    current = current ? `${current} ${s}` : s;
  }
  push();
  return chunks;
}

/* ------------------------------- Stimmgerät ------------------------------- */

export interface TunerSpeechReading {
  /** Name der Zielsaite (z. B. „E“, „H“). */
  name: string;
  stringNumber: number;
  direction: 'low' | 'high' | 'ok';
  farOff: boolean;
}

/** Kurze Ansage für den aktuellen Stimmzustand. */
export function tunerPhrase(r: TunerSpeechReading): string {
  const note = spokenNoteName(r.name);
  if (r.direction === 'ok') return `${note} stimmt.`;
  const dir = r.direction === 'low' ? 'zu tief' : 'zu hoch';
  return r.farOff ? `${note}-Saite, weit ${dir}.` : `${note}-Saite, ${dir}.`;
}

/**
 * Entscheidet, wann das Stimmgerät etwas ansagt: erst wenn ein Zustand kurz stabil ist, nicht öfter als
 * alle `minGapMs`, und derselbe Zustand erst wieder nach einer Pause (neuer Anschlag).
 */
export class TunerAnnouncer {
  private candidateKey: string | null = null;
  private candidateSince = 0;
  private lastSpokenKey: string | null = null;
  private lastSpokenAt = Number.NEGATIVE_INFINITY;
  private silentSince: number | null = null;

  constructor(
    private readonly stableMs = 500,
    private readonly minGapMs = 1500,
    private readonly silenceResetMs = 500,
  ) {}

  update(reading: TunerSpeechReading | null, now: number): string | null {
    if (!reading) {
      this.candidateKey = null;
      this.silentSince ??= now;
      return null;
    }
    if (this.silentSince !== null) {
      // Nach einer Pause (neuer Anschlag) darf dieselbe Ansage wieder kommen.
      if (now - this.silentSince >= this.silenceResetMs) this.lastSpokenKey = null;
      this.silentSince = null;
    }
    const key = `${reading.stringNumber}|${reading.direction}|${reading.farOff ? 'far' : 'near'}`;
    if (key !== this.candidateKey) {
      this.candidateKey = key;
      this.candidateSince = now;
      return null;
    }
    if (now - this.candidateSince < this.stableMs) return null;
    if (key === this.lastSpokenKey) return null;
    if (now - this.lastSpokenAt < this.minGapMs) return null;
    this.lastSpokenKey = key;
    this.lastSpokenAt = now;
    return tunerPhrase(reading);
  }

  reset(): void {
    this.candidateKey = null;
    this.lastSpokenKey = null;
    this.lastSpokenAt = Number.NEGATIVE_INFINITY;
    this.silentSince = null;
  }
}

/* ------------------------------ Spiel-mit-Modus ------------------------------ */

export interface SpokenPosition {
  string: number;
  fret: number;
  /** Notenname ohne Oktave (bereits in der gewählten Benennung). */
  name: string;
}

/** „E, sechste Saite, leer.“ / „C, fünfte Saite, dritter Bund.“ / „Akkord: E und H.“ */
export function listenTargetPhrase(positions: readonly SpokenPosition[]): string {
  if (positions.length === 0) return '';
  if (positions.length > 1) return `Akkord: ${positions.map((p) => spokenNoteName(p.name)).join(' und ')}.`;
  const p = positions[0]!;
  const where = p.fret === 0 ? 'leer' : `${ordinal(p.fret, 'm')} Bund`;
  return `${spokenNoteName(p.name)}, ${ordinal(p.string, 'f')} Saite, ${where}.`;
}

export type ListenSpeechVerdict = { kind: 'match' } | { kind: 'near'; direction: 'tief' | 'hoch' } | { kind: 'octave' } | { kind: 'wrong'; played: string; expected: string };

export function listenVerdictPhrase(v: ListenSpeechVerdict): string {
  switch (v.kind) {
    case 'match':
      return 'Richtig.';
    case 'near':
      return `Fast, etwas zu ${v.direction}.`;
    case 'octave':
      return 'Richtiger Ton, falsche Oktave.';
    default:
      return `Falsch, das war ${spokenNoteName(v.played)}. Erwartet: ${spokenNoteName(v.expected)}.`;
  }
}

export function listenResultPhrase(correct: number, total: number): string {
  if (total === 0) return 'Fertig.';
  const percent = Math.round((correct / total) * 100);
  const praise = percent >= 80 ? 'Sehr gut!' : percent >= 50 ? 'Gut, weiter so.' : 'Übe die Stelle noch einmal langsam.';
  return `Fertig. ${correct} von ${total} Tönen richtig. ${praise}`;
}
