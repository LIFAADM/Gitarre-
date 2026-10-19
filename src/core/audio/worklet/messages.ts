import type { AnalysisFrame } from '@/core/detection/engine';

/** Nachrichten Main-Thread → Worklet. */
export type ToWorkletMessage =
  | { type: 'targets'; hz: number[] }
  | { type: 'noiseFloor'; rms: number }
  | { type: 'recording'; enabled: boolean }
  | { type: 'reset' }
  | { type: 'stop' };

/** Nachrichten Worklet → Main-Thread: nur Ergebnisse, Rohaudio nur bei laufender Aufnahme. */
export type FromWorkletMessage =
  | { type: 'frame'; frame: AnalysisFrame }
  | { type: 'audio'; samples: Float32Array; time: number }
  | { type: 'ready'; sampleRate: number };

export const ANALYSER_PROCESSOR_NAME = 'guitarcoach-analyser';
