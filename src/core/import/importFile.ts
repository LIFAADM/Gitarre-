import { importAlphaTex, importWithAlphaTab, type AlphaTabImportResult } from './alphaTabImport';
import { detectFormat, formatLabel, type ImportFormat } from './formats';
import { parseSongFile, type GuitarCoachSongFile } from './gcjson';
import { importMidi } from './midiImport';
import { parseTextTab, type TextTabOptions, type TextTabParseResult } from './textTabImport';

export type ImportOutcome =
  | { kind: 'score'; format: ImportFormat; result: AlphaTabImportResult }
  | { kind: 'texttab'; format: 'texttab'; text: string; options: TextTabOptions; result: TextTabParseResult }
  | { kind: 'gcjson'; format: 'gcjson'; file: GuitarCoachSongFile };

/** Text-Tab mit (geänderten) Optionen erneut auswerten. */
export function reparseTextTab(text: string, options: TextTabOptions): ImportOutcome {
  return { kind: 'texttab', format: 'texttab', text, options, result: parseTextTab(text, options) };
}

/** Liest eine Datei ein, erkennt das Format und wandelt sie um. */
export async function importFileBytes(fileName: string, bytes: Uint8Array, textTabOptions: TextTabOptions = {}): Promise<ImportOutcome> {
  const format = detectFormat(fileName, bytes);
  if (format === 'texttab') {
    const text = new TextDecoder().decode(bytes);
    return reparseTextTab(text, { title: fileName.replace(/\.[^.]+$/, ''), ...textTabOptions });
  }
  if (format === 'unknown') {
    throw new Error(`Das Format von „${fileName}“ wurde nicht erkannt. Unterstützt: Guitar Pro (.gp3/.gp4/.gp5/.gpx/.gp), MusicXML (.xml/.musicxml/.mxl), alphaTex, MIDI (.mid) und GuitarCoach-JSON.`);
  }
  if (format === 'gcjson') {
    return { kind: 'gcjson', format, file: parseSongFile(new TextDecoder().decode(bytes)) };
  }
  if (format === 'alphatex') {
    return { kind: 'score', format, result: await importAlphaTex(new TextDecoder().decode(bytes)) };
  }
  if (format === 'midi') {
    return { kind: 'score', format, result: importMidi(bytes) };
  }
  const result = await importWithAlphaTab(bytes);
  if (result.tracks.length === 0) throw new Error(`Die ${formatLabel(format)}-Datei enthält keine Gitarrenspur.`);
  return { kind: 'score', format, result };
}
