import type { CalibrationProfile } from '@/core/detection/calibration';
import { getDb } from './db';

/**
 * Kalibrierung je Gerät: im Speicher gehalten (synchron lesbar für Hooks), in IndexedDB gesichert.
 * Der Geräteschlüssel kombiniert Plattform, Browser-Familie und Abtastrate – ein neues iPhone oder
 * ein anderer Browser bekommt so eine eigene Kalibrierung.
 */

type Listener = (profile: CalibrationProfile | null) => void;

let current: CalibrationProfile | null = null;
let loaded = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l(current);
}

/** Kurzer, stabiler Schlüssel für dieses Gerät (ohne genaue Versionsnummern). */
export function deviceKey(sampleRate = 0): string {
  if (typeof navigator === 'undefined') return `node|${sampleRate}`;
  const ua = navigator.userAgent;
  const platform = /iPhone/.test(ua) ? 'iPhone' : /iPad|Macintosh.*Mobile/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Sonstiges';
  const browser = /CriOS|Chrome/.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Browser';
  const standalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches ? 'app' : 'tab';
  return `${platform}|${browser}|${standalone}|${sampleRate || 'sr?'}`;
}

/** Lädt die Kalibrierung dieses Geräts (einmalig beim Start). Abtastrate ist noch unbekannt → Präfix-Suche. */
export async function loadCalibration(): Promise<CalibrationProfile | null> {
  try {
    const prefix = deviceKey().split('|').slice(0, 3).join('|');
    const all = await getDb().calibration.toArray();
    const matching = all.filter((c) => c.deviceKey.startsWith(prefix)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    current = matching[0] ?? null;
  } catch (error) {
    console.warn('Kalibrierung konnte nicht geladen werden:', error);
  }
  loaded = true;
  emit();
  return current;
}

export function getCalibration(): CalibrationProfile | null {
  return current;
}

export function calibrationLoaded(): boolean {
  return loaded;
}

export async function saveCalibration(profile: CalibrationProfile): Promise<void> {
  current = profile;
  emit();
  try {
    await getDb().calibration.put(profile);
  } catch (error) {
    console.warn('Kalibrierung konnte nicht gespeichert werden:', error);
  }
}

export async function clearCalibration(): Promise<void> {
  current = null;
  emit();
  try {
    await getDb().calibration.clear();
  } catch (error) {
    console.warn('Kalibrierung konnte nicht gelöscht werden:', error);
  }
}

export function subscribeCalibration(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Nur für Tests. */
export function resetCalibrationForTests(): void {
  current = null;
  loaded = false;
}
