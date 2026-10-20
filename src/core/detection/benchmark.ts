import { frequencyToMidi, midiToFrequency } from '@/core/music/notes';
import type { ClipKind, ExpectedNote } from '@/core/storage/types';
import { AnalysisEngine, type AnalysisFrame } from './engine';
import { PRESENCE_THRESHOLD } from './presence';

/**
 * Benchmark-Kern: bewertet die Tonerkennung an beschrifteten Aufnahmen (WAV + JSON aus dem
 * Erkennungs-Labor) oder an synthetischen Clips. Reine Logik, läuft in Node (Vitest-Runner unter
 * `bench/`) und könnte später auch in der App laufen.
 *
 * Gemessen wird so, wie die Spielansicht fragt: „Ist der erwartete Ton da?“
 *  - Ereignisse = Anschläge aus der Engine; je Ereignis wird im Fenster danach die Zieltonprüfung
 *    (75. Perzentil der Frame-Werte) und die Tonhöhe (Median) ausgewertet.
 *  - Treffer: erwarteter Ton anwesend (≥ Schwelle) und Tonhöhe widerspricht nicht.
 *  - Fehlalarm: ein Köderton (±1, ±2 Halbtöne, ±Oktave; nicht erwartet) gilt als anwesend.
 *    Bei Stille zählt jedes Ereignis als Fehlalarm.
 *  - Timing: Abstand der Engine-Anschläge zu Referenz-Anschlägen, die offline aus der Hüllkurve
 *    des ganzen Clips bestimmt werden (`referenceOnsets`).
 */

export type ClipSource = 'echt' | 'synthetisch';

export interface BenchmarkClip {
  id: string;
  label: string;
  kind: ClipKind;
  expected: ExpectedNote[];
  sampleRate: number;
  samples: Float32Array;
  source: ClipSource;
  /** Grundrauschen (RMS) wie aus der Kalibrierung; fehlt es, schätzt der Benchmark es aus dem Clip. */
  noiseFloorRms?: number;
}

export interface BenchmarkTargets {
  /** Einzeltöne und Folgen: Anteil getroffener erwarteter Töne. */
  singleNoteHitRate: number;
  /** Anteil der Köderprüfungen, die fälschlich „anwesend“ melden. */
  falseAlarmRate: number;
  /** Median des Abstands Engine-Anschlag ↔ Referenz-Anschlag in ms. */
  timingMedianMs: number;
  /** Akkorde: Anteil getroffener Akkordtöne je Anschlag. */
  chordHitRate: number;
}

/** Zielwerte (bestätigt 2026-10-19). */
export const BENCHMARK_TARGETS: BenchmarkTargets = { singleNoteHitRate: 0.95, falseAlarmRate: 0.03, timingMedianMs: 30, chordHitRate: 0.9 };

export interface NoteEvent {
  time: number;
  /** Median der Tonhöhe im Auswertefenster als MIDI-Gleitwert, null wenn keine Tonhöhe. */
  pitchMidi: number | null;
  /** Zieltonprüfung je Prüfton (Reihenfolge wie `probes`). */
  presence: number[];
  rms: number;
}

export interface ClipResult {
  id: string;
  label: string;
  kind: ClipKind;
  source: ClipSource;
  durationSec: number;
  events: number;
  expectedCount: number;
  hits: number;
  falseAlarms: number;
  falseAlarmChecks: number;
  /** Signierte Abstände Engine − Referenz in ms. */
  timingDeltasMs: number[];
  referenceOnsets: number;
  notes: string[];
}

export interface BenchmarkSummary {
  source: ClipSource;
  clips: number;
  singleNoteHitRate: number | null;
  singleNoteHits: number;
  singleNoteExpected: number;
  chordHitRate: number | null;
  chordHits: number;
  chordChecks: number;
  falseAlarmRate: number | null;
  falseAlarms: number;
  falseAlarmChecks: number;
  timingMedianAbsMs: number | null;
  timingMedianSignedMs: number | null;
  timingSamples: number;
  failures: string[];
  passed: boolean;
}

export interface AnalyseOptions {
  /** Fenster nach dem Anschlag, in dem Zielton und Tonhöhe ausgewertet werden (Sekunden). */
  windowStartSec?: number;
  windowEndSec?: number;
  /** Anschläge näher beieinander werden zu einem Ereignis zusammengefasst (Akkord-Strum). */
  mergeSec?: number;
  presenceThreshold?: number;
}

const DEFAULTS = { windowStartSec: 0.04, windowEndSec: 0.25, mergeSec: 0.06, chordMergeSec: 0.15, chordWindowStartSec: 0.08, chordWindowEndSec: 0.4 } as const;

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))]!;
}

/** Schätzt das Grundrauschen eines Clips (10. Perzentil der 10-ms-Pegel). */
export function estimateNoiseFloor(samples: Float32Array, sampleRate: number): number {
  const hop = Math.max(32, Math.round(sampleRate * 0.01));
  const levels: number[] = [];
  for (let i = 0; i + hop <= samples.length; i += hop) {
    let sum = 0;
    for (let j = i; j < i + hop; j++) sum += samples[j]! * samples[j]!;
    levels.push(Math.sqrt(sum / hop));
  }
  return percentile(levels, 0.1);
}

/**
 * Referenz-Anschläge offline aus der Hüllkurve: Pegel über 10 ms, alle 2 ms (überlappend, dadurch
 * glatt auch bei tiefen Tönen), steiler Anstieg deutlich über dem Rauschen und über dem Pegel kurz
 * davor, Mindestabstand 80 ms. Dient als Zeitreferenz für das Timing der Engine.
 */
export function referenceOnsets(samples: Float32Array, sampleRate: number, noiseFloorRms?: number): number[] {
  const hop = Math.max(16, Math.round(sampleRate * 0.002));
  const win = Math.max(hop, Math.round(sampleRate * 0.01));
  const half = Math.floor(win / 2);
  const env: number[] = [];
  for (let center = 0; center < samples.length; center += hop) {
    const from = Math.max(0, center - half);
    const to = Math.min(samples.length, center + half);
    let sum = 0;
    for (let j = from; j < to; j++) sum += samples[j]! * samples[j]!;
    env.push(Math.sqrt(sum / Math.max(1, to - from)));
  }
  if (env.length === 0) return [];
  const noise = noiseFloorRms ?? percentile(env, 0.1);
  const peak = Math.max(...env);
  const threshold = Math.max(noise * 6, peak * 0.03, 1e-4);
  // Vergleich mit dem Maximum des Pegels 20–60 ms davor: Ein gehaltener oder abklingender Ton löst so
  // nicht erneut aus, ein Anschlag innerhalb weniger ms schon – auch ein leiser auf dem Nachklang eines lauten.
  const nearGap = Math.round(0.02 / 0.002);
  const farGap = Math.round(0.06 / 0.002);
  const minGap = Math.round(0.08 / 0.002);
  const onsets: number[] = [];
  let lastIndex = -minGap;
  for (let i = farGap; i < env.length; i++) {
    const now = env[i]!;
    let before = 0;
    for (let k = i - farGap; k <= i - nearGap; k++) before = Math.max(before, env[k]!);
    if (now > threshold && now > before * 1.4 && now - before > threshold * 0.5 && i - lastIndex >= minGap) {
      // Auf den Beginn des Anstiegs zurückgehen: letzter Punkt, an dem der Pegel noch nahe am Wert davor lag.
      let start = i;
      while (start > 0 && env[start - 1]! > before + (now - before) * 0.15 && i - start < nearGap) start--;
      onsets.push((start * hop) / sampleRate);
      lastIndex = i;
    }
  }
  return onsets;
}

/** Prüftöne: erwartete Töne zuerst, dann Köder (±1, ±2 Halbtöne, ±Oktave), die nicht erwartet sind. */
export function probeSet(expected: readonly ExpectedNote[]): { midis: number[]; expectedCount: number } {
  const expectedMidis = [...new Set(expected.map((e) => e.midi))].sort((a, b) => a - b);
  const expectedSet = new Set(expectedMidis);
  const decoys = new Set<number>();
  for (const m of expectedMidis) for (const d of [-12, -2, -1, 1, 2, 12]) if (!expectedSet.has(m + d) && m + d >= 36 && m + d <= 84) decoys.add(m + d);
  return { midis: [...expectedMidis, ...[...decoys].sort((a, b) => a - b)], expectedCount: expectedMidis.length };
}

/** Lässt die Engine über den Clip laufen und fasst Anschläge zu Ereignissen zusammen. `probes` = erwartete Töne, dann Köder. */
export function extractEvents(clip: BenchmarkClip, probes: readonly number[], expectedCount: number, options: AnalyseOptions = {}): { events: NoteEvent[]; frames: AnalysisFrame[] } {
  const engine = new AnalysisEngine({ sampleRate: clip.sampleRate, noiseFloorRms: clip.noiseFloorRms ?? estimateNoiseFloor(clip.samples, clip.sampleRate) });
  engine.setTargets(probes.slice(0, expectedCount).map((m) => midiToFrequency(m)), probes.slice(expectedCount).map((m) => midiToFrequency(m)));
  const frames: AnalysisFrame[] = [];
  engine.onFrame = (f) => frames.push(f);
  const block = 128;
  for (let i = 0; i < clip.samples.length; i += block) engine.process(clip.samples.subarray(i, Math.min(clip.samples.length, i + block)), i / clip.sampleRate);
  // Nachlauf, damit das letzte Ereignis ein volles Auswertefenster bekommt.
  engine.process(new Float32Array(Math.round(clip.sampleRate * 0.3)), clip.samples.length / clip.sampleRate);

  const mergeSec = options.mergeSec ?? DEFAULTS.mergeSec;
  const windowStart = options.windowStartSec ?? DEFAULTS.windowStartSec;
  const windowEnd = options.windowEndSec ?? DEFAULTS.windowEndSec;
  const onsetTimes: number[] = [];
  for (const f of frames) {
    if (!f.onset) continue;
    const last = onsetTimes[onsetTimes.length - 1];
    if (last !== undefined && f.onsetTime - last < mergeSec) continue;
    onsetTimes.push(f.onsetTime);
  }
  const events: NoteEvent[] = onsetTimes.map((time, index) => {
    const next = onsetTimes[index + 1] ?? Number.POSITIVE_INFINITY;
    const end = Math.min(time + windowEnd, next);
    const inWindow = frames.filter((f) => f.time >= time + windowStart && f.time <= end);
    const presence = probes.map((_, p) => percentile(inWindow.map((f) => f.targets[p]?.score ?? 0), 0.75));
    const pitches = inWindow.filter((f) => f.pitch !== null).map((f) => frequencyToMidi(f.pitch!.hz));
    const rms = percentile(inWindow.map((f) => f.rms), 0.75);
    return { time, pitchMidi: pitches.length >= Math.max(2, inWindow.length * 0.3) ? median(pitches) : null, presence, rms };
  });
  return { events, frames };
}

/** Ob die gemessene Tonhöhe dem erwarteten Ton widerspricht (klar anderer Ton; Oktaven gelten nicht als Widerspruch, die behandelt die Zieltonprüfung). */
function pitchContradicts(pitchMidi: number | null, expectedMidi: number): boolean {
  if (pitchMidi === null) return false;
  const diff = Math.abs(pitchMidi - expectedMidi);
  if (diff <= 0.7) return false;
  if (Math.abs(diff - 12) <= 0.7) return false;
  return true;
}

export function analyseClip(clip: BenchmarkClip, options: AnalyseOptions = {}): ClipResult {
  const threshold = options.presenceThreshold ?? PRESENCE_THRESHOLD;
  const isChord = clip.kind === 'akkord';
  const { midis: probes, expectedCount } = probeSet(clip.expected);
  const { events } = extractEvents(clip, probes, expectedCount, {
    ...options,
    mergeSec: options.mergeSec ?? (isChord ? DEFAULTS.chordMergeSec : DEFAULTS.mergeSec),
    windowStartSec: options.windowStartSec ?? (isChord ? DEFAULTS.chordWindowStartSec : DEFAULTS.windowStartSec),
    windowEndSec: options.windowEndSec ?? (isChord ? DEFAULTS.chordWindowEndSec : DEFAULTS.windowEndSec),
  });
  const notes: string[] = [];
  const durationSec = clip.samples.length / clip.sampleRate;
  const expectedMidis = probes.slice(0, expectedCount);
  const decoyIndices = probes.map((_, i) => i).filter((i) => i >= expectedCount);

  let hits = 0;
  let expectedTotal = 0;
  let falseAlarms = 0;
  let falseAlarmChecks = 0;

  const present = (event: NoteEvent, probeIndex: number): boolean => event.presence[probeIndex]! >= threshold;

  if (clip.kind === 'stille') {
    falseAlarmChecks = Math.max(1, Math.round(durationSec));
    falseAlarms = events.length;
    if (events.length > 0) notes.push(`${events.length} Anschläge in Stille`);
  } else if (isChord) {
    expectedTotal = events.length * expectedCount;
    for (const event of events) {
      for (let p = 0; p < expectedCount; p++) if (present(event, p)) hits++;
      for (const d of decoyIndices) {
        falseAlarmChecks++;
        if (present(event, d)) falseAlarms++;
      }
    }
    if (events.length === 0) notes.push('kein Anschlag erkannt');
  } else if (clip.kind === 'folge') {
    // Erwartete Töne in Reihenfolge; Ereignisse werden gierig zugeordnet (höchstens ein Ton wird übersprungen).
    const sequence = clip.expected.map((e) => e.midi);
    expectedTotal = sequence.length;
    let cursor = 0;
    for (const event of events) {
      const matches = (midi: number): boolean => present(event, probes.indexOf(midi)) && !pitchContradicts(event.pitchMidi, midi);
      if (cursor < sequence.length && matches(sequence[cursor]!)) {
        hits++;
        cursor++;
      } else if (cursor + 1 < sequence.length && matches(sequence[cursor + 1]!)) {
        cursor += 2;
        hits++;
      } else {
        notes.push(`Ereignis bei ${event.time.toFixed(2)} s passt nicht zu Ton ${sequence[cursor] ?? '–'}`);
      }
      // Köder: Töne, die weder der aktuelle noch der nächste erwartete Ton sind.
      for (const d of decoyIndices) {
        falseAlarmChecks++;
        if (present(event, d)) falseAlarms++;
      }
    }
    if (cursor < sequence.length) notes.push(`${sequence.length - cursor} Töne der Folge nicht erkannt`);
  } else {
    // einzelton / frei: jedes Ereignis soll den erwarteten Ton enthalten.
    const target = expectedMidis[0];
    expectedTotal = target === undefined ? 0 : events.length;
    for (const event of events) {
      if (target !== undefined && present(event, 0) && !pitchContradicts(event.pitchMidi, target)) hits++;
      else if (target !== undefined) notes.push(`Ereignis bei ${event.time.toFixed(2)} s: Zielton ${Math.round(event.presence[0]! * 100)} %, Tonhöhe ${event.pitchMidi === null ? '–' : event.pitchMidi.toFixed(1)}`);
      for (const d of decoyIndices) {
        falseAlarmChecks++;
        if (present(event, d)) falseAlarms++;
      }
    }
    if (events.length === 0 && target !== undefined) notes.push('kein Anschlag erkannt');
  }

  // Timing gegen die Offline-Referenz.
  const reference = clip.kind === 'stille' ? [] : referenceOnsets(clip.samples, clip.sampleRate, clip.noiseFloorRms);
  const timingDeltasMs: number[] = [];
  for (const ref of reference) {
    let best: number | null = null;
    for (const event of events) {
      const delta = (event.time - ref) * 1000;
      if (Math.abs(delta) <= 100 && (best === null || Math.abs(delta) < Math.abs(best))) best = delta;
    }
    if (best !== null) timingDeltasMs.push(best);
  }

  return { id: clip.id, label: clip.label, kind: clip.kind, source: clip.source, durationSec, events: events.length, expectedCount: expectedTotal, hits, falseAlarms, falseAlarmChecks, timingDeltasMs, referenceOnsets: reference.length, notes };
}

function rate(hits: number, total: number): number | null {
  return total > 0 ? hits / total : null;
}

function percent(value: number | null): string {
  return value === null ? '–' : `${(value * 100).toFixed(1).replace('.', ',')} %`;
}

export function summarize(results: readonly ClipResult[], source: ClipSource, targets: BenchmarkTargets = BENCHMARK_TARGETS): BenchmarkSummary {
  const own = results.filter((r) => r.source === source);
  const single = own.filter((r) => r.kind === 'einzelton' || r.kind === 'folge');
  const chords = own.filter((r) => r.kind === 'akkord');
  const singleHits = single.reduce((s, r) => s + r.hits, 0);
  const singleExpected = single.reduce((s, r) => s + r.expectedCount, 0);
  const chordHits = chords.reduce((s, r) => s + r.hits, 0);
  const chordChecks = chords.reduce((s, r) => s + r.expectedCount, 0);
  const falseAlarms = own.reduce((s, r) => s + r.falseAlarms, 0);
  const falseAlarmChecks = own.reduce((s, r) => s + r.falseAlarmChecks, 0);
  const deltas = own.flatMap((r) => r.timingDeltasMs);
  const summary: BenchmarkSummary = {
    source,
    clips: own.length,
    singleNoteHitRate: rate(singleHits, singleExpected),
    singleNoteHits: singleHits,
    singleNoteExpected: singleExpected,
    chordHitRate: rate(chordHits, chordChecks),
    chordHits,
    chordChecks,
    falseAlarmRate: rate(falseAlarms, falseAlarmChecks),
    falseAlarms,
    falseAlarmChecks,
    timingMedianAbsMs: median(deltas.map((d) => Math.abs(d))),
    timingMedianSignedMs: median(deltas),
    timingSamples: deltas.length,
    failures: [],
    passed: true,
  };
  if (summary.singleNoteHitRate !== null && summary.singleNoteHitRate < targets.singleNoteHitRate) summary.failures.push(`Einzeltöne ${percent(summary.singleNoteHitRate)} < ${percent(targets.singleNoteHitRate)}`);
  if (summary.chordHitRate !== null && summary.chordHitRate < targets.chordHitRate) summary.failures.push(`Akkorde ${percent(summary.chordHitRate)} < ${percent(targets.chordHitRate)}`);
  if (summary.falseAlarmRate !== null && summary.falseAlarmRate >= targets.falseAlarmRate) summary.failures.push(`Fehlalarme ${percent(summary.falseAlarmRate)} ≥ ${percent(targets.falseAlarmRate)}`);
  if (summary.timingMedianAbsMs !== null && summary.timingMedianAbsMs >= targets.timingMedianMs) summary.failures.push(`Timing ${summary.timingMedianAbsMs.toFixed(1)} ms ≥ ${targets.timingMedianMs} ms`);
  summary.passed = summary.failures.length === 0;
  return summary;
}

/** Lesbarer Bericht (Markdown) für Konsole, CI-Log und `bench-results/`. */
export function formatReport(results: readonly ClipResult[], summaries: readonly BenchmarkSummary[]): string {
  const lines: string[] = ['# Erkennungs-Benchmark', ''];
  for (const s of summaries) {
    lines.push(`## ${s.source === 'echt' ? 'Echte Aufnahmen' : 'Synthetische Clips'} (${s.clips} Clips) – ${s.passed ? 'bestanden' : 'NICHT bestanden'}`);
    lines.push('');
    lines.push('| Kennzahl | Wert | Ziel |', '| --- | --- | --- |');
    lines.push(`| Einzeltöne getroffen | ${percent(s.singleNoteHitRate)} (${s.singleNoteHits}/${s.singleNoteExpected}) | ≥ ${percent(BENCHMARK_TARGETS.singleNoteHitRate)} |`);
    lines.push(`| Akkordtöne getroffen | ${percent(s.chordHitRate)} (${s.chordHits}/${s.chordChecks}) | ≥ ${percent(BENCHMARK_TARGETS.chordHitRate)} |`);
    lines.push(`| Fehlalarme | ${percent(s.falseAlarmRate)} (${s.falseAlarms}/${s.falseAlarmChecks}) | < ${percent(BENCHMARK_TARGETS.falseAlarmRate)} |`);
    lines.push(`| Timing Median | ${s.timingMedianAbsMs === null ? '–' : `${s.timingMedianAbsMs.toFixed(1)} ms`} (Vorzeichen-Median ${s.timingMedianSignedMs === null ? '–' : `${s.timingMedianSignedMs.toFixed(1)} ms`}, ${s.timingSamples} Anschläge) | < ${BENCHMARK_TARGETS.timingMedianMs} ms |`);
    if (s.failures.length > 0) {
      lines.push('');
      for (const f of s.failures) lines.push(`- ❌ ${f}`);
    }
    lines.push('');
    lines.push('| Clip | Art | Ereignisse | Treffer | Fehlalarme | Timing | Hinweise |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const r of results.filter((r) => r.source === s.source)) {
      const timing = median(r.timingDeltasMs.map((d) => Math.abs(d)));
      lines.push(`| ${r.label} | ${r.kind} | ${r.events} | ${r.hits}/${r.expectedCount} | ${r.falseAlarms}/${r.falseAlarmChecks} | ${timing === null ? '–' : `${timing.toFixed(0)} ms (${r.timingDeltasMs.length}/${r.referenceOnsets})`} | ${r.notes.slice(0, 2).join('; ')} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
