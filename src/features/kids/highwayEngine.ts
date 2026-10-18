/**
 * Zeitsteuerung der Mitspiel-Bahn (wie bei Yousician): Noten laufen auf eine Trefflinie zu, das Mikrofon
 * liefert erkannte Tonhöhen, die Engine entscheidet über Treffer und Fehler.
 *
 * Zwei Modi:
 * - „wait“: Die Zeit hält an der nächsten Note an, bis der richtige Ton gespielt wurde (Lernmodus).
 * - „flow“: Die Zeit läuft durch; jede Note hat ein Fenster [time − early, time + late].
 *
 * Reine Logik ohne Browser-APIs; die Komponente füttert `tick()` aus requestAnimationFrame und
 * `onPitch()` aus der Tonhöhenerkennung.
 */

import { evaluatePitch } from '@/features/listen/listenLogic';

export interface HighwayNote {
  index: number;
  /** Startzeit in Sekunden (bereits im gewählten Tempo). */
  time: number;
  durationSec: number;
  midi: number;
  /** Weitere zulässige Töne (Akkord: jeder Ton zählt). */
  midis?: number[];
  string: number;
  fret: number;
}

export type HighwayMode = 'wait' | 'flow';

export interface HighwayOptions {
  mode: HighwayMode;
  /** Wie früh vor der Trefflinie ein Ton schon zählt (s). */
  earlySec?: number;
  /** Wie spät nach der Trefflinie ein Ton noch zählt (s). */
  lateSec?: number;
  /** Toleranz der Tonhöhe in Cent. */
  toleranceCents?: number;
}

export type NoteResult = 'pending' | 'hit' | 'miss';

export type HighwayEvent = { type: 'hit'; index: number; offsetSec: number } | { type: 'miss'; index: number } | { type: 'wait'; index: number } | { type: 'end' };

export class HighwayEngine {
  readonly results: NoteResult[];
  private songTime = 0;
  private lastReal: number | null = null;
  private nextIdx = 0;
  private waiting = false;
  private finished = false;
  private readonly early: number;
  private readonly late: number;
  private readonly tolerance: number;

  constructor(
    private readonly notes: readonly HighwayNote[],
    private readonly options: HighwayOptions,
  ) {
    this.results = notes.map(() => 'pending');
    this.early = options.earlySec ?? 0.3;
    this.late = options.lateSec ?? 0.45;
    this.tolerance = options.toleranceCents ?? 60;
  }

  get time(): number {
    return this.songTime;
  }

  get isWaiting(): boolean {
    return this.waiting;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  /** Index der nächsten noch offenen Note (oder null am Ende). */
  get currentIndex(): number | null {
    return this.nextIdx < this.notes.length ? this.nextIdx : null;
  }

  get hits(): number {
    return this.results.filter((r) => r === 'hit').length;
  }

  /** Dauer bis zum Ende (letzte Note + Nachlauf). */
  get totalSec(): number {
    const last = this.notes[this.notes.length - 1];
    return last ? last.time + Math.max(last.durationSec, 0.5) : 0;
  }

  /** Zeit voranbringen; `realSec` ist eine monoton steigende Uhr (z. B. performance.now()/1000). */
  tick(realSec: number): HighwayEvent[] {
    const events: HighwayEvent[] = [];
    if (this.finished) return events;
    if (this.lastReal === null) {
      this.lastReal = realSec;
      return events;
    }
    const dt = Math.max(0, realSec - this.lastReal);
    this.lastReal = realSec;
    if (!this.waiting) this.songTime += dt;

    while (this.nextIdx < this.notes.length) {
      const n = this.notes[this.nextIdx]!;
      if (this.options.mode === 'wait') {
        if (this.songTime >= n.time && !this.waiting) {
          this.waiting = true;
          this.songTime = n.time;
          events.push({ type: 'wait', index: n.index });
        }
        break;
      }
      if (this.songTime > n.time + this.late) {
        this.results[this.nextIdx] = 'miss';
        events.push({ type: 'miss', index: n.index });
        this.nextIdx += 1;
        continue;
      }
      break;
    }

    if (this.nextIdx >= this.notes.length && this.songTime >= this.totalSec) {
      this.finished = true;
      events.push({ type: 'end' });
    }
    return events;
  }

  /** Erkannte Tonhöhe verarbeiten; liefert ein Treffer-Ereignis oder null. */
  onPitch(midi: number, cents: number): HighwayEvent | null {
    if (this.finished) return null;
    if (this.options.mode === 'wait') {
      const n = this.notes[this.nextIdx];
      if (!n) return null;
      if (!this.waiting && this.songTime < n.time - this.early) return null;
      if (!this.matchesNote(n, midi, cents)) return null;
      return this.registerHit(this.nextIdx, this.songTime - n.time);
    }
    for (let i = this.nextIdx; i < this.notes.length; i++) {
      const n = this.notes[i]!;
      if (n.time - this.early > this.songTime) break;
      if (this.results[i] !== 'pending') continue;
      if (this.songTime > n.time + this.late) continue;
      if (this.matchesNote(n, midi, cents)) return this.registerHit(i, this.songTime - n.time);
    }
    return null;
  }

  /** Aktuelle Note ohne Treffer überspringen (Eltern-Hilfe). */
  skip(): HighwayEvent | null {
    const i = this.nextIdx;
    const n = this.notes[i];
    if (!n || this.finished) return null;
    this.results[i] = 'miss';
    this.nextIdx = i + 1;
    this.waiting = false;
    if (this.options.mode === 'wait') this.songTime = n.time + 0.001;
    return { type: 'miss', index: n.index };
  }

  private matchesNote(n: HighwayNote, midi: number, cents: number): boolean {
    const v = evaluatePitch(n.midis ?? [n.midi], { midi, cents }, this.tolerance);
    return v.kind === 'match' || v.kind === 'octave';
  }

  private registerHit(i: number, offsetSec: number): HighwayEvent {
    this.results[i] = 'hit';
    if (this.options.mode === 'wait') {
      this.nextIdx = i + 1;
      this.waiting = false;
    } else {
      while (this.nextIdx < this.notes.length && this.results[this.nextIdx] !== 'pending') this.nextIdx += 1;
    }
    return { type: 'hit', index: this.notes[i]!.index, offsetSec };
  }
}

/** Erzeugt die Zeitleiste eines Liedes aus Schlägen: `beats` in Vierteln, Tempo in Vierteln pro Minute. */
export function timelineFromBeats(notes: ReadonlyArray<{ string: number; fret: number; beats: number; midi: number }>, tempoBpm: number, leadInSec = 0): HighwayNote[] {
  const beatSec = 60 / tempoBpm;
  let t = leadInSec;
  return notes.map((n, index) => {
    const note: HighwayNote = { index, time: t, durationSec: n.beats * beatSec, midi: n.midi, string: n.string, fret: n.fret };
    t += n.beats * beatSec;
    return note;
  });
}
