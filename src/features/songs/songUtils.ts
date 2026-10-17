import type { RightsStatus, SongRecord, SongVersionRecord } from '@/core/storage/types';

export type SongStatus = 'ready' | 'needs-import' | 'imported';

/** Spielbereit, importiert oder Tab-Datei nötig? */
export function songStatus(song: SongRecord, versionCount: number): SongStatus {
  if (versionCount === 0) return 'needs-import';
  if (song.rightsStatus === 'needs-import' || song.rightsStatus === 'user-import') return 'imported';
  return 'ready';
}

export const STATUS_LABEL: Record<SongStatus, string> = {
  ready: 'Spielbereit',
  imported: 'Importiert',
  'needs-import': 'Tab-Datei nötig',
};

export const RIGHTS_LABEL: Record<RightsStatus, string> = {
  'public-domain': 'Gemeinfrei – eigenes Arrangement',
  'own-arrangement': 'Eigene Komposition / Übung',
  'needs-import': 'Geschützt – eigene Tab-Datei importieren',
  'user-import': 'Eigener Import',
  'user-created': 'Selbst erstellt',
};

export const DIFFICULTY_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'sehr leicht',
  2: 'leicht',
  3: 'mittel',
  4: 'schwer',
  5: 'sehr schwer',
};

export function sortVersions(versions: SongVersionRecord[]): SongVersionRecord[] {
  return [...versions].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

/** Lädt eine Datei im Browser herunter (Export). */
export function downloadTextFile(fileName: string, content: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
