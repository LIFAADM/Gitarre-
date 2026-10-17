/**
 * Zentrale Verwaltung des AudioContext.
 *
 * iOS/Safari erlaubt Audio erst nach einer Benutzerinteraktion. `unlockAudio()` muss daher
 * aus einem Klick-/Touch-Handler aufgerufen werden. Danach kann der Kontext jederzeit genutzt werden.
 */

type Listener = (state: AudioContextState | 'none') => void;

let context: AudioContext | null = null;
let unlocked = false;
const listeners = new Set<Listener>();

function notify(): void {
  const state = context ? context.state : 'none';
  for (const l of listeners) l(state);
}

function createContext(): AudioContext {
  const Ctor: typeof AudioContext | undefined =
    typeof window !== 'undefined'
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctor) throw new Error('Web Audio wird von diesem Browser nicht unterstützt.');
  const ctx = new Ctor({ latencyHint: 'interactive' });
  ctx.addEventListener('statechange', notify);
  return ctx;
}

/** Liefert den (ggf. neu erstellten) AudioContext. */
export function getAudioContext(): AudioContext {
  if (!context) context = createContext();
  return context;
}

/** Ob bereits ein AudioContext existiert (ohne einen zu erzeugen). */
export function hasAudioContext(): boolean {
  return context !== null;
}

/** Ob Audio durch eine Benutzerinteraktion freigeschaltet wurde. */
export function isAudioUnlocked(): boolean {
  return unlocked && context !== null && context.state === 'running';
}

/**
 * Schaltet Audio frei (aus einem User-Gesture-Handler aufrufen).
 * Spielt zusätzlich einen stummen Puffer ab, was auf iOS die Ausgabe zuverlässig aktiviert.
 */
export async function unlockAudio(): Promise<AudioContext> {
  const ctx = getAudioContext();
  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
    } catch {
      // wird unten erneut geprüft
    }
  }
  if (!unlocked) {
    try {
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // ignorieren – nicht kritisch
    }
    unlocked = true;
  }
  notify();
  return ctx;
}

/** Versucht, einen unterbrochenen Kontext (z. B. nach Anruf) fortzusetzen. */
export async function resumeAudioIfNeeded(): Promise<void> {
  if (!context || !unlocked) return;
  if (context.state !== 'running') {
    try {
      await context.resume();
    } catch {
      // Benutzerinteraktion nötig – wird beim nächsten Tippen erneut versucht
    }
    notify();
  }
}

export function subscribeAudioState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Aktuelle Ausgabelatenz in Sekunden (für visuelle Synchronisation). */
export function outputLatencySeconds(): number {
  if (!context) return 0;
  const anyCtx = context as AudioContext & { outputLatency?: number };
  return anyCtx.outputLatency ?? context.baseLatency ?? 0;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void resumeAudioIfNeeded();
  });
  const retry = (): void => {
    void resumeAudioIfNeeded();
  };
  document.addEventListener('pointerdown', retry, { passive: true });
  document.addEventListener('keydown', retry);
}
