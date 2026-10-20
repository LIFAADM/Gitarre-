import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeWav } from '@/core/audio/wav';
import { analyseClip, formatReport, summarize, type BenchmarkClip, type BenchmarkSummary, type ClipResult } from '@/core/detection/benchmark';
import { syntheticBenchmarkClips } from '@/core/detection/benchmarkSynthetic';
import type { ClipSidecar } from '@/core/storage/clips';

/**
 * `npm run bench:detection` – Erkennungs-Benchmark in Node (Vitest-Runner, eigene Konfiguration).
 *
 * - Echte Aufnahmen aus `test-audio/real/` (Paare `*.wav` + `*.json` aus dem Erkennungs-Labor).
 * - Synthetischer Satz als Messkette-Beweis und Rückschritt-Schutz.
 * Schlägt fehl, wenn ein vorhandener Satz die Zielwerte unterschreitet. Ohne echte Aufnahmen
 * wird deutlich gewarnt – die Zielwerte gelten erst mit ihnen als erreicht.
 *
 * Bericht: Konsole und `bench-results/detection.md` + `.json`.
 */

const REAL_DIR = join(process.cwd(), 'test-audio', 'real');
const OUT_DIR = join(process.cwd(), 'bench-results');

function loadRealClips(): { clips: BenchmarkClip[]; problems: string[] } {
  const clips: BenchmarkClip[] = [];
  const problems: string[] = [];
  if (!existsSync(REAL_DIR)) return { clips, problems };
  for (const file of readdirSync(REAL_DIR).filter((f) => f.toLowerCase().endsWith('.wav')).sort()) {
    const stem = file.slice(0, -4);
    const jsonPath = join(REAL_DIR, `${stem}.json`);
    if (!existsSync(jsonPath)) {
      problems.push(`${file}: keine Beschriftung ${stem}.json`);
      continue;
    }
    try {
      const sidecar = JSON.parse(readFileSync(jsonPath, 'utf8')) as ClipSidecar;
      const wav = decodeWav(new Uint8Array(readFileSync(join(REAL_DIR, file))).buffer);
      const noiseFloorRms = sidecar.calibration ? 10 ** (sidecar.calibration.noiseFloorDb / 20) : undefined;
      clips.push({ id: stem, label: sidecar.label || stem, kind: sidecar.kind, expected: sidecar.expected ?? [], sampleRate: wav.sampleRate, samples: wav.samples, source: 'echt', noiseFloorRms });
    } catch (error) {
      problems.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { clips, problems };
}

function writeResults(results: ClipResult[], summaries: BenchmarkSummary[], report: string): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'detection.md'), report);
  writeFileSync(join(OUT_DIR, 'detection.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summaries, results }, null, 2));
}

describe('Erkennungs-Benchmark', () => {
  const { clips: realClips, problems } = loadRealClips();
  const synthetic = syntheticBenchmarkClips();
  const results = [...realClips, ...synthetic].map((clip) => analyseClip(clip));
  const summaries: BenchmarkSummary[] = [];
  if (realClips.length > 0) summaries.push(summarize(results, 'echt'));
  summaries.push(summarize(results, 'synthetisch'));
  const report = formatReport(results, summaries);
  writeResults(results, summaries, report);
  console.info(`\n${report}`);
  if (problems.length > 0) console.warn(`Probleme beim Einlesen:\n- ${problems.join('\n- ')}`);
  if (realClips.length === 0) console.warn('\n⚠️  Keine echten Aufnahmen in test-audio/real/ – die Zielwerte gelten erst mit echten Aufnahmen als erreicht.');

  it('liest alle beschrifteten Aufnahmen ein', () => {
    expect(problems).toEqual([]);
  });

  it('synthetischer Satz erreicht die Zielwerte', () => {
    const s = summaries.find((x) => x.source === 'synthetisch')!;
    expect(s.failures, s.failures.join('; ')).toEqual([]);
  });

  it.skipIf(realClips.length === 0)('echte Aufnahmen erreichen die Zielwerte', () => {
    const s = summaries.find((x) => x.source === 'echt')!;
    expect(s.failures, s.failures.join('; ')).toEqual([]);
  });
});
