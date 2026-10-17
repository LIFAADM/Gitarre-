import { barTicks, durationToTicks, ticksToDuration, type Duration, type DurationBase } from '../music/durations';
import { midiForPosition, suggestFinger } from '../music/fretboard';
import type { Bar, Beat, MasterBar, Note, Score, Technique, Track } from '../music/score';
import { STANDARD_TUNING } from '../music/tuning';
import type { AlphaTabImportResult } from './alphaTabImport';

/**
 * Import einfacher ASCII-Text-Tabs (sechs Zeilen mit Bundzahlen und Strichen).
 * Text-Tabs enthalten keine Notenlängen – sie werden aus den Abständen geschätzt oder
 * mit einer Standarddauer angenommen und entsprechend gekennzeichnet.
 */

export interface TextTabOptions {
  /** Standarddauer für einen Beat (kleinster Abstand). */
  defaultDuration?: DurationBase;
  /** Längere Abstände zwischen Zahlen als längere Noten interpretieren. */
  estimateFromSpacing?: boolean;
  /** Taktstriche („|“) als Taktgrenzen übernehmen. */
  useBarlines?: boolean;
  timeSignature?: [number, number];
  tempo?: number;
  title?: string;
}

export interface TextTabParseResult extends AlphaTabImportResult {
  durationsEstimated: boolean;
  noteCount: number;
  barlineCount: number;
}

const TAB_LINE = /^\s*(?:([eEbBhHgGdDaA])\s*(?:[|:]+)?\s*)?((?:[-0-9|hpbrsx~/\\()*^.,:<>]|\s(?=[-0-9|]))+)\s*$/;

interface TabLine {
  label: string;
  content: string;
}

interface RawBeat {
  column: number;
  notes: Array<{ string: number; fret: number; techniques: Technique[] }>;
}

interface Segment {
  beats: RawBeat[];
  start: number;
  end: number;
}

function isTabLine(line: string): boolean {
  const m = TAB_LINE.exec(line);
  if (!m) return false;
  const content = m[2] ?? '';
  return (content.match(/-/g)?.length ?? 0) >= 3;
}

/** Erkennt, ob ein Text wie ein ASCII-Tab aussieht (mind. 4 Tab-Zeilen). */
export function looksLikeTextTab(text: string): boolean {
  const lines = text.split(/\r?\n/);
  let count = 0;
  let consecutive = 0;
  for (const line of lines) {
    if (isTabLine(line)) {
      count++;
      consecutive++;
      if (consecutive >= 4) return true;
    } else if (line.trim() === '') {
      consecutive = 0;
    } else consecutive = 0;
  }
  return count >= 4 && false;
}

function stringOrder(lines: TabLine[]): number[] {
  // Rückgabe: für Zeile i die Saitennummer (1 = hohe E)
  const labels = lines.map((l) => l.label.toLowerCase());
  const standard = lines.map((_, i) => i + 1);
  if (labels.every((l) => l === '')) return standard;
  const names = ['e', 'b', 'g', 'd', 'a', 'e'];
  const normalized = labels.map((l) => (l === 'h' ? 'b' : l));
  const matchesTopDown = normalized.every((l, i) => l === '' || l === names[i]);
  if (matchesTopDown) return standard;
  const reversed = [...names].reverse();
  const matchesBottomUp = normalized.every((l, i) => l === '' || l === reversed[i]);
  if (matchesBottomUp) return lines.map((_, i) => lines.length - i);
  return standard;
}

function parseSystem(lines: TabLine[]): { beats: RawBeat[]; barColumns: number[]; width: number } {
  const order = stringOrder(lines);
  const width = Math.max(...lines.map((l) => l.content.length));
  const padded = lines.map((l) => l.content.padEnd(width, '-'));
  const beatsByColumn = new Map<number, RawBeat>();
  const barColumns: number[] = [];
  for (let c = 0; c < width; c++) {
    const barVotes = padded.filter((p) => p[c] === '|').length;
    if (barVotes >= Math.ceil(padded.length / 2)) barColumns.push(c);
  }
  padded.forEach((text, li) => {
    const string = order[li]!;
    for (let c = 0; c < width; c++) {
      const ch = text[c]!;
      const isDigit = ch >= '0' && ch <= '9';
      const isDead = ch === 'x' || ch === 'X';
      if (!isDigit && !isDead) continue;
      const prev = c > 0 ? text[c - 1]! : '-';
      if (isDigit && prev >= '0' && prev <= '9') continue; // Teil einer zweistelligen Zahl
      let fret = 0;
      let length = 1;
      if (isDigit) {
        const next = text[c + 1];
        if (next !== undefined && next >= '0' && next <= '9' && Number(ch + next) <= 24) {
          fret = Number(ch + next);
          length = 2;
        } else fret = Number(ch);
      }
      const techniques: Technique[] = [];
      if (isDead) techniques.push('dead');
      // Technikzeichen direkt vor der Zahl: h/p (Zielnote), nach der Zahl: ~ / \ b
      const before = prev;
      if (before === 'h') techniques.push('hammer-on');
      if (before === 'p') techniques.push('pull-off');
      const after = text[c + length];
      if (after === '/' || after === '\\' || after === 's') techniques.push('slide');
      if (after === '~') techniques.push('vibrato');
      if (after === 'b') techniques.push('bend');
      const beat = beatsByColumn.get(c) ?? { column: c, notes: [] };
      beat.notes.push({ string, fret, techniques });
      beatsByColumn.set(c, beat);
    }
  });
  const beats = [...beatsByColumn.values()].sort((a, b) => a.column - b.column);
  return { beats, barColumns, width };
}

const ALLOWED_RATIOS = [1, 2, 3, 4, 6, 8];

export function parseTextTab(text: string, options: TextTabOptions = {}): TextTabParseResult {
  const defaultDuration = options.defaultDuration ?? 8;
  const estimate = options.estimateFromSpacing ?? true;
  const timeSignature = options.timeSignature ?? [4, 4];
  const tempo = options.tempo ?? 90;
  const warnings: string[] = [];
  const lines = text.replace(/\t/g, '    ').split(/\r?\n/);

  // Titel aus der ersten Nicht-Tab-Zeile
  const titleLine = lines.find((l) => l.trim() !== '' && !isTabLine(l) && l.trim().length <= 80);

  // Systeme aus aufeinanderfolgenden Tab-Zeilen bilden
  const systems: TabLine[][] = [];
  let current: TabLine[] = [];
  for (const line of lines) {
    if (isTabLine(line)) {
      const m = TAB_LINE.exec(line)!;
      current.push({ label: m[1] ?? '', content: (m[2] ?? '').replace(/\s+$/, '') });
      if (current.length === 6) {
        systems.push(current);
        current = [];
      }
    } else if (current.length > 0) {
      if (current.length >= 4) systems.push(current);
      else warnings.push(`Ein Block mit nur ${current.length} Tab-Zeilen wurde übersprungen.`);
      current = [];
    }
  }
  if (current.length >= 4) systems.push(current);
  if (systems.length === 0) throw new Error('Im Text wurden keine Tabulatur-Zeilen (sechs Linien mit Bundzahlen) gefunden.');

  // Segmente (Takte laut Taktstrichen) über alle Systeme sammeln
  const segments: Segment[] = [];
  let barlineCount = 0;
  for (const system of systems) {
    const { beats, barColumns, width } = parseSystem(system);
    barlineCount += barColumns.length;
    const bounds = [-1, ...barColumns, width];
    for (let i = 0; i < bounds.length - 1; i++) {
      const start = bounds[i]! + 1;
      const end = bounds[i + 1]!;
      const inside = beats.filter((b) => b.column >= start && b.column < end);
      if (inside.length > 0 || (end - start > 2 && i > 0 && i < bounds.length - 2)) segments.push({ beats: inside, start, end });
    }
  }
  const useBarlines = options.useBarlines ?? barlineCount > 0;

  // Dauer je Beat: der häufigste Abstand zwischen zwei Zahlen entspricht der Standarddauer
  const baseTicks = durationToTicks({ base: defaultDuration });
  const gapCounts = new Map<number, number>();
  segments.forEach((seg) => {
    seg.beats.forEach((b, i) => {
      const next = seg.beats[i + 1];
      if (!next) return; // Abstand zum Taktstrich ist oft Auffüllung
      const gap = next.column - b.column;
      if (gap > 0) gapCounts.set(gap, (gapCounts.get(gap) ?? 0) + 1);
    });
  });
  const unit = [...gapCounts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 1;
  const tickFor = (gap: number, trailing: boolean): number => {
    if (!estimate) return baseTicks;
    let ratio = Math.max(1, Math.round(gap / unit));
    if (trailing) ratio = Math.min(ratio, 4);
    const allowed = [...ALLOWED_RATIOS].reverse().find((r) => r <= ratio) ?? 1;
    return baseTicks * allowed;
  };

  const tuning = [...STANDARD_TUNING.midi];
  const tuningObj = { id: 'standard', name: 'standard', midi: tuning };
  const barLength = barTicks(timeSignature[0], timeSignature[1]);
  const bars: Bar[] = [];
  const masterBars: MasterBar[] = [];
  let noteCount = 0;
  let overflowWarned = false;

  const makeBeat = (startTick: number, ticks: number, raw?: RawBeat): Beat => {
    const duration: Duration = ticksToDuration(ticks) ?? { base: defaultDuration };
    const notes: Note[] = (raw?.notes ?? []).map((n) => {
      const note: Note = { string: n.string, fret: n.fret, midi: midiForPosition({ string: n.string, fret: n.fret }, tuningObj), finger: suggestFinger(n.fret) };
      if (n.techniques.length) note.techniques = n.techniques;
      return note;
    });
    noteCount += notes.length;
    return { startTick, durationTicks: ticks, duration, notes, isRest: notes.length === 0 };
  };

  const pushBar = (beats: Beat[]): void => {
    // Rest auffüllen
    let tick = beats.reduce((s, b) => s + b.durationTicks, 0);
    let remaining = barLength - tick;
    for (const size of [3840, 2880, 1920, 1440, 960, 720, 480, 240, 120]) {
      while (remaining >= size) {
        beats.push(makeBeat(tick, size));
        tick += size;
        remaining -= size;
      }
    }
    const index = bars.length;
    bars.push({ index, voices: [beats] });
    masterBars.push({ index, timeSignature: { numerator: timeSignature[0], denominator: timeSignature[1] } });
  };

  let currentBeats: Beat[] = [];
  let currentTick = 0;
  const addBeat = (raw: RawBeat, ticks: number): void => {
    let remainingTicks = Math.min(ticks, barLength);
    if (currentTick + remainingTicks > barLength) {
      pushBar(currentBeats);
      currentBeats = [];
      currentTick = 0;
      if (useBarlines && !overflowWarned) {
        warnings.push('Mindestens ein Takt enthielt mehr Noten, als die Taktart erlaubt – überzählige Noten wurden in den nächsten Takt verschoben.');
        overflowWarned = true;
      }
    }
    if (remainingTicks <= 0) remainingTicks = baseTicks;
    currentBeats.push(makeBeat(currentTick, remainingTicks, raw));
    currentTick += remainingTicks;
    if (currentTick >= barLength) {
      pushBar(currentBeats);
      currentBeats = [];
      currentTick = 0;
    }
  };

  segments.forEach((seg) => {
    seg.beats.forEach((b, i) => {
      const next = seg.beats[i + 1];
      addBeat(b, tickFor((next ? next.column : seg.end) - b.column, !next));
    });
    if (useBarlines && currentBeats.length > 0) {
      pushBar(currentBeats);
      currentBeats = [];
      currentTick = 0;
    }
  });
  if (currentBeats.length > 0) pushBar(currentBeats);
  if (bars.length === 0) throw new Error('Der Text-Tab enthält keine Noten.');

  warnings.unshift(
    estimate
      ? `Text-Tabs enthalten keine Notenlängen. Die Dauern wurden aus den Abständen geschätzt (kleinster Abstand = ${durationLabel(defaultDuration)}). Bitte im Player anhören und bei Bedarf im Tab-Editor korrigieren.`
      : `Text-Tabs enthalten keine Notenlängen. Alle Töne wurden als ${durationLabel(defaultDuration)} angenommen. Bitte im Tab-Editor korrigieren.`,
  );

  const track: Track = { id: 'track-1', name: 'Gitarre (Text-Tab)', tuning, capo: 0, bars, program: 24 };
  const score: Score = {
    title: options.title?.trim() || titleLine?.trim() || 'Text-Tab',
    tempo,
    masterBars,
    tracks: [track],
    notes: 'Aus einem ASCII-Text-Tab importiert; Notenlängen geschätzt.',
  };
  return {
    score,
    tracks: [{ index: 0, name: track.name, noteCount, barCount: bars.length, tuningKnown: true, isPercussion: false, stringCount: 6 }],
    warnings,
    durationsEstimated: true,
    noteCount,
    barlineCount,
  };
}

function durationLabel(base: DurationBase): string {
  return ({ 1: 'Ganze', 2: 'Halbe', 4: 'Viertel', 8: 'Achtel', 16: 'Sechzehntel', 32: 'Zweiunddreißigstel', 64: 'Vierundsechzigstel' } as Record<DurationBase, string>)[base];
}
