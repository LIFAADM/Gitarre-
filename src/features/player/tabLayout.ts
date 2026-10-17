import type { BeatRef, PlaybackPlan } from '@/core/music/playback';

/**
 * Layout-Berechnung für die Tabulatur-Darstellung (reine Funktion, testbar):
 * Beats erhalten Breiten proportional (logarithmisch) zu ihrer Dauer, Takte werden
 * in Zeilen („Systeme“) umbrochen und auf die verfügbare Breite gestreckt.
 */

export interface TabMetrics {
  zoom: number;
  stringGap: number;
  topPad: number;
  bottomPad: number;
  fontSize: number;
  barPadLeft: number;
  barPadRight: number;
  timeSigWidth: number;
  margin: number;
  systemGap: number;
}

export interface BeatLayout {
  beatRef: number;
  voice: number;
  x: number;
  width: number;
}

export interface BarLayout {
  instanceIndex: number;
  barIndex: number;
  x: number;
  width: number;
  beats: BeatLayout[];
  showTimeSignature: boolean;
  timeSignature: { numerator: number; denominator: number };
  tempo?: number;
}

export interface SystemLayout {
  index: number;
  bars: BarLayout[];
  width: number;
  height: number;
  /** Erste Takt-Instanz des Systems (für Auto-Scroll). */
  firstInstance: number;
  lastInstance: number;
}

export interface TabLayout {
  systems: SystemLayout[];
  metrics: TabMetrics;
  /** beatRef → Position. */
  beatPositions: Map<number, { system: number; x: number; width: number }>;
  instanceSystems: Map<number, number>;
}

export function makeMetrics(zoom: number): TabMetrics {
  const z = Math.min(2, Math.max(0.6, zoom));
  return {
    zoom: z,
    stringGap: 14 * z,
    topPad: 46 * z,
    bottomPad: 50 * z,
    fontSize: 13 * z,
    barPadLeft: 14 * z,
    barPadRight: 8 * z,
    timeSigWidth: 26 * z,
    margin: 6,
    systemGap: 18 * z,
  };
}

/** Breite eines Beats (Pixel bei zoom 1) abhängig von Dauer und Ziffernanzahl. */
export function beatBaseWidth(durationTicks: number, maxDigits: number, isRest: boolean): number {
  const log = Math.log2(Math.max(60, durationTicks) / 240);
  let w = 20 + 11 * log;
  w = Math.min(72, Math.max(18, w));
  if (maxDigits >= 2) w = Math.max(w, 26);
  if (isRest) w *= 0.9;
  return w;
}

export function systemHeight(m: TabMetrics): number {
  return m.topPad + m.stringGap * 5 + m.bottomPad;
}

export function stringY(m: TabMetrics, stringNumber: number): number {
  return m.topPad + (stringNumber - 1) * m.stringGap;
}

function beatsOfInstance(plan: PlaybackPlan, instanceIndex: number): BeatRef[] {
  // plan.beats ist nach Tick sortiert; Instanzen sind zusammenhängend
  const result: BeatRef[] = [];
  for (const b of plan.beats) {
    if (b.instanceIndex === instanceIndex) result.push(b);
    else if (result.length > 0 && b.instanceIndex > instanceIndex) break;
  }
  return result;
}

export function layoutTab(plan: PlaybackPlan, options: { width: number; zoom: number }): TabLayout {
  const m = makeMetrics(options.zoom);
  const available = Math.max(160, options.width - 2 * m.margin);
  const z = m.zoom;

  interface PendingBar {
    instanceIndex: number;
    barIndex: number;
    naturalWidth: number;
    contentWidth: number;
    columns: Array<{ tick: number; width: number; beats: BeatRef[] }>;
    showTimeSignature: boolean;
    timeSignature: { numerator: number; denominator: number };
    tempo?: number;
  }

  const pending: PendingBar[] = [];
  let prevTs: string | null = null;
  let prevTempo: number | null = null;
  for (const inst of plan.barInstances) {
    const beats = beatsOfInstance(plan, inst.instanceIndex);
    // Spalten: Beats verschiedener Stimmen mit gleichem Tick teilen sich eine Spalte
    const columns = new Map<number, { tick: number; width: number; beats: BeatRef[] }>();
    for (const b of beats) {
      const digits = Math.max(1, ...b.beat.notes.map((n) => String(n.fret).length));
      const w = beatBaseWidth(b.endTick - b.tick, digits, b.isRest) * z;
      const col = columns.get(b.tick);
      if (col) {
        col.width = Math.max(col.width, w);
        col.beats.push(b);
      } else columns.set(b.tick, { tick: b.tick, width: w, beats: [b] });
    }
    const cols = [...columns.values()].sort((a, b) => a.tick - b.tick);
    const tsKey = `${inst.timeSignature.numerator}/${inst.timeSignature.denominator}`;
    const showTs = prevTs !== tsKey;
    prevTs = tsKey;
    const contentWidth = cols.reduce((s, c) => s + c.width, 0);
    const bar: PendingBar = {
      instanceIndex: inst.instanceIndex,
      barIndex: inst.barIndex,
      naturalWidth: m.barPadLeft + (showTs ? m.timeSigWidth : 0) + contentWidth + m.barPadRight,
      contentWidth,
      columns: cols,
      showTimeSignature: showTs,
      timeSignature: inst.timeSignature,
    };
    if (prevTempo !== inst.tempo) {
      bar.tempo = inst.tempo;
      prevTempo = inst.tempo;
    }
    pending.push(bar);
  }

  // Umbruch in Systeme
  const systems: SystemLayout[] = [];
  const beatPositions = new Map<number, { system: number; x: number; width: number }>();
  const instanceSystems = new Map<number, number>();
  let current: PendingBar[] = [];
  let currentWidth = 0;
  const flush = (isLast: boolean): void => {
    if (current.length === 0) return;
    const natural = current.reduce((s, b) => s + b.naturalWidth, 0);
    const shouldJustify = !isLast || natural > available * 0.7;
    const scale = shouldJustify ? available / natural : natural > available ? available / natural : 1;
    const sysIndex = systems.length;
    let x = m.margin;
    const bars: BarLayout[] = [];
    for (const pb of current) {
      const width = pb.naturalWidth * scale;
      const fixed = m.barPadLeft + (pb.showTimeSignature ? m.timeSigWidth : 0) + m.barPadRight;
      const contentScale = pb.contentWidth > 0 ? Math.max(0.2, (width - fixed) / pb.contentWidth) : 1;
      let bx = x + m.barPadLeft + (pb.showTimeSignature ? m.timeSigWidth : 0);
      const beats: BeatLayout[] = [];
      for (const col of pb.columns) {
        const cw = col.width * contentScale;
        for (const b of col.beats) {
          beats.push({ beatRef: b.index, voice: b.voice, x: bx, width: cw });
          beatPositions.set(b.index, { system: sysIndex, x: bx, width: cw });
        }
        bx += cw;
      }
      const barLayout: BarLayout = {
        instanceIndex: pb.instanceIndex,
        barIndex: pb.barIndex,
        x,
        width,
        beats,
        showTimeSignature: pb.showTimeSignature,
        timeSignature: pb.timeSignature,
      };
      if (pb.tempo !== undefined) barLayout.tempo = pb.tempo;
      bars.push(barLayout);
      instanceSystems.set(pb.instanceIndex, sysIndex);
      x += width;
    }
    systems.push({
      index: sysIndex,
      bars,
      width: Math.max(available, x - m.margin) + 2 * m.margin,
      height: systemHeight(m),
      firstInstance: current[0]!.instanceIndex,
      lastInstance: current[current.length - 1]!.instanceIndex,
    });
    current = [];
    currentWidth = 0;
  };
  for (const pb of pending) {
    if (current.length > 0 && currentWidth + pb.naturalWidth > available) flush(false);
    current.push(pb);
    currentWidth += pb.naturalWidth;
  }
  flush(true);

  return { systems, metrics: m, beatPositions, instanceSystems };
}
