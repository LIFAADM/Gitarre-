/**
 * Metronom mit Audio-Scheduler (Lookahead-Prinzip): Klicks werden ~0,25 s im Voraus auf der
 * präzisen AudioContext-Uhr geplant; der JavaScript-Timer dient nur als grober Takt.
 */

export interface MetronomeState {
  running: boolean;
  bpm: number;
  numerator: number;
  denominator: number;
  accentFirst: boolean;
  volume: number;
  subdivision: 1 | 2 | 3 | 4;
}

export interface BeatInfo {
  /** 0-basierter Schlag im Takt. */
  beatInBar: number;
  /** Fortlaufende Taktnummer seit Start (0-basiert). */
  bar: number;
  /** Anteil (0–1) der bereits vergangenen Schlagdauer. */
  progress: number;
  accent: boolean;
}

export const METRONOME_MIN_BPM = 40;
export const METRONOME_MAX_BPM = 220;

const LOOKAHEAD_SEC = 0.25;
const TIMER_MS = 40;

/** Erzeugt einen kurzen Klick (zwei Sinus-Oszillatoren mit schneller Hüllkurve). */
export function playClick(ctx: AudioContext, time: number, accent: boolean, volume: number, destination: AudioNode = ctx.destination): void {
  if (volume <= 0) return;
  const t = Math.max(time, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * (accent ? 1 : 0.7)), t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + (accent ? 0.09 : 0.06));
  gain.connect(destination);
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(accent ? 1760 : 1175, t);
  osc.frequency.exponentialRampToValueAtTime(accent ? 1200 : 880, t + 0.05);
  osc.connect(gain);
  osc.start(t);
  osc.stop(t + 0.12);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

interface ScheduledBeat {
  time: number;
  beatInBar: number;
  bar: number;
  accent: boolean;
  duration: number;
}

export class Metronome {
  private readonly ctx: AudioContext;
  private state: MetronomeState = {
    running: false,
    bpm: 80,
    numerator: 4,
    denominator: 4,
    accentFirst: true,
    volume: 0.8,
    subdivision: 1,
  };
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private beatCounter = 0;
  private scheduled: ScheduledBeat[] = [];
  private readonly listeners = new Set<(s: MetronomeState) => void>();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  getState(): MetronomeState {
    return this.state;
  }

  subscribe(listener: (s: MetronomeState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private update(patch: Partial<MetronomeState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  setBpm(bpm: number): void {
    const clamped = Math.round(Math.min(METRONOME_MAX_BPM, Math.max(METRONOME_MIN_BPM, bpm)));
    this.update({ bpm: clamped });
  }

  setTimeSignature(numerator: number, denominator: number): void {
    this.update({ numerator, denominator });
    this.beatCounter = 0;
  }

  setVolume(volume: number): void {
    this.update({ volume: Math.min(1, Math.max(0, volume)) });
  }

  setAccentFirst(accentFirst: boolean): void {
    this.update({ accentFirst });
  }

  setSubdivision(subdivision: 1 | 2 | 3 | 4): void {
    this.update({ subdivision });
  }

  /** Dauer eines Grundschlags in Sekunden (bei 6/8: punktierte Viertel). */
  beatSeconds(): number {
    const { bpm, numerator, denominator } = this.state;
    const quarter = 60 / bpm;
    if (denominator === 8 && numerator % 3 === 0 && numerator > 3) return quarter * 1.5;
    return quarter * (4 / denominator);
  }

  /** Anzahl der Grundschläge pro Takt. */
  beatsPerBar(): number {
    const { numerator, denominator } = this.state;
    if (denominator === 8 && numerator % 3 === 0 && numerator > 3) return numerator / 3;
    return numerator;
  }

  start(): void {
    if (this.state.running) return;
    this.nextBeatTime = this.ctx.currentTime + 0.08;
    this.beatCounter = 0;
    this.scheduled = [];
    this.timer = setInterval(() => this.tick(), TIMER_MS);
    this.update({ running: true });
    this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.scheduled = [];
    this.update({ running: false });
  }

  toggle(): void {
    if (this.state.running) this.stop();
    else this.start();
  }

  /** Aktueller Schlag zur Darstellung (zum Zeitpunkt `time`, Standard: jetzt). */
  currentBeat(time: number = this.ctx.currentTime): BeatInfo | null {
    if (!this.state.running) return null;
    let current: ScheduledBeat | null = null;
    for (const b of this.scheduled) {
      if (b.time <= time) current = b;
      else break;
    }
    if (!current) return null;
    return {
      beatInBar: current.beatInBar,
      bar: current.bar,
      progress: Math.min(1, Math.max(0, (time - current.time) / current.duration)),
      accent: current.accent,
    };
  }

  private tick(): void {
    const now = this.ctx.currentTime;
    const beatSec = this.beatSeconds();
    const perBar = this.beatsPerBar();
    while (this.nextBeatTime < now + LOOKAHEAD_SEC) {
      const beatInBar = this.beatCounter % perBar;
      const bar = Math.floor(this.beatCounter / perBar);
      const accent = this.state.accentFirst && beatInBar === 0;
      playClick(this.ctx, this.nextBeatTime, accent, this.state.volume);
      // Unterteilungen (leiser)
      for (let s = 1; s < this.state.subdivision; s++) {
        playClick(this.ctx, this.nextBeatTime + (beatSec * s) / this.state.subdivision, false, this.state.volume * 0.35);
      }
      this.scheduled.push({ time: this.nextBeatTime, beatInBar, bar, accent, duration: beatSec });
      this.nextBeatTime += beatSec;
      this.beatCounter++;
    }
    // alte Einträge aufräumen
    while (this.scheduled.length > 2 && this.scheduled[1]!.time < now - 1) this.scheduled.shift();
  }
}
