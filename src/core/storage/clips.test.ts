import { describe, expect, it } from 'vitest';
import { clipFileStem, clipSidecar } from './clips';
import type { ClipRecord } from './types';

describe('Aufnahmen', () => {
  const clip: ClipRecord = {
    id: 'clip-1',
    label: 'Leersaite Ä (5)',
    kind: 'einzelton',
    expected: [{ midi: 45, string: 5, fret: 0 }],
    notes: '',
    createdAt: '2026-10-19T14:32:10.000Z',
    sampleRate: 48000,
    durationSec: 2.3456,
    wav: new Blob(),
  };

  it('bildet lesbare Dateinamen ohne Umlaute', () => {
    expect(clipFileStem(clip)).toBe('2026-10-19-1432-leersaite-ae-5');
    expect(clipFileStem({ label: '!!!', createdAt: clip.createdAt })).toBe('2026-10-19-1432-aufnahme');
  });

  it('erzeugt die JSON-Beschriftung im Benchmark-Format', () => {
    const sidecar = clipSidecar(clip, 'iPhone|Safari|app|48000', '0.2.0', { noiseFloorDb: -60, gateRms: 0.004, latencyMs: 95 });
    expect(sidecar.version).toBe(1);
    expect(sidecar.expected).toEqual([{ midi: 45, string: 5, fret: 0 }]);
    expect(sidecar.durationSec).toBe(2.346);
    expect(sidecar.calibration?.latencyMs).toBe(95);
  });
});
