import { midiToFrequency } from '../music/notes';
import type { Technique } from '../music/score';
import { defaultT60ForMidi, renderDeadNote, renderPluck } from './pluckSynthesis';

/**
 * Gitarren-Synthesizer auf Basis vorgerenderter Karplus-Strong-Zupfklänge.
 * Jede Saite verwaltet ihre aktive Stimme: ein neuer Anschlag auf derselben Saite dämpft den alten Ton,
 * so wie es auf einer echten Gitarre passiert.
 */

export interface NoteOnOptions {
  velocity?: number;
  /** Saite 1–6 (für realistische Dämpfung); ohne Angabe wird nicht gedämpft. */
  string?: number;
  techniques?: Technique[];
  /** Maximale Klingdauer in Sekunden (danach Ausblenden). */
  maxDurationSec?: number;
}

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  string: number | null;
  startTime: number;
  stopped: boolean;
}

const MAX_CACHE = 36;

export class GuitarSynth {
  readonly output: GainNode;
  private readonly ctx: AudioContext;
  private readonly cache = new Map<number, AudioBuffer>();
  private readonly cacheOrder: number[] = [];
  private deadBuffer: AudioBuffer | null = null;
  private readonly voices = new Set<Voice>();
  private readonly lastVoiceByString = new Map<number, Voice>();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 0.9;

    // Klangkette: Tiefpass (nylon-typisch weich) → leichte Körperresonanz → Kompressor
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 5200;
    lowpass.Q.value = 0.6;
    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 115;
    body.Q.value = 1.1;
    body.gain.value = 2.5;
    const body2 = ctx.createBiquadFilter();
    body2.type = 'peaking';
    body2.frequency.value = 230;
    body2.Q.value = 1.4;
    body2.gain.value = 1.5;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;
    this.output.connect(lowpass);
    lowpass.connect(body);
    body.connect(body2);
    body2.connect(compressor);
    compressor.connect(ctx.destination);
  }

  setVolume(volume: number): void {
    this.output.gain.setTargetAtTime(Math.max(0, Math.min(1.5, volume)), this.ctx.currentTime, 0.02);
  }

  /** Puffer für einen MIDI-Ton (gecacht). */
  bufferForMidi(midi: number): AudioBuffer {
    const cached = this.cache.get(midi);
    if (cached) return cached;
    const seconds = midi < 52 ? 2.6 : midi < 64 ? 2.2 : 1.8;
    const t60 = defaultT60ForMidi(midi);
    const data = renderPluck(midiToFrequency(midi), this.ctx.sampleRate, { seconds, t60 });
    const buffer = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate);
    buffer.copyToChannel(data, 0);
    this.cache.set(midi, buffer);
    this.cacheOrder.push(midi);
    if (this.cacheOrder.length > MAX_CACHE) {
      const oldest = this.cacheOrder.shift();
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return buffer;
  }

  /** Bereitet die Puffer für mehrere Töne vor (z. B. beim Laden eines Songs). */
  preload(midis: Iterable<number>): void {
    for (const m of midis) this.bufferForMidi(m);
  }

  /** Spielt einen Ton zum Zeitpunkt `when` (AudioContext-Zeit). */
  noteOn(midi: number, when: number, options: NoteOnOptions = {}): void {
    const techniques = options.techniques ?? [];
    const t = Math.max(when, this.ctx.currentTime);
    if (options.string !== undefined) this.dampString(options.string, t);

    const isDead = techniques.includes('dead');
    const buffer = isDead ? this.deadNoteBuffer() : this.bufferForMidi(midi);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    const velocity = Math.max(0.05, Math.min(1, options.velocity ?? 0.85));
    const level = isDead ? velocity * 0.5 : velocity;
    gain.gain.setValueAtTime(level, t);

    if (techniques.includes('palm-mute')) {
      gain.gain.setTargetAtTime(0.0001, t + 0.02, 0.08);
    } else if (techniques.includes('staccato')) {
      gain.gain.setTargetAtTime(0.0001, t + 0.08, 0.03);
    }
    if (options.maxDurationSec !== undefined && options.maxDurationSec > 0) {
      const end = t + options.maxDurationSec;
      gain.gain.setTargetAtTime(0.0001, end, 0.04);
    }

    source.connect(gain);
    gain.connect(this.output);
    source.start(t);
    const voice: Voice = { source, gain, string: options.string ?? null, startTime: t, stopped: false };
    this.voices.add(voice);
    if (voice.string !== null) this.lastVoiceByString.set(voice.string, voice);
    source.onended = () => {
      voice.stopped = true;
      this.voices.delete(voice);
      source.disconnect();
      gain.disconnect();
    };
  }

  /** Dämpft den aktuell klingenden Ton einer Saite (Fade 25 ms). */
  dampString(string: number, when: number): void {
    const voice = this.lastVoiceByString.get(string);
    if (voice && !voice.stopped) this.fadeVoice(voice, when, 0.02);
  }

  /** Dämpft alle klingenden Töne (z. B. bei Pausen oder Stopp). */
  dampAll(when: number = this.ctx.currentTime, fadeSeconds = 0.03): void {
    for (const voice of this.voices) if (!voice.stopped) this.fadeVoice(voice, when, fadeSeconds);
  }

  /** Stoppt sofort alles (auch bereits geplante Töne). */
  panic(): void {
    const now = this.ctx.currentTime;
    for (const voice of this.voices) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(0, now);
        voice.source.stop(now + 0.01);
      } catch {
        // bereits beendet
      }
    }
    this.voices.clear();
    this.lastVoiceByString.clear();
  }

  get activeVoices(): number {
    return this.voices.size;
  }

  private fadeVoice(voice: Voice, when: number, fadeSeconds: number): void {
    const t = Math.max(when, this.ctx.currentTime, voice.startTime);
    try {
      voice.gain.gain.cancelScheduledValues(t);
      voice.gain.gain.setTargetAtTime(0.0001, t, fadeSeconds);
      voice.source.stop(t + fadeSeconds * 6 + 0.05);
    } catch {
      // Quelle wurde evtl. schon gestoppt
    }
  }

  private deadNoteBuffer(): AudioBuffer {
    if (!this.deadBuffer) {
      const data = renderDeadNote(this.ctx.sampleRate);
      this.deadBuffer = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate);
      this.deadBuffer.copyToChannel(data, 0);
    }
    return this.deadBuffer;
  }
}

/**
 * Reiner Referenzton (Sinus mit leichtem Oberton) – für das Stimmgerät,
 * weil hier eine exakte, obertonarme Frequenz wichtiger ist als Realismus.
 */
export function playReferenceTone(ctx: AudioContext, frequencyHz: number, seconds = 2.5, volume = 0.5): () => void {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.02);
  gain.gain.setValueAtTime(volume, now + seconds - 0.3);
  gain.gain.linearRampToValueAtTime(0, now + seconds);
  gain.connect(ctx.destination);
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = frequencyHz;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = frequencyHz * 2;
  const g2 = ctx.createGain();
  g2.gain.value = 0.18;
  osc1.connect(gain);
  osc2.connect(g2);
  g2.connect(gain);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + seconds + 0.05);
  osc2.stop(now + seconds + 0.05);
  return () => {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0, t, 0.02);
    osc1.stop(t + 0.2);
    osc2.stop(t + 0.2);
  };
}
