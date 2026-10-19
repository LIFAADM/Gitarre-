import { encodeWav } from '@/core/audio/wav';
import { getDb, newId } from './db';
import type { ClipKind, ClipRecord, ExpectedNote } from './types';

/**
 * Aufnahmen des Erkennungs-Labors: WAV in IndexedDB, Beschriftung daneben.
 * Export als WAV + JSON mit gleichem Dateinamen – genau das Format, das der Benchmark in
 * `test-audio/real/` erwartet.
 */

export interface NewClip {
  label: string;
  kind: ClipKind;
  expected: ExpectedNote[];
  notes: string;
  sampleRate: number;
  samples: Float32Array;
}

export async function saveClip(input: NewClip): Promise<ClipRecord> {
  const record: ClipRecord = {
    id: newId('clip-'),
    label: input.label,
    kind: input.kind,
    expected: input.expected,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    sampleRate: input.sampleRate,
    durationSec: input.samples.length / input.sampleRate,
    wav: new Blob([encodeWav(input.samples, input.sampleRate)], { type: 'audio/wav' }),
  };
  await getDb().clips.add(record);
  return record;
}

export async function listClips(): Promise<ClipRecord[]> {
  return getDb().clips.orderBy('createdAt').reverse().toArray();
}

export async function deleteClip(id: string): Promise<void> {
  await getDb().clips.delete(id);
}

/** Dateiname ohne Endung: `2026-10-19-1432-leersaite-a`. */
export function clipFileStem(clip: Pick<ClipRecord, 'label' | 'createdAt'>): string {
  const date = clip.createdAt.slice(0, 16).replace('T', '-').replace(':', '');
  const slug = clip.label
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${date}-${slug || 'aufnahme'}`;
}

export interface ClipSidecar {
  version: 1;
  label: string;
  kind: ClipKind;
  expected: ExpectedNote[];
  notes: string;
  recordedAt: string;
  sampleRate: number;
  durationSec: number;
  device: string;
  appVersion: string;
  calibration: { noiseFloorDb: number; gateRms: number; latencyMs: number | null } | null;
}

/** JSON-Beschriftung zu einer Aufnahme (Benchmark-Format). */
export function clipSidecar(clip: ClipRecord, device: string, appVersion: string, calibration: ClipSidecar['calibration']): ClipSidecar {
  return {
    version: 1,
    label: clip.label,
    kind: clip.kind,
    expected: clip.expected,
    notes: clip.notes,
    recordedAt: clip.createdAt,
    sampleRate: clip.sampleRate,
    durationSec: Math.round(clip.durationSec * 1000) / 1000,
    device,
    appVersion,
    calibration,
  };
}
