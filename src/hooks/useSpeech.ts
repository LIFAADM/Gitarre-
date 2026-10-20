import { isSpeechSupported, speak, type SpeakOptions } from '@/core/speech/speech';
import { getSettings } from '@/core/storage/settings';

/** Einziger verbliebener Sprachbereich: der optionale gesprochene Einzähler. */
export type SpeechScope = 'countIn';

/** Spricht `text`, wenn der gesprochene Einzähler eingeschaltet ist und der Browser Sprachausgabe bietet. */
export function sayNow(scope: SpeechScope, text: string, options: SpeakOptions = {}): Promise<boolean> {
  if (scope !== 'countIn' || !isSpeechSupported() || !getSettings().spokenCountIn) return Promise.resolve(false);
  return speak(text, options);
}
