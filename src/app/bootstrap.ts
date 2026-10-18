import { loadSettings } from '@/core/storage/settings';
import { seedDatabase } from '@/core/content/seed';

export type BootstrapState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

/** Lädt Einstellungen und legt die eingebauten Inhalte an. */
export async function bootstrapApp(): Promise<void> {
  await loadSettings();
  await seedDatabase();
}

export function describeBootstrapError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/indexeddb|dexie|database|quota|blocked|version/i.test(msg)) {
    return `Die lokale Datenbank konnte nicht geöffnet werden (${msg}). Im privaten Modus von Safari ist der Speicher eingeschränkt – bitte die App im normalen Modus oder vom Home-Bildschirm öffnen.`;
  }
  return `Beim Start ist ein Fehler aufgetreten: ${msg}`;
}
