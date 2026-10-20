import { estimateLatency, matchClicksToOnsets, recommendGate, summarizeNoise, toDb, type LatencyEstimate } from './calibration';
import type { AnalysisFrame } from './engine';

/**
 * Ablauf der Kalibrierung als Zustandsautomat, gespeist mit Analyse-Frames.
 *
 *  1. „stille“: `noiseSeconds` lang Pegel sammeln → Grundrauschen.
 *  2. „anschlag“: auf einen Anschlag warten (Pegel deutlich über dem Rauschen), danach
 *     `strumSeconds` lang den Spitzenpegel messen.
 *  3. „latenz“: Die Oberfläche spielt Klicks und meldet ihre Zeitpunkte (`addClick`); die Anschläge
 *     dazwischen werden zugeordnet. Nach dem letzten Klick + Nachlauf wird die Latenz geschätzt.
 *  4. „fertig“.
 *
 * Reine Logik, Zeitbasis sind die `time`-Werte der Frames (AudioContext-Uhr).
 */

export type CalibrationStep = 'stille' | 'anschlag' | 'latenz' | 'fertig';

export interface CalibrationSessionOptions {
  noiseSeconds?: number;
  strumSeconds?: number;
  /** Zeitpunkte der Klicks werden von außen gemeldet; so viele werden erwartet. */
  clickCount?: number;
  /** Nachlauf nach dem letzten Klick in Sekunden. */
  latencyTailSeconds?: number;
}

export interface CalibrationResultData {
  noiseFloorRms: number;
  noiseFloorDb: number;
  strumPeakRms: number;
  strumPeakDb: number;
  gateRms: number;
  latency: LatencyEstimate | null;
  latencySamplesMs: number[];
}

export interface CalibrationState {
  step: CalibrationStep;
  /** Fortschritt des aktuellen Schritts 0–1. */
  progress: number;
  /** Im Schritt „anschlag“: ob der Anschlag bereits erkannt wurde. */
  strumDetected: boolean;
  /** Im Schritt „latenz“: Anzahl zugeordneter Anschläge. */
  latencyHits: number;
  clicksPlayed: number;
  result: CalibrationResultData;
}

const DEFAULTS = { noiseSeconds: 2, strumSeconds: 1.5, clickCount: 8, latencyTailSeconds: 0.8 } as const;

export class CalibrationSession {
  private readonly noiseSeconds: number;
  private readonly strumSeconds: number;
  private readonly clickCount: number;
  private readonly latencyTailSeconds: number;

  private step: CalibrationStep = 'stille';
  private stepStart: number | null = null;
  private readonly noiseSamples: number[] = [];
  private noiseFloorRms = 0;
  private strumDetected = false;
  private strumStart = 0;
  private strumPeakRms = 0;
  private readonly clicks: number[] = [];
  private readonly onsets: number[] = [];
  private latency: LatencyEstimate | null = null;
  private latencySamplesMs: number[] = [];
  private lastClickTime: number | null = null;

  constructor(options: CalibrationSessionOptions = {}) {
    this.noiseSeconds = options.noiseSeconds ?? DEFAULTS.noiseSeconds;
    this.strumSeconds = options.strumSeconds ?? DEFAULTS.strumSeconds;
    this.clickCount = options.clickCount ?? DEFAULTS.clickCount;
    this.latencyTailSeconds = options.latencyTailSeconds ?? DEFAULTS.latencyTailSeconds;
  }

  get currentStep(): CalibrationStep {
    return this.step;
  }

  /** Pegelschwelle, ab der im Schritt „anschlag“ ein Anschlag gilt. */
  get strumThresholdRms(): number {
    return Math.max(0.01, this.noiseFloorRms * 8);
  }

  /** Meldet einen geplanten Klick (Zeit in Sekunden auf der Frame-Uhr). */
  addClick(time: number): void {
    if (this.step !== 'latenz') return;
    this.clicks.push(time);
    this.lastClickTime = time;
  }

  /** Überspringt den aktuellen Schritt (z. B. Latenz ohne Messung). */
  skip(): void {
    if (this.step === 'stille') this.finishNoise();
    else if (this.step === 'anschlag') this.finishStrum();
    else if (this.step === 'latenz') this.finishLatency();
  }

  push(frame: AnalysisFrame): CalibrationState {
    const now = frame.time;
    if (this.stepStart === null) this.stepStart = now;
    switch (this.step) {
      case 'stille':
        this.noiseSamples.push(frame.rms);
        if (now - this.stepStart >= this.noiseSeconds) this.finishNoise();
        break;
      case 'anschlag':
        if (!this.strumDetected) {
          if (frame.rms >= this.strumThresholdRms) {
            this.strumDetected = true;
            this.strumStart = now;
            this.strumPeakRms = frame.rms;
          }
        } else {
          if (frame.rms > this.strumPeakRms) this.strumPeakRms = frame.rms;
          if (now - this.strumStart >= this.strumSeconds) this.finishStrum();
        }
        break;
      case 'latenz':
        if (frame.onset && this.clicks.length > 0) this.onsets.push(frame.onsetTime);
        if (this.clicks.length >= this.clickCount && this.lastClickTime !== null && now - this.lastClickTime >= this.latencyTailSeconds) this.finishLatency();
        break;
      case 'fertig':
        break;
    }
    return this.state(now);
  }

  state(now: number = this.stepStart ?? 0): CalibrationState {
    let progress: number;
    const start = this.stepStart ?? now;
    if (this.step === 'stille') progress = Math.min(1, (now - start) / this.noiseSeconds);
    else if (this.step === 'anschlag') progress = this.strumDetected ? Math.min(1, (now - this.strumStart) / this.strumSeconds) : 0;
    else if (this.step === 'latenz') progress = Math.min(1, this.clicks.length / this.clickCount);
    else progress = 1;
    return {
      step: this.step,
      progress,
      strumDetected: this.strumDetected,
      latencyHits: this.latencySamplesMs.length || matchClicksToOnsets(this.clicks, this.onsets).length,
      clicksPlayed: this.clicks.length,
      result: {
        noiseFloorRms: this.noiseFloorRms,
        noiseFloorDb: toDb(this.noiseFloorRms),
        strumPeakRms: this.strumPeakRms,
        strumPeakDb: toDb(this.strumPeakRms),
        gateRms: recommendGate(this.noiseFloorRms, this.strumPeakRms),
        latency: this.latency,
        latencySamplesMs: this.latencySamplesMs,
      },
    };
  }

  private finishNoise(): void {
    this.noiseFloorRms = summarizeNoise(this.noiseSamples).floorRms;
    this.step = 'anschlag';
    this.stepStart = null;
  }

  private finishStrum(): void {
    this.step = 'latenz';
    this.stepStart = null;
  }

  private finishLatency(): void {
    this.latencySamplesMs = matchClicksToOnsets(this.clicks, this.onsets);
    this.latency = estimateLatency(this.latencySamplesMs);
    this.step = 'fertig';
    this.stepStart = null;
  }
}
