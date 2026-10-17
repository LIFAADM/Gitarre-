import { getAudioContext } from './audioContext';
import { GuitarSynth } from './guitarSynth';
import { Metronome, playClick } from './metronome';
import { TabPlayer } from './tabPlayer';

/**
 * Gemeinsame Audio-Engine der App (Singleton): ein AudioContext, ein Gitarren-Synth,
 * ein Metronom und ein Tab-Player.
 */
export interface AudioEngine {
  ctx: AudioContext;
  synth: GuitarSynth;
  metronome: Metronome;
  player: TabPlayer;
  setClickVolume(volume: number): void;
}

let engine: AudioEngine | null = null;

export function getEngine(): AudioEngine {
  if (engine) return engine;
  const ctx = getAudioContext();
  const synth = new GuitarSynth(ctx);
  const metronome = new Metronome(ctx);
  let clickVolume = 0.7;
  const player = new TabPlayer({
    clock: { now: () => ctx.currentTime },
    sink: {
      noteOn: (ev, time, scaledDuration) => {
        const letRing = ev.techniques.includes('let-ring');
        synth.noteOn(ev.midi, time, {
          velocity: ev.velocity,
          string: ev.string,
          techniques: ev.techniques,
          maxDurationSec: letRing ? undefined : Math.max(0.35, scaledDuration + 0.15),
        });
      },
      damp: (time) => synth.dampAll(time, 0.03),
      click: (time, accent) => playClick(ctx, time, accent, clickVolume),
      stopAll: () => synth.panic(),
    },
  });
  engine = {
    ctx,
    synth,
    metronome,
    player,
    setClickVolume: (v: number) => {
      clickVolume = Math.min(1, Math.max(0, v));
    },
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Im Hintergrund pausieren (Akku, iOS-Audio-Unterbrechung)
        if (player.getStatus() === 'playing' || player.getStatus() === 'counting') player.pause();
        if (metronome.getState().running) metronome.stop();
      }
    });
  }
  return engine;
}

/** Nur für Tests/Debugging: Engine zurücksetzen. */
export function resetEngineForTests(): void {
  engine = null;
}
