/**
 * Mikrofonzugriff: Unterstützung prüfen, Stream anfordern, Fehler verständlich übersetzen.
 * Die Analyse selbst läuft in `micWorklet.ts` (AudioWorklet).
 *
 * `echoCancellation`, `noiseSuppression` und `autoGainControl` bleiben aus – sie würden
 * Gitarrentöne verfälschen (Pegelsprünge, weggefilterte Obertöne).
 */

export const MIC_MESSAGES = {
  denied: 'Der Mikrofonzugriff wurde verweigert. Bitte erlaube GuitarCoach den Zugriff in den Safari-/iOS-Einstellungen.',
  notFound: 'Es wurde kein Mikrofon gefunden.',
  busy: 'Das Mikrofon wird gerade von einer anderen App verwendet.',
  insecure: 'Der Mikrofonzugriff funktioniert nur über HTTPS oder localhost.',
  unsupported: 'Dieser Browser unterstützt keinen Mikrofonzugriff.',
  unsupportedWorklet: 'Dieser Browser unterstützt die Audio-Analyse (AudioWorklet) nicht. Bitte iOS/Safari aktualisieren.',
  interrupted: 'Die Mikrofonaufnahme wurde unterbrochen (z. B. durch einen Anruf). Bitte starte das Mikrofon erneut.',
  generic: 'Das Mikrofon konnte nicht gestartet werden. Bitte versuche es erneut.',
} as const;

export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
  video: false,
};

/** Ob dieser Browser getUserMedia anbietet. */
export function isMicrophoneSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
}

/** Ob AudioWorklet verfügbar ist (iOS ab 14.5, alle aktuellen Browser). */
export function isAudioWorkletSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return !!Ctor && 'audioWorklet' in Ctor.prototype && typeof AudioWorkletNode !== 'undefined';
}

export function isSecure(): boolean {
  return typeof window === 'undefined' || window.isSecureContext !== false;
}

export function namedError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

function errorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (typeof error === 'object' && error !== null && 'name' in error) return String((error as { name: unknown }).name);
  return '';
}

/** Übersetzt Fehler von getUserMedia in verständliche deutsche Hinweise. */
export function describeMicError(error: unknown): string {
  switch (errorName(error)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'PermissionDismissedError':
      return MIC_MESSAGES.denied;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return MIC_MESSAGES.notFound;
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return MIC_MESSAGES.busy;
    case 'SecurityError':
      return isSecure() ? MIC_MESSAGES.denied : MIC_MESSAGES.insecure;
    case 'NotSupportedError':
      return error instanceof Error && error.message === MIC_MESSAGES.unsupportedWorklet ? MIC_MESSAGES.unsupportedWorklet : MIC_MESSAGES.unsupported;
    default:
      break;
  }
  if (!isSecure()) return MIC_MESSAGES.insecure;
  if (!isMicrophoneSupported()) return MIC_MESSAGES.unsupported;
  if (error instanceof Error && error.message) return `${MIC_MESSAGES.generic} (${error.message})`;
  return MIC_MESSAGES.generic;
}

/** Fordert den Mikrofon-Stream mit ausgeschalteter Signalaufbereitung an. */
export async function requestMicStream(): Promise<MediaStream> {
  if (!isSecure()) throw namedError('SecurityError', MIC_MESSAGES.insecure);
  if (!isMicrophoneSupported()) throw namedError('NotSupportedError', MIC_MESSAGES.unsupported);
  return navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
}
