import { AnalysisEngine } from '@/core/detection/engine';
import { ANALYSER_PROCESSOR_NAME, type FromWorkletMessage, type ToWorkletMessage } from './messages';

/**
 * AudioWorklet-Prozessor: nimmt das Mikrofonsignal in 128er-Blöcken entgegen, lässt den
 * Analyse-Kern in festen 10-ms-Schritten rechnen und schickt nur Ergebnisse an den Main-Thread.
 * Rohaudio wird ausschließlich während einer Aufnahme (Erkennungs-Labor) übertragen.
 */
class GuitarCoachAnalyser extends AudioWorkletProcessor {
  private readonly engine: AnalysisEngine;
  private recording = false;
  private running = true;

  constructor() {
    super();
    this.engine = new AnalysisEngine({ sampleRate });
    this.engine.onFrame = (frame) => this.post({ type: 'frame', frame });
    this.port.onmessage = (event: MessageEvent<ToWorkletMessage>) => this.handle(event.data);
    this.post({ type: 'ready', sampleRate });
  }

  override process(inputs: Float32Array[][]): boolean {
    if (!this.running) return false;
    const channel = inputs[0]?.[0];
    if (!channel || channel.length === 0) return true;
    const start = currentTime;
    this.engine.process(channel, start);
    if (this.recording) {
      const copy = new Float32Array(channel);
      this.port.postMessage({ type: 'audio', samples: copy, time: start } satisfies FromWorkletMessage, [copy.buffer]);
    }
    return true;
  }

  private handle(message: ToWorkletMessage): void {
    switch (message.type) {
      case 'targets':
        this.engine.setTargets(message.hz, message.decoys ?? []);
        break;
      case 'noiseFloor':
        this.engine.setNoiseFloor(message.rms);
        break;
      case 'recording':
        this.recording = message.enabled;
        break;
      case 'reset':
        this.engine.reset();
        break;
      case 'stop':
        this.running = false;
        break;
    }
  }

  private post(message: FromWorkletMessage): void {
    this.port.postMessage(message);
  }
}

registerProcessor(ANALYSER_PROCESSOR_NAME, GuitarCoachAnalyser);
