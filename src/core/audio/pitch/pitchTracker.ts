import { frequencyToMidi } from '@/core/music/notes';

/**
 * Stabilisierungsschicht über der rohen Tonhöhenerkennung.
 *
 * Die YIN-Analyse liefert pro Puffer eine Schätzung, die bei leisen Stellen, Anschlaggeräuschen
 * oder Übergängen springen kann. Der Tracker
 *  - verwirft zu leise Messungen (Pegel-Gate je nach Empfindlichkeit),
 *  - glättet mit dem Median der letzten gültigen Frequenzen (ein Ausreißer fällt heraus),
 *  - meldet `stable`, sobald die erkannte Note eine Mindestzeit unverändert geblieben ist,
 *  - und vergisst den Wert nach kurzer Zeit ohne gültige Messung (keine „eingefrorene“ Anzeige).
 */

export type TunerSensitivity = 'niedrig' | 'normal' | 'hoch';

export interface PitchSample {
  frequency: number;
  probability: number;
  rms: number;
}

export interface TrackedPitch {
  /** Geglättete Frequenz in Hz (Median). */
  frequency: number;
  /** Nächstgelegene MIDI-Note (gerundet). */
  midi: number;
  /** Abweichung zur nächstgelegenen Note in Cent (positiv = zu hoch). */
  cents: number;
  /** Ob die Note seit `minStableMs` unverändert erkannt wird. */
  stable: boolean;
  /** Pegel (RMS) der letzten Messung. */
  level: number;
}

export interface PitchTrackerOptions {
  sensitivity: TunerSensitivity;
  /** Anzahl der Werte für den Median. Standard 5. */
  medianWindow?: number;
  /** Mindestdauer unveränderter Note, bis `stable` gilt. Standard 100 ms. */
  minStableMs?: number;
  /** Kammerton in Hz. Standard 440. */
  a4Hz?: number;
  /** Nach dieser Zeit ohne gültige Messung liefert `current()` null. Standard 400 ms. */
  holdMs?: number;
  /** Mindestzuverlässigkeit einer Messung. Standard 0,5. */
  minProbability?: number;
  /** Fester Mindestpegel (RMS), z. B. aus der Kalibrierung; ersetzt die Tabelle `RMS_GATE`. */
  gateRms?: number;
}

/** Mindestpegel (RMS) je Empfindlichkeit – darunter werden Messungen verworfen. */
export const RMS_GATE: Record<TunerSensitivity, number> = {
  hoch: 0.004,
  normal: 0.01,
  niedrig: 0.02,
};

const DEFAULT_MEDIAN_WINDOW = 5;
const DEFAULT_MIN_STABLE_MS = 100;
const DEFAULT_HOLD_MS = 400;
const DEFAULT_MIN_PROBABILITY = 0.5;

/** Exponentielle Glättung für die Cent-Anzeige (z. B. für eine ruhigere Nadel). */
export function smoothCents(prev: number | null, next: number, alpha = 0.4): number {
  if (prev === null || !Number.isFinite(prev)) return next;
  const a = Math.min(1, Math.max(0, alpha));
  return prev + a * (next - prev);
}

/**
 * Median einer Liste. Bei gerader Anzahl wird der mittlere Wert gewählt, der dem jüngsten
 * Wert am nächsten liegt – ein Mittelwert würde sonst z. B. 110 Hz und 220 Hz zu 165 Hz verschmelzen.
 */
function medianOf(values: readonly number[], newest: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  const lower = sorted[mid - 1]!;
  const upper = sorted[mid]!;
  return Math.abs(lower - newest) <= Math.abs(upper - newest) ? lower : upper;
}

export class PitchTracker {
  private sensitivity: TunerSensitivity;
  private medianWindow: number;
  private minStableMs: number;
  private a4Hz: number;
  private holdMs: number;
  private minProbability: number;
  private gateRms: number | null;

  private readonly window: number[] = [];
  private lastValidMs = Number.NEGATIVE_INFINITY;
  private lastPushMs = 0;
  private lastLevel = 0;
  private stableMidi: number | null = null;
  private stableSinceMs = 0;
  private latest: { frequency: number; midi: number; cents: number } | null = null;

  constructor(options: PitchTrackerOptions) {
    this.sensitivity = options.sensitivity;
    this.medianWindow = Math.max(1, Math.round(options.medianWindow ?? DEFAULT_MEDIAN_WINDOW));
    this.minStableMs = Math.max(0, options.minStableMs ?? DEFAULT_MIN_STABLE_MS);
    this.a4Hz = options.a4Hz ?? 440;
    this.holdMs = Math.max(0, options.holdMs ?? DEFAULT_HOLD_MS);
    this.minProbability = options.minProbability ?? DEFAULT_MIN_PROBABILITY;
    this.gateRms = options.gateRms ?? null;
  }

  /** Aktualisiert Optionen im laufenden Betrieb (z. B. nach Änderung der Einstellungen). */
  setOptions(patch: Partial<PitchTrackerOptions>): void {
    if (patch.sensitivity !== undefined) this.sensitivity = patch.sensitivity;
    if (patch.medianWindow !== undefined) this.medianWindow = Math.max(1, Math.round(patch.medianWindow));
    if (patch.minStableMs !== undefined) this.minStableMs = Math.max(0, patch.minStableMs);
    if (patch.a4Hz !== undefined && patch.a4Hz !== this.a4Hz) {
      this.a4Hz = patch.a4Hz;
      this.reset();
    }
    if (patch.holdMs !== undefined) this.holdMs = Math.max(0, patch.holdMs);
    if (patch.minProbability !== undefined) this.minProbability = patch.minProbability;
    if (patch.gateRms !== undefined) this.gateRms = patch.gateRms;
    while (this.window.length > this.medianWindow) this.window.shift();
  }

  /** Aktueller Mindestpegel (RMS): kalibrierter Wert, sonst Tabelle je Empfindlichkeit. */
  get gate(): number {
    return this.gateRms ?? RMS_GATE[this.sensitivity];
  }

  /** Pegel der letzten Messung (auch wenn sie verworfen wurde). */
  get level(): number {
    return this.lastLevel;
  }

  /** Vergisst alle bisherigen Messungen. */
  reset(): void {
    this.window.length = 0;
    this.lastValidMs = Number.NEGATIVE_INFINITY;
    this.lastLevel = 0;
    this.stableMidi = null;
    this.stableSinceMs = 0;
    this.latest = null;
  }

  /** Nimmt eine neue Messung (oder `null` für „nichts erkannt“) zum Zeitpunkt `nowMs` entgegen. */
  push(sample: PitchSample | null, nowMs: number): void {
    this.lastPushMs = nowMs;
    this.lastLevel = sample ? sample.rms : 0;
    const gapMs = nowMs - this.lastValidMs;
    if (!this.isValid(sample)) {
      if (gapMs > this.holdMs) this.forget();
      return;
    }
    // Nach einer Pause nicht mit alten Werten vermischen.
    if (gapMs > this.holdMs) this.forget();
    this.lastValidMs = nowMs;
    this.window.push(sample.frequency);
    while (this.window.length > this.medianWindow) this.window.shift();

    const frequency = medianOf(this.window, sample.frequency);
    const midiFloat = frequencyToMidi(frequency, this.a4Hz);
    const midi = Math.round(midiFloat);
    const cents = (midiFloat - midi) * 100;
    if (midi !== this.stableMidi) {
      this.stableMidi = midi;
      this.stableSinceMs = nowMs;
    }
    this.latest = { frequency, midi, cents };
  }

  /**
   * Aktueller geglätteter Wert oder `null`, wenn seit `holdMs` keine gültige Messung vorlag.
   * Ohne Argument gilt der Zeitpunkt des letzten `push()`.
   */
  current(nowMs: number = this.lastPushMs): TrackedPitch | null {
    if (!this.latest || nowMs - this.lastValidMs > this.holdMs) return null;
    return {
      frequency: this.latest.frequency,
      midi: this.latest.midi,
      cents: this.latest.cents,
      stable: nowMs - this.stableSinceMs >= this.minStableMs,
      level: this.lastLevel,
    };
  }

  private isValid(sample: PitchSample | null): sample is PitchSample {
    if (!sample) return false;
    if (!Number.isFinite(sample.frequency) || sample.frequency <= 0) return false;
    if (sample.rms < this.gate) return false;
    return sample.probability >= this.minProbability;
  }

  private forget(): void {
    this.window.length = 0;
    this.stableMidi = null;
    this.stableSinceMs = 0;
    this.latest = null;
  }
}
