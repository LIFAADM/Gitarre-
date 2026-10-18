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
  prepExerciseIds?: string[];
  notes?: string;
  /** Nach dem Import auch im Kinder-Modus anbieten. */
  forKids?: boolean;
  versions: BuiltinVersionDef[];
}

const PD_NOTE = 'Gemeinfreies Lied – eigenes GuitarCoach-Arrangement für Konzertgitarre (Melodie in der ersten Lage).';
const IMPORT_NOTE =
  'Urheberrechtlich geschützter Song. GuitarCoach liefert keine fremden Tabs mit – importiere eine eigene, rechtmäßig erworbene Tab-Datei (Guitar Pro, MusicXML) und übe sie hier im Player. Bis dahin helfen die Vorübungen.';
const KIDS_IMPORT_NOTE =
  'Lied aus Film bzw. Hörspiel, urheberrechtlich geschützt. GuitarCoach liefert keine fremden Noten mit – importiere eine eigene, rechtmäßig erworbene Tab-Datei (Guitar Pro, MusicXML) oder tippe die Melodie im Tab-Editor ein. Danach erscheint das Lied auch im Kinder-Modus auf der Mitspiel-Bahn.';

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

  // ---------- Urheberrechtlich geschützte Songs: Eintrag + Vorübungen, Notendaten per Import ----------
  { id: 'elvis-love-me-tender', title: 'Love Me Tender', artist: 'Elvis Presley', genre: 'Rock ’n’ Roll', difficulty: 2, originalTempo: 72, year: 1956, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-fingerpicking-wechselbass', 'ex-tonleiter-c-dur'], notes: IMPORT_NOTE, versions: [] },
  { id: 'elvis-cant-help-falling-in-love', title: 'Can’t Help Falling in Love', artist: 'Elvis Presley', genre: 'Rock ’n’ Roll', difficulty: 2, originalTempo: 68, year: 1961, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-fingerpicking-wechselbass', 'ex-fingerpicking-em'], notes: IMPORT_NOTE, versions: [] },
  { id: 'elvis-jailhouse-rock', title: 'Jailhouse Rock', artist: 'Elvis Presley', genre: 'Rock ’n’ Roll', difficulty: 3, originalTempo: 168, year: 1957, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-chromatik-bass', 'ex-riff-e-saite-achtel'], notes: IMPORT_NOTE, versions: [] },
  { id: 'elvis-blue-suede-shoes', title: 'Blue Suede Shoes', artist: 'Elvis Presley', genre: 'Rock ’n’ Roll', difficulty: 3, originalTempo: 180, year: 1956, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-chromatik-bass', 'ex-riff-saitenwechsel'], notes: IMPORT_NOTE, versions: [] },
  { id: 'beatles-love-me-do', title: 'Love Me Do', artist: 'The Beatles', genre: 'Beatles', difficulty: 2, originalTempo: 148, year: 1962, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-melodie-d-dur', 'ex-rhythmus-viertel-achtel'], notes: IMPORT_NOTE, versions: [] },
  { id: 'beatles-yesterday', title: 'Yesterday', artist: 'The Beatles', genre: 'Beatles', difficulty: 3, originalTempo: 96, year: 1965, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-fingerpicking-wechselbass', 'ex-tonleiter-c-dur'], notes: IMPORT_NOTE, versions: [] },
  { id: 'beatles-let-it-be', title: 'Let It Be', artist: 'The Beatles', genre: 'Beatles', difficulty: 2, originalTempo: 72, year: 1970, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-tonleiter-c-dur', 'ex-fingerpicking-wechselbass'], notes: IMPORT_NOTE, versions: [] },
  { id: 'beatles-day-tripper', title: 'Day Tripper', artist: 'The Beatles', genre: 'Beatles', difficulty: 3, originalTempo: 140, year: 1965, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-saitenwechsel', 'ex-riff-e-saite-achtel'], notes: IMPORT_NOTE, versions: [] },
  { id: 'beatles-come-together', title: 'Come Together', artist: 'The Beatles', genre: 'Beatles', difficulty: 3, originalTempo: 82, year: 1969, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-saitenwechsel', 'ex-slide-vibrato'], notes: IMPORT_NOTE, versions: [] },
  { id: 'metallica-nothing-else-matters', title: 'Nothing Else Matters', artist: 'Metallica', genre: 'Metal', difficulty: 3, originalTempo: 69, year: 1991, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-fingerpicking-em', 'ex-fingerpicking-wechselbass'], notes: IMPORT_NOTE, versions: [] },
  { id: 'metallica-enter-sandman', title: 'Enter Sandman', artist: 'Metallica', genre: 'Metal', difficulty: 4, originalTempo: 123, year: 1991, rightsStatus: 'needs-import', goalTier: 'lang', prepExerciseIds: ['ex-riff-e-saite-achtel', 'ex-hammer-pull'], notes: IMPORT_NOTE, versions: [] },
  { id: 'metallica-one', title: 'One', artist: 'Metallica', genre: 'Metal', difficulty: 5, originalTempo: 108, year: 1988, rightsStatus: 'needs-import', goalTier: 'lang', prepExerciseIds: ['ex-fingerpicking-em', 'ex-pentatonik-am', 'ex-solo-kombination'], notes: IMPORT_NOTE, versions: [] },
  { id: 'metallica-fade-to-black', title: 'Fade to Black', artist: 'Metallica', genre: 'Metal', difficulty: 4, originalTempo: 112, year: 1984, rightsStatus: 'needs-import', goalTier: 'lang', prepExerciseIds: ['ex-fingerpicking-em', 'ex-hammer-pull'], notes: IMPORT_NOTE, versions: [] },
  { id: 'nena-99-luftballons', title: '99 Luftballons', artist: 'Nena', genre: 'Neue Deutsche Welle', difficulty: 2, originalTempo: 96, year: 1983, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-melodie-d-dur', 'ex-riff-offbeat'], notes: IMPORT_NOTE, versions: [] },
  { id: 'peter-schilling-major-tom', title: 'Major Tom (Völlig losgelöst)', artist: 'Peter Schilling', genre: 'Neue Deutsche Welle', difficulty: 2, originalTempo: 148, year: 1982, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-melodie-d-dur', 'ex-rhythmus-viertel-achtel'], notes: IMPORT_NOTE, versions: [] },
  { id: 'spider-murphy-gang-skandal-im-sperrbezirk', title: 'Skandal im Sperrbezirk', artist: 'Spider Murphy Gang', genre: 'Neue Deutsche Welle', difficulty: 3, originalTempo: 160, year: 1981, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-offbeat', 'ex-riff-chromatik-bass'], notes: IMPORT_NOTE, versions: [] },
  { id: 'falco-der-kommissar', title: 'Der Kommissar', artist: 'Falco', genre: 'Neue Deutsche Welle', difficulty: 3, originalTempo: 130, year: 1981, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-offbeat', 'ex-riff-saitenwechsel'], notes: IMPORT_NOTE, versions: [] },
  { id: 'bryan-adams-summer-of-69', title: 'Summer of ’69', artist: 'Bryan Adams', genre: 'Rock', difficulty: 3, originalTempo: 139, year: 1984, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-saitenwechsel', 'ex-rhythmus-viertel-achtel'], notes: IMPORT_NOTE, versions: [] },
  { id: 'bon-jovi-livin-on-a-prayer', title: 'Livin’ on a Prayer', artist: 'Bon Jovi', genre: 'Rock', difficulty: 4, originalTempo: 123, year: 1986, rightsStatus: 'needs-import', goalTier: 'lang', prepExerciseIds: ['ex-riff-offbeat', 'ex-pentatonik-am'], notes: IMPORT_NOTE, versions: [] },
  { id: 'guns-n-roses-sweet-child-o-mine', title: 'Sweet Child o’ Mine', artist: 'Guns N’ Roses', genre: 'Rock', difficulty: 5, originalTempo: 125, year: 1987, rightsStatus: 'needs-import', goalTier: 'lang', prepExerciseIds: ['ex-pentatonik-am', 'ex-solo-kombination', 'ex-chromatik-1234'], notes: IMPORT_NOTE, versions: [] },
  { id: 'nirvana-come-as-you-are', title: 'Come As You Are', artist: 'Nirvana', genre: 'Rock', difficulty: 2, originalTempo: 120, year: 1991, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-e-saite-achtel', 'ex-riff-saitenwechsel'], notes: IMPORT_NOTE, versions: [] },
  { id: 'oasis-wonderwall', title: 'Wonderwall', artist: 'Oasis', genre: 'Rock', difficulty: 3, originalTempo: 87, year: 1995, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-rhythmus-viertel-achtel', 'ex-melodie-d-dur'], notes: IMPORT_NOTE, versions: [] },
  { id: 'scorpions-wind-of-change', title: 'Wind of Change', artist: 'Scorpions', genre: 'Rock', difficulty: 3, originalTempo: 76, year: 1990, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-tonleiter-c-dur', 'ex-slide-vibrato'], notes: IMPORT_NOTE, versions: [] },
  { id: 'wham-last-christmas', title: 'Last Christmas', artist: 'Wham!', genre: 'Weihnachten', difficulty: 2, originalTempo: 108, year: 1984, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-offbeat', 'ex-melodie-d-dur'], notes: IMPORT_NOTE, versions: [] },

  // ---------- Kinder-Hits aus Film und Hörspiel: Eintrag + Vorübungen, Notendaten per Import (auch für den Kinder-Modus) ----------
  { id: 'smt1-titelsong', title: 'Die Schule der magischen Tiere (Titelsong)', artist: 'Sasha · Die Schule der magischen Tiere (Film 1)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2021, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur', 'ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'smt2-raeuberhauptmann', title: 'Räuberhauptmann', artist: 'Die Schule der magischen Tiere 2 (Filmsoundtrack)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2022, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-rhythmus-viertel-achtel', 'ex-riff-saitenwechsel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'smt2-adelheid', title: 'Adelheid', artist: 'Die Schule der magischen Tiere 2 (Filmsoundtrack)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2022, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur', 'ex-tonleiter-c-dur'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'smt2-die-raeuber-sind-besiegt', title: 'Die Räuber sind besiegt', artist: 'Die Schule der magischen Tiere 2 (Filmsoundtrack)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2022, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'smt3-karamell', title: 'Karamell', artist: 'Die Schule der magischen Tiere 3 (Filmsoundtrack)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2024, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur', 'ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'smt3-halt-das-ist-unser-wald', title: 'Halt, das ist unser Wald', artist: 'Die Schule der magischen Tiere 3 (Filmsoundtrack)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2024, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-rhythmus-viertel-achtel', 'ex-riff-saitenwechsel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'smt3-alles-nichts-ohne-dich', title: 'Alles nichts ohne dich', artist: 'LEA · Die Schule der magischen Tiere 3', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2024, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-tonleiter-c-dur', 'ex-fingerpicking-wechselbass'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'smt4-mein-herz-schreit-yeah', title: 'Mein Herz schreit yeah', artist: 'Esther Graf · Die Schule der magischen Tiere 4', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2025, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur', 'ex-riff-offbeat'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'smt4-quantentheorie', title: 'Quantentheorie', artist: 'Annett Louisan · Die Schule der magischen Tiere 4', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2025, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-tonleiter-c-dur'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'smt4-lol', title: 'LOL', artist: 'Die Schule der magischen Tiere 4 (Filmsoundtrack)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2025, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'bt1-up-up-up', title: 'Up, Up, Up (Nobody’s Perfect)', artist: 'Lina Larissa Strahl · Bibi & Tina (Film 1)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2014, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur', 'ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'bt1-titelsong', title: 'Bibi & Tina (Titelsong)', artist: 'Bibi & Tina · Peter Plate, Ulf Leo Sommer', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2014, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'bt3-maedchen-gegen-jungs', title: 'Mädchen gegen Jungs', artist: 'Bibi & Tina (Film 3)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2016, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-riff-offbeat', 'ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'bt3-bester-sommer', title: 'Bester Sommer', artist: 'Bibi & Tina (Film 3)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2016, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'bt3-feuer-feuer', title: 'Feuer, Feuer!', artist: 'Bibi & Tina (Film 3)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 3, year: 2016, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-e-saite-achtel', 'ex-riff-offbeat'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'bt3-funky-monkey', title: 'Funky Monkey', artist: 'Bibi & Tina (Film 3)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 3, year: 2016, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-offbeat', 'ex-riff-saitenwechsel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'bt3-happy-end', title: 'Happy End', artist: 'Bibi & Tina (Film 3)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2016, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-tonleiter-c-dur'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'bt3-cheerleader-song', title: 'Cheerleader Song', artist: 'Bibi & Tina (Film 3)', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2016, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-titelsong', title: 'Eule findet den Beat (Titel-Song)', artist: 'Eule', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2014, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur', 'ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-finde-deinen-beat', title: 'Finde deinen Beat', artist: 'Eule', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2014, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-pop-song', title: 'Pop-Song', artist: 'Eule findet den Beat', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2014, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-rock-song', title: 'Rock-Song', artist: 'Eule findet den Beat', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 3, year: 2014, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-e-saite-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-jazz-song', title: 'Jazz-Song', artist: 'Eule findet den Beat', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 3, year: 2014, rightsStatus: 'needs-import', goalTier: 'mittel', prepExerciseIds: ['ex-riff-offbeat', 'ex-tonleiter-c-dur'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-jeder-braucht-liebe', title: 'Jeder braucht Liebe', artist: 'Eule findet den Beat – mit Gefühl', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2020, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-tonleiter-c-dur'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-gemeinschaft-macht-stark', title: 'Gemeinschaft macht stark', artist: 'Eule findet den Beat – mit Gefühl', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2020, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-oh-ich-freu-mich', title: 'Oh ich freu mich', artist: 'Eule findet den Beat – mit Gefühl', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2020, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-ueberall-zuhaus', title: 'Überall zuhaus', artist: 'Eule findet den Beat – mit Instrumenten', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2022, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-melodie-d-dur'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-kapitaenin-der-band', title: 'Kapitänin der Band', artist: 'Eule findet den Beat – mit Instrumenten', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2022, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-rhythmus-viertel-achtel'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
  { id: 'eule-das-kann-nur-musik', title: 'Das kann nur Musik', artist: 'Eule feat. DIKKA · Eule findet den Beat – mit Instrumenten', genre: 'Kinder-Hits (Film & Hörspiel)', difficulty: 2, year: 2022, rightsStatus: 'needs-import', goalTier: 'anfaenger', prepExerciseIds: ['ex-riff-offbeat'], notes: KIDS_IMPORT_NOTE, forKids: true, versions: [] },
];

export function getBuiltinSong(id: string): BuiltinSongDef | undefined {
  return BUILTIN_SONGS.find((s) => s.id === id);
}
