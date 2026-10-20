import Dexie, { type EntityTable } from 'dexie';
import type { CalibrationRecord, ClipRecord, MetaRecord, SettingsRecord } from './types';

/**
 * IndexedDB-Datenbank für GuitarCoach v2 (Dexie). Eigener Datenbankname: Daten der v1-App werden nicht übernommen.
 * Schema-Versionen werden hier fortgeschrieben; weitere Tabellen (Kalibrierung, Fortschritt) kommen mit ihren Phasen.
 */
export class GuitarCoachDB extends Dexie {
  settings!: EntityTable<SettingsRecord, 'key'>;
  meta!: EntityTable<MetaRecord, 'key'>;
  /** Kalibrierung je Gerät (Phase 1). */
  calibration!: EntityTable<CalibrationRecord, 'deviceKey'>;
  /** Beschriftete Aufnahmen aus dem Erkennungs-Labor (Phase 1). */
  clips!: EntityTable<ClipRecord, 'id'>;

  constructor(name = 'guitarcoach-v2') {
    super(name);
    this.version(1).stores({
      settings: 'key',
      meta: 'key',
    });
    this.version(2).stores({
      settings: 'key',
      meta: 'key',
      calibration: 'deviceKey',
      clips: 'id, createdAt',
    });
  }
}

let instance: GuitarCoachDB | null = null;

export function getDb(): GuitarCoachDB {
  if (!instance) instance = new GuitarCoachDB();
  return instance;
}

/** Nur für Tests: frische Datenbank mit eigenem Namen. */
export function createTestDb(name: string): GuitarCoachDB {
  return new GuitarCoachDB(name);
}

/** Erzeugt eine eindeutige ID (UUID, Fallback für ältere WebViews). */
export function newId(prefix = ''): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}${uuid}` : uuid;
}
