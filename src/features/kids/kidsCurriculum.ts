/**
 * Kinder-Schule: geführter Lehrgang in kleinen Schritten nach dem Prinzip
 * Erklären → Vormachen → Nachmachen → Üben → Verstehen. Jede Lektion schaltet die nächste frei.
 * Reine Daten und Logik (testbar); gesprochen wird alles über die Sprachbegleitung.
 */

import { kidString, midiOf, positionPhrase } from './kidsData';

export interface KidTarget {
  string: number;
  fret: number;
}

export type KidsStep =
  /** Erklären: kurzer Satz, wird vorgelesen; weiter per großer Taste. */
  | { kind: 'explain'; emoji: string; text: string; speak: string; show?: KidTarget }
  /** Vormachen: die App spielt die Töne vor. */
  | { kind: 'show'; emoji: string; text: string; speak: string; targets: KidTarget[] }
  /** Nachmachen: das Kind spielt die Töne einmal nach (Mikrofon). */
  | { kind: 'imitate'; emoji: string; text: string; speak: string; targets: KidTarget[] }
  /** Üben: dieselben Töne mehrmals hintereinander. */
  | { kind: 'practice'; emoji: string; text: string; speak: string; targets: KidTarget[]; repeat: number }
  /** Verstehen: die App spielt einen Ton aus dem Gelernten, das Kind findet ihn ohne Hilfe. */
  | { kind: 'check'; emoji: string; text: string; speak: string; pool: KidTarget[]; rounds: number }
  /** Lied: auf der Mitspiel-Bahn spielen (Lektion gilt als geschafft, wenn das Lied durch ist). */
  | { kind: 'song'; emoji: string; text: string; speak: string; songId: string };

export interface KidsLesson {
  id: string;
  title: string;
  emoji: string;
  /** Ein Satz für die Übersicht (wird vorgelesen). */
  goal: string;
  steps: KidsStep[];
}

const open = (string: number): KidTarget => ({ string, fret: 0 });
const t = (string: number, fret: number): KidTarget => ({ string, fret });

function stringLesson(string: number, learned: number[]): KidsLesson {
  const s = kidString(string);
  const name = `${s.word} Saite`;
  const thick = string >= 5 ? 'dick und klingt tief' : string <= 2 ? 'dünn und klingt hoch' : 'mittel';
  const pool = [...learned, string].map(open);
  return {
    id: `saite-${string}`,
    title: `Die ${name}`,
    emoji: '🎸',
    goal: `Du lernst die ${name} kennen und findest sie mit geschlossenen Augen.`,
    steps: [
      { kind: 'explain', emoji: '👀', text: `Das ist die ${name}.`, speak: `Schau auf deine Gitarre. Die ${name} ist Saite Nummer ${string}. Sie ist ${thick}. Leg den Daumen locker darauf, aber zupf noch nicht.`, show: open(string) },
      { kind: 'show', emoji: '👂', text: 'Hör zu.', speak: `Hör zu, so klingt die ${name}.`, targets: [open(string), open(string)] },
      { kind: 'imitate', emoji: '🫵', text: 'Jetzt du!', speak: `Jetzt du. Zupf die ${name} einmal mit dem Daumen. Nur diese eine Saite.`, targets: [open(string)] },
      { kind: 'practice', emoji: '🔁', text: 'Dreimal hintereinander.', speak: `Super. Jetzt dreimal hintereinander. Lass die Saite jedes Mal ausklingen.`, targets: [open(string)], repeat: 3 },
      ...(learned.length > 0
        ? [
            {
              kind: 'check' as const,
              emoji: '🧠',
              text: 'Welche Saite war das?',
              speak: `Jetzt wird geraten. Ich spiele eine Saite, die du schon kennst. Du spielst sie nach.`,
              pool,
              rounds: Math.min(4, pool.length + 1),
            },
          ]
        : [{ kind: 'check' as const, emoji: '🧠', text: 'Finde die Saite ohne Hilfe.', speak: `Letzte Aufgabe: Ich spiele die ${name} vor, du spielst sie nach, ohne dass sie leuchtet.`, pool, rounds: 2 }]),
    ],
  };
}

const STRING_ORDER = [6, 5, 4, 3, 2, 1];

export const KIDS_LESSONS: readonly KidsLesson[] = [
  {
    id: 'start',
    title: 'Hallo Gitarre',
    emoji: '👋',
    goal: 'Du hältst die Gitarre richtig und hörst alle Saiten.',
    steps: [
      { kind: 'explain', emoji: '🪑', text: 'Setz dich gerade hin.', speak: 'Hallo! Setz dich gerade auf einen Stuhl. Die Gitarre liegt auf deinem Bein, der Hals zeigt nach links. Die linke Hand hält den Hals, die rechte Hand zupft.' },
      { kind: 'explain', emoji: '🌈', text: 'Sechs Saiten, sechs Farben.', speak: 'Deine Gitarre hat sechs Saiten. In der App haben sie Farben: Rot ist die dicke Saite oben, Lila die dünne Saite unten.' },
      { kind: 'show', emoji: '👂', text: 'Hör alle Saiten.', speak: 'Hör zu. Ich spiele alle Saiten von oben nach unten.', targets: STRING_ORDER.map(open) },
      { kind: 'imitate', emoji: '🫵', text: 'Streich einmal über alle Saiten.', speak: 'Jetzt du. Streich mit dem Daumen langsam von der dicken roten Saite bis zur dünnen lila Saite. Ich höre zu.', targets: [open(6)] },
      { kind: 'practice', emoji: '🔁', text: 'Noch zweimal.', speak: 'Schön. Noch zweimal, ganz langsam, jede Saite einzeln hörbar.', targets: [open(6)], repeat: 2 },
      { kind: 'explain', emoji: '⭐', text: 'Geschafft!', speak: 'Das war der erste Ton auf deiner Gitarre. In der nächsten Lektion lernst du die rote Saite richtig kennen.' },
    ],
  },
  stringLesson(6, []),
  stringLesson(5, [6]),
  stringLesson(4, [6, 5]),
  stringLesson(3, [6, 5, 4]),
  stringLesson(2, [6, 5, 4, 3]),
  stringLesson(1, [6, 5, 4, 3, 2]),
  {
    id: 'regenbogen',
    title: 'Regenbogen rauf und runter',
    emoji: '🌈',
    goal: 'Du spielst alle Saiten nacheinander, erst langsam, dann als Lied.',
    steps: [
      { kind: 'explain', emoji: '🌈', text: 'Alle Farben nacheinander.', speak: 'Jetzt kommen alle sechs Saiten nacheinander: rot, orange, gelb, grün, blau, lila. Das ist wie ein Regenbogen.' },
      { kind: 'show', emoji: '👂', text: 'Hör zu.', speak: 'Hör zu, alle sechs Saiten nacheinander.', targets: STRING_ORDER.map(open) },
      { kind: 'imitate', emoji: '🫵', text: 'Spiel den Regenbogen nach.', speak: 'Jetzt du. Eine Saite nach der anderen. Die App zeigt dir, welche dran ist.', targets: STRING_ORDER.map(open) },
      { kind: 'practice', emoji: '🔁', text: 'Noch zweimal.', speak: 'Toll. Jetzt noch zweimal, schön gleichmäßig.', targets: STRING_ORDER.map(open), repeat: 2 },
      { kind: 'song', emoji: '🎵', text: 'Dein erstes Lied!', speak: 'Jetzt spielst du das Lied Regenbogen rauf und runter auf der Bahn. Die Farben laufen zur weißen Linie. Tippe auf Lied spielen.', songId: 'regenbogen' },
    ],
  },
  {
    id: 'erster-finger',
    title: 'Der erste gedrückte Ton',
    emoji: '☝️',
    goal: 'Du drückst die gelbe Saite im zweiten Bund und hörst den Unterschied.',
    steps: [
      { kind: 'explain', emoji: '☝️', text: 'Finger auf die gelbe Saite, zweiter Bund.', speak: 'Jetzt greift die linke Hand. Leg den Zeigefinger auf die gelbe Saite, in das zweite Feld, dicht hinter dem Metallstäbchen. Drück fest mit der Fingerspitze.', show: t(4, 2) },
      { kind: 'show', emoji: '👂', text: 'Leer und gedrückt.', speak: 'Hör den Unterschied: erst die gelbe Saite leer, dann gedrückt im zweiten Bund.', targets: [open(4), t(4, 2)] },
      { kind: 'imitate', emoji: '🫵', text: 'Erst leer, dann gedrückt.', speak: 'Jetzt du. Erst die gelbe Saite leer, dann mit dem Finger im zweiten Bund.', targets: [open(4), t(4, 2)] },
      { kind: 'practice', emoji: '🔁', text: 'Dreimal gedrückt.', speak: 'Jetzt dreimal den gedrückten Ton. Wenn er schnarrt, drück fester und näher ans Stäbchen.', targets: [t(4, 2)], repeat: 3 },
      { kind: 'check', emoji: '🧠', text: 'Leer oder gedrückt?', speak: 'Ich spiele leer oder gedrückt. Du spielst genau das nach.', pool: [open(4), t(4, 2)], rounds: 4 },
    ],
  },
  {
    id: 'drei-toene',
    title: 'Drei Töne: C, D, E',
    emoji: '🎶',
    goal: 'Du spielst C, D und E hintereinander – der Anfang von „Alle meine Entchen“.',
    steps: [
      { kind: 'explain', emoji: '🎶', text: 'C, D, E.', speak: 'Drei Töne: C ist die orange Saite im dritten Bund, D ist die gelbe Saite leer, E ist die gelbe Saite im zweiten Bund.', show: t(5, 3) },
      { kind: 'show', emoji: '👂', text: 'Hör zu.', speak: 'Hör zu: C, D, E.', targets: [t(5, 3), open(4), t(4, 2)] },
      { kind: 'imitate', emoji: '🫵', text: 'Spiel C, D, E.', speak: 'Jetzt du. Orange dritter Bund, gelb leer, gelb zweiter Bund.', targets: [t(5, 3), open(4), t(4, 2)] },
      { kind: 'practice', emoji: '🔁', text: 'Dreimal C, D, E.', speak: 'Dreimal hintereinander. Langsam ist richtig.', targets: [t(5, 3), open(4), t(4, 2)], repeat: 3 },
      { kind: 'check', emoji: '🧠', text: 'Welcher Ton war das?', speak: 'Ich spiele einen der drei Töne. Du spielst ihn nach.', pool: [t(5, 3), open(4), t(4, 2)], rounds: 4 },
    ],
  },
  {
    id: 'entchen',
    title: 'Alle meine Entchen',
    emoji: '🦆',
    goal: 'Du spielst dein erstes richtiges Lied mit gedrückten Tönen.',
    steps: [
      { kind: 'explain', emoji: '🦆', text: 'Noch zwei Töne: F und G.', speak: 'Für das Entchen-Lied brauchst du noch zwei Töne: F ist die gelbe Saite im dritten Bund, G ist die grüne Saite leer.', show: t(4, 3) },
      { kind: 'show', emoji: '👂', text: 'C D E F G.', speak: 'Hör den Anfang: C, D, E, F, G, G.', targets: [t(5, 3), open(4), t(4, 2), t(4, 3), open(3), open(3)] },
      { kind: 'imitate', emoji: '🫵', text: 'Spiel den Anfang nach.', speak: 'Jetzt du: C, D, E, F, G, G.', targets: [t(5, 3), open(4), t(4, 2), t(4, 3), open(3), open(3)] },
      { kind: 'practice', emoji: '🔁', text: 'Zweimal den Anfang.', speak: 'Noch zweimal den Anfang.', targets: [t(5, 3), open(4), t(4, 2), t(4, 3), open(3), open(3)], repeat: 2 },
      { kind: 'song', emoji: '🎵', text: 'Das ganze Lied!', speak: 'Jetzt das ganze Lied auf der Bahn. Die Bahn wartet auf dich, bis jeder Ton stimmt. Tippe auf Lied spielen.', songId: 'alle-meine-entchen' },
    ],
  },
  {
    id: 'haenschen',
    title: 'Hänschen klein',
    emoji: '🎒',
    goal: 'Du spielst „Hänschen klein“ mit den fünf Tönen, die du kennst.',
    steps: [
      { kind: 'explain', emoji: '🎒', text: 'Alle Töne kennst du schon.', speak: 'Hänschen klein braucht nur Töne, die du schon kennst: G, E, F, D und C.' },
      { kind: 'show', emoji: '👂', text: 'G E E, F D D.', speak: 'Hör den Anfang: G, E, E. F, D, D.', targets: [open(3), t(4, 2), t(4, 2), t(4, 3), open(4), open(4)] },
      { kind: 'imitate', emoji: '🫵', text: 'Spiel den Anfang nach.', speak: 'Jetzt du: G, E, E. F, D, D.', targets: [open(3), t(4, 2), t(4, 2), t(4, 3), open(4), open(4)] },
      { kind: 'check', emoji: '🧠', text: 'Welcher Ton?', speak: 'Ich spiele einen Ton, du spielst ihn nach.', pool: [t(5, 3), open(4), t(4, 2), t(4, 3), open(3)], rounds: 4 },
      { kind: 'song', emoji: '🎵', text: 'Das ganze Lied!', speak: 'Jetzt Hänschen klein auf der Bahn. Tippe auf Lied spielen.', songId: 'haenschen-klein' },
    ],
  },
  {
    id: 'jakob',
    title: 'Bruder Jakob',
    emoji: '🔔',
    goal: 'Du lernst den Ton A und spielst „Bruder Jakob“.',
    steps: [
      { kind: 'explain', emoji: '🔔', text: 'Neuer Ton: A.', speak: 'Ein neuer Ton: A ist die grüne Saite im zweiten Bund. Und ganz unten brauchst du das tiefe G: rote Saite, dritter Bund.', show: t(3, 2) },
      { kind: 'show', emoji: '👂', text: 'G A G F E C.', speak: 'Hör zu: G, A, G, F, E, C.', targets: [open(3), t(3, 2), open(3), t(4, 3), t(4, 2), t(5, 3)] },
      { kind: 'imitate', emoji: '🫵', text: 'Spiel es nach.', speak: 'Jetzt du: G, A, G, F, E, C.', targets: [open(3), t(3, 2), open(3), t(4, 3), t(4, 2), t(5, 3)] },
      { kind: 'practice', emoji: '🔁', text: 'Tiefes G und C.', speak: 'Jetzt der Schluss: C, tiefes G, C. Dreimal.', targets: [t(5, 3), t(6, 3), t(5, 3)], repeat: 3 },
      { kind: 'song', emoji: '🎵', text: 'Das ganze Lied!', speak: 'Jetzt Bruder Jakob auf der Bahn. Tippe auf Lied spielen.', songId: 'bruder-jakob' },
    ],
  },
];

export function kidsLesson(id: string): KidsLesson | undefined {
  return KIDS_LESSONS.find((l) => l.id === id);
}

/** Freigeschaltet ist die erste Lektion und jede, deren Vorgängerin geschafft ist. */
export function isLessonUnlocked(lessonId: string, done: readonly string[]): boolean {
  const idx = KIDS_LESSONS.findIndex((l) => l.id === lessonId);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return done.includes(KIDS_LESSONS[idx - 1]!.id);
}

export function nextKidsLesson(done: readonly string[]): KidsLesson | undefined {
  return KIDS_LESSONS.find((l) => !done.includes(l.id));
}

export function lessonAfter(lessonId: string): KidsLesson | undefined {
  const idx = KIDS_LESSONS.findIndex((l) => l.id === lessonId);
  return idx >= 0 ? KIDS_LESSONS[idx + 1] : undefined;
}

/** Ansage einer Zielposition (für Nachmachen/Üben). */
export function targetPhrase(target: KidTarget): string {
  return positionPhrase(target.string, target.fret);
}

export function targetMidi(target: KidTarget): number {
  return midiOf(target.string, target.fret);
}

/** Zufälliges Ziel aus dem Pool, möglichst nicht dasselbe wie zuletzt. */
export function pickCheckTarget(pool: readonly KidTarget[], rng: () => number, previous?: KidTarget): KidTarget {
  const candidates = pool.length > 1 && previous ? pool.filter((p) => p.string !== previous.string || p.fret !== previous.fret) : [...pool];
  return candidates[Math.floor(rng() * candidates.length)] ?? pool[0]!;
}
