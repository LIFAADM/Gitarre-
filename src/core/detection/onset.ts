/**
 * Anschlagerkennung über Spectral Flux (Zunahme der Energie je Frequenzband zwischen zwei Fenstern).
 *
 * - Halbwellen-gleichgerichtete Differenz der logarithmierten Beträge im Bereich 60 Hz – 5 kHz
 * - adaptive Schwelle: Median der letzten Werte × Faktor, mindestens ein fester Sockel
 * - Spitzenwahl: ein Schritt Verzögerung, damit das lokale Maximum sicher erkannt wird
 * - Mindestabstand zwischen zwei Anschlägen (Standard 60 ms)
 *
 * Ein neuer Anschlag erzeugt breitbandig Energie, auch wenn derselbe Ton noch klingt – darum
 * erkennt das Verfahren wiederholte gleiche Töne, die eine reine Tonhöhenerkennung nicht trennt.
 */

export interface OnsetDetectorOptions {
  sampleRate: number;
  fftSize: number;
  /** Schrittweite der Analyse in Sekunden (für Mindestabstand und Schwellenfenster). */
  hopSec: number;
  minHz?: number;
  maxHz?: number;
  /** Länge des Schwellenfensters in Schritten. Standard 20 (= 200 ms bei 10 ms). */
  historyLength?: number;
  /** Faktor über dem Median. Standard 2. */
  thresholdFactor?: number;
  /** Absoluter Mindestwert des Flux (normierte Einheiten). Standard 5. */
  thresholdFloor?: number;
  /** Mindestabstand zweier Anschläge in Sekunden. Standard 0,06. */
  minIntervalSec?: number;
  /** Kompressionsfaktor für log(1 + γ·|X|) mit |X| normiert auf Vollaussteuerung = 1. Standard 100. */
  gamma?: number;
}

export interface OnsetResult {
  /** Spectral Flux des aktuellen Schritts. */
  flux: number;
  /** Aktuelle adaptive Schwelle. */
  threshold: number;
  /** Ob im vorherigen Schritt ein Anschlag lag (Spitzenwahl mit einem Schritt Verzögerung). */
  onset: boolean;
  /** Zeitpunkt des erkannten Anschlags (Sekunden), wenn `onset`. */
  onsetTime: number;
  /** Flux / Schwelle des erkannten Anschlags – ab 1 gilt er als Anschlag. */
  strength: number;
}

export class OnsetDetector {
  private readonly loBin: number;
  private readonly hiBin: number;
  private readonly gamma: number;
  /** Normierung der FFT-Beträge: Hann-gefensterter Sinus mit Amplitude 1 → 1. */
  private readonly scale: number;
  private readonly historyLength: number;
  private readonly thresholdFactor: number;
  private readonly thresholdFloor: number;
  private readonly minIntervalSec: number;
  private previous: Float32Array | null = null;
  private readonly history: number[] = [];
  private fluxPrev = 0;
  private fluxPrevPrev = 0;
  private thresholdPrev = Number.POSITIVE_INFINITY;
  private timePrev = 0;
  private audiblePrev = false;
  private lastOnsetTime = Number.NEGATIVE_INFINITY;

  constructor(options: OnsetDetectorOptions) {
    const { sampleRate, fftSize } = options;
    const minHz = options.minHz ?? 60;
    const maxHz = options.maxHz ?? 5000;
    this.loBin = Math.max(1, Math.floor((minHz * fftSize) / sampleRate));
    this.hiBin = Math.min(fftSize / 2, Math.ceil((maxHz * fftSize) / sampleRate));
    this.gamma = options.gamma ?? 100;
    this.scale = 4 / fftSize;
    this.historyLength = options.historyLength ?? 20;
    this.thresholdFactor = options.thresholdFactor ?? 2;
    this.thresholdFloor = options.thresholdFloor ?? 5;
    this.minIntervalSec = options.minIntervalSec ?? 0.06;
  }

  reset(): void {
    this.previous = null;
    this.history.length = 0;
    this.fluxPrev = 0;
    this.fluxPrevPrev = 0;
    this.thresholdPrev = Number.POSITIVE_INFINITY;
    this.audiblePrev = false;
    this.lastOnsetTime = Number.NEGATIVE_INFINITY;
  }

  /**
   * Nimmt das Betragsspektrum eines Schritts entgegen (Zeitpunkt = Ende des Fensters).
   * `audible` = false (Pegel unter dem Mindestpegel) verhindert, dass dieser Schritt als Anschlag zählt.
   */
  push(magnitudes: Float32Array, time: number, audible = true): OnsetResult {
    let flux = 0;
    const prev = this.previous;
    const current = prev ?? new Float32Array(magnitudes.length);
    for (let k = this.loBin; k <= this.hiBin; k++) {
      const value = Math.log1p(this.gamma * this.scale * magnitudes[k]!);
      if (prev) {
        const delta = value - prev[k]!;
        if (delta > 0) flux += delta;
      }
      current[k] = value;
    }
    this.previous = current;

    const threshold = Math.max(this.thresholdFloor, this.median() * this.thresholdFactor);
    this.history.push(flux);
    while (this.history.length > this.historyLength) this.history.shift();

    // Spitzenwahl: der vorherige Wert ist ein Anschlag, wenn er über seiner Schwelle lag und ein lokales Maximum ist.
    let onset = false;
    let strength = this.thresholdPrev > 0 && Number.isFinite(this.thresholdPrev) ? this.fluxPrev / this.thresholdPrev : 0;
    if (this.audiblePrev && this.fluxPrev > this.thresholdPrev && this.fluxPrev >= this.fluxPrevPrev && this.fluxPrev >= flux && this.timePrev - this.lastOnsetTime >= this.minIntervalSec) {
      onset = true;
      this.lastOnsetTime = this.timePrev;
    } else {
      strength = Math.min(strength, 0.999);
    }
    const onsetTime = this.timePrev;

    this.fluxPrevPrev = this.fluxPrev;
    this.fluxPrev = flux;
    this.thresholdPrev = threshold;
    this.timePrev = time;
    this.audiblePrev = audible;
    return { flux, threshold, onset, onsetTime, strength };
  }

  private median(): number {
    if (this.history.length === 0) return 0;
    const sorted = [...this.history].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)]!;
  }
}
