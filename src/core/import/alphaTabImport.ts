import type * as AlphaTabTypes from '@coderline/alphatab';
import { ticksToDuration, type Duration, type DurationBase } from '../music/durations';
import { preferredPositionForMidi } from '../music/fretboard';
import type { Bar, Beat, MasterBar, Note, Score, Technique, Track } from '../music/score';
import { STANDARD_TUNING } from '../music/tuning';

/**
 * Import von Guitar-Pro-, MusicXML- und alphaTex-Dateien über alphaTab (MPL-2.0)
 * und Umwandlung in das interne GuitarCoach-Datenmodell.
 */

type AlphaTabModule = typeof AlphaTabTypes;
let alphaTabModule: Promise<AlphaTabModule> | null = null;

/** Lädt alphaTab erst bei Bedarf (großes Bundle). */
export function loadAlphaTab(): Promise<AlphaTabModule> {
  if (!alphaTabModule) alphaTabModule = import('@coderline/alphatab');
  return alphaTabModule;
}

export interface ImportedTrackInfo {
  index: number;
  name: string;
  noteCount: number;
  barCount: number;
  tuningKnown: boolean;
  isPercussion: boolean;
  stringCount: number;
}

export interface AlphaTabImportResult {
  score: Score;
  tracks: ImportedTrackInfo[];
  warnings: string[];
}

const DURATION_BASES: DurationBase[] = [1, 2, 4, 8, 16, 32, 64];

/** Entfernt geschützte Leerzeichen/Steuerzeichen aus importierten Texten. */
function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/[\u00a0\s]+/g, ' ').trim();
}

function toDuration(beat: AlphaTabTypes.model.Beat): Duration {
  const base = DURATION_BASES.includes(beat.duration as DurationBase) ? (beat.duration as DurationBase) : 4;
  const duration: Duration = { base };
  if (beat.dots === 1) duration.dots = 1;
  else if (beat.dots >= 2) duration.dots = 2;
  if (beat.tupletNumerator > 0 && beat.tupletDenominator > 0 && beat.tupletNumerator !== beat.tupletDenominator) {
    const n = beat.tupletNumerator;
    if (n === 3 || n === 5 || n === 6 || n === 7) duration.tuplet = n;
  }
  return duration;
}

function techniquesOf(alphaTab: AlphaTabModule, note: AlphaTabTypes.model.Note): Technique[] {
  const t: Technique[] = [];
  if (note.isDead) t.push('dead');
  if (note.isPalmMute) t.push('palm-mute');
  if (note.isLetRing) t.push('let-ring');
  if (note.isStaccato) t.push('staccato');
  if (note.hasBend) t.push('bend');
  if (note.vibrato !== alphaTab.model.VibratoType.None) t.push('vibrato');
  if (note.slideOutType !== alphaTab.model.SlideOutType.None || note.slideInType !== alphaTab.model.SlideInType.None) t.push('slide');
  if (note.harmonicType !== alphaTab.model.HarmonicType.None) t.push('harmonic');
  if (note.isHammerPullDestination) {
    const origin = note.hammerPullOrigin;
    if (origin && origin.realValue > note.realValue) t.push('pull-off');
    else t.push('hammer-on');
  }
  return t;
}

/** Wandelt einen alphaTab-Score in das interne Modell um. */
export function convertAlphaTabScore(alphaTab: AlphaTabModule, atScore: AlphaTabTypes.model.Score): AlphaTabImportResult {
  const warnings: string[] = [];
  const masterBars: MasterBar[] = atScore.masterBars.map((mb, index) => {
    const record: MasterBar = { index, timeSignature: { numerator: mb.timeSignatureNumerator, denominator: mb.timeSignatureDenominator } };
    const tempoAutomation = mb.tempoAutomations.find((a) => a.ratioPosition === 0) ?? mb.tempoAutomations[0];
    if (tempoAutomation && tempoAutomation.value > 0) record.tempo = tempoAutomation.value;
    if (index === 0 && !record.tempo && atScore.tempo > 0) record.tempo = atScore.tempo;
    if (mb.isRepeatStart) record.repeatStart = true;
    if (mb.repeatCount > 0) record.repeatCount = mb.repeatCount;
    if (mb.alternateEndings > 0) record.alternateEndings = mb.alternateEndings;
    if (cleanText(mb.section?.text)) record.section = cleanText(mb.section?.text);
    return record;
  });

  const tracks: Track[] = [];
  const infos: ImportedTrackInfo[] = [];
  atScore.tracks.forEach((atTrack, trackIndex) => {
    const staff = atTrack.staves.find((s) => s.showTablature || s.tuning.length > 0) ?? atTrack.staves[0];
    if (!staff) return;
    const isPercussion = Boolean(staff.isPercussion);
    const tuningKnown = staff.tuning.length >= 4 && !isPercussion;
    const tuning = tuningKnown ? [...staff.tuning] : [...STANDARD_TUNING.midi];
    const tuningObj = { id: 'import', name: 'import', midi: tuning };
    let noteCount = 0;
    let autoPositions = false;
    let previousPos: { string: number; fret: number } | null = null;

    const bars: Bar[] = staff.bars.map((atBar, barIndex) => {
      const voices: Beat[][] = [];
      for (const voice of atBar.voices) {
        if (voice.isEmpty && voice.beats.every((b) => b.isEmpty)) continue;
        const beats: Beat[] = [];
        for (const atBeat of voice.beats) {
          if (atBeat.playbackDuration <= 0 && atBeat.notes.length === 0) continue;
          const notes: Note[] = [];
          if (!atBeat.isRest) {
            for (const atNote of atBeat.notes) {
              const midi = atNote.realValue;
              let string: number;
              let fret: number;
              if (tuningKnown && atNote.string >= 1 && atNote.string <= tuning.length) {
                string = tuning.length - atNote.string + 1;
                fret = atNote.fret;
              } else {
                const pos = preferredPositionForMidi(midi, { tuning: tuningObj, previous: previousPos });
                if (!pos) continue;
                string = pos.string;
                fret = pos.fret;
                autoPositions = true;
              }
              previousPos = { string, fret };
              const note: Note = { string, fret, midi };
              if (atNote.isTieOrigin) note.tieToNext = true;
              if (atNote.isTieDestination) note.tieFromPrevious = true;
              const techniques = techniquesOf(alphaTab, atNote);
              if (techniques.length) note.techniques = techniques;
              if (atNote.leftHandFinger >= 0 && atNote.leftHandFinger <= 4) note.finger = atNote.leftHandFinger as Note['finger'];
              if (atNote.dynamics !== undefined) {
                const dyn = Number(atNote.dynamics);
                if (Number.isFinite(dyn)) note.velocity = Math.min(1, Math.max(0.3, 0.45 + dyn * 0.08));
              }
              notes.push(note);
              noteCount++;
            }
          }
          const durationTicks = Math.max(1, Math.round(atBeat.playbackDuration));
          const duration = ticksToDuration(durationTicks) ?? toDuration(atBeat);
          const beat: Beat = {
            startTick: Math.round(atBeat.playbackStart),
            durationTicks,
            duration,
            notes,
            isRest: notes.length === 0,
          };
          if (atBeat.text) beat.text = atBeat.text;
          else if (atBeat.lyrics && atBeat.lyrics.length > 0 && atBeat.lyrics[0]) beat.text = atBeat.lyrics[0];
          beats.push(beat);
        }
        if (beats.length > 0) voices.push(beats);
      }
      if (voices.length === 0) {
        const mb = masterBars[barIndex];
        const ticks = mb ? Math.round(mb.timeSignature.numerator * ((960 * 4) / mb.timeSignature.denominator)) : 3840;
        voices.push([{ startTick: 0, durationTicks: ticks, duration: { base: 1 }, notes: [], isRest: true }]);
      }
      return { index: barIndex, voices };
    });

    // Fehlende Takte auffüllen, damit alle Spuren gleich lang sind
    while (bars.length < masterBars.length) {
      const mb = masterBars[bars.length]!;
      const ticks = Math.round(mb.timeSignature.numerator * ((960 * 4) / mb.timeSignature.denominator));
      bars.push({ index: bars.length, voices: [[{ startTick: 0, durationTicks: ticks, duration: { base: 1 }, notes: [], isRest: true }]] });
    }

    if (isPercussion) {
      warnings.push(`Spur „${atTrack.name || trackIndex + 1}“ ist eine Schlagzeugspur und wurde übersprungen.`);
      return;
    }
    if (autoPositions) warnings.push(`Spur „${atTrack.name || trackIndex + 1}“: Saiten und Bünde wurden automatisch berechnet (keine Tabulatur in der Datei).`);

    const track: Track = {
      id: `track-${trackIndex + 1}`,
      name: cleanText(atTrack.name) || `Spur ${trackIndex + 1}`,
      tuning,
      capo: staff.capo ?? 0,
      bars,
      program: atTrack.playbackInfo.program,
    };
    tracks.push(track);
    infos.push({ index: tracks.length - 1, name: track.name, noteCount, barCount: bars.length, tuningKnown, isPercussion, stringCount: tuning.length });
  });

  if (tracks.length === 0) throw new Error('Die Datei enthält keine spielbare Gitarren-/Melodiespur.');

  // Abspielreihenfolge (Wiederholungen, Sprünge) von alphaTab übernehmen
  let playbackBarOrder: number[] | undefined;
  try {
    const midiFile = new alphaTab.midi.MidiFile();
    const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(midiFile);
    const generator = new alphaTab.midi.MidiFileGenerator(atScore, new alphaTab.Settings(), handler);
    generator.generate();
    playbackBarOrder = generator.tickLookup.masterBars.map((m) => m.masterBar.index);
    if (playbackBarOrder.length === masterBars.length && playbackBarOrder.every((v, i) => v === i)) playbackBarOrder = undefined;
  } catch (error) {
    warnings.push('Wiederholungen konnten nicht vollständig ausgewertet werden; der Song wird linear abgespielt.');
    console.warn(error);
  }

  const firstBarTempo = masterBars[0]?.tempo;
  const score: Score = {
    title: cleanText(atScore.title) || 'Importierter Song',
    tempo: firstBarTempo && firstBarTempo > 0 ? firstBarTempo : atScore.tempo > 0 ? atScore.tempo : 120,
    masterBars,
    tracks,
  };
  if (cleanText(atScore.artist)) score.artist = cleanText(atScore.artist);
  if (playbackBarOrder) score.playbackBarOrder = playbackBarOrder;
  return { score, tracks: infos, warnings };
}

/** Importiert Guitar-Pro-/MusicXML-/CapXML-Dateien aus Bytes. */
export async function importWithAlphaTab(bytes: Uint8Array): Promise<AlphaTabImportResult> {
  const alphaTab = await loadAlphaTab();
  let atScore: AlphaTabTypes.model.Score;
  try {
    atScore = alphaTab.importer.ScoreLoader.loadScoreFromBytes(bytes, new alphaTab.Settings());
  } catch (error) {
    throw new Error(describeAlphaTabError(error), { cause: error });
  }
  return convertAlphaTabScore(alphaTab, atScore);
}

/** Importiert alphaTex-Text. */
export async function importAlphaTex(text: string): Promise<AlphaTabImportResult> {
  const alphaTab = await loadAlphaTab();
  let atScore: AlphaTabTypes.model.Score;
  try {
    atScore = alphaTab.importer.ScoreLoader.loadAlphaTex(text, new alphaTab.Settings());
  } catch (error) {
    throw new Error(describeAlphaTabError(error), { cause: error });
  }
  return convertAlphaTabScore(alphaTab, atScore);
}

export function describeAlphaTabError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/No compatible importer|UnsupportedFormat/i.test(msg)) return 'Das Dateiformat wurde nicht erkannt. Unterstützt werden Guitar Pro 3–8, MusicXML, alphaTex, MIDI und GuitarCoach-JSON.';
  if (/password|encrypted/i.test(msg)) return 'Die Datei ist passwortgeschützt und kann nicht gelesen werden.';
  return `Die Datei konnte nicht gelesen werden: ${msg}`;
}
