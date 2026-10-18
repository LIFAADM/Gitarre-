/**
 * Coach-Tipps: regelbasierte, situationsbezogene Hinweise aus echten Messwerten – ohne Zufall, ohne
 * Netz. Reine Logik (testbar); Anzeige und Sprachausgabe übernehmen die Feature-Komponenten.
 *
 * Grundsätze: Ein Tipp erscheint erst, wenn sich ein Muster wiederholt (nicht beim ersten Fehler),
 * höchstens einer alle paar Sekunden, derselbe Tipp pro Sitzung nur einmal. Lob kommt sparsam.
 */

import type { Summary } from '../progress/stats';

export interface CoachTip {
  id: string;
  /** Anzeigetext. */
  text: string;
  /** Kürzere Fassung für die Sprachausgabe (sonst `text`). */
  spoken?: string;
  kind: 'hint' | 'praise' | 'info';
}

function hint(id: string, text: string, spoken?: string): CoachTip {
  return spoken ? { id, text, spoken, kind: 'hint' } : { id, text, kind: 'hint' };
}

/** Drosselt Tipps: Mindestabstand, jede ID nur einmal (außer wiederholbar). */
export class TipGate {
  private lastAt = Number.NEGATIVE_INFINITY;
  private readonly given = new Set<string>();

  constructor(private readonly cooldownMs: number) {}

  offer(tip: CoachTip | null, now: number, repeatable = false): CoachTip | null {
    if (!tip) return null;
    if (now - this.lastAt < this.cooldownMs) return null;
    if (!repeatable && this.given.has(tip.id)) return null;
    this.given.add(tip.id);
    this.lastAt = now;
    return tip;
  }

  reset(): void {
    this.lastAt = Number.NEGATIVE_INFINITY;
    this.given.clear();
  }
}

/* ------------------------------ Spiel-mit-Modus ------------------------------ */

export type ListenVerdictLike = { kind: 'match' } | { kind: 'near'; direction: 'tief' | 'hoch'; cents: number } | { kind: 'octave' } | { kind: 'wrong'; midi: number };

export interface ListenObservation {
  verdict: ListenVerdictLike;
  expected: ReadonlyArray<{ string: number; fret: number; midi: number }>;
}

interface ListenEntry {
  kind: ListenVerdictLike['kind'];
  fretted: boolean;
  open: boolean;
  /** „near“ mit ≥ 70 Cent Abstand: vermutlich ein Bund daneben. */
  oneFretOff: boolean;
  /** „near“ unter 70 Cent: Intonation (Druck, Fingerposition) oder Stimmung. */
  intonation: 'tief' | 'hoch' | null;
  /** „wrong“ mit Quart-/Terzabstand: vermutlich die Nachbarsaite. */
  neighbour: boolean;
}

export const LISTEN_TIPS = {
  oneFret: hint('listen-one-fret', 'Du liegst einen Bund daneben. Zähle die Bünde vom Sattel aus: Der erste Bund ist das Feld direkt hinter dem Sattel.', 'Du liegst einen Bund daneben. Zähle die Bünde vom Sattel aus.'),
  neighbour: hint('listen-neighbour', 'Das war die Nachbarsaite. Die dünnste Saite unten ist Saite 1, die dickste oben Saite 6. Schlag nur die eine Saite an, die anderen mit der Handkante dämpfen.', 'Das war die Nachbarsaite. Die dünnste Saite ist Saite eins, die dickste Saite sechs.'),
  octave: hint('listen-octave', 'Richtiger Ton, falsche Oktave: Meist ist es die falsche Saite. Vergleiche Saite und Bund mit dem Griffbrett oben.', 'Falsche Oktave heißt meist falsche Saite. Vergleiche mit dem Griffbrett.'),
  pressLow: hint('listen-press-low', 'Der Ton ist etwas zu tief: Drücke die Saite dicht hinter dem Bundstäbchen fest herunter, nicht in der Mitte des Bundes. Die Fingerkuppe steht senkrecht.', 'Etwas zu tief. Drücke dicht hinter dem Bundstäbchen fest herunter.'),
  pressHigh: hint('listen-press-high', 'Der Ton ist etwas zu hoch: Du ziehst die Saite vermutlich seitlich weg. Finger senkrecht aufsetzen und gerade nach unten drücken.', 'Etwas zu hoch. Nicht seitlich ziehen, gerade nach unten drücken.'),
  retune: hint('listen-retune', 'Die leeren Saiten klingen verstimmt. Stimme kurz nach, sonst sind alle Töne daneben, obwohl du richtig greifst.', 'Die leeren Saiten klingen verstimmt. Stimme kurz nach.'),
  slowDown: hint('listen-slow', 'Mach kurz Pause: Höre den Referenzton an, vergleiche Saite und Bund mit dem Griffbrett und spiele dann ruhig den nächsten Ton.', 'Kurz Pause. Höre den Referenzton an und vergleiche mit dem Griffbrett.'),
  noSignal: hint('listen-no-signal', 'Ich höre nichts. Schlage die Saite etwas kräftiger an und halte das iPhone näher an das Schallloch.', 'Ich höre nichts. Schlage kräftiger an und halte das iPhone näher an die Gitarre.'),
} as const;

const PRAISE: CoachTip[] = [
  { id: 'praise-5', text: 'Fünf Treffer in Folge. Sehr gut, bleib so gleichmäßig.', spoken: 'Fünf in Folge. Sehr gut.', kind: 'praise' },
  { id: 'praise-10', text: 'Zehn Treffer in Folge. Das sitzt, probiere die Stelle danach etwas schneller.', spoken: 'Zehn in Folge. Das sitzt.', kind: 'praise' },
];

export class ListenCoach {
  private history: ListenEntry[] = [];
  private matchesInRow = 0;
  private readonly gate = new TipGate(12_000);

  reset(): void {
    this.history = [];
    this.matchesInRow = 0;
    this.gate.reset();
  }

  observe(o: ListenObservation, now: number): CoachTip | null {
    const v = o.verdict;
    if (v.kind === 'match') {
      this.matchesInRow += 1;
      this.history.push({ kind: 'match', fretted: false, open: false, oneFretOff: false, intonation: null, neighbour: false });
      if (this.matchesInRow === 5) return this.gate.offer(PRAISE[0]!, now, true);
      if (this.matchesInRow === 10) return this.gate.offer(PRAISE[1]!, now, true);
      return null;
    }
    this.matchesInRow = 0;
    const fretted = o.expected.some((p) => p.fret > 0);
    const open = o.expected.length > 0 && o.expected.every((p) => p.fret === 0);
    const entry: ListenEntry = {
      kind: v.kind,
      fretted,
      open,
      oneFretOff: v.kind === 'near' && Math.abs(v.cents) >= 70,
      intonation: v.kind === 'near' && Math.abs(v.cents) < 70 ? v.direction : null,
      neighbour: v.kind === 'wrong' && o.expected.some((p) => [4, 5].includes(Math.abs(v.midi - p.midi))),
    };
    this.history.push(entry);
    const recent = this.history.slice(-3);
    const last2 = this.history.slice(-2);
    const count = (pred: (e: ListenEntry) => boolean): number => recent.filter(pred).length;

    let tip: CoachTip | null = null;
    if (count((e) => e.oneFretOff) >= 2) tip = LISTEN_TIPS.oneFret;
    else if (last2.length === 2 && last2.every((e) => e.neighbour)) tip = LISTEN_TIPS.neighbour;
    else if (last2.length === 2 && last2.every((e) => e.kind === 'octave')) tip = LISTEN_TIPS.octave;
    else if (last2.length === 2 && last2.every((e) => e.intonation === 'tief' && e.fretted)) tip = LISTEN_TIPS.pressLow;
    else if (last2.length === 2 && last2.every((e) => e.intonation === 'hoch' && e.fretted)) tip = LISTEN_TIPS.pressHigh;
    else if (last2.length === 2 && last2.every((e) => e.intonation !== null && e.open)) tip = LISTEN_TIPS.retune;
    else if (recent.length === 3 && recent.every((e) => e.kind !== 'match')) tip = LISTEN_TIPS.slowDown;
    return this.gate.offer(tip, now);
  }

  /** Aufrufen, solange kein Signal anliegt; `silentMs` = Dauer der Stille. */
  noSignal(silentMs: number, now: number): CoachTip | null {
    if (silentMs < 6000) return null;
    return this.gate.offer(LISTEN_TIPS.noSignal, now);
  }
}

/** Tipp zum Ergebnis eines Durchgangs; `hardBars` = Taktnummern (1-basiert) mit übersprungenen Tönen. */
export function listenResultTip(correct: number, total: number, hardBars: number[] = []): CoachTip | null {
  if (total === 0) return null;
  const pct = (correct / total) * 100;
  const bars = [...new Set(hardBars)].sort((a, b) => a - b).slice(0, 3);
  const barText = bars.length ? ` Schau dir ${bars.length === 1 ? `Takt ${bars[0]}` : `die Takte ${bars.join(', ')}`} im Player mit Schleife an.` : '';
  if (pct >= 90) return { id: 'result-great', text: `Fast alles richtig. Nächster Schritt: etwas schneller oder die nächste Version.${barText}`, kind: 'praise' };
  if (pct >= 60) return { id: 'result-good', text: `Gute Grundlage. Übe die Stellen, die schiefgingen, einzeln und langsam.${barText}`, kind: 'hint' };
  return { id: 'result-slow', text: `Nimm dir nur wenige Töne pro Durchgang vor und spiele sie ganz langsam, bis sie sitzen.${barText}`, kind: 'hint' };
}

/* --------------------------------- Stimmgerät --------------------------------- */

export interface TunerObservation {
  stringNumber: number;
  name: string;
  direction: 'low' | 'high' | 'ok';
  cents: number;
  farOff: boolean;
  nearestName: string;
}

interface DirectionEntry {
  string: number;
  direction: 'low' | 'high' | 'ok';
  at: number;
}

export class TunerCoach {
  private readonly gate = new TipGate(15_000);
  private directions: DirectionEntry[] = [];
  private readonly okAt = new Map<number, number>();
  private farSince: { string: number; at: number } | null = null;
  private offSince: { string: number; direction: 'low' | 'high'; at: number } | null = null;

  reset(): void {
    this.gate.reset();
    this.directions = [];
    this.okAt.clear();
    this.farSince = null;
    this.offSince = null;
  }

  update(o: TunerObservation | null, now: number): CoachTip | null {
    if (!o) {
      this.farSince = null;
      this.offSince = null;
      return null;
    }
    if (o.farOff) {
      if (!this.farSince || this.farSince.string !== o.stringNumber) this.farSince = { string: o.stringNumber, at: now };
      else if (now - this.farSince.at >= 1500) {
        return this.gate.offer(hint(`tuner-far-${o.stringNumber}`, `Das klingt nach ${o.nearestName}, nicht nach der ${o.name}-Saite. Spiele die Saite leer, ohne zu greifen, und nur diese eine Saite.`, `Das klingt nach ${o.nearestName}. Spiele die ${o.name}-Saite leer und einzeln an.`), now);
      }
      return null;
    }
    this.farSince = null;

    const last = this.directions[this.directions.length - 1];
    if (!last || last.string !== o.stringNumber || last.direction !== o.direction) this.directions.push({ string: o.stringNumber, direction: o.direction, at: now });

    if (o.direction === 'ok') {
      this.okAt.set(o.stringNumber, now);
      this.offSince = null;
      return null;
    }

    // Zurückgerutscht: war vor kurzem gestimmt und ist jetzt wieder zu tief
    const okBefore = this.okAt.get(o.stringNumber);
    if (o.direction === 'low' && okBefore !== undefined && now - okBefore > 5000 && now - okBefore < 120_000) {
      const tip = this.gate.offer(hint(`tuner-slip-${o.stringNumber}`, `Die ${o.name}-Saite ist wieder zu tief gerutscht. Neue Saiten dehnen sich: Stimme sie von unten kommend hoch und ziehe sie zwischendurch sanft lang.`, `Die ${o.name}-Saite ist wieder zu tief gerutscht. Von unten kommend hochstimmen.`), now);
      if (tip) return tip;
    }

    // Überdrehen: zu tief → zu hoch → zu tief auf derselben Saite innerhalb kurzer Zeit
    const same = this.directions.filter((e) => e.string === o.stringNumber && e.direction !== 'ok').slice(-3);
    if (same.length === 3 && same[0]!.direction !== same[1]!.direction && same[1]!.direction !== same[2]!.direction && now - same[0]!.at < 25_000) {
      const tip = this.gate.offer(hint(`tuner-overshoot-${o.stringNumber}`, 'Du drehst zu weit. Immer nur ein kleines Stück am Wirbel, dann neu anschlagen und nachsehen.', 'Du drehst zu weit. Nur ein kleines Stück drehen, dann neu anschlagen.'), now);
      if (tip) return tip;
    }

    // Lange deutlich daneben in derselben Richtung: mutiger drehen
    if (Math.abs(o.cents) > 30) {
      if (!this.offSince || this.offSince.string !== o.stringNumber || this.offSince.direction !== o.direction) this.offSince = { string: o.stringNumber, direction: o.direction, at: now };
      else if (now - this.offSince.at >= 12_000) {
        return this.gate.offer(hint(`tuner-bolder-${o.stringNumber}`, `Die Richtung stimmt, aber du bist noch deutlich daneben. Dreh den Wirbel ruhig etwas weiter ${o.direction === 'low' ? 'an' : 'auf'} und schlage dann neu an.`, 'Die Richtung stimmt. Dreh ruhig etwas weiter und schlage neu an.'), now);
      }
    } else this.offSince = null;
    return null;
  }
}

/* ----------------------------------- Player ----------------------------------- */

export function playthroughTip(tempoFactor: number): CoachTip {
  const pct = Math.round(tempoFactor * 100);
  if (tempoFactor < 0.5) return hint('play-25', `Durchlauf bei ${pct} % geschafft. Spiel ihn noch zweimal so sauber, dann geh auf 50 %.`);
  if (tempoFactor < 0.75) return hint('play-50', `Durchlauf bei ${pct} % geschafft. Nächster Schritt: 75 %. Erst schneller werden, wenn alle Töne sauber sitzen.`);
  if (tempoFactor < 1) return hint('play-75', `Durchlauf bei ${pct} % geschafft. Jetzt das Originaltempo versuchen, und wenn es hakt, kurz zurück auf 75 %.`);
  return { id: 'play-100', text: 'Im Originaltempo durchgespielt, stark! Prüfe mit „Spiel mit“, ob jeder Ton sitzt, oder nimm dir die nächste Version vor.', spoken: 'Im Originaltempo durchgespielt. Stark! Prüfe mit Spiel mit, ob jeder Ton sitzt.', kind: 'praise' };
}

/** Beim ersten Start eines noch nie durchgespielten Stücks in vollem Tempo. */
export function startTip(info: { completedPlaythroughs: number; tempoFactor: number; bars: number }): CoachTip | null {
  if (info.completedPlaythroughs > 0 || info.tempoFactor < 1 || info.bars <= 4) return null;
  return hint('play-start-slow', 'Neues Stück: Fang mit 50 % Tempo an. Langsam und richtig ist schneller gelernt als schnell und falsch.', 'Neues Stück. Fang mit fünfzig Prozent Tempo an.');
}

/* ------------------------------- Tipp des Tages ------------------------------- */

export const DAILY_TIPS: readonly string[] = [
  'Stimme die Gitarre vor jedem Üben. Nur so lernt dein Ohr, wie richtig klingt.',
  'Kurz und täglich schlägt lang und selten: Zehn Minuten jeden Tag bringen mehr als eine Stunde am Wochenende.',
  'Drücke die Saite dicht hinter dem Bundstäbchen herunter, nicht in der Mitte des Bundes. Das braucht weniger Kraft und klingt sauber.',
  'Die Fingerkuppen schmerzen in den ersten Wochen. Das ist normal und vergeht, sobald sich Hornhaut bildet. Mach Pausen, aber bleib dran.',
  'Der Daumen der Greifhand liegt flach hinter dem Hals, etwa auf Höhe des Mittelfingers. Nicht über den Hals greifen.',
  'Die Fingernägel der Greifhand kurz halten, sonst kannst du die Saiten nicht senkrecht herunterdrücken.',
  'Übe so langsam, dass du keinen Fehler machst. Fehler, die du oft wiederholst, lernst du mit.',
  'Vor dem Üben zwei Minuten einspielen: Leere Saiten, dann die Finger einzeln in den ersten Bünden.',
  'Nimm dich mit dem iPhone auf und hör es dir an. Von außen hört man Unsauberkeiten, die man beim Spielen überhört.',
  'Setz dich aufrecht auf die vordere Stuhlkante, die Gitarre liegt auf dem linken Bein, der Hals zeigt leicht nach oben.',
  'Atme ruhig weiter, während du spielst. Angehaltener Atem macht die Hände steif.',
  'Das Metronom ist dein Übungspartner: Erst mit Klick langsam und gleichmäßig, dann das Tempo in kleinen Schritten erhöhen.',
  'Ein schwieriger Takt lässt sich mit der Schleife im Player zehnmal hintereinander üben. Das ist effektiver als der ganze Song von vorn.',
  'Die Anschlaghand bleibt locker. Der Daumen spielt die drei dicken Saiten, Zeige-, Mittel- und Ringfinger die drei dünnen.',
  'Wenn ein Ton schnarrt, liegt der Finger meist zu weit vom Bundstäbchen weg oder drückt zu schwach.',
  'Nach dem Üben die Hände ausschütteln und kurz dehnen. Verspannungen werden sonst zur Gewohnheit.',
  'Schau beim Üben nicht nur auf die Greifhand. Versuche, die Position zu fühlen, der Blick darf zu den Noten gehen.',
  'Nylonsaiten dehnen sich nach dem Aufziehen tagelang. Dann häufiger nachstimmen, das ist kein Fehler deinerseits.',
  'Lerne ein Stück rückwärts: zuerst die letzten zwei Takte, dann die zwei davor. So wird das Ende nie der schwache Teil.',
  'Klingt ein Akkord dumpf, prüfe jede Saite einzeln. So findest du den Finger, der eine Nachbarsaite berührt.',
  'Mach kleine Ziele pro Tag: einen Takt sauber, eine Lektion fertig. Das motiviert mehr als ein ganzer Song auf einmal.',
  'Höre dir die Lieder, die du lernst, mehrmals bewusst an. Wer die Melodie im Kopf hat, findet die Töne leichter.',
  'Lege die Gitarre sichtbar in Reichweite statt in den Koffer. Was man sieht, nimmt man öfter in die Hand.',
  'Feuchtigkeit und Wärme verändern die Stimmung. Stimme nach, wenn die Gitarre aus einem anderen Raum kommt.',
];

export interface DailyTipInput {
  now: number;
  summary: Summary;
}

/** Datengetriebener Tipp, sonst der Tipp des Tages (pro Kalendertag gleich). */
export function dailyTip(input: DailyTipInput): CoachTip {
  const s = input.summary;
  if (s.practiceDays >= 3 && s.streak === 0) return { id: 'daily-habit', text: 'Du hattest schon einige Übungstage, zuletzt aber eine Pause. Lieber jeden Tag zehn Minuten als einmal pro Woche eine Stunde: Finger und Gedächtnis lernen über Nacht.', kind: 'hint' };
  if (s.todayMinutes >= 45) return { id: 'daily-break', text: 'Du hast heute schon viel geübt. Gönn deinen Fingerkuppen eine Pause, Hornhaut braucht Zeit und Konzentration lässt nach 45 Minuten nach.', kind: 'info' };
  if (s.bestAccuracy !== null && s.bestAccuracy < 60 && s.practiceDays >= 2) return { id: 'daily-slow', text: 'Deine Trefferquote steigt am schnellsten, wenn du das Tempo so weit senkst, dass du fehlerfrei spielst. Erst dann schneller werden.', kind: 'hint' };
  if (s.streak >= 7) return { id: 'daily-streak', text: `${s.streak} Tage in Folge geübt. Genau so entsteht Fortschritt. Belohne dich heute mit einem Lieblingslied.`, kind: 'praise' };
  const dayIndex = Math.floor(input.now / 86_400_000);
  const idx = dayIndex % DAILY_TIPS.length;
  return { id: `daily-${idx}`, text: DAILY_TIPS[idx]!, kind: 'info' };
}
