/**
 * Kalibrierungsmodell: Grundrauschen, Eingangspegel und Latenz je Gerät.
 * Reine Berechnungen; Ablauf in `calibrationSession.ts`, Speicherung in `core/storage/calibration.ts`.
 */

export interface CalibrationProfile {
  /** Kennung des Geräts (Plattform, Browser, Abtastrate). */
  deviceKey: string;
  createdAt: string;
  appVersion: string;
  sampleRate: number;
  /** Grundrauschen (RMS) – 90. Perzentil der Stille-Messung. */
  noiseFloorRms: number;
  noiseFloorDb: number;
  /** Spitzenpegel (RMS, 10 ms) beim Anschlag über alle Saiten. */
  strumPeakRms: number;
  strumPeakDb: number;
  /** Empfohlener Mindestpegel (RMS), ab dem nach Tönen gesucht wird. */
  gateRms: number;
  /** Gesamtlatenz Klick → erkannter Anschlag (Median, ms) oder null, wenn übersprungen. */
  latencyMs: number | null;
  /** Einzelmessungen der Latenz (ms). */
  latencySamplesMs: number[];
}

export type NoiseVerdict = 'ruhig' | 'ok' | 'laut';
export type LevelVerdict = 'leise' | 'gut' | 'laut';

/** RMS → dBFS (0 dB = Vollaussteuerung eines Sinus mit RMS 1). */
export function toDb(rms: number): number {
  return rms > 0 ? 20 * Math.log10(rms) : -120;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index]!;
}

/** Fasst die Pegelwerte der Stille-Messung zusammen (robust gegen einzelne Störgeräusche). */
export function summarizeNoise(rmsValues: readonly number[]): { floorRms: number; floorDb: number; medianRms: number } {
  const floorRms = percentile(rmsValues, 0.9);
  return { floorRms, floorDb: toDb(floorRms), medianRms: percentile(rmsValues, 0.5) };
}

export function noiseVerdict(floorDb: number): NoiseVerdict {
  if (floorDb < -55) return 'ruhig';
  if (floorDb < -40) return 'ok';
  return 'laut';
}

export function levelVerdict(peakDb: number): LevelVerdict {
  if (peakDb < -30) return 'leise';
  if (peakDb > -3) return 'laut';
  return 'gut';
}

/**
 * Empfohlener Mindestpegel: deutlich über dem Rauschen, aber höchstens ein Zehntel des Anschlagpegels,
 * damit leise gespielte Töne und das Ausklingen noch erfasst werden.
 */
export function recommendGate(noiseFloorRms: number, strumPeakRms: number): number {
  const fromNoise = Math.max(0.0015, noiseFloorRms * 4);
  if (!(strumPeakRms > 0)) return fromNoise;
  return Math.min(fromNoise, Math.max(0.0015, strumPeakRms * 0.1));
}

/**
 * Ordnet jedem Klick den ersten Anschlag innerhalb des Suchfensters zu und liefert die Abstände (ms).
 * Anschläge vor dem Klick (zu früh gespielt) zählen bis `earlyMs` als negative Werte.
 */
export function matchClicksToOnsets(clickTimes: readonly number[], onsetTimes: readonly number[], windowMs = 350, earlyMs = 80): number[] {
  const offsets: number[] = [];
  const sortedOnsets = [...onsetTimes].sort((a, b) => a - b);
  let cursor = 0;
  for (const click of clickTimes) {
    while (cursor < sortedOnsets.length && sortedOnsets[cursor]! < click - earlyMs / 1000) cursor++;
    const candidate = sortedOnsets[cursor];
    if (candidate !== undefined && candidate <= click + windowMs / 1000) {
      offsets.push((candidate - click) * 1000);
      cursor++;
    }
  }
  return offsets;
}

export interface LatencyEstimate {
  medianMs: number;
  /** Streuung (Interquartilsabstand) in ms. */
  spreadMs: number;
  samples: number;
  /** Mindestens 3 Treffer und Streuung unter 60 ms. */
  reliable: boolean;
}

/** Latenz aus den Klick→Anschlag-Abständen (Median; robust gegen Ausreißer). */
export function estimateLatency(offsetsMs: readonly number[]): LatencyEstimate | null {
  if (offsetsMs.length === 0) return null;
  const medianMs = percentile(offsetsMs, 0.5);
  const spreadMs = percentile(offsetsMs, 0.75) - percentile(offsetsMs, 0.25);
  return { medianMs, spreadMs, samples: offsetsMs.length, reliable: offsetsMs.length >= 3 && spreadMs < 60 };
}
