import type { AnalysisFrame } from '@/core/detection/engine';
import { MIC_MESSAGES, isAudioWorkletSupported, namedError, requestMicStream } from './mic';
import { ANALYSER_PROCESSOR_NAME, type FromWorkletMessage, type ToWorkletMessage } from './worklet/messages';
import analyserWorkletUrl from './worklet/analyser.worklet?worker&url';

/**
 * Mikrofon-Kette: getUserMedia → MediaStreamAudioSourceNode → AudioWorkletNode (Analyse-Kern).
 *
 * Der Worklet-Knoten wird über einen stummen GainNode mit dem Ausgang verbunden, damit alle
 * Browser ihn zuverlässig takten – hörbar ist nichts (Verstärkung 0, keine Rückkopplung).
 * Ergebnisse kommen als `AnalysisFrame` (alle 10 ms); Rohaudio nur bei eingeschalteter Aufnahme.
 */

export interface AudioChunk {
  samples: Float32Array;
  /** Zeitpunkt des ersten Samples (AudioContext-Uhr). */
  time: number;
}

const moduleLoaded = new WeakMap<AudioContext, Promise<void>>();

function loadModule(ctx: AudioContext): Promise<void> {
  let promise = moduleLoaded.get(ctx);
  if (!promise) {
    promise = ctx.audioWorklet.addModule(analyserWorkletUrl).catch((error: unknown) => {
      moduleLoaded.delete(ctx);
      throw error;
    });
    moduleLoaded.set(ctx, promise);
  }
  return promise;
}

export class MicAnalyser {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;
  private generation = 0;
  private starting = false;
  private targets: number[] = [];
  private noiseFloor = 0;
  private recording = false;

  onFrame: ((frame: AnalysisFrame) => void) | null = null;
  onAudio: ((chunk: AudioChunk) => void) | null = null;
  /** Wird aufgerufen, wenn das System die Aufnahme beendet (z. B. Anruf, andere App). */
  onEnded: (() => void) | null = null;

  get isRunning(): boolean {
    return this.node !== null;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 0;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Fordert das Mikrofon an und baut die Kette auf. Vorher `unlockAudio()` aus einem Klick-Handler aufrufen (iOS). */
  async start(ctx: AudioContext): Promise<void> {
    if (this.isRunning || this.starting) return;
    if (!isAudioWorkletSupported()) throw namedError('NotSupportedError', MIC_MESSAGES.unsupportedWorklet);
    this.starting = true;
    const generation = this.generation;
    let stream: MediaStream | null = null;
    try {
      await loadModule(ctx);
      stream = await requestMicStream();
      if (generation !== this.generation) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      const node = new AudioWorkletNode(ctx, ANALYSER_PROCESSOR_NAME, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 1, channelCountMode: 'explicit' });
      node.port.onmessage = (event: MessageEvent<FromWorkletMessage>) => this.handle(event.data);
      const source = ctx.createMediaStreamSource(stream);
      const sink = ctx.createGain();
      sink.gain.value = 0;
      source.connect(node);
      node.connect(sink);
      sink.connect(ctx.destination);
      this.ctx = ctx;
      this.stream = stream;
      this.source = source;
      this.node = node;
      this.sink = sink;
      for (const track of stream.getAudioTracks()) track.addEventListener('ended', this.handleTrackEnded);
      this.send({ type: 'targets', hz: this.targets });
      this.send({ type: 'noiseFloor', rms: this.noiseFloor });
      this.send({ type: 'recording', enabled: this.recording });
    } catch (error) {
      if (stream) for (const track of stream.getTracks()) track.stop();
      throw error;
    } finally {
      this.starting = false;
    }
  }

  /** Zieltöne (Hz) für die erwartungsgeführte Prüfung – auch vor dem Start setzbar. */
  setTargets(hz: readonly number[]): void {
    this.targets = [...hz];
    this.send({ type: 'targets', hz: this.targets });
  }

  setNoiseFloor(rms: number): void {
    this.noiseFloor = rms;
    this.send({ type: 'noiseFloor', rms });
  }

  /** Rohaudio mitschicken (Erkennungs-Labor). */
  setRecording(enabled: boolean): void {
    this.recording = enabled;
    this.send({ type: 'recording', enabled });
  }

  reset(): void {
    this.send({ type: 'reset' });
  }

  /** Beendet die Aufnahme vollständig (danach verschwindet auch die Mikrofon-Anzeige von iOS). */
  stop(): void {
    this.generation++;
    this.send({ type: 'stop' });
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.removeEventListener('ended', this.handleTrackEnded);
        track.stop();
      }
    }
    for (const node of [this.source, this.node, this.sink]) {
      try {
        node?.disconnect();
      } catch {
        // bereits getrennt
      }
    }
    if (this.node) this.node.port.onmessage = null;
    this.stream = null;
    this.source = null;
    this.node = null;
    this.sink = null;
    this.ctx = null;
  }

  private send(message: ToWorkletMessage): void {
    this.node?.port.postMessage(message);
  }

  private handle(message: FromWorkletMessage): void {
    if (message.type === 'frame') this.onFrame?.(message.frame);
    else if (message.type === 'audio') this.onAudio?.({ samples: message.samples, time: message.time });
  }

  private readonly handleTrackEnded = (): void => {
    if (!this.isRunning) return;
    this.stop();
    this.onEnded?.();
  };
}
