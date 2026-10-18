import type { NoteNaming } from '../music/notes';
import { getDb } from './db';

/** Einstellungen der App (klein, werden vollständig geladen). */
export interface AppSettings {
  userName: string;
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
  /** Toleranz im Spiel-mit-Modus (Cent). */
  listenToleranceCents: number;
  /** Mindestdauer für einen stabil erkannten Ton (ms). */
  listenMinStableMs: number;
  metronomeVolume: number;
  synthVolume: number;
  dailyGoalMinutes: number;
  weeklyGoalDays: number;
  tabZoom: number;
  autoScroll: boolean;
  countIn: boolean;
  micAllowed: boolean;
  onboardingDone: boolean;
  defaultNotationView: 'tab' | 'score';
  hapticFeedback: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  noteNaming: 'de',
  leftHanded: false,
  fretboardOrientation: 'tab',
  showFingerNumbers: true,
  a4Hz: 440,
  tunerToleranceCents: 5,
  tunerSensitivity: 'normal',
  listenToleranceCents: 30,
  listenMinStableMs: 120,
  metronomeVolume: 0.7,
  synthVolume: 0.9,
  dailyGoalMinutes: 20,
  weeklyGoalDays: 5,
  tabZoom: 1,
  autoScroll: true,
  countIn: true,
  micAllowed: true,
  onboardingDone: false,
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

/** Ersetzt die Einstellungen vollständig (z. B. bei Wiederherstellung einer Sicherung). */
export async function replaceSettings(settings: Partial<AppSettings>): Promise<void> {
  current = { ...DEFAULT_SETTINGS, ...settings };
  emit();
  await getDb().settings.put({ key: SETTINGS_KEY, value: current });
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
