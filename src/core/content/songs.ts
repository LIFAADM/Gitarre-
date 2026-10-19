import type { Genre, RightsStatus, VersionKind, VersionLabel } from '../storage/types';

/** Eine eingebaute Songversion in Tab-Notation (siehe tabNotation.ts). */
export interface BuiltinVersionDef {
  id: string;
  label: VersionLabel;
  kind: VersionKind;
  description: string;
  notation: string;
  tempo: number;
  timeSignature: [number, number];
}

export interface BuiltinSongDef {
  id: string;
  title: string;
  artist: string;
  genre: Genre;
  difficulty: 1 | 2 | 3 | 4 | 5;
  originalTempo?: number;
  year?: number;
  rightsStatus: RightsStatus;
  goalTier?: 'anfaenger' | 'mittel' | 'lang';
  notes?: string;
  versions: BuiltinVersionDef[];
}

const PD_NOTE = 'Gemeinfreies Lied – eigenes GuitarCoach-Arrangement für Konzertgitarre (Melodie in der ersten Lage).';

// ---------- Gemeinfreie Lieder mit vollständigen Arrangements ----------

const HAPPY_BIRTHDAY_LEICHT =
  'r.2 0.3.8d"Hap" 0.3.16"py" | 2.3.4"birth" 0.3.4"day" 1.2.4"to" | 0.2.2"you" 0.3.8d"Hap" 0.3.16"py" | 2.3.4"birth" 0.3.4"day" 3.2.4"to" | 1.2.2"you" 0.3.8d"Hap" 0.3.16"py" | 3.1.4"birth" 0.1.4"day" 1.2.4"dear" | 0.2.4"Na" 2.3.4"me" 1.1.8d"Hap" 1.1.16"py" | 0.1.4"birth" 1.2.4"day" 3.2.4"to" | 1.2.2d"you" |';

const HAPPY_BIRTHDAY_ANFAENGER =
  'r.2 0.3.8"Hap" 0.3.8"py" | 2.3.4"birth" 0.3.4"day" 1.2.4"to" | 0.2.2"you" 0.3.8"Hap" 0.3.8"py" | 2.3.4"birth" 0.3.4"day" 3.2.4"to" | 1.2.2"you" 0.3.8"Hap" 0.3.8"py" | 3.1.4"birth" 0.1.4"day" 1.2.4"dear" | 0.2.4"Na" 2.3.4"me" 1.1.8"Hap" 1.1.8"py" | 0.1.4"birth" 1.2.4"day" 3.2.4"to" | 1.2.2d"you" |';

const HAPPY_BIRTHDAY_MITTEL =
  'r.2 0.3.8d"Hap" 0.3.16"py" | (2.3 3.5).4"birth" 0.3.4"day" 1.2.4"to" | (0.2 3.6).2"you" 0.3.8d"Hap" 0.3.16"py" | (2.3 3.6).4"birth" 0.3.4"day" 3.2.4"to" | (1.2 3.5).2"you" 0.3.8d"Hap" 0.3.16"py" | (3.1 3.5).4"birth" 0.1.4"day" 1.2.4"dear" | (0.2 1.6).4"Na" 2.3.4"me" 1.1.8d"Hap" 1.1.16"py" | (0.1 3.6).4"birth" 1.2.4"day" 3.2.4"to" | (1.2 3.5).2d"you" |';

const JINGLE_CHORUS =
  '{Refrain} 0.1.4"Jin" 0.1.4"gle" 0.1.2"bells" | 0.1.4"jin" 0.1.4"gle" 0.1.2"bells" | 0.1.4"jin" 3.1.4"gle" 1.2.4d"all" 3.2.8"the" | 0.1.2d"way" r.4 | ' +
  '1.1.4"Oh" 1.1.4"what" 1.1.4d"fun" 1.1.8"it" | 1.1.4"is" 0.1.4"to" 0.1.4"ride" 0.1.8"in" 0.1.8"a" | 0.1.4"one" 3.2.4"horse" 3.2.4"o" 0.1.4"pen" | 3.2.2"sleigh" 3.1.2"Hey!" | ' +
  '0.1.4"Jin" 0.1.4"gle" 0.1.2"bells" | 0.1.4"jin" 0.1.4"gle" 0.1.2"bells" | 0.1.4"jin" 3.1.4"gle" 1.2.4d"all" 3.2.8"the" | 0.1.2d"way" r.4 | ' +
  '1.1.4"Oh" 1.1.4"what" 1.1.4d"fun" 1.1.8"it" | 1.1.4"is" 0.1.4"to" 0.1.4"ride" 0.1.8"in" 0.1.8"a" | 3.1.4"one" 3.1.4"horse" 1.1.4"o" 3.2.4"pen" | 1.2.2d"sleigh" r.4 |';

const JINGLE_VERSE =
  '{Strophe} 3.1.4"Dash" 0.1.4"ing" 3.2.4"through" 1.2.4"the" | 0.3.2d"snow" 0.3.8"in" 0.3.8"a" | 3.1.4"one" 0.1.4"horse" 3.2.4"o" 1.2.4"pen" | 2.3.2d"sleigh" r.4 | ' +
  '2.3.4"o’er" 1.1.4"the" 0.1.4"fields" 3.2.4"we" | 0.2.2d"go" r.4 | 3.1.4"laugh" 3.1.4"ing" 1.1.4"all" 3.2.4"the" | 0.1.2d"way" r.4 | ' +
  '3.1.4"Bells" 0.1.4"on" 3.2.4"bob" 1.2.4"tail" | 0.3.2d"ring" r.4 | 3.1.4"ma" 0.1.4"king" 3.2.4"spi" 1.2.4"rits" | 2.3.2d"bright" r.8 2.3.8"what" | ' +
  '2.3.4"fun" 1.1.4"it" 0.1.4"is" 3.2.4"to" | 3.1.4"ride" 3.1.4"and" 3.1.4d"sing" 3.1.8"a" | 5.1.4"sleigh" 3.1.4"ing" 1.1.4"song" 3.2.4"to" | 1.2.2"night" 3.1.2"Oh!" | ';

const JINGLE_CHORUS_MITTEL =
  '{Refrain} (0.1 3.5).4"Jin" 0.1.4"gle" (0.1 0.3).2"bells" | (0.1 3.5).4"jin" 0.1.4"gle" (0.1 0.3).2"bells" | (0.1 3.5).4"jin" 3.1.4"gle" (1.2 0.3).4d"all" 3.2.8"the" | (0.1 3.5).2d"way" r.4 | ' +
  '(1.1 1.4).4"Oh" 1.1.4"what" (1.1 2.4).4d"fun" 1.1.8"it" | (1.1 1.4).4"is" 0.1.4"to" (0.1 3.5).4"ride" 0.1.8"in" 0.1.8"a" | (0.1 3.6).4"one" 3.2.4"horse" (3.2 0.4).4"o" 0.1.4"pen" | (3.2 3.6).2"sleigh" (3.1 0.4).2"Hey!" | ' +
  '(0.1 3.5).4"Jin" 0.1.4"gle" (0.1 0.3).2"bells" | (0.1 3.5).4"jin" 0.1.4"gle" (0.1 0.3).2"bells" | (0.1 3.5).4"jin" 3.1.4"gle" (1.2 0.3).4d"all" 3.2.8"the" | (0.1 3.5).2d"way" r.4 | ' +
  '(1.1 1.4).4"Oh" 1.1.4"what" (1.1 2.4).4d"fun" 1.1.8"it" | (1.1 1.4).4"is" 0.1.4"to" (0.1 3.5).4"ride" 0.1.8"in" 0.1.8"a" | (3.1 3.6).4"one" 3.1.4"horse" (1.1 0.4).4"o" 3.2.4"pen" | (1.2 3.5).2d"sleigh" r.4 |';

const TANNENBAUM_REFRAIN_LEICHT =
  'r.4 r.4 r.8 0.3.8"O" | 1.2.8d"Tan" 1.2.16"nen" 1.2.4"baum" 3.2.4"o" | 0.1.8d"Tan" 0.1.16"nen" 0.1.4d"baum" 0.1.8"wie" | 3.2.8"treu" 0.1.8"sind" 1.1.4"dei" 0.2.4"ne" | ';
const TANNENBAUM_REFRAIN_ANFAENGER =
  'r.4 r.4 r.8 0.3.8"O" | 1.2.8"Tan" 1.2.8"nen" 1.2.4"baum" 3.2.4"o" | 0.1.8"Tan" 0.1.8"nen" 0.1.4d"baum" 0.1.8"wie" | 3.2.8"treu" 0.1.8"sind" 1.1.4"dei" 0.2.4"ne" | ';
const TANNENBAUM_STROPHE =
  '3.2.4"Blät" 1.2.4"ter" r.8 3.1.8"Du" | 3.1.8"grünst" 0.1.8"nicht" 5.1.4d"nur" 3.1.8"zur" | 3.1.8"Som" 1.1.8"mer" 1.1.4d"zeit" 1.1.8"nein" | 1.1.8"auch" 3.2.8"im" 3.1.4d"Win" 1.1.8"ter" | 1.1.8"wenn" 0.1.8"es" 0.1.4"schneit" r.8 0.3.8"O" | ' +
  '1.2.8d"Tan" 1.2.16"nen" 1.2.4"baum" 3.2.4"o" | 0.1.8d"Tan" 0.1.16"nen" 0.1.4d"baum" 0.1.8"wie" | 3.2.8"treu" 0.1.8"sind" 1.1.4"dei" 0.2.4"ne" | 3.2.4"Blät" 1.2.4"ter" r.4 |';

const STILLE_NACHT_LEICHT =
  '0.3.8d"Stil" 2.3.16 0.3.8"le" 2.4.4d"Nacht" | 0.3.8d"hei" 2.3.16"li" 0.3.8"ge" 2.4.4d"Nacht" | 3.2.4"Al" 3.2.8"les" 0.2.4d"schläft" | 1.2.4"ein" 1.2.8"sam" 0.3.4d"wacht" | ' +
  '2.3.4"nur" 2.3.8"das" 1.2.8d"trau" 0.2.16"te" 2.3.8"hoch" | 0.3.8d"hei" 2.3.16"li" 0.3.8"ge" 2.4.4d"Paar" | 2.3.4"Hol" 2.3.8"der" 1.2.8d"Kna" 0.2.16"be" 2.3.8"im" | 0.3.8d"lo" 2.3.16"cki" 0.3.8"gen" 2.4.4d"Haar" | ' +
  '3.2.4"schlaf" 3.2.8"in" 1.1.8d"himm" 3.2.16"li" 0.2.8"scher" | 1.2.4d"Ruh" 0.1.4d | 1.2.8"schlaf" 0.3.8"in" 2.4.8"himm" 0.3.8d"li" 3.4.16 0.4.8"scher" | 3.5.4d"Ruh" r.4d |';

const STILLE_NACHT_ANFAENGER =
  '0.3.8"Stil" 2.3.8 0.3.8"le" 2.4.4d"Nacht" | 0.3.8"hei" 2.3.8"li" 0.3.8"ge" 2.4.4d"Nacht" | 3.2.4"Al" 3.2.8"les" 0.2.4d"schläft" | 1.2.4"ein" 1.2.8"sam" 0.3.4d"wacht" | ' +
  '2.3.4"nur" 2.3.8"das" 1.2.8"trau" 0.2.8"te" 2.3.8"hoch" | 0.3.8"hei" 2.3.8"li" 0.3.8"ge" 2.4.4d"Paar" | 2.3.4"Hol" 2.3.8"der" 1.2.8"Kna" 0.2.8"be" 2.3.8"im" | 0.3.8"lo" 2.3.8"cki" 0.3.8"gen" 2.4.4d"Haar" | ' +
  '3.2.4"schlaf" 3.2.8"in" 1.1.8"himm" 3.2.8"li" 0.2.8"scher" | 1.2.4d"Ruh" 0.1.4d | 1.2.8"schlaf" 0.3.8"in" 2.4.8"himm" 0.3.8"li" 3.4.8 0.4.8"scher" | 3.5.4d"Ruh" r.4d |';

const ALLE_JAHRE_LEICHT =
  '3.2.4d"Al" 0.1.8"le" 3.2.4"Jah" 1.2.4"re" | 0.2.2"wie" 2.3.2"der" | 0.3.4"kommt" 2.3.8"das" 0.2.8 1.2.4"Chris" 0.2.4"tus" | 2.3.2d"kind" r.4 | ' +
  '0.2.4"auf" 3.2.4"die" 0.1.4"Er" 3.2.4"de" | 3.1.2"nie" 2.1.4"der" 0.1.4 | 3.2.4"wo" 1.2.8"wir" 0.2.8 1.2.4"Men" 3.2.4"schen" | 0.2.2d"sind" r.4 |';

const ALLE_JAHRE_ANFAENGER =
  '3.2.4"Al" 0.1.4"le" 3.2.4"Jah" 1.2.4"re" | 0.2.2"wie" 2.3.2"der" | 0.3.4"kommt" 2.3.4"das" 1.2.4"Chris" 0.2.4"tus" | 2.3.2d"kind" r.4 | ' +
  '0.2.4"auf" 3.2.4"die" 0.1.4"Er" 3.2.4"de" | 3.1.2"nie" 2.1.4"der" 0.1.4 | 3.2.4"wo" 1.2.4"wir" 1.2.4"Men" 3.2.4"schen" | 0.2.2d"sind" r.4 |';

const WEIHNACHTSMANN_ANFAENGER =
  '0.3.4"Mor" 0.3.4"gen" 3.2.4"kommt" 3.2.4"der" | 0.1.4"Weih" 0.1.4"nachts" 3.2.2"mann" | 1.2.4"kommt" 1.2.4"mit" 0.2.4"sei" 0.2.4"nen" | 2.3.2"Ga" 0.3.2"ben" | ' +
  '3.2.4 3.2.4 1.2.4 1.2.4 | 0.2.4 0.2.4 2.3.2 | 3.2.4 3.2.4 1.2.4 1.2.4 | 0.2.4 0.2.4 2.3.2 | ' +
  '0.3.4 0.3.4 3.2.4 3.2.4 | 0.1.4 0.1.4 3.2.2 | 1.2.4 1.2.4 0.2.4 0.2.4 | 2.3.2 0.3.2 |';

const WEIHNACHTSMANN_MITTEL =
  '(0.3 3.6).4"Mor" 0.3.4"gen" (3.2 3.6).4"kommt" 3.2.4"der" | (0.1 3.5).4"Weih" 0.1.4"nachts" (3.2 3.6).2"mann" | (1.2 3.5).4"kommt" 1.2.4"mit" (0.2 3.6).4"sei" 0.2.4"nen" | (2.3 0.4).2"Ga" (0.3 3.6).2"ben" | ' +
  '(3.2 3.6).4 3.2.4 (1.2 3.5).4 1.2.4 | (0.2 3.6).4 0.2.4 (2.3 0.4).2 | (3.2 3.6).4 3.2.4 (1.2 3.5).4 1.2.4 | (0.2 3.6).4 0.2.4 (2.3 0.4).2 | ' +
  '(0.3 3.6).4 0.3.4 (3.2 3.6).4 3.2.4 | (0.1 3.5).4 0.1.4 (3.2 3.6).2 | (1.2 3.5).4 1.2.4 (0.2 3.6).4 0.2.4 | (2.3 0.4).2 (0.3 3.6).2 |';

export const BUILTIN_SONGS: BuiltinSongDef[] = [
  {
    id: 'happy-birthday',
    title: 'Happy Birthday',
    artist: 'Traditionell (Hill/Hill)',
    genre: 'Geburtstag',
    difficulty: 1,
    originalTempo: 100,
    year: 1893,
    rightsStatus: 'public-domain',
    goalTier: 'anfaenger',
    notes: PD_NOTE,
    versions: [
      { id: 'happy-birthday-anfaenger', label: 'Anfänger', kind: 'arrangement', description: 'Melodie in C-Dur, nur erste Lage, vereinfachter Rhythmus (gerade Achtel).', notation: HAPPY_BIRTHDAY_ANFAENGER, tempo: 92, timeSignature: [3, 4] },
      { id: 'happy-birthday-leicht', label: 'Leicht', kind: 'arrangement', description: 'Melodie mit dem originalen punktierten Rhythmus („Hap-py“).', notation: HAPPY_BIRTHDAY_LEICHT, tempo: 100, timeSignature: [3, 4] },
      { id: 'happy-birthday-mittel', label: 'Mittel', kind: 'arrangement', description: 'Melodie plus Basston auf der Eins jedes Takts (Daumen).', notation: HAPPY_BIRTHDAY_MITTEL, tempo: 96, timeSignature: [3, 4] },
    ],
  },
  {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    artist: 'James Lord Pierpont',
    genre: 'Weihnachten',
    difficulty: 1,
    originalTempo: 120,
    year: 1857,
    rightsStatus: 'public-domain',
    goalTier: 'anfaenger',
    notes: PD_NOTE,
    versions: [
      { id: 'jingle-bells-anfaenger', label: 'Anfänger', kind: 'arrangement', description: 'Nur der Refrain in C-Dur – alles auf den beiden hohen Saiten, Bund 0–3.', notation: JINGLE_CHORUS, tempo: 104, timeSignature: [4, 4] },
      { id: 'jingle-bells-leicht', label: 'Leicht', kind: 'arrangement', description: 'Strophe und Refrain komplett (Strophe reicht bis Bund 5).', notation: JINGLE_VERSE + JINGLE_CHORUS, tempo: 116, timeSignature: [4, 4] },
      { id: 'jingle-bells-mittel', label: 'Mittel', kind: 'arrangement', description: 'Refrain mit Bassbegleitung durch den Daumen.', notation: JINGLE_CHORUS_MITTEL, tempo: 108, timeSignature: [4, 4] },
    ],
  },
  {
    id: 'o-tannenbaum',
    title: 'O Tannenbaum',
    artist: 'Traditionell (Ernst Anschütz)',
    genre: 'Weihnachten',
    difficulty: 2,
    originalTempo: 96,
    year: 1824,
    rightsStatus: 'public-domain',
    goalTier: 'anfaenger',
    notes: PD_NOTE,
    versions: [
      { id: 'o-tannenbaum-anfaenger', label: 'Anfänger', kind: 'arrangement', description: 'Erste Zeile („O Tannenbaum, o Tannenbaum, wie treu sind deine Blätter“) mit vereinfachtem Rhythmus.', notation: TANNENBAUM_REFRAIN_ANFAENGER + '3.2.4"Blät" 1.2.4"ter" r.4 |', tempo: 88, timeSignature: [3, 4] },
      { id: 'o-tannenbaum-leicht', label: 'Leicht', kind: 'arrangement', description: 'Komplette Strophe (A–B–A) in C-Dur mit originalem Rhythmus; Mittelteil bis Bund 5.', notation: TANNENBAUM_REFRAIN_LEICHT + TANNENBAUM_STROPHE, tempo: 96, timeSignature: [3, 4] },
    ],
  },
  {
    id: 'stille-nacht',
    title: 'Stille Nacht',
    artist: 'Franz Xaver Gruber',
    genre: 'Weihnachten',
    difficulty: 2,
    originalTempo: 78,
    year: 1818,
    rightsStatus: 'public-domain',
    goalTier: 'anfaenger',
    notes: PD_NOTE,
    versions: [
      { id: 'stille-nacht-anfaenger', label: 'Anfänger', kind: 'arrangement', description: 'Melodie in C-Dur (6/8) mit vereinfachtem Rhythmus (gerade Achtel statt Punktierungen).', notation: STILLE_NACHT_ANFAENGER, tempo: 72, timeSignature: [6, 8] },
      { id: 'stille-nacht-leicht', label: 'Leicht', kind: 'arrangement', description: 'Melodie mit originalem wiegenden Rhythmus (punktierte Achtel + Sechzehntel).', notation: STILLE_NACHT_LEICHT, tempo: 78, timeSignature: [6, 8] },
    ],
  },
  {
    id: 'alle-jahre-wieder',
    title: 'Alle Jahre wieder',
    artist: 'Friedrich Silcher',
    genre: 'Weihnachten',
    difficulty: 1,
    originalTempo: 84,
    year: 1842,
    rightsStatus: 'public-domain',
    goalTier: 'anfaenger',
    notes: PD_NOTE,
    versions: [
      { id: 'alle-jahre-wieder-anfaenger', label: 'Anfänger', kind: 'arrangement', description: 'Melodie in G-Dur, Bund 0–3, nur Viertel und Halbe.', notation: ALLE_JAHRE_ANFAENGER, tempo: 76, timeSignature: [4, 4] },
      { id: 'alle-jahre-wieder-leicht', label: 'Leicht', kind: 'arrangement', description: 'Melodie mit den originalen Achtelpaaren.', notation: ALLE_JAHRE_LEICHT, tempo: 84, timeSignature: [4, 4] },
    ],
  },
  {
    id: 'morgen-kommt-der-weihnachtsmann',
    title: 'Morgen kommt der Weihnachtsmann',
    artist: 'Traditionell (Hoffmann von Fallersleben)',
    genre: 'Weihnachten',
    difficulty: 1,
    originalTempo: 100,
    year: 1835,
    rightsStatus: 'public-domain',
    goalTier: 'anfaenger',
    notes: PD_NOTE,
    versions: [
      { id: 'morgen-kommt-anfaenger', label: 'Anfänger', kind: 'arrangement', description: 'Melodie in G-Dur, nur Viertel und Halbe, Bund 0–3.', notation: WEIHNACHTSMANN_ANFAENGER, tempo: 92, timeSignature: [4, 4] },
      { id: 'morgen-kommt-mittel', label: 'Mittel', kind: 'arrangement', description: 'Melodie mit Basstönen auf den Zählzeiten 1 und 3.', notation: WEIHNACHTSMANN_MITTEL, tempo: 92, timeSignature: [4, 4] },
    ],
  },

];

export function getBuiltinSong(id: string): BuiltinSongDef | undefined {
  return BUILTIN_SONGS.find((s) => s.id === id);
}
