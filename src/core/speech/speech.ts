import { chunkText } from './phrases';

/**
 * Sprachausgabe über die Web Speech API (`speechSynthesis`): deutsche Systemstimme, offline,
 * nichts verlässt das Gerät. Kapselt Browser-Eigenheiten:
 * - iOS: Die erste Ausgabe muss aus einer Berührung heraus starten (`primeSpeech`).
 * - Safari/Chrome melden `onend` nicht immer zuverlässig → Sicherheits-Timeout je Abschnitt.
 * - Chrome bricht lange Texte ab → Ausgabe in kurzen Abschnitten.
 *
 * Solange gesprochen wird (plus kurzer Nachlauf), meldet `isSpeechBlockingMic()` wahr; die Tonhöhen-
 * erkennung wertet in dieser Zeit nichts aus, damit die eigene Stimme nicht als Ton gezählt wird.
 */

export interface SpeechVoiceInfo {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
}

export interface SpeakOptions {
  /** Sprechtempo 0,5–2 (Standard 1). */
  rate?: number;
  /** Gewünschte Stimme (voiceURI); sonst beste deutsche Stimme. */
  voiceURI?: string | null;
  volume?: number;
  /** Laufende Ausgabe zuerst abbrechen (Standard: ja). */
  interrupt?: boolean;
}

const MIC_TAIL_MS = 350;
const CHARS_PER_SECOND = 14;
const PREFERRED_NAMES = ['anna', 'petra', 'helena', 'markus', 'martin', 'viktor', 'google deutsch', 'microsoft katja', 'microsoft hedda'];

let active = 0;
let lastEndAt = Number.NEGATIVE_INFINITY;
let primed = false;
const speakingListeners = new Set<(speaking: boolean) => void>();

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

function getSynth(): SpeechSynthesis | null {
  return isSpeechSupported() ? window.speechSynthesis : null;
}

function setActive(delta: number): void {
  const was = active > 0;
  active = Math.max(0, active + delta);
  if (active === 0) lastEndAt = now();
  const is = active > 0;
  if (was !== is) for (const l of speakingListeners) l(is);
}

export function isSpeaking(): boolean {
  return active > 0;
}

/** Wahr, solange gesprochen wird oder die Ausgabe gerade erst geendet hat. */
export function isSpeechBlockingMic(at: number = now()): boolean {
  return active > 0 || at < lastEndAt + MIC_TAIL_MS;
}

export function subscribeSpeaking(listener: (speaking: boolean) => void): () => void {
  speakingListeners.add(listener);
  return () => speakingListeners.delete(listener);
}

/** Verfügbare deutsche Stimmen (kann anfangs leer sein – `subscribeVoices` meldet Nachladen). */
export function listGermanVoices(): SpeechVoiceInfo[] {
  const s = getSynth();
  if (!s) return [];
  return s
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('de'))
    .map((v) => ({ voiceURI: v.voiceURI, name: v.name, lang: v.lang, localService: v.localService }));
}

export function subscribeVoices(listener: () => void): () => void {
  const s = getSynth();
  if (!s || typeof s.addEventListener !== 'function') return () => undefined;
  s.addEventListener('voiceschanged', listener);
  return () => s.removeEventListener('voiceschanged', listener);
}

type VoiceLike = Pick<SpeechSynthesisVoice, 'voiceURI' | 'name' | 'lang' | 'localService'>;

/**
 * Wählt die Stimme: die gewünschte, sonst die beste deutsche (de-DE vor anderen Varianten, lokal vor
 * Netzwerk, „Enhanced/Premium“ und bekannte Namen bevorzugt). `null`, wenn keine deutsche Stimme da ist.
 */
export function pickVoice<T extends VoiceLike>(voices: readonly T[], preferredURI?: string | null): T | null {
  if (preferredURI) {
    const exact = voices.find((v) => v.voiceURI === preferredURI);
    if (exact) return exact;
  }
  let best: T | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const v of voices) {
    const lang = v.lang.toLowerCase().replace('_', '-');
    if (!lang.startsWith('de')) continue;
    let score = 0;
    if (lang === 'de-de') score += 4;
    if (v.localService) score += 2;
    const id = `${v.name} ${v.voiceURI}`.toLowerCase();
    if (/enhanced|premium|neural/.test(id)) score += 3;
    const idx = PREFERRED_NAMES.findIndex((n) => id.includes(n));
    if (idx >= 0) score += PREFERRED_NAMES.length - idx;
    if (/eloquence|compact|novelty|whisper|bells|bubbles|zarvox|trinoids/.test(id)) score -= 10;
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

/** Bricht die laufende Ausgabe ab. */
export function cancelSpeech(): void {
  const s = getSynth();
  try {
    s?.cancel();
  } catch {
    // ignorieren
  }
  if (active > 0) setActive(-active);
}

/**
 * iOS erlaubt Sprachausgabe erst nach einer Berührung. Einmalig aus einem Touch-/Klick-Handler aufrufen;
 * danach darf die App auch ohne Geste sprechen (z. B. Einzähler, Ansagen im Spiel-mit-Modus).
 */
export function primeSpeech(): void {
  if (primed) return;
  const s = getSynth();
  if (!s) return;
  primed = true;
  if (s.speaking || s.pending) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = 'de-DE';
    s.speak(u);
  } catch {
    // ignorieren
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Spricht einen Text. Löst mit `true` auf, wenn die Ausgabe vollständig war, sonst `false`
 * (abgebrochen, keine Sprachausgabe verfügbar, leerer Text).
 */
export function speak(text: string, options: SpeakOptions = {}): Promise<boolean> {
  const s = getSynth();
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!s || !clean) return Promise.resolve(false);
  if (options.interrupt !== false) cancelSpeech();
  const chunks = chunkText(clean);
  const voice = pickVoice(s.getVoices(), options.voiceURI);
  const rate = clamp(options.rate ?? 1, 0.5, 2);
  const volume = clamp(options.volume ?? 1, 0, 1);

  return new Promise<boolean>((resolve) => {
    let remaining = chunks.length;
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    for (const chunk of chunks) {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = voice?.lang ?? 'de-DE';
      if (voice) u.voice = voice;
      u.rate = rate;
      u.volume = volume;
      const expectedMs = (chunk.length / CHARS_PER_SECOND / rate) * 1000;
      let started = false;
      let ended = false;
      let safety: ReturnType<typeof setTimeout> | null = null;
      const end = (ok: boolean): void => {
        if (ended) return;
        ended = true;
        if (safety !== null) clearTimeout(safety);
        if (started) setActive(-1);
        remaining -= 1;
        if (!ok) finish(false);
        else if (remaining === 0) finish(true);
      };
      u.onstart = () => {
        if (started || ended) return;
        started = true;
        setActive(1);
        if (safety !== null) clearTimeout(safety);
        // Falls `onend` ausbleibt (bekannt bei Safari), spätestens nach der erwarteten Dauer freigeben.
        safety = setTimeout(() => end(true), expectedMs + 2500);
      };
      u.onend = () => end(true);
      u.onerror = () => end(false);
      // Keine Sprach-Engine (z. B. Testumgebung): nicht ewig warten.
      safety = setTimeout(() => end(false), expectedMs + 6000);
      try {
        s.speak(u);
      } catch {
        end(false);
      }
    }
    if (chunks.length === 0) finish(false);
  });
}
