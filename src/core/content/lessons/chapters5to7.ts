import type { ChapterDef } from './types';

export const CHAPTER_5: ChapterDef = {
  id: 'k5',
  number: 5,
  title: 'Erste Rock-Riffs',
  subtitle: 'Riffs, Rhythmus und Rocktechniken auf der Konzertgitarre',
  lessons: [
    {
      id: 'k5-l1-was-ist-ein-riff',
      title: 'Was ist ein Riff?',
      goal: 'Du weißt, was ein Riff ist, und spielst dein erstes Achtel-Riff auf der E-Saite.',
      minutes: 10,
      content: `## Das Riff – das Markenzeichen eines Songs
Ein **Riff** ist eine kurze, prägnante Tonfolge, die sich immer wieder wiederholt. Denk an das Intro von „Enter Sandman“, „Come As You Are“ oder „Day Tripper“: Du erkennst den Song nach zwei Sekunden – das ist die Macht des Riffs.

## Riffs leben auf den tiefen Saiten
Die meisten Rock-Riffs spielen sich auf der **E- und A-Saite** ab, oft mit vielen leeren Saiten. Der Rhythmus ist dabei wichtiger als viele verschiedene Töne.

## Auf der Konzertgitarre?
Ja! Riffs klingen auf Nylonsaiten anders – wärmer, perkussiver – aber du lernst genau dieselben Bewegungen, die du später auf jeder Gitarre brauchst. Schlag die tiefen Saiten mit dem **Daumen** oder mit dem **Zeigefinger nach unten** an.

## Dein erstes Riff
Die Übung besteht fast nur aus der leeren E-Saite in **Achteln** – acht gleichmäßige Anschläge pro Takt – und kleinen Ausflügen zu Bund 1, 2 und 3.`,
      practice: 'Starte bei 50 % mit Metronom. Die Achtel müssen absolut gleichmäßig sein. Steigere in 10-%-Schritten bis 100 %.',
      exercise: { kind: 'exercise', exerciseId: 'ex-riff-e-saite-achtel', tempoPercent: 50 },
      checklist: ['Die Achtel sind gleichmäßig.', 'Ich schaffe das Riff bei 75 %.'],
    },
    {
      id: 'k5-l2-mehrere-saiten',
      title: 'Einzelne Töne auf mehreren Saiten',
      goal: 'Du wechselst innerhalb eines Riffs sauber zwischen E-, A- und D-Saite.',
      minutes: 10,
      content: `## Saitenwechsel ohne Stolpern
Die meisten Riffs springen zwischen zwei oder drei Saiten. Der Trick: Die rechte Hand **bleibt dicht an den Saiten** und macht kleine Bewegungen – kein weites Ausholen.

## Linke Hand: Finger liegen lassen
Wenn ein Ton kurz darauf wiederkommt (z. B. Bund 3 auf der E-Saite), lass den Finger einfach liegen. So sparst du Zeit und vermeidest Nebengeräusche.

## Abdämpfen
Beim Wechsel von der E- auf die A-Saite klingt die E-Saite nach. Lege den Daumen nach dem Anschlag leicht auf die E-Saite (Apoyando) – das stoppt sie automatisch.`,
      practice: 'Übe Takt 1 allein im Loop, bis der Wechsel E → A sitzt. Dann Takt 2 (A → D) und schließlich das ganze Riff.',
      exercise: { kind: 'exercise', exerciseId: 'ex-riff-saitenwechsel', tempoPercent: 50 },
    },
    {
      id: 'k5-l3-wiederkehrende-riffs',
      title: 'Einfache wiederkehrende Riffs',
      goal: 'Du spielst ein zweitaktiges Riff mit Wiederholungszeichen und variiertem Schluss.',
      minutes: 12,
      content: `## Wiederholungszeichen
In Tabs stehen Riffs oft nur einmal, mit **Wiederholungszeichen** (die Taktstriche mit den zwei Punkten). GuitarCoach rollt die Wiederholungen für dich aus: Du siehst jeden Durchgang.

## Frage und Antwort
Gute Riffs funktionieren wie ein Gespräch: Takt 1 stellt eine „Frage“, Takt 2 gibt die „Antwort“. In unserem E-Moll-Riff ist die Frage immer gleich, die Antwort ändert sich.

## E-Moll
Das Riff benutzt die Töne E, G, H – zusammen ergeben sie den Akkord **E-Moll**, die „Heimat“ unzähliger Rocksongs (auch von „Nothing Else Matters“).`,
      practice: 'Riff bei 50 % im Loop, dann steigern. Achte darauf, dass die Pause am Ende wirklich still ist – Saiten abdämpfen!',
      exercise: { kind: 'exercise', exerciseId: 'ex-riff-em', tempoPercent: 50 },
    },
    {
      id: 'k5-l4-rhythmisch',
      title: 'Rhythmisches Spielen – Offbeats',
      goal: 'Du spielst Töne auf den „und“-Zählzeiten und hältst dabei den Puls.',
      minutes: 10,
      content: `## Der Groove liegt zwischen den Schlägen
Viele Pop- und NDW-Songs („Skandal im Sperrbezirk“, „Der Kommissar“) leben von **Offbeats**: Die Gitarre spielt nicht **auf** den Schlag, sondern genau **dazwischen** – auf „und“.

## So zählst du
„1 **und** 2 **und** 3 **und** 4 **und**“ – auf den Zahlen kommt nichts (Pause oder Metronom-Klick), auf **und** spielst du.

## Hilfe beim Üben
1. Metronom an. Zähle laut mit.
2. Klopfe zuerst nur mit dem Fuß die Zahlen und klatsche die „und“s.
3. Dann dasselbe mit der Gitarre: Pause auf dem Klick, Ton zwischen den Klicks.

Das fühlt sich anfangs seltsam an – nach ein paar Minuten „rastet“ es ein.`,
      practice: 'Beginne bei 50 % mit Metronom. Erst wenn die Offbeats stabil sind, Tempo steigern.',
      exercise: { kind: 'exercise', exerciseId: 'ex-riff-offbeat', tempoPercent: 50 },
      checklist: ['Ich kann bei 75 % durchgehend auf „und“ spielen.'],
    },
    {
      id: 'k5-l5-rocktechniken',
      title: 'Grundlegende Rocktechniken: Palm Mute und Akzente',
      goal: 'Du dämpfst mit dem Handballen (Palm Mute) und setzt Akzente.',
      minutes: 10,
      content: `## Palm Mute (P.M.)
Lege den **Handballen der rechten Hand** leicht auf die Saiten, direkt vor dem Steg. Die Töne klingen kurz und perkussiv („tschuck tschuck“). In der Tabulatur steht **P.M.** über den Noten.

- Zu viel Druck: Der Ton verschwindet ganz.
- Zu weit vorne (Richtung Schallloch): Der Ton wird nur dumpf.
- Genau richtig: Der Ton ist hörbar, aber kurz und trocken.

## Akzente
Nicht alle Töne sind gleich laut. Spiele den **ersten Ton eines Takts** und die ungedämpften Töne etwas kräftiger – so bekommt das Riff Kontur.

## Walking-Bass im Rock ’n’ Roll
Die Übung dieser Lektion ist eine laufende Basslinie im Stil der 50er-Jahre – die Grundlage von „Jailhouse Rock“ oder „Blue Suede Shoes“. Spiele sie mit leichtem Palm Mute.`,
      practice: 'Erst ohne Palm Mute für die richtigen Töne, dann mit Handballen. Den Bund 4 greift der kleine Finger.',
      exercise: { kind: 'exercise', exerciseId: 'ex-riff-chromatik-bass', tempoPercent: 50 },
    },
    {
      id: 'k5-l6-vorbereitung-songs',
      title: 'Vorbereitende Übungen zu deinen Lieblingssongs',
      goal: 'Du weißt, welche Übung welchen Song vorbereitet, und übst gezielt daran.',
      minutes: 12,
      content: `## Von der Übung zum Song
GuitarCoach enthält keine fremden Tabs – aber für jeden deiner Lieblingssongs **eigene Vorübungen**, die genau die Technik trainieren, die du für den Song brauchst:

- **Achtel-Riff auf der E-Saite** → Enter Sandman, Come As You Are
- **Riff mit Saitenwechsel E–A–D** → Day Tripper, Come Together, Summer of ’69
- **Walking-Bass** → Jailhouse Rock, Blue Suede Shoes
- **Offbeats** → Skandal im Sperrbezirk, Der Kommissar, Last Christmas
- **Melodie in D-Dur** → 99 Luftballons, Major Tom

## Und dann?
Sobald du eine rechtmäßig erworbene Tab-Datei (Guitar Pro oder MusicXML) des Songs hast, importiere sie unter „Meine Songs“. Der Player spielt sie langsam, in Schleifen und Note für Note – genau wie die Übungen hier.

## Heute
Die Melodie-Übung in D-Dur: singbar, mit Achteln und einem Ausflug bis zum 5. Bund.`,
      practice: 'Melodie bei 60 % lernen, dann steigern. Öffne danach unter „Meine Songs“ einen Lieblingssong und schau dir seine Vorübungen an.',
      exercise: { kind: 'exercise', exerciseId: 'ex-melodie-d-dur', tempoPercent: 60 },
    },
  ],
};

export const CHAPTER_6: ChapterDef = {
  id: 'k6',
  number: 6,
  title: 'Fingerpicking',
  subtitle: 'Daumen und Finger werden unabhängig',
  lessons: [
    {
      id: 'k6-l1-unabhaengigkeit',
      title: 'Unabhängigkeit der Finger',
      goal: 'Deine Greiffinger arbeiten einzeln und kontrolliert – auch der kleine Finger.',
      minutes: 10,
      content: `## Fingergymnastik
Die berühmte **1–2–3–4-Übung**: Zeige-, Mittel-, Ring- und kleiner Finger greifen nacheinander vier Bünde auf jeder Saite. Sie trainiert Kraft, Dehnung und vor allem **Unabhängigkeit** – jeder Finger macht genau das, was er soll.

## Regeln
- Jeder Finger **bleibt liegen**, bis der nächste greift (beim Aufwärtsgehen).
- Die Finger bleiben nah über den Saiten – maximal einen Zentimeter.
- Lieber langsam und sauber als schnell und schlampig.

## Rechte Hand
Spiele im Wechselschlag i–m. Beim Wechsel zur nächsten Saite wandern die Finger mit.`,
      practice: 'Starte bei 50 % mit Metronom. Diese Übung darf jeden Tag zwei Minuten dauern – sie ist das „Zähneputzen“ des Gitarristen.',
      exercise: { kind: 'exercise', exerciseId: 'ex-chromatik-1234', tempoPercent: 50 },
    },
    {
      id: 'k6-l2-daumenanschlag',
      title: 'Daumenanschlag',
      goal: 'Der Daumen spielt Bassnoten sicher und mit vollem Ton – die Basis jedes Zupfmusters.',
      minutes: 8,
      content: `## Der Daumen führt
Beim Fingerpicking spielt der Daumen den **Bass** und hält damit den Puls. Er muss unabhängig von den Fingern funktionieren – wie ein eigener Musiker.

## Technik-Check
- Der Daumen schlägt **von der Seite** an, nicht von oben.
- Das Daumengelenk bleibt stabil; die Bewegung kommt aus dem Grundgelenk an der Handwurzel.
- Nach dem Anschlag kommt der Daumen **vor** den Fingern zur Ruhe (nicht unter ihnen), damit er den Fingern nicht in die Quere kommt.

## Klang
Ein guter Bass klingt rund und voll. Experimentiere: Spielst du näher am Steg, wird der Ton härter; näher am Hals, weicher.`,
      practice: 'Übung mit gleichmäßigen Vierteln auf E, A, D. Metronom an, Tempo langsam steigern.',
      exercise: { kind: 'exercise', exerciseId: 'ex-daumen-bass' },
    },
    {
      id: 'k6-l3-wechselbass',
      title: 'Wechselbass',
      goal: 'Der Daumen pendelt zwischen zwei Bass-Saiten, während die Finger dazu zupfen.',
      minutes: 12,
      content: `## Das Herz des Folk- und Country-Pickings
Beim **Wechselbass** spielt der Daumen abwechselnd zwei Bass-Saiten – z. B. A und D beim C-Dur-Akkord, E und D beim G-Dur. Dazwischen zupfen Zeige- und Mittelfinger die hohen Saiten. Es entsteht ein „Boom-tschick-Boom-tschick“.

## Schritt für Schritt
1. Erst **nur den Daumen**: A – D – A – D, gleichmäßig.
2. Dann die Finger dazu: Daumen auf 1 und 3, Finger auf 2 und 4.
3. Beide Hälften fließen zusammen: p – m – p – a.

## Für Balladen
Dieses Muster trägt Lieder wie „Love Me Tender“, „Can’t Help Falling in Love“ oder „Yesterday“. Wenn du eigene Tabs importierst, erkennst du es sofort wieder.`,
      practice: 'Übung bei 50 % im Loop. Erst Takt 1, dann Takt 2 (anderer Basston), dann der Schlussakkord.',
      exercise: { kind: 'exercise', exerciseId: 'ex-fingerpicking-wechselbass', tempoPercent: 50 },
    },
    {
      id: 'k6-l4-arpeggios',
      title: 'Arpeggios',
      goal: 'Du zerlegst einen Akkord in einzelne Töne (p–i–m–a) – gleichmäßig und klingend.',
      minutes: 12,
      content: `## Gebrochene Akkorde
Ein **Arpeggio** ist ein Akkord, dessen Töne nacheinander statt gleichzeitig erklingen. Alle Töne **klingen ineinander** – die Finger der linken Hand bleiben liegen, die rechte Hand zupft p – i – m – a.

## E-Moll – ganz ohne greifen
Die leeren Saiten E, G, H, E ergeben zusammen **E-Moll**. Dein erstes Arpeggio braucht also keinen Griff – du kannst dich voll auf die rechte Hand konzentrieren.

## Technik
- Alle vier Finger vorbereiten (auf die Saiten legen), dann nacheinander zupfen.
- Nach dem Zupfen bleibt der Finger kurz in der Luft und kehrt zur Saite zurück.
- Gleichmäßig: Jeder Ton gleich lang, gleich laut (der Daumen minimal kräftiger).`,
      practice: 'Loop bei 50 %, dann 75 %, dann 100 %. Ziel: zwei Minuten ohne Unterbrechung mit völlig entspannter Hand.',
      exercise: { kind: 'exercise', exerciseId: 'ex-fingerpicking-em', tempoPercent: 50 },
      checklist: ['Alle vier Töne klingen gleichmäßig.', 'Die Hand bleibt locker.'],
    },
    {
      id: 'k6-l5-zupfmuster',
      title: 'Zupfmuster',
      goal: 'Du spielst ein 6/8-Zupfmuster über E-Moll und A-Moll mit Akkordwechsel.',
      minutes: 15,
      content: `## p–i–m–a–m–i
Das vielleicht wichtigste Zupfmuster überhaupt: hinauf und wieder hinunter. Im **6/8-Takt** gespielt, wiegt es sanft – perfekt für Balladen.

## Der erste gegriffene Akkord: A-Moll
- Zeigefinger (1): H-Saite, Bund 1
- Mittelfinger (2): D-Saite, Bund 2
- Ringfinger (3): G-Saite, Bund 2

Setze alle drei Finger gleichzeitig und prüfe jede Saite einzeln auf sauberen Klang.

## Akkordwechsel
Von E-Moll (leer) zu A-Moll: Setze die Finger **während der letzten beiden Töne** des vorigen Takts – der Wechsel wird mit der Zeit unhörbar.`,
      practice: 'Erst die E-Moll-Takte (leer) im Loop, dann A-Moll allein, dann der Wechsel. Tempo 60 %.',
      exercise: { kind: 'exercise', exerciseId: 'ex-zupfmuster', tempoPercent: 60 },
    },
    {
      id: 'k6-l6-nothing-else-matters',
      title: 'Vorbereitung auf „Nothing Else Matters“',
      goal: 'Du beherrschst die Technik, die das Intro der Ballade trägt – Em-Arpeggio in Achteln.',
      minutes: 15,
      content: `## Worum es geht
Das Intro von Metallicas „Nothing Else Matters“ ist ein in **Achteln gezupftes E-Moll-Arpeggio über leere Saiten** – genau die Technik aus den letzten Lektionen. Es steht im 6/8-Takt und ist langsam (♩ ≈ 69). James Hetfield spielt es mit den Fingern, nicht mit dem Plektrum – auf der Konzertgitarre bist du also sogar im Vorteil.

## Was du jetzt üben kannst
1. Das Em-Arpeggio (p–i–m–a) absolut gleichmäßig, mit Metronom in 6/8.
2. Das Zupfmuster p–i–m–a–m–i aus der letzten Lektion bei 50–70 %.
3. Lange Töne klingen lassen: Nichts abdämpfen, alles „let ring“.

## Der Song selbst
GuitarCoach liefert keine fremden Tabs mit. Besorge dir eine rechtmäßige Tab-Datei (z. B. ein gekauftes Guitar-Pro-Songbook) und importiere sie unter „Meine Songs“. Dann kannst du das Intro bei 25–50 % Tempo in der Schleife üben und Note für Note nachspielen – mit genau den Bewegungen, die du hier gelernt hast.`,
      practice: 'Em-Arpeggio zehn Minuten bei 50 %, dann 75 %. Erst wenn es mühelos ist, ans Original wagen.',
      exercise: { kind: 'exercise', exerciseId: 'ex-fingerpicking-em', tempoPercent: 50 },
    },
  ],
};

export const CHAPTER_7: ChapterDef = {
  id: 'k7',
  number: 7,
  title: 'Fortgeschrittene Techniken',
  subtitle: 'Hammer-ons, Pull-offs, Slides, Vibrato, Solos',
  lessons: [
    {
      id: 'k7-l1-hammer-on',
      title: 'Hammer-ons',
      goal: 'Du erzeugst den zweiten Ton einer Bindung allein mit der Greifhand.',
      minutes: 10,
      content: `## Aufhämmern statt anschlagen
Beim **Hammer-on** (in Tabs: **h** bzw. Bogen mit „H“) schlägst du nur den ersten Ton an. Den zweiten, höheren Ton erzeugst du, indem ein Finger **kräftig und schnell** auf den höheren Bund „hämmert“.

## Technik
- Der Finger kommt aus etwa 1–2 cm Höhe, **senkrecht** und mit Schwung.
- Lande **direkt hinter dem Bundstäbchen** – dann klingt der Ton auch ohne viel Kraft.
- Der erste Finger bleibt liegen.

## Typische Fehler
Zu langsam oder zu flach aufgesetzt → der Ton ist leise oder fehlt. Übe die Bewegung mit lockerem Handgelenk, nicht mit Kraft aus dem Arm.`,
      practice: 'Erste Hälfte der Übung (Hammer-ons) im Loop bei 60 %. Der zweite Ton soll fast so laut sein wie der erste.',
      exercise: { kind: 'exercise', exerciseId: 'ex-hammer-pull', tempoPercent: 60 },
    },
    {
      id: 'k7-l2-pull-off',
      title: 'Pull-offs',
      goal: 'Du ziehst den Finger so ab, dass der tiefere Ton von selbst klingt.',
      minutes: 10,
      content: `## Abziehen
Der **Pull-off** (**p**) ist der umgekehrte Hammer-on: Zwei Finger liegen auf, der höhere Ton klingt; dann **ziehst du den oberen Finger leicht nach unten weg** – wie ein winziger Anschlag mit der Greifhand – und der tiefere Ton erklingt.

## Wichtig
- Der untere Finger (oder die leere Saite) ist schon **vorbereitet**, bevor du abziehst.
- Nicht einfach loslassen, sondern **zupfend wegziehen** – Richtung Boden.
- Auf Nylonsaiten brauchst du etwas mehr Schwung als auf Stahlsaiten.

## Kombination
Hammer-on + Pull-off hintereinander ergibt einen **Triller** – die Basis vieler Solo-Licks.`,
      practice: 'Zweite Hälfte der Übung (Pull-offs) im Loop bei 60 %, dann die ganze Übung.',
      exercise: { kind: 'exercise', exerciseId: 'ex-hammer-pull', tempoPercent: 60 },
    },
    {
      id: 'k7-l3-slides',
      title: 'Slides',
      goal: 'Du rutschst mit gehaltenem Druck von einem Bund zum nächsten.',
      minutes: 8,
      content: `## Gleiten
Beim **Slide** (**s** bzw. Schrägstrich in der Tab) schlägst du einen Ton an und **rutschst mit gedrücktem Finger** zum Zielbund. Der Ton gleitet hörbar mit – ein sehr ausdrucksstarker Effekt, z. B. in „Come Together“.

## Technik
- Den Druck **während des Rutschens halten** – lässt du nach, bricht der Ton ab.
- Das Handgelenk bewegt sich mit, der Finger bleibt gerundet.
- Am Ziel genau hinter dem Bundstäbchen ankommen.

## Richtung
Aufwärts-Slides (zum höheren Bund) sind leichter; Abwärts-Slides brauchen etwas mehr Kontrolle.`,
      practice: 'Übung bei 75 %: In jedem Takt ein Slide, dann ein langer Ton mit Vibrato (nächste Lektion).',
      exercise: { kind: 'exercise', exerciseId: 'ex-slide-vibrato', tempoPercent: 75 },
    },
    {
      id: 'k7-l4-vibrato',
      title: 'Vibrato',
      goal: 'Du belebst lange Töne mit einem kontrollierten Vibrato.',
      minutes: 8,
      content: `## Der Ton lebt
**Vibrato** (**v** bzw. „~“) lässt die Tonhöhe ganz leicht und regelmäßig schwanken. Lange Töne klingen dadurch wärmer und „singender“.

## Klassisches Vibrato (Nylonsaiten)
Anders als bei E-Gitarren ziehst du die Saite nicht seitlich, sondern bewegst den Finger **entlang der Saite** (Richtung Steg – Richtung Sattel), mit Druck. Die Bewegung kommt aus dem Unterarm, nicht aus dem Fingergelenk.

## Dosierung
- Langsam und breit = dramatisch
- Schnell und schmal = nervös
Beginne langsam und gleichmäßig, wie ein Pendel. Das Vibrato setzt **nach** dem Anschlag ein, nicht gleichzeitig.`,
      practice: 'Übung: Nach jedem Slide den Zielton zwei Schläge mit Vibrato halten. Höre dir die Schwankung bewusst an.',
      exercise: { kind: 'exercise', exerciseId: 'ex-slide-vibrato', tempoPercent: 75 },
    },
    {
      id: 'k7-l5-schnellere-tonfolgen',
      title: 'Saitenwechsel und schnellere Tonfolgen',
      goal: 'Du spielst Tonleitern flüssig über alle Saiten – die Vorstufe zum Solo.',
      minutes: 12,
      content: `## Geschwindigkeit entsteht durch Ökonomie
Schnell spielen heißt nicht schnell bewegen, sondern **wenig bewegen**: Finger nah an den Saiten, präziser Wechselschlag i–m, keine überflüssigen Sprünge.

## Die Tempo-Treppe (Erinnerung)
Dreimal sauber → 5 % schneller. Fehler → zwei Stufen zurück. So baust du Geschwindigkeit auf, ohne Fehler einzuüben.

## Saitenwechsel mit i–m
Beim Wechsel von einer Saite zur nächsten darf der Fingerwechsel nicht abreißen: i spielt die G-Saite, m die H-Saite, i die H-Saite, m die E-Saite … Das Muster läuft einfach weiter.

## Übung: C-Dur-Tonleiter
Jetzt auf 100 %, danach 125 %. Immer mit Metronom.`,
      practice: 'C-Dur-Tonleiter: heute 100 % anpeilen, mit der Tempo-Treppe. Achte auf gleichmäßigen Wechselschlag.',
      exercise: { kind: 'exercise', exerciseId: 'ex-tonleiter-c-dur' },
    },
    {
      id: 'k7-l6-einfache-solos',
      title: 'Einfache Solos: die Pentatonik',
      goal: 'Du spielst einen Pentatonik-Lick in A-Moll in der fünften Lage.',
      minutes: 15,
      content: `## Fünf Töne für tausend Solos
Die **Moll-Pentatonik** besteht aus fünf Tönen und passt fast immer. Rock-Gitarristen von Slash bis Kirk Hammett nutzen sie ständig. In A-Moll liegt sie bequem in der **fünften Lage**: Zeigefinger auf Bund 5, Ringfinger auf 7, kleiner Finger auf 8.

## Lagenspiel
Zum ersten Mal verlässt du die erste Lage. Die Hand rutscht hoch, sodass der Zeigefinger über Bund 5 steht – und bleibt dort. Jeder Finger ist weiter für „seinen“ Bund zuständig (1 = 5, 3 = 7, 4 = 8).

## Der Lick
Abwärts durch das „Kästchen“, wieder hinauf, und zum Schluss ein langer Ton mit Vibrato. Das ist die Grundlage für Solos wie in „Sweet Child o’ Mine“ oder „One“.`,
      practice: 'Lick bei 50 % im Loop, erst Takt 1, dann Takt 2, dann alles. Auf saubere Töne achten – Geschwindigkeit kommt von allein.',
      exercise: { kind: 'exercise', exerciseId: 'ex-pentatonik-am', tempoPercent: 50 },
    },
    {
      id: 'k7-l7-kleines-solo',
      title: 'Kombination: ein kleines Solo',
      goal: 'Du kombinierst Hammer-ons, Pull-offs, Slides und Vibrato zu einer Solo-Phrase.',
      minutes: 15,
      content: `## Alles zusammen
In dieser Phrase steckt alles aus Kapitel 7: Hammer-ons in der ersten Zeile, ein Slide mit Vibrato, Pull-offs abwärts durch die Pentatonik und ein langer Schlusston.

## So lernst du ein Solo
1. **Zerlegen**: Jeder Takt ist eine eigene Mini-Übung (Schleife!).
2. **Langsam**: 50 % oder weniger. Jede Technik muss sauber klingen.
3. **Verbinden**: Takt 1+2, dann 3+4, dann alles.
4. **Tempo**: Tempo-Treppe bis 100 %.

## Danach
Du bist bereit für echte Solos aus importierten Tabs. Nutze den Einzeltonmodus, um Fingersätze zu verstehen, und die Schleife, um schwierige Läufe zu meistern. Gib dir Zeit – jedes Solo, das du hörst, wurde genau so geübt.`,
      practice: 'Takte einzeln im Loop bei 50 %, dann verbinden. Ziel heute: das Solo bei 75 % durchspielen.',
      exercise: { kind: 'exercise', exerciseId: 'ex-solo-kombination', tempoPercent: 50 },
      checklist: ['Jede Technik ist einzeln sauber.', 'Das Solo klappt bei 75 %.'],
    },
  ],
};
