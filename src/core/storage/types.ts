/** Stilrichtungen der gemeinfreien Stücke und eigenen Übungen. */
export type Genre = 'Weihnachten' | 'Geburtstag' | 'Kinderlied / Volkslied' | 'Etüde' | 'Übung';

/** Rechtestatus: nur gemeinfreie Stücke mit eigenem Arrangement oder eigene Übungen. */
export type RightsStatus = 'public-domain' | 'own-arrangement';

export type VersionLabel = 'Anfänger' | 'Leicht' | 'Mittel' | 'Originalnah';
export type VersionKind = 'arrangement';

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}
