import type { ChapterDef } from './types';

export const CHAPTER_1: ChapterDef = {
  id: 'k1',
  number: 1,
  title: 'Meine Gitarre',
  subtitle: 'Instrument kennenlernen, richtig sitzen, stimmen',
  lessons: [
    {
      id: 'k1-l1-aufbau',
      title: 'Aufbau einer Konzertgitarre',
      goal: 'Du kennst die Teile deiner Gitarre und weißt, wofür sie da sind.',
      minutes: 5,
      content: `## Von oben nach unten
- **Kopfplatte mit Wirbeln**: Mit den sechs Wirbeln (Stimmmechaniken) spannst du die Saiten und stimmst damit die Gitarre.
- **Sattel**: Der kleine weiße Steg am Übergang zum Hals. Hier beginnt die schwingende Saite – deshalb heißt eine ungegriffene Saite „leere Saite“.
- **Hals und Griffbrett**: Die Metallstäbchen heißen **Bundstäbchen**, die Felder dazwischen **Bünde**. Der erste Bund liegt direkt am Sattel.
- **Korpus mit Schallloch**: Der hohle Körper verstärkt den Klang. Über dem Schallloch schlägst du die Saiten an.
- **Steg mit Stegeinlage**: Hier sind die Saiten unten verknotet. Steg und Sattel legen die klingende Saitenlänge (Mensur) fest.

## Warum ist das wichtig?
In den Lektionen sprechen wir ständig von „Bund 3“, „Sattel“ oder „über dem Schallloch“. Wenn du die Begriffe kennst, kannst du jede Anweisung sofort umsetzen.`,
      practice: 'Nimm deine Gitarre in die Hand und berühre nacheinander: Wirbel, Sattel, 1. Bund, 12. Bund (meist mit Punkt markiert), Schallloch, Steg. Zähle die Bundstäbchen bis zum Korpus.',
      exercise: { kind: 'fretboard', mode: 'explore' },
      tips: ['Der 12. Bund teilt die Saite genau in der Mitte – dort klingt die Saite eine Oktave höher als leer.'],
      checklist: ['Ich kann Sattel, Bund und Steg zeigen.', 'Ich weiß, was eine leere Saite ist.'],
    },
    {
      id: 'k1-l2-nylonsaiten',
      title: 'Nylonsaiten – weich, warm, anfängerfreundlich',
      goal: 'Du weißt, was Nylonsaiten besonders macht und wie du sie pflegst.',
      minutes: 4,
      content: `## Drei dünne, drei umsponnene Saiten
Die drei hohen Saiten (E, H, G) sind aus **blankem Nylon**. Die drei tiefen Saiten (D, A, E) haben einen Nylon-Kern, der mit feinem Draht **umsponnen** ist – deshalb fühlen sie sich geriffelt an.

## Vorteile für dich als Anfänger
- Nylon ist weich: Deine Fingerkuppen tun weniger weh als bei Stahlsaiten.
- Der Klang ist warm und rund – ideal für Melodien und Fingerpicking.
- Die Saitenlage ist bei Konzertgitarren etwas höher und der Hals breiter: mehr Platz für die Finger.

## Gut zu wissen
- Neue Nylonsaiten dehnen sich tagelang und verstimmen sich schnell. Das ist normal – einfach öfter nachstimmen.
- Nach dem Spielen die Saiten mit einem trockenen Tuch abwischen.
- Nylonsaiten reagieren auf Temperatur: Nach dem Reinkommen aus der Kälte erst kurz warten, dann stimmen.`,
      practice: 'Zupfe jede Saite einmal mit dem Daumen an und höre, wie der Ton langsam ausklingt. Vergleiche die blanken mit den umsponnenen Saiten.',
      exercise: { kind: 'exercise', exerciseId: 'ex-leere-saiten' },
      checklist: ['Ich kann umsponnene und blanke Saiten unterscheiden.'],
    },
    {
      id: 'k1-l3-saitennamen',
      title: 'Die Namen der sechs Saiten',
      goal: 'Du kannst alle sechs Saiten benennen und findest sie auf Anhieb.',
      minutes: 6,
      content: `## E – A – D – G – H – E
Von der dicksten zur dünnsten Saite heißen die Töne der leeren Saiten:

- Saite **6** (dick, oben am Hals): **E** (tiefes E, E2)
- Saite **5**: **A**
- Saite **4**: **D**
- Saite **3**: **G**
- Saite **2**: **H** (international „B“ genannt)
- Saite **1** (dünn, unten): **E** (hohes E, E4)

Merksatz: **„Eine Alte Dame Geht Heringe Essen.“**

## Zählweise
Gitarristen zählen die Saiten von **dünn nach dick**: Die dünne hohe E-Saite ist Saite 1, die dicke tiefe E-Saite ist Saite 6. Genau so erscheinen sie auch in der Tabulatur: Saite 1 ist die oberste Linie.

> In GuitarCoach wird die zweite Saite als „H“ bezeichnet, wie im deutschen Sprachraum üblich. In den Einstellungen kannst du auf die internationale Schreibweise „B“ umstellen.`,
      practice: 'Spiele die Saiten der Reihe nach und sage den Namen laut dazu: E – A – D – G – H – E, dann rückwärts. Anschließend wahllos: GuitarCoach zeigt im Griffbrett-Modus „Zeige mir den Ton“, ob du richtig liegst.',
      exercise: { kind: 'fretboard', mode: 'find' },
      tips: ['Die beiden E-Saiten klingen gleich, nur zwei Oktaven auseinander – höre genau hin.'],
      checklist: ['Ich kann E–A–D–G–H–E auswendig aufsagen.', 'Ich finde die H-Saite ohne nachzudenken.'],
    },
    {
      id: 'k1-l4-sitzhaltung',
      title: 'Die richtige Sitzhaltung',
      goal: 'Du sitzt entspannt und stabil, sodass beide Hände frei arbeiten können.',
      minutes: 5,
      content: `## Klassische Haltung
- Setz dich auf die vordere Hälfte eines Stuhls ohne Armlehnen, beide Füße auf dem Boden.
- Lege die Gitarre mit der Taille auf den **linken Oberschenkel** (als Rechtshänder). Der Hals zeigt schräg nach oben, der Kopf etwa auf Augenhöhe.
- Ein **Fußbänkchen** unter dem linken Fuß (oder eine Gitarrenstütze) bringt die Gitarre in die richtige Höhe. Zur Not tut es ein dickes Buch.
- Der Oberkörper bleibt gerade; die Gitarre lehnt an deiner Brust, du beugst dich nicht zu ihr hin.

## Bequeme Alternative
Du kannst die Gitarre auch auf das rechte Bein legen (wie viele Pop-Gitarristen). Wichtig ist nur: Der Hals darf nicht nach unten hängen und die linke Hand muss den Hals nicht halten.

## Vier Kontaktpunkte
Oberschenkel, Brust, rechter Unterarm auf der Zarge, linke Hand am Hals – wenn die Gitarre so ruhig liegt, kannst du die linke Hand sogar loslassen, ohne dass sie kippt.`,
      practice: 'Setz dich wie beschrieben hin und lass die linke Hand vom Hals: Bleibt die Gitarre liegen? Spiele dann 1 Minute lang die leeren Saiten und achte nur auf lockere Schultern.',
      exercise: { kind: 'exercise', exerciseId: 'ex-leere-saiten' },
      checklist: ['Die Gitarre liegt stabil, auch ohne linke Hand.', 'Meine Schultern sind locker und gerade.'],
    },
    {
      id: 'k1-l5-haende',
      title: 'Haltung der rechten und linken Hand',
      goal: 'Du kennst die Grundhaltung beider Hände und die Fingerbezeichnungen p, i, m, a und 1–4.',
      minutes: 7,
      content: `## Rechte Hand (Anschlaghand)
Die Finger der rechten Hand haben spanische Namen:
- **p** (pulgar) = Daumen → spielt die Bass-Saiten E, A, D
- **i** (índice) = Zeigefinger → meist G-Saite
- **m** (medio) = Mittelfinger → meist H-Saite
- **a** (anular) = Ringfinger → meist hohe E-Saite

Das Handgelenk ist leicht gewölbt, die Finger hängen locker über dem Schallloch. Der Daumen liegt vor den anderen Fingern (näher zum Hals).

## Linke Hand (Greifhand)
Die Finger werden mit Zahlen bezeichnet: **1** Zeigefinger, **2** Mittelfinger, **3** Ringfinger, **4** kleiner Finger. (Der Daumen greift nicht.)

- Der Daumen liegt locker **hinter dem Hals**, ungefähr gegenüber dem Mittelfinger.
- Die Finger stehen wie kleine Hämmer **auf den Fingerkuppen** – nicht flach.
- Gedrückt wird **direkt hinter dem Bundstäbchen** (zum Korpus hin), nicht mittig im Bund und nie auf dem Stäbchen.
- Fingernägel der linken Hand kurz halten!

> In GuitarCoach siehst du über der Tabulatur kleine Ziffern: Das ist der empfohlene Finger der linken Hand (1–4).`,
      practice: 'Lege die rechte Hand auf: p auf die E-Saite, i auf G, m auf H, a auf die hohe E – ohne zu spielen. Dann zupfe die Saiten in dieser Reihenfolge, ganz langsam. Die linke Hand ruht dabei entspannt am Hals.',
      exercise: { kind: 'exercise', exerciseId: 'ex-pima-offen' },
      tips: ['Beim Zupfen bewegt sich nur der Finger, nicht die ganze Hand.', 'Kurze Fingernägel links, leicht längere rechts – Nägel geben dem Ton Glanz, sind aber kein Muss.'],
      checklist: ['Ich weiß, welche Finger p, i, m, a sind.', 'Mein linker Daumen liegt hinter dem Hals, nicht darüber.'],
    },
    {
      id: 'k1-l6-stimmen',
      title: 'Gitarre stimmen',
      goal: 'Du stimmst alle sechs Saiten mit dem Stimmgerät von GuitarCoach.',
      minutes: 6,
      content: `## Warum stimmen?
Eine verstimmte Gitarre klingt immer falsch – egal wie gut du spielst. Stimme deshalb **vor jedem Üben**. Mit der Zeit hört dein Ohr den Unterschied von selbst.

## So geht es
1. Starte unten das Stimmgerät und erlaube den Mikrofonzugriff.
2. Zupfe **eine einzelne Saite** kräftig an und lass sie klingen. Halte das iPhone nah ans Schallloch.
3. Das Stimmgerät zeigt den erkannten Ton und ob er **zu tief** (Nadel links) oder **zu hoch** (Nadel rechts) ist.
4. Ist der Ton zu tief: Wirbel **anziehen** (Saite spannen). Ist er zu hoch: Wirbel **lösen**. Immer nur ein kleines Stück drehen und erneut anschlagen.
5. Ziel: Die Nadel steht im grünen Bereich und die Anzeige meldet „richtig gestimmt“.

## Reihenfolge
Stimme von der dicken E-Saite zur dünnen: E – A – D – G – H – E. Danach noch einmal alle kontrollieren, denn beim Spannen einer Saite verändern sich die anderen leicht.

> Tipp: Stimme lieber von unten nach oben an den Zielton heran (erst etwas zu tief, dann anziehen). So bleibt die Saite besser in Stimmung.`,
      practice: 'Stimme jetzt alle sechs Saiten. GuitarCoach markiert jede Saite mit einem Haken, sobald sie eine Sekunde lang sauber im grünen Bereich ist.',
      exercise: { kind: 'tuner' },
      tips: ['Wenn das Stimmgerät nichts anzeigt: nur eine Saite anschlagen, Nebengeräusche vermeiden, näher ans Mikrofon.', 'Ganz neue Saiten muss man anfangs alle paar Minuten nachstimmen.'],
      checklist: ['Alle sechs Saiten zeigen „richtig gestimmt“.'],
    },
  ],
};

export const CHAPTER_2: ChapterDef = {
  id: 'k2',
  number: 2,
  title: 'Die ersten Töne',
  subtitle: 'Leere Saiten, Anschlag, die ersten Griffe',
  lessons: [
    {
      id: 'k2-l1-offene-saiten',
      title: 'Offene Saiten anspielen',
      goal: 'Du spielst jede leere Saite einzeln, sauber und ohne Nebensaiten.',
      minutes: 6,
      content: `## Der erste Ton
„Offen“ oder „leer“ heißt: Du greifst nichts, die Saite schwingt vom Sattel bis zum Steg. In der Tabulatur steht dafür eine **0**.

## So klingt es sauber
- Zupfe mit dem Daumen die dicke E-Saite: Der Daumen drückt die Saite leicht nach unten und lässt sie dann los.
- Die Saite soll **frei schwingen**: Berühre mit keinem Finger die Nachbarsaiten.
- Lass den Ton **ausklingen**, bevor du die nächste Saite spielst. Hör zu!

## Hören lernen
Spiele die Saiten abwärts (E–A–D–G–H–E) und aufwärts. Jede Saite klingt höher als die vorige. Dieses „Höher/Tiefer“ ist die Grundlage für alles Weitere.`,
      practice: 'Höre dir zuerst das Beispiel an (Play). Spiele dann mit „Nächste Note“ Saite für Saite nach. Zum Schluss die ganze Übung langsam mit dem Metronom.',
      exercise: { kind: 'exercise', exerciseId: 'ex-leere-saiten' },
      checklist: ['Jede Saite klingt ohne Schnarren.', 'Ich treffe die richtige Saite, ohne hinzusehen.'],
    },
    {
      id: 'k2-l2-daumen',
      title: 'Saiten anzupfen mit dem Daumen',
      goal: 'Der Daumen spielt die Bass-Saiten gleichmäßig und kräftig.',
      minutes: 6,
      content: `## Der Daumen ist dein Bass
Der Daumen (p) ist für die drei tiefen Saiten zuständig. Er spielt **nach unten**, vom Körper weg.

## Zwei Arten des Anschlags
- **Apoyando (angelegt)**: Der Daumen schlägt die Saite an und kommt auf der nächsthöheren Saite zur Ruhe. Klingt kräftig – ideal für Bassnoten.
- **Tirando (frei)**: Der Daumen schwingt frei durch, ohne die Nachbarsaite zu berühren. Wichtig, wenn die Nachbarsaite weiterklingen soll.

Beginne mit **Apoyando**: E-Saite anschlagen, Daumen landet auf der A-Saite. A-Saite anschlagen, Daumen landet auf der D-Saite.

## Gleichmäßigkeit
Alle Töne sollen gleich laut sein. Schalte das Metronom zu und spiele genau auf den Klick.`,
      practice: 'Spiele die Übung erst bei 75 % Tempo mit Metronom. Wenn vier Durchgänge sauber klingen, auf 100 %.',
      exercise: { kind: 'exercise', exerciseId: 'ex-daumen-bass' },
      tips: ['Der Daumen bleibt gestreckt; die Bewegung kommt aus dem Grundgelenk.'],
    },
    {
      id: 'k2-l3-pima',
      title: 'Rechte Hand: p, i, m, a',
      goal: 'Daumen und drei Finger spielen nacheinander ihre Saiten – die Basis für Fingerpicking.',
      minutes: 8,
      content: `## Jeder Finger hat seine Saite
- **p** (Daumen) → tiefe E-, A- oder D-Saite
- **i** (Zeigefinger) → G-Saite
- **m** (Mittelfinger) → H-Saite
- **a** (Ringfinger) → hohe E-Saite

## So übst du
1. Lege alle vier Finger auf ihre Saiten („Vorbereiten“).
2. Spiele p – dann i – dann m – dann a, langsam und gleichmäßig.
3. Die Finger i, m, a zupfen **zur Handfläche hin**, mit einer kleinen Bewegung aus dem Grundgelenk.
4. Das Handgelenk bleibt ruhig und leicht gewölbt, nichts verkrampft.

## Hinhören
Achte darauf, dass alle Töne gleich laut sind. Der Daumen darf etwas kräftiger sein – er ist der Bass.`,
      practice: 'Spiele die Übung mit „Nächste Note“ Schritt für Schritt, dann im Loop bei 75 %. Ziel: 1 Minute ohne Unterbrechung.',
      exercise: { kind: 'exercise', exerciseId: 'ex-pima-offen' },
      checklist: ['Jeder Finger trifft seine Saite blind.', 'Die Töne klingen gleichmäßig.'],
    },
    {
      id: 'k2-l4-wechselschlag',
      title: 'Grundlegender Wechselschlag (i–m)',
      goal: 'Zeige- und Mittelfinger wechseln sich flüssig ab – so spielst du später Melodien.',
      minutes: 8,
      content: `## Warum wechseln?
Melodien spielt man nicht mit einem Finger, sondern abwechselnd mit **i und m** – wie beim Gehen: links, rechts, links, rechts. So wirst du schneller und gleichmäßiger.

## Technik
- Die Finger zupfen die Saite nach innen (Tirando) oder angelegt (Apoyando – der Finger kommt auf der nächsttieferen Saite zur Ruhe).
- Während ein Finger spielt, bereitet sich der andere bereits vor.
- Beginne jede Übung mit **i**, aber übe auch den Start mit **m**.

## Typischer Fehler
Zwei Mal derselbe Finger hintereinander („i i“). Zähle laut mit: „i – m – i – m“.`,
      practice: 'Die Übung läuft über E-, H- und G-Saite. Starte bei 75 %, dann 100 %. Später: auf 125 % steigern.',
      exercise: { kind: 'exercise', exerciseId: 'ex-wechselschlag-im', tempoPercent: 75 },
      tips: ['Beim Saitenwechsel bleibt die Hand ruhig – nur die Finger wandern eine Saite weiter.'],
    },
    {
      id: 'k2-l5-linke-hand',
      title: 'Linke Hand richtig positionieren',
      goal: 'Du drückst Töne mit wenig Kraft sauber und schnarrfrei.',
      minutes: 6,
      content: `## Die Fingerkuppe macht den Ton
- Greife mit der **Spitze der Fingerkuppe**, der Finger ist gerundet wie ein Haken.
- Drücke **direkt hinter dem Bundstäbchen**. Je näher am Stäbchen, desto weniger Kraft brauchst du.
- Der Daumen liegt hinter dem Hals und drückt leicht dagegen – wie eine Klammer, aber ohne zu pressen.

## Ton-Test
Greife die H-Saite im 1. Bund mit dem Zeigefinger und zupfe sie. Klingt es sauber? Wenn es schnarrt: näher ans Bundstäbchen rücken oder etwas fester drücken. Wenn es dumpf klingt: Der Finger berührt eine Nachbarsaite – Finger aufstellen.

## Ein Finger pro Bund
In der **ersten Lage** gilt: Zeigefinger = Bund 1, Mittelfinger = Bund 2, Ringfinger = Bund 3, kleiner Finger = Bund 4. So musst du die Hand nicht verschieben.`,
      practice: 'Tippe im Griffbrett auf verschiedene Positionen der ersten drei Bünde, höre dir den Ton an und greife ihn nach. Achte auf den sauberen Klang.',
      exercise: { kind: 'fretboard', mode: 'explore' },
      checklist: ['Mein Finger drückt hinter dem Bundstäbchen.', 'Kein Schnarren, keine gedämpften Nachbarsaiten.'],
    },
    {
      id: 'k2-l6-erste-toene',
      title: 'Bund 1 bis 3 greifen',
      goal: 'Du spielst auf der E- und H-Saite die Töne leer, 1, 2 und 3 mit dem richtigen Finger.',
      minutes: 10,
      content: `## Vier Töne pro Saite
Auf der hohen E-Saite: **E** (leer) – **F** (Bund 1, Zeigefinger) – **F#** (Bund 2, Mittelfinger) – **G** (Bund 3, Ringfinger).
Auf der H-Saite: **H** (leer) – **C** (Bund 1) – **C#** (Bund 2) – **D** (Bund 3).

## So übst du
1. Höre dir die Übung an und schau dabei auf das Griffbrett unter der Tabulatur: Es zeigt dir Saite, Bund und Finger.
2. Spiele mit „Nächste Note“ jeden Ton einzeln nach. Lass den Finger erst los, wenn der nächste sitzt.
3. Dann die Übung langsam im Ganzen – mit Metronom.

## Finger liegen lassen
Beim Aufwärtsgehen (1 → 2 → 3) bleiben die unteren Finger auf der Saite liegen. Das spart Kraft und macht den Ton sicherer.`,
      practice: 'Erst Einzeltonmodus, dann Loop bei 50 %, später 75 % und 100 %. Die rechte Hand spielt im Wechselschlag i–m.',
      exercise: { kind: 'exercise', exerciseId: 'ex-bund-1-2-3', tempoPercent: 75 },
      tips: ['Wenn die Fingerkuppen schmerzen: kurze Pause. Nach ein bis zwei Wochen bildet sich Hornhaut.'],
      checklist: ['Jeder Ton klingt sauber.', 'Ich benutze 1, 2, 3 für Bund 1, 2, 3.'],
    },
    {
      id: 'k2-l7-tonfolgen',
      title: 'Einfache Tonfolgen – meine erste Melodie',
      goal: 'Du spielst eine kleine Melodie aus den Tönen, die du jetzt kennst.',
      minutes: 10,
      content: `## Jetzt wird es Musik
Mit E, F, G auf der hohen Saite und H, C, D auf der H-Saite kannst du schon richtige Melodien spielen. Die folgende Melodie ist eine eigene GuitarCoach-Komposition – acht Takte, nur Viertel und Halbe.

## Vorgehen
1. Höre die Melodie zwei Mal komplett an.
2. Spiele die ersten vier Takte mit „Nächste Note“ – Ton für Ton.
3. Übe die ersten vier Takte im Loop bei 50 %, bis sie fließen.
4. Dann Takte 5–8 genauso.
5. Zum Schluss alles zusammen – erst 75 %, dann 100 %.

## Der Trick der Profis
Lieber **kurze Abschnitte** sehr oft wiederholen, als immer wieder von vorn anfangen und beim gleichen Fehler hängen bleiben.`,
      practice: 'Nutze die Schleifenfunktion (Schleife → Takte antippen) für Takt 1–4 und Takt 5–8. Schaffst du die Melodie dreimal hintereinander ohne Fehler bei 100 %? Dann schließe die Lektion ab.',
      exercise: { kind: 'exercise', exerciseId: 'ex-erste-melodie', tempoPercent: 75 },
      checklist: ['Takte 1–4 klappen im Loop.', 'Die ganze Melodie klappt bei 100 %.'],
    },
  ],
};

export const CHAPTER_3: ChapterDef = {
  id: 'k3',
  number: 3,
  title: 'Tabs und Rhythmus',
  subtitle: 'Tabulatur lesen, Takt, Notenlängen, Metronom',
  lessons: [
    {
      id: 'k3-l1-tabs-lesen',
      title: 'Gitarren-Tabs lesen',
      goal: 'Du verstehst die sechs Linien, Saitennummern, Bundzahlen und Akkorde in der Tabulatur.',
      minutes: 8,
      content: `## Die Tabulatur ist eine Landkarte deiner Gitarre
Eine Tabulatur („Tab“) hat **sechs Linien** – eine pro Saite. Die **oberste Linie ist die dünne hohe E-Saite** (Saite 1), die unterste die dicke tiefe E-Saite (Saite 6). Stell dir vor, du schaust von oben auf deine Gitarre, während sie auf dem Schoß liegt.

## Zahlen = Bünde
Eine Zahl auf einer Linie sagt: Greife diese Saite in diesem Bund. **0** heißt leere Saite, **3** heißt dritter Bund.

## Zeit läuft von links nach rechts
Zahlen nacheinander spielst du nacheinander. Stehen Zahlen **übereinander**, spielst du sie **gleichzeitig** (Akkord).

## Pausen und Dauern
Unter den Linien zeigt GuitarCoach kleine Notenhälse: Sie sagen dir, wie lange ein Ton dauert. Pausenzeichen bedeuten: nichts spielen, Saiten abdämpfen. Mehr dazu in den nächsten Lektionen.

> Die interaktive Einführung „Tabs verstehen“ erklärt alles Schritt für Schritt – mit anklickbaren Beispielen, die du dir anhören kannst.`,
      practice: 'Arbeite die interaktive Einführung durch. Tippe dort auf die Zahlen, um die Töne zu hören und auf dem Griffbrett zu sehen.',
      exercise: { kind: 'tab-reading' },
      checklist: ['Ich weiß, welche Linie welche Saite ist.', 'Ich weiß, was übereinanderstehende Zahlen bedeuten.'],
    },
    {
      id: 'k3-l2-takt-tempo',
      title: 'Takt und Tempo',
      goal: 'Du verstehst Taktarten (4/4, 3/4, 6/8) und was BPM bedeutet.',
      minutes: 6,
      content: `## Der Puls
Jede Musik hat einen gleichmäßigen Puls – die **Schläge** (Beats). Wie schnell sie kommen, sagt das **Tempo** in **BPM** (Beats per Minute). 60 BPM = ein Schlag pro Sekunde; 120 BPM = zwei pro Sekunde.

## Der Takt
Schläge werden zu Gruppen gebündelt: dem **Takt**. Die **Taktart** steht am Anfang der Tabulatur:
- **4/4**: vier Viertelschläge pro Takt – „1, 2, 3, 4“ (Rock, Pop, fast alles)
- **3/4**: drei Schläge – „1, 2, 3“ (Walzer, „Happy Birthday“, „O Tannenbaum“)
- **6/8**: sechs Achtel, gefühlt als zwei wiegende Schläge – „1-2-3, 4-5-6“ („Stille Nacht“)

## Der erste Schlag
Die **Eins** jedes Takts ist betont. Das Metronom von GuitarCoach spielt sie heller – so hörst du, wo ein Takt beginnt.`,
      practice: 'Starte das Metronom mit 60 BPM in 4/4 und zähle laut mit: „1, 2, 3, 4“. Wechsle auf 3/4 und 6/8 und höre den Unterschied. Klatsche danach den Puls mit.',
      exercise: { kind: 'metronome', bpm: 60, timeSignature: [4, 4] },
      checklist: ['Ich höre, wo die Eins ist.', 'Ich kann 4/4 und 3/4 unterscheiden.'],
    },
    {
      id: 'k3-l3-notenlaengen',
      title: 'Notenlängen',
      goal: 'Du kennst Ganze, Halbe, Viertel und Achtel und spielst sie in der richtigen Länge.',
      minutes: 8,
      content: `## Wie lange klingt ein Ton?
- **Ganze Note**: 4 Schläge (ein ganzer 4/4-Takt). Rhythmus-Symbol: hohler Kreis ohne Hals.
- **Halbe Note**: 2 Schläge. Hohler Kopf mit Hals.
- **Viertelnote**: 1 Schlag. Hals ohne Fähnchen.
- **Achtelnote**: ein halber Schlag – zwei pro Schlag. Hals mit Fähnchen oder Balken.
- **Punktierung**: Ein Punkt verlängert die Note um die Hälfte (punktierte Viertel = 1,5 Schläge).

## Zählen
Viertel: „1 – 2 – 3 – 4“. Achtel: „1 und 2 und 3 und 4 und“.

## Länge heißt: klingen lassen
Eine Halbe spielst du **einmal** an und lässt sie **zwei Schläge** klingen. Zu früh abzudämpfen ist genauso ein Fehler wie zu spät zu spielen.`,
      practice: 'Spiele die Übung mit Metronom. Zähle laut. Bei den Halben und der Ganzen: anschlagen, zählen, erst dann weiter.',
      exercise: { kind: 'exercise', exerciseId: 'ex-pausen-und-halbe' },
      checklist: ['Ich erkenne Halbe, Viertel und Achtel in der Tabulatur.'],
    },
    {
      id: 'k3-l4-pausen',
      title: 'Pausen',
      goal: 'Du erkennst Pausenzeichen und dämpfst die Saiten bewusst ab.',
      minutes: 6,
      content: `## Stille ist Musik
Eine **Pause** ist eine Zeitspanne, in der **nichts** klingt. Sie hat genau wie eine Note eine Länge: ganze, halbe, Viertel- oder Achtelpause.

## Abdämpfen
Damit wirklich Stille entsteht, musst du die Saiten stoppen:
- Mit der **rechten Hand**: Handkante oder Finger leicht auf die Saiten legen.
- Mit der **linken Hand**: Greifdruck lösen, ohne die Finger ganz abzuheben – der Ton verstummt.

## Pausen zählen
Pausen werden **mitgezählt**, als wären sie Töne. Bei „Viertel – Viertel – Viertelpause – Viertel“ zählst du „1, 2, (3), 4“ – auf der 3 passiert nichts, aber du zählst weiter.`,
      practice: 'Spiele die Übung und dämpfe bei jeder Pause bewusst ab. Höre genau, ob wirklich Ruhe ist.',
      exercise: { kind: 'tab', title: 'Pausen-Übung', notation: '0.2.4 0.2.4 r.4 0.2.4 | 1.2.4 r.4 1.2.4 r.4 | 3.2.8 3.2.8 r.4 3.2.4 r.4 | 0.1.2 r.2 | 0.1.4 r.8 0.1.8 r.4 0.1.4 | 3.2.1 |', tempo: 76, timeSignature: [4, 4] },
      checklist: ['Bei jeder Pause ist es wirklich still.'],
    },
    {
      id: 'k3-l5-gleichmaessig',
      title: 'Gleichmäßig spielen',
      goal: 'Viertel und Achtel sitzen exakt auf dem Klick.',
      minutes: 8,
      content: `## Timing ist alles
Ein einfaches Riff, das genau auf dem Puls sitzt, klingt besser als ein kompliziertes, das wackelt. Deshalb üben wir Gleichmäßigkeit – mit dem Metronom als strengem, aber fairem Lehrer.

## Methode
1. Schalte im Player das **Metronom** ein.
2. Starte bei **50 %**: Die Töne sollen **mit** dem Klick erklingen, nicht kurz danach.
3. Wenn du den Klick kaum noch hörst, weil dein Ton genau draufliegt, bist du richtig.
4. Dann Tempo in kleinen Schritten erhöhen.

## Achtel
Bei Achteln spielst du zwei Töne pro Klick: einen **auf** dem Klick, einen genau **dazwischen** („und“).`,
      practice: 'Übe mit Metronom und Einzähler. Erst 50 %, dann 75 %, dann 100 %. Spiele die Achtel im Wechselschlag i–m.',
      exercise: { kind: 'exercise', exerciseId: 'ex-rhythmus-viertel-achtel', tempoPercent: 50 },
      checklist: ['Bei 75 % sitzen alle Töne auf dem Klick.'],
    },
    {
      id: 'k3-l6-metronom',
      title: 'Mit dem Metronom üben',
      goal: 'Du nutzt das Metronom als Werkzeug, um Stücke schrittweise auf Tempo zu bringen.',
      minutes: 6,
      content: `## Die Tempo-Treppe
So bringst du jedes Stück auf Tempo:
1. Wähle ein Tempo, bei dem du **fehlerfrei** spielen kannst – auch wenn es lächerlich langsam wirkt.
2. Spiele den Abschnitt **dreimal sauber** hintereinander.
3. Erhöhe um **5 BPM** (oder 5 % im Player).
4. Geht es schief? Zwei Stufen zurück und von vorn.

## Einzähler
Mit dem Einzähler gibt GuitarCoach einen Takt vor, bevor die Wiedergabe startet. So weißt du genau, wann die Eins kommt.

## Taktart passend wählen
Übst du ein Lied im 3/4-Takt („Happy Birthday“), stelle auch das Metronom auf 3/4 – dann liegt die Betonung richtig.`,
      practice: 'Nimm die Tonleiter-Übung: Starte mit 50 BPM, erhöhe nach drei sauberen Durchgängen um 5 BPM. Wie weit kommst du heute?',
      exercise: { kind: 'exercise', exerciseId: 'ex-tonleiter-c-dur', tempoPercent: 75 },
      tips: ['Notiere dir dein Tagesmaximum – im Bereich „Mein Fortschritt“ siehst du deine Übungszeit.'],
    },
  ],
};

export const CHAPTER_4: ChapterDef = {
  id: 'k4',
  number: 4,
  title: 'Meine ersten vollständigen Lieder',
  subtitle: 'Sechs Lieder, die du komplett spielen kannst',
  lessons: [
    {
      id: 'k4-l1-happy-birthday',
      title: 'Happy Birthday',
      goal: 'Du spielst „Happy Birthday“ vollständig im 3/4-Takt.',
      minutes: 15,
      content: `## Dein erstes richtiges Lied
„Happy Birthday“ steht im **3/4-Takt** und beginnt mit einem **Auftakt**: Die beiden ersten Töne („Hap-py“) kommen vor der ersten Eins. Im Player siehst du deshalb am Anfang Pausen – zähle „1, 2“ und spiele auf „3“ los.

## Die Töne
Alles liegt in der ersten Lage auf den Saiten G, H und E: G (leer), A (G-Saite Bund 2), H (leer), C (H-Saite Bund 1), D (H-Saite Bund 3), E (leer), F (E-Saite Bund 1), G (E-Saite Bund 3).

## Übungsplan
1. **Anfänger-Version** anhören.
2. Takte 1–3 („Happy Birthday to you“) im Einzeltonmodus, dann im Loop bei 50 %.
3. Takte 4–5 genauso (gleiche Melodie, anderes Ende: D statt C).
4. Takte 6–7: Hier springt die Melodie hoch zum G auf der E-Saite – langsam!
5. Takte 8–9 und dann alles zusammen.
6. Wenn alles klappt: **Leicht**-Version mit dem punktierten „Hap-py“-Rhythmus.`,
      practice: 'Öffne das Lied unten, arbeite den Übungsplan ab und spiele es am Ende einmal komplett bei 100 % durch. Dann hat GuitarCoach einen „Durchlauf“ für dich gespeichert.',
      exercise: { kind: 'song', songId: 'happy-birthday', versionLabel: 'Anfänger' },
      tips: ['Singe die Melodie innerlich mit – dann weißt du immer, wie der nächste Ton klingen muss.'],
      checklist: ['Ich spiele die Anfänger-Version komplett bei 75 % oder schneller.'],
    },
    {
      id: 'k4-l2-jingle-bells',
      title: 'Jingle Bells',
      goal: 'Du spielst den Refrain von „Jingle Bells“ flüssig im 4/4-Takt.',
      minutes: 15,
      content: `## Der Refrain
„Jingle Bells, Jingle Bells, Jingle all the way“: Der Refrain besteht fast nur aus dem **E** (leere hohe Saite) und ist damit das ideale Rhythmus-Training. Achte auf die Halben („bells“) – zwei Schläge klingen lassen!

## Die Stellen zum Üben
- Takt 3: „jingle all the way“ – E, G (Bund 3), C (H-Saite Bund 1), D (Bund 3) mit punktierter Viertel + Achtel.
- Takt 6: Achtel „in a“ – im Wechselschlag.
- Takt 8: „sleigh – hey!“ mit dem Sprung zum G.

## Steigerung
Die **Leicht**-Version enthält zusätzlich die Strophe („Dashing through the snow“). Dort kommt in Takt 15 der Ton A im 5. Bund – strecke den kleinen Finger oder rücke kurz mit der Hand nach.`,
      practice: 'Refrain (Anfänger-Version) in Vierergruppen von Takten üben, dann komplett. Mit Metronom und Einzähler bei 75 %.',
      exercise: { kind: 'song', songId: 'jingle-bells', versionLabel: 'Anfänger' },
      checklist: ['Der Refrain klappt bei 75 % ohne Stocken.'],
    },
    {
      id: 'k4-l3-alle-jahre-wieder',
      title: 'Alle Jahre wieder',
      goal: 'Du spielst „Alle Jahre wieder“ in G-Dur.',
      minutes: 12,
      content: `## Ruhig und getragen
Dieses Lied ist langsam und ruhig – perfekt, um schöne, lange Töne zu üben. Die Melodie liegt auf den Saiten G, H und E in der ersten Lage.

## Besonderheiten
- Takt 2 und Takt 8: Halbe Noten – klingen lassen und zählen.
- Takt 6: Der höchste Ton G (E-Saite Bund 3) als Halbe, dann F# (Bund 2) und E (leer) – ein kleines Treppchen abwärts.
- Die **Leicht**-Version hat Achtelpaare („kommt das“), die Anfänger-Version vereinfacht sie zu Vierteln.

## Klang
Spiele die Melodie mit Wechselschlag i–m und lass jeden Ton bis zum nächsten klingen (legato).`,
      practice: 'Erst die Anfänger-Version komplett, dann die Leicht-Version mit den Achteln. Übe Takt 5–8 extra im Loop.',
      exercise: { kind: 'song', songId: 'alle-jahre-wieder', versionLabel: 'Anfänger' },
    },
    {
      id: 'k4-l4-o-tannenbaum',
      title: 'O Tannenbaum',
      goal: 'Du spielst „O Tannenbaum“ mit Auftakt und punktiertem Rhythmus.',
      minutes: 15,
      content: `## Auftakt im 3/4
Wie „Happy Birthday“ beginnt „O Tannenbaum“ mit einem Auftakt („O“) auf der leeren G-Saite. Zähle „1, 2, 3 und“ und spiele auf „und“ los.

## Der typische Rhythmus
„Tan-nen-baum“ wird **punktiert** gespielt: lang – kurz – lang. In der Anfänger-Version sind es gerade Achtel; die Leicht-Version hat den echten Rhythmus (punktierte Achtel + Sechzehntel).

## Die kniffligste Stelle
„wie treu sind dei-ne“: D – E – F – H. Der Sprung vom F (E-Saite Bund 1) hinunter zum H (leere H-Saite) überrascht – höre ihn dir mehrmals an.

## Die ganze Strophe
Die Leicht-Version enthält den Mittelteil („Du grünst nicht nur zur Sommerzeit“) – dort kommt das A im 5. Bund der E-Saite vor.`,
      practice: 'Anfänger-Version (erste Zeile) im Loop, bis sie sitzt. Dann die Leicht-Version abschnittsweise: Takte 1–5, 6–9, 10–13.',
      exercise: { kind: 'song', songId: 'o-tannenbaum', versionLabel: 'Anfänger' },
    },
    {
      id: 'k4-l5-weihnachtsmann',
      title: 'Morgen kommt der Weihnachtsmann',
      goal: 'Du spielst die Melodie („Twinkle, Twinkle“) komplett in G-Dur.',
      minutes: 12,
      content: `## Weltberühmte Melodie
Die Melodie kennt man auch als „Twinkle, Twinkle, Little Star“ oder „Ah! vous dirai-je, maman“ – Mozart hat Variationen darüber geschrieben. Sie besteht aus **Vierteln und Halben**, ohne Auftakt – ideal nach „O Tannenbaum“.

## Aufbau: A – B – B – A
- Teil A (Takt 1–4): „Morgen kommt der Weihnachtsmann, kommt mit seinen Gaben.“
- Teil B (Takt 5–8), wiederholt (Takt 9–12 ist wieder A). Wenn du A und B kannst, kannst du alles.

## Mittel-Version
Hier spielt der Daumen auf den Zählzeiten 1 und 3 einen Basston dazu. Das ist deine erste echte **zweistimmige** Begleitung – Daumen und Finger gleichzeitig.`,
      practice: 'Teil A im Loop (Takt 1–4), dann Teil B (Takt 5–8), dann alles. Danach die Mittel-Version mit Basstönen bei 50 %.',
      exercise: { kind: 'song', songId: 'morgen-kommt-der-weihnachtsmann', versionLabel: 'Anfänger' },
    },
    {
      id: 'k4-l6-stille-nacht',
      title: 'Stille Nacht',
      goal: 'Du spielst „Stille Nacht“ im wiegenden 6/8-Takt über fünf Saiten.',
      minutes: 18,
      content: `## 6/8-Takt
„Stille Nacht“ wiegt in **6/8**: sechs Achtel pro Takt, gefühlt als zwei große Schläge („1-2-3, 4-5-6“). Das Metronom klickt deshalb zweimal pro Takt.

## Fünf Saiten
Die Melodie wandert von der G-Saite hinunter bis zur A-Saite (das tiefe C am Ende) und hinauf bis zum F auf der hohen E-Saite. Zum ersten Mal spielst du eine Melodie über fast das ganze Griffbrett der ersten Lage – schau aufs Griffbrett im Player.

## Der Rhythmus
„Stil-le Nacht“ = punktierte Achtel, Sechzehntel, Achtel, dann punktierte Viertel. Die Anfänger-Version glättet das zu geraden Achteln; wenn du die Melodie kannst, wechsle zur Leicht-Version mit dem originalen Schwung.

## Übungsplan
Takte 1–4, 5–8, 9–12 getrennt im Loop. Der Schluss (Takte 11–12) geht tief hinunter zum C auf der A-Saite (Bund 3) – benutze den Daumen für die Bass-Saiten.`,
      practice: 'Wie im Übungsplan beschrieben. Ziel: Leicht-Version bei 75 %.',
      exercise: { kind: 'song', songId: 'stille-nacht', versionLabel: 'Anfänger' },
      checklist: ['Ich fühle die zwei großen Schläge pro Takt.', 'Der Schluss mit dem tiefen C klappt.'],
    },
  ],
};
