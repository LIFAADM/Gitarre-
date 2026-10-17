import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { getEngine, type AudioEngine } from '@/core/audio/engine';
import type { PlayerSnapshot } from '@/core/audio/tabPlayer';
import type { MetronomeState } from '@/core/audio/metronome';
import { isAudioUnlocked, subscribeAudioState, unlockAudio } from '@/core/audio/audioContext';
import { getSettings, subscribeSettings } from '@/core/storage/settings';

/** Zugriff auf die Audio-Engine (lazy erzeugt; Lautstärken folgen den Einstellungen). */
export function useEngine(): AudioEngine {
  const engine = useMemo(() => getEngine(), []);
  useEffect(() => {
    const apply = (): void => {
      const s = getSettings();
      engine.synth.setVolume(s.synthVolume);
      engine.metronome.setVolume(s.metronomeVolume);
      engine.setClickVolume(s.metronomeVolume);
    };
    apply();
    return subscribeSettings(apply);
  }, [engine]);
  return engine;
}

export function usePlayerSnapshot(): PlayerSnapshot {
  const engine = useEngine();
  const [snapshot, setSnapshot] = useState<PlayerSnapshot>(() => engine.player.snapshot());
  useEffect(() => engine.player.subscribe(setSnapshot), [engine]);
  return snapshot;
}

export function useMetronomeState(): MetronomeState {
  const engine = useEngine();
  const [state, setState] = useState<MetronomeState>(() => engine.metronome.getState());
  useEffect(() => engine.metronome.subscribe(setState), [engine]);
  return state;
}

/** Ob Audio bereits freigeschaltet ist; `unlock` aus einem Klick-Handler aufrufen. */
export function useAudioUnlock(): { unlocked: boolean; unlock: () => Promise<void> } {
  const unlocked = useSyncExternalStore(subscribeAudioState, isAudioUnlocked, () => false);
  return {
    unlocked,
    unlock: async () => {
      await unlockAudio();
    },
  };
}
