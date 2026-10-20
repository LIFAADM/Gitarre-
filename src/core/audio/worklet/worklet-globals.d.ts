/**
 * Globale Typen des AudioWorklet-Prozessor-Kontexts (nicht in lib.dom enthalten).
 * Gilt nur für `analyser.worklet.ts`; im Main-Thread existieren diese Namen nicht.
 */
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

declare function registerProcessor(name: string, processorCtor: new () => AudioWorkletProcessor): void;

/** Abtastrate des AudioContext (Worklet-Kontext). */
declare const sampleRate: number;
/** Aktuelle Zeit des AudioContext in Sekunden (Worklet-Kontext). */
declare const currentTime: number;
