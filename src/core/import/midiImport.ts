import { barTicks, ticksToDuration, TICKS_PER_QUARTER, type Duration } from '../music/durations';
import { preferredPositionForMidi } from '../music/fretboard';
import type { Bar, Beat, MasterBar, Note, Score, Track } from '../music/score';
import { STANDARD_TUNING } from '../music/tuning';
import type { AlphaTabImportResult, ImportedTrackInfo } from './alphaTabImport';

/**
 * Einfacher Standard-MIDI-File-Import (Format 0/1):
 * Noten werden auf ein 16tel-Raster quantisiert, Saiten/Bünde automatisch berechnet.
 * Ergebnis ist ausdrücklich eine Näherung – die App weist darauf hin.
 */

interface RawNote {
  tick: number;
  durationTicks: number;
  midi: number;
  velocity: number;
}

interface TempoEvent {
  tick: number;
  bpm: number;
}

interface TimeSigEvent {
  tick: number;
  numerator: number;
  denominator: number;
}

class Reader {
  pos = 0;
  constructor(private readonly bytes: Uint8Array) {}
  get eof(): boolean {
    return this.pos >= this.bytes.length;
  }
  u8(): number {
    const v = this.bytes[this.pos];
    if (v === undefined) throw new Error('MIDI-Datei unvollständig.');
    this.pos++;
    return v;
  }
  u16(): number {
    return (this.u8() << 8) | this.u8();
  }
  u32(): number {
    return ((this.u8() << 24) >>> 0) + (this.u8() << 16) + (this.u8() << 8) + this.u8();
  }
  varLen(): number {
    let value = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.u8();
      value = (value << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return value;
  }
  text(n: number): string {
    const s = new TextDecoder('latin1').decode(this.bytes.subarray(this.pos, this.pos + n));
    this.pos += n;
    return s;
  }
  skip(n: number): void {
    this.pos += n;
  }
}

interface ParsedMidi {
  ppq: number;
  tracks: Array<{ name: string; notes: RawNote[]; program: number; isPercussion: boolean }>;
  tempos: TempoEvent[];
  timeSigs: TimeSigEvent[];
}

export function parseMidi(bytes: Uint8Array): ParsedMidi {
  const r = new Reader(bytes);
  if (r.text(4) !== 'MThd') throw new Error('Keine gültige MIDI-Datei (MThd fehlt).');
  const headerLength = r.u32();
  const format = r.u16();
  const trackCount = r.u16();
  const division = r.u16();
  if (division & 0x8000) throw new Error('MIDI-Dateien mit SMPTE-Zeitbasis werden nicht unterstützt.');
  r.skip(headerLength - 6);
  if (format > 2) throw new Error(`MIDI-Format ${format} wird nicht unterstützt.`);
  const ppq = division || 480;
  const result: ParsedMidi = { ppq, tracks: [], tempos: [], timeSigs: [] };

  for (let t = 0; t < trackCount && !r.eof; t++) {
    if (r.text(4) !== 'MTrk') throw new Error('MIDI-Spur beschädigt (MTrk fehlt).');
    const length = r.u32();
    const end = r.pos + length;
    let tick = 0;
    let running = 0;
    let name = '';
    const notes: RawNote[] = [];
    const open = new Map<string, RawNote>();
    const programs = new Map<number, number>();
    let hasPercussion = false;
    let hasMelodic = false;
    while (r.pos < end) {
      tick += r.varLen();
      let status = r.u8();
      if (status < 0x80) {
        r.pos--;
        status = running;
      } else running = status;
      const type = status & 0xf0;
      const channel = status & 0x0f;
      if (status === 0xff) {
        const metaType = r.u8();
        const len = r.varLen();
        if (metaType === 0x03) name = r.text(len);
        else if (metaType === 0x51) {
          const micros = (r.u8() << 16) | (r.u8() << 8) | r.u8();
          result.tempos.push({ tick, bpm: micros > 0 ? 60_000_000 / micros : 120 });
        } else if (metaType === 0x58) {
          const n = r.u8();
          const d = 1 << r.u8();
          r.skip(len - 2);
          result.timeSigs.push({ tick, numerator: n, denominator: d });
        } else r.skip(len);
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        r.skip(r.varLen());
        continue;
      }
      if (type === 0x90 || type === 0x80) {
        const key = r.u8();
        const velocity = r.u8();
        const id = `${channel}:${key}`;
        if (type === 0x90 && velocity > 0) {
          if (channel === 9) hasPercussion = true;
          else hasMelodic = true;
          const existing = open.get(id);
          if (existing) existing.durationTicks = Math.max(1, tick - existing.tick);
          const note: RawNote = { tick, durationTicks: 0, midi: key, velocity: velocity / 127 };
          open.set(id, note);
          if (channel !== 9) notes.push(note);
        } else {
          const existing = open.get(id);
          if (existing) {
            existing.durationTicks = Math.max(1, tick - existing.tick);
            open.delete(id);
          }
        }
      } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) r.skip(2);
      else if (type === 0xc0) programs.set(channel, r.u8());
      else if (type === 0xd0) r.skip(1);
    }
    for (const n of open.values()) if (n.durationTicks === 0) n.durationTicks = ppq;
    r.pos = end;
    if (notes.length > 0 || name) {
      const program = programs.values().next().value ?? 24;
      result.tracks.push({ name, notes, program, isPercussion: hasPercussion && !hasMelodic });
    }
  }
  return result;
}

/** Quantisiert MIDI-Ticks auf das interne Raster (960/Viertel) und ein 16tel-Grid. */
function quantize(tick: number, ppq: number, grid = TICKS_PER_QUARTER / 4): number {
  const scaled = (tick / ppq) * TICKS_PER_QUARTER;
  return Math.round(scaled / grid) * grid;
}

export function importMidi(bytes: Uint8Array): AlphaTabImportResult {
  const midi = parseMidi(bytes);
  const warnings: string[] = ['MIDI-Import: Saiten und Bünde wurden automatisch berechnet und Notenlängen auf Sechzehntel gerundet. Bitte Griffe im Zweifel anpassen.'];
  const melodicTracks = midi.tracks.filter((t) => !t.isPercussion && t.notes.length > 0);
  if (melodicTracks.length === 0) throw new Error('Die MIDI-Datei enthält keine Melodiespur mit Noten.');

  const firstTs = midi.timeSigs.find((t) => t.tick === 0) ?? midi.timeSigs[0] ?? { tick: 0, numerator: 4, denominator: 4 };
  const baseTempo = midi.tempos.find((t) => t.tick === 0)?.bpm ?? midi.tempos[0]?.bpm ?? 120;
  const totalTicks = Math.max(...melodicTracks.flatMap((t) => t.notes.map((n) => quantize(n.tick + n.durationTicks, midi.ppq))));

  // Taktliste aufbauen (Taktartwechsel berücksichtigen)
  const masterBars: MasterBar[] = [];
  let tick = 0;
  let tsIndex = 0;
  const timeSigs = [...midi.timeSigs].sort((a, b) => a.tick - b.tick);
  let current = { numerator: firstTs.numerator, denominator: firstTs.denominator };
  const tempos = [...midi.tempos].sort((a, b) => a.tick - b.tick);
  while (tick < Math.max(totalTicks, 1) && masterBars.length < 2000) {
    while (tsIndex < timeSigs.length && quantize(timeSigs[tsIndex]!.tick, midi.ppq) <= tick) {
      current = { numerator: timeSigs[tsIndex]!.numerator, denominator: timeSigs[tsIndex]!.denominator };
      tsIndex++;
    }
    const length = barTicks(current.numerator, current.denominator);
    const mb: MasterBar = { index: masterBars.length, timeSignature: { ...current } };
    const tempoHere = tempos.filter((t) => quantize(t.tick, midi.ppq) >= tick && quantize(t.tick, midi.ppq) < tick + length)[0];
    if (masterBars.length === 0) mb.tempo = Math.round(baseTempo * 10) / 10;
    else if (tempoHere) mb.tempo = Math.round(tempoHere.bpm * 10) / 10;
    masterBars.push(mb);
    tick += length;
  }
  const barStarts = masterBars.map((_, i) => masterBars.slice(0, i).reduce((s, mb) => s + barTicks(mb.timeSignature.numerator, mb.timeSignature.denominator), 0));

  const tuning = [...STANDARD_TUNING.midi];
  const tuningObj = { id: 'standard', name: 'standard', midi: tuning };
  const tracks: Track[] = [];
  const infos: ImportedTrackInfo[] = [];

  melodicTracks.forEach((mt, ti) => {
    // Noten gruppieren: gleicher Start = Akkord
    const grouped = new Map<number, RawNote[]>();
    for (const n of mt.notes) {
      const start = quantize(n.tick, midi.ppq);
      const list = grouped.get(start) ?? [];
      list.push(n);
      grouped.set(start, list);
    }
    const starts = [...grouped.keys()].sort((a, b) => a - b);
    const bars: Bar[] = masterBars.map((mb, bi) => {
      const barStart = barStarts[bi]!;
      const barLength = barTicks(mb.timeSignature.numerator, mb.timeSignature.denominator);
      const beats: Beat[] = [];
      let cursor = 0;
      const inBar = starts.filter((s) => s >= barStart && s < barStart + barLength);
      let previous: { string: number; fret: number } | null = null;
      for (let i = 0; i < inBar.length; i++) {
        const s = inBar[i]!;
        const rel = s - barStart;
        if (rel > cursor) beats.push(...restBeats(cursor, rel - cursor));
        const next = i + 1 < inBar.length ? inBar[i + 1]! - barStart : barLength;
        const group = grouped.get(s)!;
        const longest = Math.max(...group.map((n) => quantize(n.tick + n.durationTicks, midi.ppq) - s));
        let durationTicks = Math.min(Math.max(TICKS_PER_QUARTER / 4, longest), next - rel);
        durationTicks = Math.max(TICKS_PER_QUARTER / 4, Math.round(durationTicks / (TICKS_PER_QUARTER / 4)) * (TICKS_PER_QUARTER / 4));
        if (rel + durationTicks > barLength) durationTicks = barLength - rel;
        const notes: Note[] = [];
        for (const n of group.sort((a, b) => a.midi - b.midi)) {
          const pos = preferredPositionForMidi(n.midi, { tuning: tuningObj, previous });
          if (!pos) continue;
          if (notes.some((x) => x.string === pos.string)) continue;
          previous = pos;
          notes.push({ string: pos.string, fret: pos.fret, midi: n.midi, velocity: Math.max(0.3, n.velocity) });
        }
        const duration: Duration = ticksToDuration(durationTicks) ?? { base: 16 };
        beats.push({ startTick: rel, durationTicks, duration, notes, isRest: notes.length === 0 });
        cursor = rel + durationTicks;
      }
      if (cursor < barLength) beats.push(...restBeats(cursor, barLength - cursor));
      return { index: bi, voices: [beats] };
    });
    const track: Track = { id: `track-${ti + 1}`, name: mt.name.trim() || `MIDI-Spur ${ti + 1}`, tuning, capo: 0, bars, program: mt.program };
    tracks.push(track);
    infos.push({ index: ti, name: track.name, noteCount: mt.notes.length, barCount: bars.length, tuningKnown: false, isPercussion: false, stringCount: 6 });
  });

  const score: Score = { title: 'MIDI-Import', tempo: Math.round(baseTempo), masterBars, tracks, notes: 'Aus MIDI importiert – Saiten/Bünde automatisch berechnet.' };
  return { score, tracks: infos, warnings };
}

/** Zerlegt eine Pausenlänge in darstellbare Pausen. */
function restBeats(startTick: number, lengthTicks: number): Beat[] {
  const beats: Beat[] = [];
  let remaining = lengthTicks;
  let tick = startTick;
  const sizes = [3840, 2880, 1920, 1440, 960, 720, 480, 240, 120];
  while (remaining > 0) {
    const size = sizes.find((s) => s <= remaining) ?? remaining;
    const duration = ticksToDuration(size) ?? { base: 16 };
    beats.push({ startTick: tick, durationTicks: size, duration, notes: [], isRest: true });
    tick += size;
    remaining -= size;
  }
  return beats;
}
