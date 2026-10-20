import type { NoteNaming } from '../music/notes';
import { getDb } from './db';

/** Einstellungen der App (klein, werden vollständig geladen). */
export interface AppSettings {
  noteNaming: NoteNaming;
  leftHanded: boolean;
  /** Griffbrett-Darstellung: wie Tab (hohe E oben) oder Blick auf die eigene Gitarre (tiefe E oben). */
  fretboardOrientation: 'tab' | 'player-view';
  showFingerNumbers: boolean;
  a4Hz: number;
  /** Toleranz, ab der ein Ton im Stimmgerät als „richtig gestimmt“ gilt (Cent). */
  tunerToleranceCents: number;
  /** Empfindlichkeit des Stimmgeräts (Mindestpegel). */
  tunerSensitivity: 'niedrig' | 'normal' | 'hoch';
  metronomeVolume: number;
  synthVolume: number;
  tabZoom: number;
  autoScroll: boolean;
  /** Ein Takt Einzähler vor dem Start (bei eingeschaltetem Metronom). */
  countIn: boolean;
  /** Einzähler zusätzlich gesprochen („eins, zwei, drei, vier“). Standard: aus. */
  spokenCountIn: boolean;
  defaultNotationView: 'tab' | 'score';
  hapticFeedback: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  noteNaming: 'de',
  leftHanded: false,
  fretboardOrientation: 'tab',
  showFingerNumbers: true,
  a4Hz: 440,
  tunerToleranceCents: 5,
  tunerSensitivity: 'normal',
  metronomeVolume: 0.7,
  synthVolume: 0.9,
  tabZoom: 1,
  autoScroll: true,
  countIn: true,
  spokenCountIn: false,
  defaultNotationView: 'tab',
  hapticFeedback: true,
};

const SETTINGS_KEY = 'app';

type Listener = (s: AppSettings) => void;

let current: AppSettings = { ...DEFAULT_SETTINGS };
let loaded = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l(current);
}

/** Lädt die Einstellungen aus IndexedDB (einmalig beim Start). */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const record = await getDb().settings.get(SETTINGS_KEY);
    if (record && typeof record.value === 'object' && record.value) {
      current = { ...DEFAULT_SETTINGS, ...(record.value as Partial<AppSettings>) };
    }
  } catch (error) {
    console.warn('Einstellungen konnten nicht geladen werden:', error);
  }
  loaded = true;
  emit();
  return current;
}

export function getSettings(): AppSettings {
  return current;
}

export function settingsLoaded(): boolean {
  return loaded;
}

/** Aktualisiert Einstellungen (sofort im Speicher, asynchron in der DB). */
export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  current = { ...current, ...patch };
  emit();
  try {
    await getDb().settings.put({ key: SETTINGS_KEY, value: current });
  } catch (error) {
    console.warn('Einstellungen konnten nicht gespeichert werden:', error);
  }
  return current;
}

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Nur für Tests. */
export function resetSettingsForTests(): void {
  current = { ...DEFAULT_SETTINGS };
  loaded = false;
}
