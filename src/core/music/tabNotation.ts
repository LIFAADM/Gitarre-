import { durationToTicks, type Duration, type DurationBase } from './durations';
import { midiForPosition, suggestFinger } from './fretboard';
import { STANDARD_TUNING } from './tuning';
import type { Bar, Beat, Finger, MasterBar, Note, Score, Technique, Track } from './score';

/**
 * Kompakte Tab-Notation für eingebaute Übungen und Lieder (an alphaTex angelehnt).
 *
 * Syntax (Tokens durch Leerzeichen getrennt, Takte durch `|`):
 *   3.2.4        Bund 3 auf Saite 2, Viertelnote
 *   0.1.8        leere Saite 1, Achtelnote
 *   r.4          Viertelpause
 *   (0.3 2.4).2  Akkord (mehrere Noten gleichzeitig), halbe Note
 *   3.2.4d       punktierte Viertel (dd = doppelt punktiert)
 *   3.2.8t3      Achteltriole
 *   3.2.4~       mit der nächsten Note auf derselben Saite übergebunden
 *   2.3.8h       Spieltechnik: h = Hammer-on, p = Pull-off, s = Slide, v = Vibrato, m = Palm Mute, x = Dead Note
 *   3.2.4f3      expliziter Finger (0–4)
 *   3.2.4"Hap"   Text/Silbe am Beat
 *   {Intro}      Abschnittsname für den folgenden Takt
 *   [ts 3/4]     Taktartwechsel ab dem folgenden Takt
 *   [tempo 80]   Tempowechsel ab dem folgenden Takt
 *   [ro] [rc 2]  Wiederholungsanfang / Wiederholungsende (2 Durchläufe) für den folgenden bzw. aktuellen Takt
 *
 * Saite 1 = hohe E, Saite 6 = tiefe E.
 */

export interface TabNotationOptions {
  title?: string;
  artist?: string;
  tempo: number;
  timeSignature?: [number, number];
  tuning?: number[];
  trackName?: string;
  /** Finger automatisch nach erster Lage vorschlagen (Standard: an). */
  autoFingers?: boolean;
  notes?: string;
}

const TECHNIQUE_MAP: Record<string, Technique> = {
  h: 'hammer-on',
  p: 'pull-off',
  s: 'slide',
  v: 'vibrato',
  m: 'palm-mute',
  x: 'dead',
};

interface ParsedToken {
  kind: 'beat' | 'bar' | 'section' | 'directive';
  value: string;
}

function tokenize(src: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  const re = /\{([^}]*)\}|\[([^\]]*)\]|\|\||\||\([^)]*\)[^\s|]*|[^\s|]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m[1] !== undefined) tokens.push({ kind: 'section', value: m[1].trim() });
    else if (m[2] !== undefined) tokens.push({ kind: 'directive', value: m[2].trim() });
    else if (m[0] === '|' || m[0] === '||') tokens.push({ kind: 'bar', value: '|' });
    else tokens.push({ kind: 'beat', value: m[0] });
  }
  return tokens;
}

function parseDuration(spec: string): { duration: Duration; rest: string } {
  const m = /^(64|32|16|8|4|2|1)(dd|d)?(t3|t5|t6|t7)?(.*)$/.exec(spec);
  if (!m) throw new Error(`Ungültige Notendauer: „${spec}“`);
  const base = Number(m[1]) as DurationBase;
  const duration: Duration = { base };
  if (m[2] === 'd') duration.dots = 1;
  if (m[2] === 'dd') duration.dots = 2;
  if (m[3]) duration.tuplet = Number(m[3].slice(1)) as 3 | 5 | 6 | 7;
  return { duration, rest: m[4] ?? '' };
}

interface Modifiers {
  tie: boolean;
  techniques: Technique[];
  finger?: Finger;
  text?: string;
}

function parseModifiers(mods: string): Modifiers {
  const result: Modifiers = { tie: false, techniques: [] };
  let rest = mods;
  const textMatch = /"([^"]*)"/.exec(rest);
  if (textMatch) {
    result.text = textMatch[1];
    rest = rest.replace(textMatch[0], '');
  }
  const fingerMatch = /f([0-4])/.exec(rest);
  if (fingerMatch) {
    result.finger = Number(fingerMatch[1]) as Finger;
    rest = rest.replace(fingerMatch[0], '');
  }
  for (const ch of rest) {
    if (ch === '~') result.tie = true;
    else if (TECHNIQUE_MAP[ch]) result.techniques.push(TECHNIQUE_MAP[ch]);
    else throw new Error(`Unbekanntes Zeichen „${ch}“ in Notentoken.`);
  }
  return result;
}

/** Parst die Notation in einen Score mit genau einer Spur. */
export function parseTabNotation(src: string, options: TabNotationOptions): Score {
  const tuning = options.tuning ?? [...STANDARD_TUNING.midi];
  const tuningObj = { id: 'custom', name: 'custom', midi: tuning };
  const autoFingers = options.autoFingers ?? true;
  let timeSignature = options.timeSignature ?? [4, 4];
  let pendingTempo: number | undefined;
  let pendingSection: string | undefined;
  let pendingRepeatStart = false;

  const masterBars: MasterBar[] = [];
  const bars: Bar[] = [];
  let currentBeats: Beat[] = [];
  let currentTick = 0;
  let currentRepeatCount: number | undefined;
  let currentAltEnding: number | undefined;

  const flushBar = (): void => {
    if (currentBeats.length === 0 && masterBars.length === 0 && !pendingSection) return;
    if (currentBeats.length === 0) return;
    const index = masterBars.length;
    const mb: MasterBar = { index, timeSignature: { numerator: timeSignature[0], denominator: timeSignature[1] } };
    if (pendingTempo !== undefined) {
      mb.tempo = pendingTempo;
      pendingTempo = undefined;
    }
    if (pendingSection) {
      mb.section = pendingSection;
      pendingSection = undefined;
    }
    if (pendingRepeatStart) {
      mb.repeatStart = true;
      pendingRepeatStart = false;
    }
    if (currentRepeatCount !== undefined) mb.repeatCount = currentRepeatCount;
    if (currentAltEnding !== undefined) mb.alternateEndings = currentAltEnding;
    masterBars.push(mb);
    bars.push({ index, voices: [currentBeats] });
    currentBeats = [];
    currentTick = 0;
    currentRepeatCount = undefined;
    currentAltEnding = undefined;
  };

  for (const token of tokenize(src)) {
    if (token.kind === 'bar') {
      flushBar();
      continue;
    }
    if (token.kind === 'section') {
      pendingSection = token.value;
      continue;
    }
    if (token.kind === 'directive') {
      const [cmd, ...args] = token.value.split(/\s+/);
      if (cmd === 'ts') {
        const [n, d] = (args[0] ?? '4/4').split('/').map(Number);
        if (!n || !d) throw new Error(`Ungültige Taktart: „${token.value}“`);
        timeSignature = [n, d];
      } else if (cmd === 'tempo') {
        pendingTempo = Number(args[0]);
        if (!(pendingTempo > 0)) throw new Error(`Ungültiges Tempo: „${token.value}“`);
      } else if (cmd === 'ro') {
        pendingRepeatStart = true;
      } else if (cmd === 'rc') {
        currentRepeatCount = Number(args[0] ?? 2);
      } else if (cmd === 'ae') {
        currentAltEnding = Number(args[0] ?? 1);
      } else {
        throw new Error(`Unbekannte Anweisung: „${token.value}“`);
      }
      continue;
    }
    // Beat-Token
    const raw = token.value;
    let notesPart: string;
    let durPart: string;
    if (raw.startsWith('(')) {
      const close = raw.indexOf(')');
      if (close < 0) throw new Error(`Akkord nicht geschlossen: „${raw}“`);
      notesPart = raw.slice(1, close);
      const after = raw.slice(close + 1);
      if (!after.startsWith('.')) throw new Error(`Akkord ohne Dauer: „${raw}“`);
      durPart = after.slice(1);
    } else if (raw.startsWith('r.')) {
      notesPart = '';
      durPart = raw.slice(2);
    } else {
      const parts = raw.split('.');
      if (parts.length < 3) throw new Error(`Ungültiges Notentoken: „${raw}“ (erwartet Bund.Saite.Dauer)`);
      notesPart = `${parts[0]}.${parts[1]}`;
      durPart = parts.slice(2).join('.');
    }
    const { duration, rest } = parseDuration(durPart);
    const mods = parseModifiers(rest);
    const notes: Note[] = [];
    if (notesPart.trim().length > 0) {
      for (const np of notesPart.trim().split(/\s+/)) {
        const [fretStr, stringStr] = np.split('.');
        const fret = Number(fretStr);
        const string = Number(stringStr);
        if (!Number.isInteger(fret) || !Number.isInteger(string) || string < 1 || string > tuning.length || fret < 0) {
          throw new Error(`Ungültige Griffposition: „${np}“`);
        }
        const note: Note = { string, fret, midi: midiForPosition({ string, fret }, tuningObj) };
        if (mods.tie) note.tieToNext = true;
        if (mods.techniques.length) note.techniques = [...mods.techniques];
        if (mods.finger !== undefined) note.finger = mods.finger;
        else if (autoFingers) note.finger = suggestFinger(fret);
        notes.push(note);
      }
    }
    const beat: Beat = {
      startTick: currentTick,
      durationTicks: durationToTicks(duration),
      duration,
      notes,
      isRest: notes.length === 0,
    };
    if (mods.text) beat.text = mods.text;
    currentBeats.push(beat);
    currentTick += beat.durationTicks;
  }
  flushBar();

  // Bindungen auflösen: tieToNext → tieFromPrevious bei der nächsten Note derselben Saite
  const allBeats: Beat[] = bars.flatMap((b) => b.voices[0] ?? []);
  for (let i = 0; i < allBeats.length; i++) {
    const beat = allBeats[i]!;
    for (const note of beat.notes) {
      if (!note.tieToNext) continue;
      for (let j = i + 1; j < allBeats.length; j++) {
        const next = allBeats[j]!;
        if (next.isRest) continue;
        const target = next.notes.find((n) => n.string === note.string);
        if (target) target.tieFromPrevious = true;
        break;
      }
    }
  }

  const track: Track = {
    id: 'track-1',
    name: options.trackName ?? 'Gitarre',
    tuning,
    capo: 0,
    bars,
    program: 24,
  };
  const score: Score = {
    title: options.title ?? 'Übung',
    tempo: options.tempo,
    masterBars,
    tracks: [track],
  };
  if (options.artist) score.artist = options.artist;
  if (options.notes) score.notes = options.notes;
  return score;
}
