/**
 * Kopfhörer- und Sperrbildschirm-Steuerung über die Media Session API.
 *
 * iOS zeigt Medien-Steuerung (und reicht Kopfhörer-Tasten weiter) nur, wenn ein `<audio>`-Element spielt –
 * Web Audio allein genügt nicht. Deshalb läuft während der Wiedergabe eine stumme Audioschleife mit.
 * Das Verhalten ist auf echten Geräten nicht automatisiert prüfbar und daher als „experimentell“ gekennzeichnet.
 */

export interface MediaSessionHandlers {
  play: () => void;
  pause: () => void;
  stop?: () => void;
  previous?: () => void;
  next?: () => void;
}

let silent: HTMLAudioElement | null = null;
let silentUrl: string | null = null;

export function isMediaSessionSupported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof Audio !== 'undefined';
}

/** Eine Sekunde Stille als WAV (8 kHz, 8 Bit, mono) – klein genug, um sie zur Laufzeit zu erzeugen. */
export function buildSilentWav(seconds = 1, sampleRate = 8000): Uint8Array {
  const samples = Math.max(1, Math.round(seconds * sampleRate));
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // Byte-Rate (8 Bit mono)
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, 'data');
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // 8-Bit-PCM: 128 = Nulllinie
  return bytes;
}

function silentElement(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (silent) return silent;
  const wav = buildSilentWav();
  silentUrl = URL.createObjectURL(new Blob([wav.buffer as ArrayBuffer], { type: 'audio/wav' }));
  const el = new Audio(silentUrl);
  el.loop = true;
  el.volume = 0.01;
  el.setAttribute('playsinline', '');
  silent = el;
  return el;
}

const ACTIONS: (keyof MediaSessionHandlers)[] = ['play', 'pause', 'stop', 'previous', 'next'];
const ACTION_NAMES: Record<keyof MediaSessionHandlers, MediaSessionAction> = { play: 'play', pause: 'pause', stop: 'stop', previous: 'previoustrack', next: 'nexttrack' };

/** Registriert Titel und Tasten-Handler. Liefert eine Funktion zum Abmelden. */
export function startMediaSession(meta: { title: string; artist?: string }, handlers: MediaSessionHandlers): () => void {
  if (!isMediaSessionSupported()) return () => undefined;
  const session = navigator.mediaSession;
  try {
    session.metadata = new MediaMetadata({ title: meta.title, artist: meta.artist ?? 'GuitarCoach', album: 'GuitarCoach' });
  } catch {
    // MediaMetadata nicht verfügbar
  }
  for (const key of ACTIONS) {
    const handler = handlers[key];
    try {
      session.setActionHandler(ACTION_NAMES[key], handler ? () => handler() : null);
    } catch {
      // Aktion wird nicht unterstützt
    }
  }
  return () => {
    for (const key of ACTIONS) {
      try {
        session.setActionHandler(ACTION_NAMES[key], null);
      } catch {
        // ignorieren
      }
    }
    setMediaPlaybackState('none');
  };
}

/** Spiegelt den Transportzustand; startet bzw. pausiert die stumme Schleife, die iOS für die Steuerung braucht. */
export function setMediaPlaybackState(state: 'playing' | 'paused' | 'none'): void {
  if (!isMediaSessionSupported()) return;
  try {
    navigator.mediaSession.playbackState = state;
  } catch {
    // ignorieren
  }
  const el = silentElement();
  if (!el) return;
  if (state === 'playing') {
    el.play().catch(() => undefined);
  } else {
    el.pause();
    if (state === 'none') el.currentTime = 0;
  }
}
