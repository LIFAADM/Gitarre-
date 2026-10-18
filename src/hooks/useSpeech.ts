import { useSyncExternalStore } from 'react';
import { cancelSpeech, isSpeaking, isSpeechSupported, speak, subscribeSpeaking, type SpeakOptions } from '@/core/speech/speech';
import { getSettings, type AppSettings } from '@/core/storage/settings';
import { useSettings } from './useSettings';

/** Bereiche, in denen die App spricht – einzeln abschaltbar in den Einstellungen. */
export type SpeechScope = 'lessons' | 'tuner' | 'listen' | 'countIn' | 'player' | 'tips';

const SCOPE_KEY: Record<SpeechScope, keyof AppSettings> = {
  lessons: 'speechLessons',
  tuner: 'speechTuner',
  listen: 'speechListen',
  countIn: 'speechCountIn',
  player: 'speechPlayer',
  tips: 'speechTips',
};

export function speechScopeEnabled(scope: SpeechScope | null, settings: AppSettings = getSettings()): boolean {
  if (!isSpeechSupported() || !settings.speechEnabled) return false;
  return scope === null || Boolean(settings[SCOPE_KEY[scope]]);
}

/**
 * Spricht `text`, wenn die Sprachbegleitung (und der Bereich) eingeschaltet ist. Liest die Einstellungen
 * zum Zeitpunkt des Aufrufs, hat daher eine stabile Identität und kann gefahrlos in Effekten verwendet werden.
 */
export function sayNow(scope: SpeechScope | null, text: string, options: SpeakOptions = {}): Promise<boolean> {
  const s = getSettings();
  if (!speechScopeEnabled(scope, s)) return Promise.resolve(false);
  return speak(text, { rate: s.speechRate, voiceURI: s.speechVoiceURI || null, ...options });
}

export interface SpeechApi {
  supported: boolean;
  /** Hauptschalter an und Browser unterstützt Sprachausgabe. */
  enabled: boolean;
  speaking: boolean;
  say: typeof sayNow;
  cancel: () => void;
  scopeOn: (scope: SpeechScope) => boolean;
}

export function useSpeech(): SpeechApi {
  const [settings] = useSettings();
  const speaking = useSyncExternalStore(subscribeSpeaking, isSpeaking, () => false);
  const supported = isSpeechSupported();
  return {
    supported,
    enabled: supported && settings.speechEnabled,
    speaking,
    say: sayNow,
    cancel: cancelSpeech,
    scopeOn: (scope) => speechScopeEnabled(scope, settings),
  };
}
