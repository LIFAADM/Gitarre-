import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Testet die Sprachausgabe mit einer nachgebauten `speechSynthesis`: Start/Ende-Ereignisse, Mikrofon-
 * Sperre während der Ausgabe, Stimmenauswahl und Abbruch.
 */

interface FakeUtterance {
  text: string;
  lang: string;
  rate: number;
  volume: number;
  voice: SpeechSynthesisVoice | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function voice(partial: Partial<SpeechSynthesisVoice>): SpeechSynthesisVoice {
  return { voiceURI: 'x', name: 'x', lang: 'de-DE', localService: true, default: false, ...partial } as SpeechSynthesisVoice;
}

const spoken: FakeUtterance[] = [];
let voices: SpeechSynthesisVoice[] = [];
const synth = {
  speaking: false,
  pending: false,
  getVoices: () => voices,
  speak: vi.fn((u: FakeUtterance) => {
    spoken.push(u);
  }),
  cancel: vi.fn(() => {
    for (const u of spoken.splice(0)) u.onerror?.({ error: 'interrupted' });
  }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

class Utterance implements FakeUtterance {
  lang = '';
  rate = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}

beforeEach(() => {
  spoken.length = 0;
  voices = [];
  vi.useFakeTimers();
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true, writable: true });
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  // @ts-expect-error Aufräumen der Test-Attrappe
  delete window.speechSynthesis;
  // @ts-expect-error Aufräumen der Test-Attrappe
  delete window.SpeechSynthesisUtterance;
});

async function load() {
  return import('./speech');
}

describe('speak', () => {
  it('spricht deutsch, meldet Sprechen und sperrt das Mikrofon kurz nach dem Ende', async () => {
    const speech = await load();
    voices = [voice({ voiceURI: 'de-anna', name: 'Anna', lang: 'de-DE' })];
    const states: boolean[] = [];
    speech.subscribeSpeaking((s) => states.push(s));
    expect(speech.isSpeechBlockingMic()).toBe(false);
    const done = speech.speak('Hallo Gitarre.', { rate: 1.1 });
    expect(spoken).toHaveLength(1);
    expect(spoken[0]!.lang).toBe('de-DE');
    expect(spoken[0]!.voice?.name).toBe('Anna');
    expect(spoken[0]!.rate).toBeCloseTo(1.1);
    spoken[0]!.onstart?.();
    expect(speech.isSpeaking()).toBe(true);
    expect(speech.isSpeechBlockingMic()).toBe(true);
    spoken[0]!.onend?.();
    expect(speech.isSpeaking()).toBe(false);
    expect(speech.isSpeechBlockingMic()).toBe(true); // Nachlauf
    vi.advanceTimersByTime(400);
    expect(speech.isSpeechBlockingMic()).toBe(false);
    await expect(done).resolves.toBe(true);
    expect(states).toEqual([true, false]);
  });

  it('teilt lange Texte in mehrere Abschnitte und löst erst nach dem letzten auf', async () => {
    const speech = await load();
    const text = Array.from({ length: 10 }, (_, i) => `Dies ist der ${i + 1}. Satz mit ein paar Wörtern, damit er länger wird.`).join(' ');
    let resolved: boolean | null = null;
    void speech.speak(text).then((v) => (resolved = v));
    expect(spoken.length).toBeGreaterThan(1);
    for (const u of spoken) expect(u.text.length).toBeLessThanOrEqual(220);
    for (const u of spoken.slice(0, -1)) {
      u.onstart?.();
      u.onend?.();
    }
    await Promise.resolve();
    expect(resolved).toBeNull();
    spoken[spoken.length - 1]!.onstart?.();
    spoken[spoken.length - 1]!.onend?.();
    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  it('bricht beim nächsten Aufruf die laufende Ausgabe ab', async () => {
    const speech = await load();
    const first = speech.speak('Erster Satz.');
    spoken[0]!.onstart?.();
    const second = speech.speak('Zweiter Satz.');
    await expect(first).resolves.toBe(false);
    expect(speech.isSpeaking()).toBe(false);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]!.text).toBe('Zweiter Satz.');
    spoken[0]!.onstart?.();
    spoken[0]!.onend?.();
    await expect(second).resolves.toBe(true);
  });

  it('gibt das Mikrofon auch frei, wenn onend ausbleibt', async () => {
    const speech = await load();
    void speech.speak('Kurz.');
    spoken[0]!.onstart?.();
    expect(speech.isSpeaking()).toBe(true);
    vi.advanceTimersByTime(10_000);
    expect(speech.isSpeaking()).toBe(false);
  });

  it('löst ohne Sprach-Engine (kein onstart) nach einer Frist mit false auf', async () => {
    const speech = await load();
    const p = speech.speak('Niemand hört zu.');
    vi.advanceTimersByTime(20_000);
    await expect(p).resolves.toBe(false);
    expect(speech.isSpeechBlockingMic()).toBe(false);
  });

  it('liefert false für leeren Text und ohne Unterstützung', async () => {
    const speech = await load();
    await expect(speech.speak('   ')).resolves.toBe(false);
    // @ts-expect-error Unterstützung entfernen
    delete window.speechSynthesis;
    expect(speech.isSpeechSupported()).toBe(false);
    await expect(speech.speak('Hallo')).resolves.toBe(false);
  });
});

describe('pickVoice', () => {
  it('bevorzugt gewünschte, dann de-DE, lokale und bekannte Stimmen', async () => {
    const { pickVoice } = await load();
    const list = [
      voice({ voiceURI: 'en', name: 'Samantha', lang: 'en-US' }),
      voice({ voiceURI: 'de-at', name: 'Michael', lang: 'de-AT' }),
      voice({ voiceURI: 'de-net', name: 'Google Deutsch', lang: 'de-DE', localService: false }),
      voice({ voiceURI: 'de-anna', name: 'Anna', lang: 'de-DE' }),
      voice({ voiceURI: 'de-anna-enh', name: 'Anna (Erweitert)', lang: 'de-DE' }),
    ];
    expect(pickVoice(list)?.voiceURI).toBe('de-anna');
    expect(pickVoice(list, 'de-at')?.voiceURI).toBe('de-at');
    expect(pickVoice(list, 'gibt-es-nicht')?.voiceURI).toBe('de-anna');
    expect(pickVoice([voice({ voiceURI: 'en', lang: 'en-US' })])).toBeNull();
    expect(pickVoice([voice({ voiceURI: 'enh', name: 'Anna', lang: 'de-DE' }), voice({ voiceURI: 'com.apple.voice.premium.de-DE.Anna', name: 'Anna', lang: 'de-DE' })])?.voiceURI).toBe('com.apple.voice.premium.de-DE.Anna');
  });

  it('listet nur deutsche Stimmen', async () => {
    const speech = await load();
    voices = [voice({ voiceURI: 'en', lang: 'en-US' }), voice({ voiceURI: 'de', lang: 'de-DE', name: 'Anna' })];
    expect(speech.listGermanVoices().map((v) => v.voiceURI)).toEqual(['de']);
  });
});
