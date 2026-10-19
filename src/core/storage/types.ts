/** Stilrichtungen der gemeinfreien Stücke und eigenen Übungen. */
export type Genre = 'Weihnachten' | 'Geburtstag' | 'Kinderlied / Volkslied' | 'Etüde' | 'Übung';

/** Rechtestatus: nur gemeinfreie Stücke mit eigenem Arrangement oder eigene Übungen. */
export type RightsStatus = 'public-domain' | 'own-arrangement';

export type VersionLabel = 'Anfänger' | 'Leicht' | 'Mittel' | 'Originalnah';
export type VersionKind = 'arrangement';

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

/** Kalibrierungsprofil eines Geräts (siehe `core/detection/calibration.ts`). */
export interface CalibrationRecord {
  deviceKey: string;
  createdAt: string;
  appVersion: string;
  sampleRate: number;
  noiseFloorRms: number;
  noiseFloorDb: number;
  strumPeakRms: number;
  strumPeakDb: number;
  gateRms: number;
  latencyMs: number | null;
  latencySamplesMs: number[];
}

/** Art einer beschrifteten Aufnahme. */
export type ClipKind = 'einzelton' | 'akkord' | 'folge' | 'stille' | 'frei';

/** Erwarteter Ton in einer Aufnahme (für den Benchmark). */
export interface ExpectedNote {
  midi: number;
  string?: number;
  fret?: number;
}

/** Aufnahme aus dem Erkennungs-Labor: WAV-Daten plus Beschriftung. */
export interface ClipRecord {
  id: string;
  label: string;
  kind: ClipKind;
  expected: ExpectedNote[];
  notes: string;
  createdAt: string;
  sampleRate: number;
  durationSec: number;
  /** PCM-16-WAV als Blob. */
  wav: Blob;
}
