import { detectPitchYin } from '@/core/audio/pitch/yin';
import { applyWindow, hannWindow, RealFFT, windowSum } from './fft';
import { OnsetDetector } from './onset';
import { targetPresence, type PresenceResult } from './presence';

/**
 * Analyse-Kern der Tonerkennung: nimmt Audio in beliebigen Blöcken entgegen und liefert in festen
 * Schritten (Standard 10 ms) ein Ergebnis-Frame – lückenlos, unabhängig von Timern des Main-Threads.
 *
 * Je Schritt:
 *  - Pegel (RMS, Spitze) des Schritts
 *  - Betragsspektrum (FFT 2048, Hann) → Spectral-Flux-Anschlagerkennung
 *  - Tonhöhe (YIN auf 2048 Samples) als Gegenprobe
 *  - Zieltonprüfung (Goertzel auf 4096 Samples) für die gesetzten Zieltöne
 *
 * Läuft im AudioWorklet, in Vitest und im Node-Benchmark (keine Browser-APIs).
 */

export interface AnalysisEngineOptions {
  sampleRate: number;
  /** Schrittweite in Sekunden. Standard 0,01. */
  hopSec?: number;
  /** FFT-/YIN-Fenster. Standard 2048. */
  fftSize?: number;
  /** Fenster der Zieltonprüfung. Standard 4096 (bessere Trennung tiefer Töne). */
  presenceSize?: number;
  minHz?: number;
  maxHz?: number;
  /** Effektivwert des Grundrauschens (Kalibrierung). */
  noiseFloorRms?: number;
}

export interface PitchReading {
  hz: number;
  /** Zuverlässigkeit 0–1 (YIN). */
  probability: number;
}

export interface AnalysisFrame {
  /** Fortlaufende Schrittnummer seit Start/Reset. */
  index: number;
  /** Zeitpunkt des Schrittendes in Sekunden (Uhr des Lieferanten, im Browser die AudioContext-Uhr). */
  time: number;
  /** Effektivwert des Schritts (10 ms). */
  rms: number;
  /** Betragsmaximum des Schritts. */
  peak: number;
  /** Tonhöhenschätzung oder null (zu leise / kein klarer Ton). */
  pitch: PitchReading | null;
  /** Spectral Flux des Schritts. */
  flux: number;
  /** Ob ein Anschlag erkannt wurde (liegt einen Schritt zurück, siehe `onsetTime`). */
  onset: boolean;
  onsetTime: number;
  /** Flux relativ zur Schwelle (≥ 1 = Anschlag). */
  onsetStrength: number;
  /** Ergebnisse der Zieltonprüfung in der Reihenfolge von `setTargets()`. */
  targets: PresenceResult[];
}

export const ENGINE_DEFAULTS = {
  hopSec: 0.01,
  fftSize: 2048,
  presenceSize: 4096,
  minHz: 70,
  maxHz: 1200,
} as const;

/** Mindestpegel relativ zum Grundrauschen, ab dem Tonhöhe und Zielton geprüft werden. */
const GATE_OVER_NOISE = 3;
/** Absoluter Mindestpegel (RMS), falls keine Kalibrierung vorliegt. */
const ABSOLUTE_GATE = 0.0015;

export class AnalysisEngine {
  readonly sampleRate: number;
  readonly hopSize: number;
  readonly fftSize: number;
  readonly presenceSize: number;
  private readonly minHz: number;
  private readonly maxHz: number;
  private noiseFloorRms: number;

  private readonly history: Float32Array;
  private readonly pending: Float32Array;
  private pendingLength = 0;
  private readonly fft: RealFFT;
  private readonly fftWindow: Float32Array;
  private readonly fftScratch: Float32Array;
  private readonly magnitudes: Float32Array;
  private readonly presenceWindow: Float32Array;
  private readonly presenceWindowSum: number;
  private readonly presenceScratch: Float32Array;
  private readonly onsets: OnsetDetector;
  private targets: number[] = [];
  private index = 0;

  onFrame: ((frame: AnalysisFrame) => void) | null = null;

  constructor(options: AnalysisEngineOptions) {
    this.sampleRate = options.sampleRate;
    const hopSec = options.hopSec ?? ENGINE_DEFAULTS.hopSec;
    this.hopSize = Math.max(32, Math.round(hopSec * this.sampleRate));
    this.fftSize = options.fftSize ?? ENGINE_DEFAULTS.fftSize;
    this.presenceSize = options.presenceSize ?? ENGINE_DEFAULTS.presenceSize;
    this.minHz = options.minHz ?? ENGINE_DEFAULTS.minHz;
    this.maxHz = options.maxHz ?? ENGINE_DEFAULTS.maxHz;
    this.noiseFloorRms = options.noiseFloorRms ?? 0;
    const historyLength = Math.max(this.fftSize, this.presenceSize);
    this.history = new Float32Array(historyLength);
    this.pending = new Float32Array(this.hopSize);
    this.fft = new RealFFT(this.fftSize);
    this.fftWindow = hannWindow(this.fftSize);
    this.fftScratch = new Float32Array(this.fftSize);
    this.magnitudes = new Float32Array(this.fft.bins);
    this.presenceWindow = hannWindow(this.presenceSize);
    this.presenceWindowSum = windowSum(this.presenceWindow);
    this.presenceScratch = new Float32Array(this.presenceSize);
    this.onsets = new OnsetDetector({ sampleRate: this.sampleRate, fftSize: this.fftSize, hopSec });
  }

  /** Aktueller Mindestpegel (RMS), unterhalb dessen nicht nach Tönen gesucht wird. */
  get gateRms(): number {
    return Math.max(ABSOLUTE_GATE, this.noiseFloorRms * GATE_OVER_NOISE);
  }

  /** Zieltöne (Grundfrequenzen in Hz) für die erwartungsgeführte Prüfung. */
  setTargets(hz: readonly number[]): void {
    this.targets = hz.filter((f) => Number.isFinite(f) && f > 0);
  }

  setNoiseFloor(rms: number): void {
    this.noiseFloorRms = Number.isFinite(rms) && rms > 0 ? rms : 0;
  }

  reset(): void {
    this.history.fill(0);
    this.pendingLength = 0;
    this.onsets.reset();
    this.index = 0;
  }

  /**
   * Verarbeitet einen Block Samples. `startTime` ist der Zeitpunkt (Sekunden) des ersten Samples.
   * Für jeden vollständigen Schritt wird `onFrame` aufgerufen.
   */
  process(samples: Float32Array, startTime: number): void {
    let offset = 0;
    while (offset < samples.length) {
      const take = Math.min(this.hopSize - this.pendingLength, samples.length - offset);
      this.pending.set(samples.subarray(offset, offset + take), this.pendingLength);
      this.pendingLength += take;
      offset += take;
      if (this.pendingLength === this.hopSize) {
        this.pendingLength = 0;
        this.analyse(startTime + offset / this.sampleRate);
      }
    }
  }

  private analyse(time: number): void {
    const hop = this.pending;
    const history = this.history;
    history.copyWithin(0, this.hopSize);
    history.set(hop, history.length - this.hopSize);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < hop.length; i++) {
      const v = hop[i]!;
      sum += v * v;
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }
    const rms = Math.sqrt(sum / hop.length);

    const fftInput = history.subarray(history.length - this.fftSize);
    applyWindow(fftInput, this.fftWindow, this.fftScratch);
    this.fft.magnitudes(this.fftScratch, this.magnitudes);
    const audible = rms >= this.gateRms;
    const onset = this.onsets.push(this.magnitudes, time, audible);

    let pitch: PitchReading | null = null;
    const targets: PresenceResult[] = [];
    if (audible) {
      const estimate = detectPitchYin(fftInput, this.sampleRate, { minHz: this.minHz, maxHz: this.maxHz });
      if (estimate) pitch = { hz: estimate.frequency, probability: estimate.probability };
      if (this.targets.length > 0) {
        const presenceInput = history.subarray(history.length - this.presenceSize);
        applyWindow(presenceInput, this.presenceWindow, this.presenceScratch);
        for (const hz of this.targets) {
          const lowerOctaveExpected = this.targets.some((other) => Math.abs(1200 * Math.log2(other / (hz / 2))) < 50);
          targets.push(targetPresence(this.presenceScratch, this.presenceWindowSum, hz, { sampleRate: this.sampleRate, noiseRms: this.noiseFloorRms, lowerOctaveExpected }));
        }
      }
    } else {
      for (const hz of this.targets) targets.push({ hz, score: 0, matched: 0, energy: 0, octave: 'keine' });
    }

    const frame: AnalysisFrame = {
      index: this.index++,
      time,
      rms,
      peak,
      pitch,
      flux: onset.flux,
      onset: onset.onset,
      onsetTime: onset.onsetTime,
      onsetStrength: onset.strength,
      targets,
    };
    this.onFrame?.(frame);
  }
}
