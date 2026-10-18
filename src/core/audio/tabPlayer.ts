import type { BeatRef, NoteEvent, PlaybackPlan } from '../music/playback';

/**
 * Transport-Engine für Tabulaturen: plant Noten- und Metronom-Ereignisse aus einem PlaybackPlan
 * auf der Audio-Uhr. Tempo, Schleifen und Einzelton-Modus werden hier umgesetzt.
 *
 * Die Engine ist unabhängig von Web Audio implementiert (Clock + Sink), damit sie testbar bleibt.
 */

export interface PlayerSink {
  noteOn(event: NoteEvent, time: number, scaledDurationSec: number): void;
  /** Dämpft klingende Töne (optional nur die einer Spur/eines Kanals). */
  damp(time: number, channel?: number): void;
  click(time: number, accent: boolean): void;
  stopAll(): void;
}

export interface PlayerClock {
  now(): number;
}

export interface LoopRange {
  /** Erste Takt-Instanz (inklusive). */
  startInstance: number;
  /** Letzte Takt-Instanz (inklusive). */
  endInstance: number;
}

export type PlayerStatus = 'stopped' | 'playing' | 'paused' | 'counting';

export interface PlayerSnapshot {
  status: PlayerStatus;
  tempoFactor: number;
  loop: LoopRange | null;
  metronome: boolean;
  countIn: boolean;
  hasPlan: boolean;
  totalSec: number;
  /** Position zum Zeitpunkt des Snapshots (Sekunden bei 100 % Tempo). */
  positionSec: number;
}

interface Anchor {
  time: number;
  sec: number;
}

export const TEMPO_FACTORS = [0.25, 0.5, 0.75, 1, 1.25, 1.5] as const;
const LOOKAHEAD_SEC = 0.25;
const TIMER_MS = 40;
const START_DELAY = 0.08;

export interface TabPlayerOptions {
  clock: PlayerClock;
  sink: PlayerSink;
  setTimer?: (cb: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export class TabPlayer {
  private readonly clock: PlayerClock;
  private readonly sink: PlayerSink;
  private readonly setTimer: (cb: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  private plan: PlaybackPlan | null = null;
  private voice0Beats: BeatRef[] = [];
  private multiVoice = false;
  private status: PlayerStatus = 'stopped';
  private positionSec = 0;
  private tempoFactor = 1;
  private loop: LoopRange | null = null;
  private metronomeOn = false;
  private countIn = false;
  private anchors: Anchor[] = [];
  private nextEventIdx = 0;
  private nextMetroIdx = 0;
  private timer: unknown = null;
  private endsAtTime: number | null = null;
  /** Zuletzt im Einzelton-Modus gespielter Beat (null = noch nicht gestartet). */
  private stepCursor: number | null = null;
  private readonly listeners = new Set<(s: PlayerSnapshot) => void>();
  private readonly endListeners = new Set<() => void>();

  constructor(options: TabPlayerOptions) {
    this.clock = options.clock;
    this.sink = options.sink;
    this.setTimer = options.setTimer ?? ((cb, ms) => setInterval(cb, ms));
    this.clearTimer = options.clearTimer ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>));
  }

  // ---------- Zustand & Abonnements ----------

  snapshot(): PlayerSnapshot {
    return {
      status: this.status,
      tempoFactor: this.tempoFactor,
      loop: this.loop,
      metronome: this.metronomeOn,
      countIn: this.countIn,
      hasPlan: this.plan !== null,
      totalSec: this.plan?.totalSec ?? 0,
      positionSec: this.getPositionSec(),
    };
  }

  subscribe(listener: (s: PlayerSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onEnded(listener: () => void): () => void {
    this.endListeners.add(listener);
    return () => this.endListeners.delete(listener);
  }

  private notify(): void {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }

  getPlan(): PlaybackPlan | null {
    return this.plan;
  }

  getStatus(): PlayerStatus {
    return this.status;
  }

  // ---------- Laden ----------

  load(plan: PlaybackPlan | null): void {
    this.stopInternal();
    this.plan = plan;
    this.voice0Beats = plan ? plan.beats.filter((b) => b.voice === 0) : [];
    this.multiVoice = plan ? plan.beats.some((b) => b.voice > 0) : false;
    this.loop = null;
    this.positionSec = 0;
    this.stepCursor = null;
    this.notify();
  }

  // ---------- Transport ----------

  play(): void {
    if (!this.plan || this.status === 'playing' || this.status === 'counting') return;
    const { start: regionStart, end: regionEnd } = this.region();
    let startSec = this.positionSec;
    if (startSec < regionStart - 1e-6 || startSec >= regionEnd - 1e-6) startSec = regionStart;
    const now = this.clock.now();
    let delay = START_DELAY;
    if (this.countIn && this.metronomeOn) {
      const inst = this.plan.barInstances.find((b) => b.startSec <= startSec + 1e-6 && startSec < b.endSec) ?? this.plan.barInstances[0];
      if (inst) {
        const beats = Math.max(1, Math.round((inst.endTick - inst.startTick) / inst.beatTicks));
        const beatSec = (inst.endSec - inst.startSec) / beats / this.tempoFactor;
        for (let i = 0; i < beats; i++) this.sink.click(now + START_DELAY + i * beatSec, i === 0);
        delay += beats * beatSec;
      }
    }
    this.stepCursor = null;
    this.anchors = [{ time: now + delay, sec: startSec }];
    this.nextEventIdx = this.firstIndexAtOrAfter(this.plan.events.map((e) => e.sec), startSec);
    this.nextMetroIdx = this.firstIndexAtOrAfter(this.plan.metronome.map((m) => m.sec), startSec);
    this.endsAtTime = null;
    this.status = delay > START_DELAY ? 'counting' : 'playing';
    this.startTimer();
    this.notify();
    this.tick();
  }

  pause(): void {
    if (this.status !== 'playing' && this.status !== 'counting') return;
    this.positionSec = this.getPositionSec();
    this.stopInternal();
    this.status = 'paused';
    this.notify();
  }

  stop(): void {
    this.stopInternal();
    this.positionSec = this.region().start;
    this.status = 'stopped';
    this.stepCursor = null;
    this.notify();
  }

  togglePlay(): void {
    if (this.status === 'playing' || this.status === 'counting') this.pause();
    else this.play();
  }

  /** Springt an eine Position (Sekunden bei 100 % Tempo). */
  seekSec(sec: number): void {
    if (!this.plan) return;
    const clamped = Math.min(Math.max(0, sec), this.plan.totalSec);
    const wasPlaying = this.status === 'playing' || this.status === 'counting';
    if (wasPlaying) {
      this.stopInternal();
      this.positionSec = clamped;
      this.status = 'paused';
      const countInBackup = this.countIn;
      this.countIn = false;
      this.play();
      this.countIn = countInBackup;
    } else {
      this.positionSec = clamped;
      this.stepCursor = null;
      if (this.status === 'stopped') this.status = 'paused';
      this.notify();
    }
  }

  seekToInstance(instanceIndex: number): void {
    const inst = this.plan?.barInstances[instanceIndex];
    if (inst) this.seekSec(inst.startSec);
  }

  seekToBeat(beatRef: number): void {
    const beat = this.plan?.beats[beatRef];
    if (beat) this.seekSec(beat.sec);
  }

  // ---------- Einstellungen ----------

  setTempoFactor(factor: number): void {
    const f = Math.min(2, Math.max(0.1, factor));
    if (Math.abs(f - this.tempoFactor) < 1e-9) return;
    const wasPlaying = this.status === 'playing' || this.status === 'counting';
    if (wasPlaying) {
      this.positionSec = this.getPositionSec();
      this.stopInternal();
    }
    this.tempoFactor = f;
    if (wasPlaying) {
      this.status = 'paused';
      const countInBackup = this.countIn;
      this.countIn = false;
      this.play();
      this.countIn = countInBackup;
    } else this.notify();
  }

  setLoop(loop: LoopRange | null): void {
    if (loop && this.plan) {
      const max = this.plan.barInstances.length - 1;
      const start = Math.min(Math.max(0, Math.min(loop.startInstance, loop.endInstance)), max);
      const end = Math.min(Math.max(start, Math.max(loop.startInstance, loop.endInstance)), max);
      this.loop = { startInstance: start, endInstance: end };
    } else this.loop = null;
    const { start, end } = this.region();
    const pos = this.getPositionSec();
    if (pos < start || pos >= end) this.seekSec(start);
    else this.notify();
  }

  setMetronome(on: boolean): void {
    this.metronomeOn = on;
    this.notify();
  }

  setCountIn(on: boolean): void {
    this.countIn = on;
    this.notify();
  }

  // ---------- Einzelton-Modus ----------

  /** Spielt genau einen Beat (alle Noten des Beats) und setzt die Position dorthin. */
  playBeat(beatRef: number): void {
    if (!this.plan) return;
    const beat = this.plan.beats[beatRef];
    if (!beat) return;
    this.stopInternal();
    this.status = 'paused';
    this.positionSec = beat.sec;
    this.stepCursor = beatRef;
    const now = this.clock.now() + 0.02;
    for (const ev of this.plan.events) {
      if (ev.kind !== 'note' || ev.beatRef !== beatRef) continue;
      this.sink.noteOn(ev, now, ev.durationSec / this.tempoFactor);
    }
    this.notify();
  }

  /** Nächster angeschlagener Beat (Stimme 1) ab der aktuellen Position. */
  stepNext(): BeatRef | null {
    let startIdx: number;
    if (this.stepCursor !== null) {
      startIdx = this.voice0Beats.findIndex((b) => b.index === this.stepCursor) + 1;
    } else {
      // noch kein Schritt: ersten Beat an/nach der aktuellen Position spielen
      const pos = this.getPositionSec();
      startIdx = this.voice0Beats.findIndex((b) => b.sec >= pos - 1e-6);
      if (startIdx < 0) startIdx = this.voice0Beats.length;
    }
    for (let i = startIdx; i < this.voice0Beats.length; i++) {
      const b = this.voice0Beats[i]!;
      if (!b.isRest) {
        this.playBeat(b.index);
        return b;
      }
    }
    return null;
  }

  stepPrev(): BeatRef | null {
    let idx: number;
    if (this.stepCursor !== null) idx = this.voice0Beats.findIndex((b) => b.index === this.stepCursor);
    else {
      const current = this.currentBeat();
      idx = current ? this.voice0Beats.findIndex((b) => b.index === current.index) : this.voice0Beats.length;
    }
    for (let i = idx - 1; i >= 0; i--) {
      const b = this.voice0Beats[i]!;
      if (!b.isRest) {
        this.playBeat(b.index);
        return b;
      }
    }
    return null;
  }

  // ---------- Positionsabfrage ----------

  /** Aktuelle Position in Plan-Sekunden (100 % Tempo). */
  getPositionSec(atTime: number = this.clock.now()): number {
    if (this.status !== 'playing' && this.status !== 'counting') return this.positionSec;
    const anchor = this.anchorAt(atTime);
    if (!anchor) return this.anchors[0]?.sec ?? this.positionSec;
    const { end } = this.region();
    return Math.min(end, anchor.sec + (atTime - anchor.time) * this.tempoFactor);
  }

  /** Beat der Hauptstimme an der aktuellen Position. */
  currentBeat(atTime: number = this.clock.now()): BeatRef | null {
    const pos = this.getPositionSec(atTime);
    let lo = 0;
    let hi = this.voice0Beats.length - 1;
    let result: BeatRef | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const b = this.voice0Beats[mid]!;
      if (b.sec <= pos + 1e-6) {
        result = b;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return result;
  }

  isCountingIn(atTime: number = this.clock.now()): boolean {
    return this.status === 'counting' && (this.anchors[0]?.time ?? 0) > atTime;
  }

  // ---------- intern ----------

  private region(): { start: number; end: number } {
    if (!this.plan) return { start: 0, end: 0 };
    if (!this.loop) return { start: 0, end: this.plan.totalSec };
    const s = this.plan.barInstances[this.loop.startInstance];
    const e = this.plan.barInstances[this.loop.endInstance];
    return { start: s?.startSec ?? 0, end: e?.endSec ?? this.plan.totalSec };
  }

  private anchorAt(time: number): Anchor | null {
    let result: Anchor | null = null;
    for (const a of this.anchors) {
      if (a.time <= time) result = a;
      else break;
    }
    return result;
  }

  private firstIndexAtOrAfter(secs: number[], sec: number): number {
    let lo = 0;
    let hi = secs.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (secs[mid]! < sec - 1e-6) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private startTimer(): void {
    if (this.timer !== null) return;
    this.timer = this.setTimer(() => this.tick(), TIMER_MS);
  }

  private stopInternal(): void {
    if (this.timer !== null) {
      this.clearTimer(this.timer);
      this.timer = null;
    }
    this.anchors = [];
    this.endsAtTime = null;
    this.sink.stopAll();
  }

  /** Plant alle Ereignisse bis zum Lookahead-Horizont. */
  tick(): void {
    if (!this.plan || (this.status !== 'playing' && this.status !== 'counting')) return;
    const now = this.clock.now();
    if (this.status === 'counting' && (this.anchors[0]?.time ?? 0) <= now) {
      this.status = 'playing';
      this.notify();
    }
    if (this.endsAtTime !== null) {
      if (now >= this.endsAtTime) {
        this.stopInternal();
        this.positionSec = this.region().start;
        this.status = 'stopped';
        this.notify();
        for (const l of this.endListeners) l();
      }
      return;
    }
    const horizon = now + LOOKAHEAD_SEC;
    let guard = 0;
    while (guard++ < 10000) {
      const anchor = this.anchors[this.anchors.length - 1]!;
      const { start: regionStart, end: regionEnd } = this.region();
      const timeOf = (sec: number): number => anchor.time + (sec - anchor.sec) / this.tempoFactor;
      const ev = this.plan.events[this.nextEventIdx];
      const metro = this.plan.metronome[this.nextMetroIdx];
      const evOk = ev !== undefined && ev.sec < regionEnd - 1e-6;
      const metroOk = metro !== undefined && metro.sec < regionEnd - 1e-6;
      const nextSec = Math.min(evOk ? ev.sec : Infinity, metroOk ? metro.sec : Infinity);
      const regionEndTime = timeOf(regionEnd);
      if (nextSec !== Infinity && timeOf(nextSec) < horizon && timeOf(nextSec) <= regionEndTime) {
        if (evOk && ev.sec <= nextSec + 1e-9) {
          const t = timeOf(ev.sec);
          if (ev.kind === 'note') this.sink.noteOn(ev, t, ev.durationSec / this.tempoFactor);
          else if (!this.multiVoice) this.sink.damp(t, this.plan.accompanimentTracks?.length ? this.plan.trackIndex : undefined);
          this.nextEventIdx++;
        }
        if (metroOk && metro.sec <= nextSec + 1e-9) {
          if (this.metronomeOn) this.sink.click(timeOf(metro.sec), metro.accent);
          this.nextMetroIdx++;
        }
        continue;
      }
      if (regionEndTime < horizon) {
        if (this.loop) {
          this.anchors.push({ time: regionEndTime, sec: regionStart });
          this.nextEventIdx = this.firstIndexAtOrAfter(this.plan.events.map((e) => e.sec), regionStart);
          this.nextMetroIdx = this.firstIndexAtOrAfter(this.plan.metronome.map((m) => m.sec), regionStart);
          // alte Anker aufräumen
          while (this.anchors.length > 3 && this.anchors[1]!.time < now - 1) this.anchors.shift();
          continue;
        }
        this.endsAtTime = regionEndTime + 0.3;
        this.sink.damp(regionEndTime + 0.25);
      }
      break;
    }
  }
}
