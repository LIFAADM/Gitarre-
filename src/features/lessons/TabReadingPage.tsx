import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button, Card, Markdown, PageHeader } from '@/components/ui';
import { noteNameWithOctave } from '@/core/music/notes';
import { Fretboard } from '@/features/fretboard/Fretboard';
import { useSettings } from '@/hooks/useSettings';
import { TabExample } from './TabExample';

interface Step {
  title: string;
  text: string;
  notation?: string;
  tempo?: number;
  timeSignature?: [number, number];
  caption?: string;
  fretboard?: Array<{ string: number; fret: number; label?: string }>;
}

const STEPS: Step[] = [
  {
    title: 'Sechs Linien = sechs Saiten',
    text: `Eine Tabulatur hat **sechs Linien**. Jede Linie ist eine Saite deiner Gitarre.

- Die **oberste Linie** ist die dünnste Saite (hohe E-Saite, Saite 1).
- Die **unterste Linie** ist die dickste Saite (tiefe E-Saite, Saite 6).

Links neben den Linien siehst du die Namen der leeren Saiten: E H G D A E (von oben nach unten).

> Merke: In der Tab ist „oben“ die dünne Saite – so, als würdest du von oben auf deine Gitarre schauen.`,
    notation: '0.1.4 0.2.4 0.3.4 0.4.4 | 0.5.4 0.6.4 r.2 |',
    tempo: 80,
    caption: 'Jede 0 ist eine leere Saite – von der dünnen zur dicken.',
  },
  {
    title: 'Zahlen = Bünde',
    text: `Eine **Zahl** auf einer Linie sagt dir, in welchem **Bund** du die Saite greifst:

- **0** = leere Saite (nichts greifen)
- **1** = erster Bund (direkt am Sattel)
- **3** = dritter Bund

Die kleine Ziffer im Kreis über der Tab ist der empfohlene **Finger** (1 = Zeigefinger, 2 = Mittel-, 3 = Ring-, 4 = kleiner Finger). Unten auf dem Griffbrett siehst du, wo die Töne liegen.`,
    notation: '0.1.4 1.1.4 3.1.4 1.1.4 | 0.2.4 1.2.4 3.2.4 0.1.1 |',
    tempo: 80,
    fretboard: [
      { string: 1, fret: 1, label: '1' },
      { string: 1, fret: 3, label: '3' },
      { string: 2, fret: 1, label: '1' },
      { string: 2, fret: 3, label: '3' },
    ],
  },
  {
    title: 'Von links nach rechts',
    text: `Die Zeit läuft **von links nach rechts**. Zahlen, die nacheinander stehen, spielst du nacheinander – jede Zahl ein Ton.

Die senkrechten Striche sind **Taktstriche**. Sie teilen die Musik in gleich lange Takte. Die Zahl über dem ersten Takt (klein, links) ist die Taktnummer – praktisch, um Abschnitte zum Üben auszuwählen.`,
    notation: '0.3.4 2.3.4 0.2.4 1.2.4 | 3.2.4 1.2.4 0.2.4 2.3.4 | 0.3.1 |',
    tempo: 90,
  },
  {
    title: 'Gleichzeitig: Zahlen übereinander',
    text: `Stehen Zahlen **genau übereinander**, spielst du die Saiten **gleichzeitig** – das ist ein Akkord oder ein Zweiklang.

Im Beispiel: erst einzelne Töne, dann zwei Saiten zusammen, am Ende ein voller E-Moll-Akkord über alle sechs leeren Saiten (von unten nach oben anschlagen, mit dem Daumen).`,
    notation: '0.1.4 0.2.4 (0.1 0.2).2 | (0.3 0.2 0.1).2 (0.6 0.5 0.4 0.3 0.2 0.1).2 |',
    tempo: 76,
  },
  {
    title: 'Notenlängen: die Hälse unter der Tab',
    text: `Wie **lange** ein Ton klingt, zeigen die kleinen Zeichen **unter** den Linien:

- Hohler Kreis ohne Hals = **ganze Note** (4 Schläge)
- Hohler Kreis mit Hals = **halbe Note** (2 Schläge)
- Hals ohne Fähnchen = **Viertelnote** (1 Schlag)
- Hals mit Fähnchen/Balken = **Achtelnote** (½ Schlag)
- Ein Punkt rechts vom Hals = **punktiert** (um die Hälfte länger)

Zähle beim Beispiel laut mit: „1 – 2 – 3 – 4“.`,
    notation: '0.1.1 | 0.1.2 0.1.2 | 0.1.4 0.1.4 0.1.4 0.1.4 | 0.1.8 0.1.8 0.1.8 0.1.8 0.1.4 0.1.4d 0.1.8 |',
    tempo: 80,
    caption: 'Ganze, Halbe, Viertel, Achtel und eine punktierte Viertel.',
  },
  {
    title: 'Pausen',
    text: `Eine **Pause** bedeutet: nichts spielen – und die Saiten **abdämpfen**, damit Stille entsteht. Pausen haben genau wie Noten eine Länge:

- Balken unter einer Linie = ganze Pause
- Balken auf einer Linie = halbe Pause
- Zickzack = Viertelpause
- Kleiner Haken = Achtelpause

Pausen werden mitgezählt: „1, 2, (3), 4“.`,
    notation: '0.2.4 r.4 0.2.4 r.4 | 0.2.2 r.2 | 0.2.8 r.8 0.2.8 r.8 0.2.4 r.4 | r.1 |',
    tempo: 80,
  },
  {
    title: 'Rhythmus und Taktart',
    text: `Die Zahlen am Anfang (z. B. **3 über 4**) sind die **Taktart**: Wie viele Schläge ein Takt hat. 4/4 = vier Viertel pro Takt, 3/4 = drei (Walzer, „Happy Birthday“), 6/8 = sechs Achtel in zwei Gruppen.

Das Beispiel steht im **3/4-Takt**. Zähle „1, 2, 3 | 1, 2, 3“ – der erste Schlag ist betont.`,
    notation: '0.1.4 1.2.4 3.2.4 | 0.1.2 r.4 | 3.2.4 1.2.4 0.2.4 | 1.2.2d |',
    tempo: 96,
    timeSignature: [3, 4],
  },
  {
    title: 'Wiederholungen',
    text: `In gedruckten Tabs stehen **Wiederholungszeichen** (Taktstriche mit zwei Punkten): Der Abschnitt dazwischen wird zweimal gespielt.

GuitarCoach **rollt Wiederholungen aus** – du siehst jeden Durchgang hintereinander und musst nicht zurückspringen. Im Beispiel wird der erste Takt zweimal gespielt.`,
    notation: '[ro] 0.3.4 2.3.4 0.2.4 2.3.4 | [rc 2] 0.3.4 2.3.4 0.2.2 | 0.3.1 |',
    tempo: 90,
  },
  {
    title: 'Spieltechniken',
    text: `Buchstaben und Zeichen zwischen den Zahlen sind **Spieltechniken**:

- **H** mit Bogen = Hammer-on: zweiten Ton aufhämmern, nicht anschlagen
- **P** mit Bogen = Pull-off: Finger abziehen
- Schräger Strich = **Slide** (rutschen)
- **~~** = Vibrato
- **P.M.** = Palm Mute (mit dem Handballen dämpfen)
- **x** = abgedämpfter („toter“) Ton
- Bogen zwischen gleichen Zahlen = **Bindung** (Ton nur einmal anschlagen, klingen lassen)

Keine Sorge: Diese Techniken lernst du in Kapitel 7 Schritt für Schritt.`,
    notation: '0.3.8 2.3.8h 2.3.8 0.3.8p 2.3.4s 4.3.4v | 0.6.8m 0.6.8m 0.6.8m 0.6.8m 0.1.2~ | 0.1.1 |',
    tempo: 80,
  },
];

export function TabReadingPage() {
  const navigate = useNavigate();
  const [settings] = useSettings();
  const [index, setIndex] = useState(0);
  const step = STEPS[index]!;
  return (
    <>
      <PageHeader title="Tabs verstehen" subtitle={`Schritt ${index + 1} von ${STEPS.length}`} back="/lernen" compact />
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <button key={s.title} type="button" aria-label={`Schritt ${i + 1}`} onClick={() => setIndex(i)} className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-gold' : 'bg-surface-3'}`} />
          ))}
        </div>
        <Card>
          <h2 className="text-lg font-bold">{step.title}</h2>
          <div className="mt-2">
            <Markdown text={step.text} />
          </div>
        </Card>
        {step.notation && <TabExample notation={step.notation} tempo={step.tempo ?? 80} timeSignature={step.timeSignature ?? [4, 4]} caption={step.caption} />}
        {step.fretboard && (
          <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
            <Fretboard
              frets={5}
              compact
              leftHanded={settings.leftHanded}
              orientation={settings.fretboardOrientation}
              naming={settings.noteNaming}
              highlights={step.fretboard.map((h) => ({ string: h.string, fret: h.fret, tone: 'gold', label: h.label ?? noteNameWithOctave(64, settings.noteNaming) }))}
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button full icon={<ChevronLeft size={18} />} disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
            Zurück
          </Button>
          {index < STEPS.length - 1 ? (
            <Button full variant="primary" iconRight={<ChevronRight size={18} />} onClick={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}>
              Weiter
            </Button>
          ) : (
            <Button full variant="primary" onClick={() => navigate('/lernen/k3-l1-tabs-lesen')}>
              Zur Lektion
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
