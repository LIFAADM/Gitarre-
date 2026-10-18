/**
 * Tonhöhenerkennung nach dem YIN-Verfahren (de Cheveigné & Kawahara, 2002).
 *
 * Reine Funktion ohne Abhängigkeiten – wird vom Stimmgerät (und später vom „Spiel mit“-Modus)
 * auf den Zeitbereichsdaten des Mikrofons ausgeführt.
 *
 * Schritte:
 *  1. Differenzfunktion d(τ) = Σ (x[j] − x[j+τ])²
 *  2. Kumulativ-mittelwertnormierte Differenz d'(τ) (Dips werden vergleichbar, τ = 0 fällt weg)
 *  3. Absolute Schwelle: erster Dip unter `threshold`, dann bis zum lokalen Minimum laufen
 *     (bevorzugt die Grundperiode gegenüber Vielfachen – vermeidet Oktavfehler nach unten)
 *  4. Parabolische Interpolation für Genauigkeit unterhalb eines Samples
 *
 * Aufwand: O(W · maxLag) mit W = Fenster (halbe Pufferlänge) und maxLag = sampleRate / minHz.
 * Für 4096 Samples bei 48 kHz und minHz = 60 sind das ≈ 1,6 Mio. Multiplikationen – unproblematisch
 * bei 25 Analysen pro Sekunde.
 */

export interface YinOptions {
  /** Schwelle für die normierte Differenz (kleiner = strenger). Standard 0,12. */
  threshold?: number;
  /** Tiefste erkennbare Frequenz in Hz. Standard 60. */
  minHz?: number;
  /** Höchste erkennbare Frequenz in Hz. Standard 1200. */
  maxHz?: number;
}

export interface PitchEstimate {
  /** Geschätzte Grundfrequenz in Hz. */
  frequency: number;
  /** Zuverlässigkeit 0–1 (1 − Tiefe des gefundenen Dips). */
  probability: number;
  /** Effektivwert (RMS) des analysierten Puffers. */
  rms: number;
}

export const YIN_DEFAULTS = {
  threshold: 0.12,
  minHz: 60,
  maxHz: 1200,
} as const;

/** Unterhalb dieses Effektivwerts gilt ein Puffer als digitale Stille. */
const SILENCE_RMS = 1e-5;

/** Effektivwert (Root Mean Square) eines Puffers – Maß für die Lautstärke. */
export function rms(buffer: Float32Array): number {
  const n = buffer.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = buffer[i]!;
    sum += v * v;
  }
  return Math.sqrt(sum / n);
}

/**
 * Erkennt die Grundfrequenz eines Signals.
 * Liefert `null`, wenn kein ausreichend klarer Dip gefunden wurde (Stille, Rauschen, Geräusche)
 * oder die gefundene Frequenz außerhalb von [minHz, maxHz] liegt.
 */
export function detectPitchYin(buffer: Float32Array, sampleRate: number, options: YinOptions = {}): PitchEstimate | null {
  const threshold = options.threshold ?? YIN_DEFAULTS.threshold;
  const minHz = options.minHz ?? YIN_DEFAULTS.minHz;
  const maxHz = options.maxHz ?? YIN_DEFAULTS.maxHz;
  const n = buffer.length;
  if (n < 64 || !(sampleRate > 0) || !(minHz > 0) || !(maxHz > minHz)) return null;

  const level = rms(buffer);
  if (level < SILENCE_RMS) return null;

  // Fenster W = halbe Pufferlänge (Standard-YIN); die Verzögerung τ darf höchstens so groß sein,
  // dass x[j + τ] noch im Puffer liegt.
  const half = Math.floor(n / 2);
  const maxLag = Math.min(half, Math.floor(sampleRate / minHz));
  if (maxLag < 4) return null;
  const w = half;
  // Die jüngsten Samples liegen am Ende des Puffers – nur den hinteren Teil verwenden (geringere Latenz).
  const offset = n - (w + maxLag);

  const diff = new Float32Array(maxLag + 1);
  const cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0;
    const shifted = offset + tau;
    for (let j = 0; j < w; j++) {
      const delta = buffer[offset + j]! - buffer[shifted + j]!;
      sum += delta * delta;
    }
    diff[tau] = sum;
    runningSum += sum;
    cmnd[tau] = runningSum > 0 ? (sum * tau) / runningSum : 1;
  }

  // Absolute Schwelle: erster Dip unter der Schwelle, dann zum lokalen Minimum weiterlaufen.
  // Die Suche beginnt bei τ = 2, damit zu hohe Töne als „außerhalb des Bereichs“ erkannt werden,
  // statt fälschlich auf einem Vielfachen ihrer Periode zu landen.
  let tau = 2;
  let found = -1;
  while (tau <= maxLag) {
    if (cmnd[tau]! < threshold) {
      while (tau + 1 <= maxLag && cmnd[tau + 1]! < cmnd[tau]!) tau++;
      found = tau;
      break;
    }
    tau++;
  }
  if (found < 0) return null;

  // Parabolische Interpolation auf der rohen Differenzfunktion (wie im Originalverfahren).
  let period = found;
  if (found > 0 && found < maxLag) {
    const s0 = diff[found - 1]!;
    const s1 = diff[found]!;
    const s2 = diff[found + 1]!;
    const curvature = s0 - 2 * s1 + s2;
    if (curvature > 0) {
      const shift = (s0 - s2) / (2 * curvature);
      if (Math.abs(shift) <= 1) period = found + shift;
    }
  }
  if (!(period > 0)) return null;

  const frequency = sampleRate / period;
  if (frequency < minHz || frequency > maxHz) return null;

  const probability = Math.min(1, Math.max(0, 1 - cmnd[found]!));
  return { frequency, probability, rms: level };
}
