/** Erkennung von Tab-Dateiformaten anhand von Dateiendung und Magic Bytes. */

export type ImportFormat = 'gp3' | 'gp4' | 'gp5' | 'gpx' | 'gp7' | 'musicxml' | 'mxl' | 'alphatex' | 'midi' | 'gcjson' | 'unknown';

export interface FormatInfo {
  id: ImportFormat;
  label: string;
  extensions: string[];
  /** Wird in dieser Version tatsächlich unterstützt (getestet)? */
  supported: boolean;
  note?: string;
}

export const FORMAT_INFOS: FormatInfo[] = [
  { id: 'gp3', label: 'Guitar Pro 3', extensions: ['.gp3'], supported: true },
  { id: 'gp4', label: 'Guitar Pro 4', extensions: ['.gp4'], supported: true },
  { id: 'gp5', label: 'Guitar Pro 5', extensions: ['.gp5'], supported: true },
  { id: 'gpx', label: 'Guitar Pro 6', extensions: ['.gpx'], supported: true },
  { id: 'gp7', label: 'Guitar Pro 7/8', extensions: ['.gp'], supported: true },
  { id: 'musicxml', label: 'MusicXML', extensions: ['.xml', '.musicxml'], supported: true },
  { id: 'mxl', label: 'MusicXML (komprimiert)', extensions: ['.mxl'], supported: true },
  { id: 'alphatex', label: 'alphaTex', extensions: ['.atex', '.alphatex', '.tex'], supported: true },
  { id: 'midi', label: 'MIDI', extensions: ['.mid', '.midi'], supported: true, note: 'Saiten und Bünde werden automatisch berechnet und können abweichen.' },
  { id: 'gcjson', label: 'GuitarCoach (JSON)', extensions: ['.gcjson', '.json'], supported: true },
];

export const ACCEPTED_EXTENSIONS = FORMAT_INFOS.flatMap((f) => f.extensions);

export function formatLabel(format: ImportFormat): string {
  return FORMAT_INFOS.find((f) => f.id === format)?.label ?? 'Unbekannt';
}

function startsWith(bytes: Uint8Array, text: string, offset = 0): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i++) if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  return true;
}

function headText(bytes: Uint8Array, max = 2048): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, Math.min(max, bytes.length)));
}

/** Erkennt das Format aus Dateiname und Inhalt. */
export function detectFormat(fileName: string, bytes: Uint8Array): ImportFormat {
  const lower = fileName.toLowerCase();
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';

  // Magic Bytes zuerst (zuverlässiger als die Endung)
  if (startsWith(bytes, 'MThd')) return 'midi';
  if (bytes.length > 24 && bytes[0]! < 40 && startsWith(bytes, 'FICHIER GUITAR PRO v', 1)) {
    const version = headText(bytes, 40).slice(1 + 'FICHIER GUITAR PRO v'.length, 1 + 'FICHIER GUITAR PRO v'.length + 4);
    if (version.startsWith('3')) return 'gp3';
    if (version.startsWith('4')) return 'gp4';
    return 'gp5';
  }
  if (startsWith(bytes, 'BCFZ') || startsWith(bytes, 'BCFS')) return 'gpx';
  if (startsWith(bytes, 'PK')) {
    if (ext === '.mxl') return 'mxl';
    if (ext === '.gpx') return 'gpx';
    return 'gp7';
  }
  const text = headText(bytes).trimStart();
  if (text.startsWith('<?xml') || text.startsWith('<score-partwise') || text.startsWith('<score-timewise')) {
    if (/score-(partwise|timewise)/.test(headText(bytes, 65536))) return 'musicxml';
  }
  if (text.startsWith('{')) {
    if (/"format"\s*:\s*"guitarcoach/.test(headText(bytes, 4096))) return 'gcjson';
    if (ext === '.json' || ext === '.gcjson') return 'gcjson';
  }
  if (ext === '.atex' || ext === '.alphatex' || ext === '.tex') return 'alphatex';
  if (ext === '.gp3') return 'gp3';
  if (ext === '.gp4') return 'gp4';
  if (ext === '.gp5') return 'gp5';
  if (ext === '.gpx') return 'gpx';
  if (ext === '.gp') return 'gp7';
  if (ext === '.xml' || ext === '.musicxml') return 'musicxml';
  if (ext === '.mid' || ext === '.midi') return 'midi';
  if (ext === '.txt' && /\\(title|track|tempo|ts)\b|\|/.test(text)) return 'alphatex';
  return 'unknown';
}
