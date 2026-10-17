import { ProgressRepository } from '@/core/storage/repositories';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { Link } from 'react-router';
import { Card, PageHeader } from '@/components/ui';
import { useSettings } from '@/hooks/useSettings';
import { TunerWidget } from './TunerWidget';

const GUIDE_STEPS: { title: string; text: string }[] = [
  { title: 'Saite einzeln anschlagen', text: 'Zupfe nur eine Saite – am besten mit dem Daumen – und lass sie frei klingen. Die anderen Saiten mit der Handkante ruhig halten.' },
  { title: 'Auf die Anzeige schauen', text: 'Die Nadel zeigt, ob der Ton zu tief (links) oder zu hoch (rechts) ist. Grün heißt: richtig gestimmt.' },
  { title: 'Wirbel drehen', text: 'Zu tief? Den Wirbel dieser Saite langsam anziehen (Spannung erhöhen). Zu hoch? Wirbel etwas lösen. Immer nur kleine Bewegungen.' },
  { title: 'Erneut prüfen', text: 'Saite noch einmal anschlagen und nachsehen. Zum Schluss alle sechs Saiten nacheinander kontrollieren – beim Stimmen einer Saite verändern sich die anderen leicht.' },
];

export function TunerPage() {
  const [settings] = useSettings();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <PageHeader title="Stimmgerät" subtitle="Standardstimmung E–A–D–G–H–E" back="/werkzeuge" />

      <TunerWidget onAllStringsTuned={() => void new ProgressRepository().recordSession({ kind: 'tuner', startedAt: Date.now() - 1000, title: 'Alle Saiten gestimmt', details: { completed: true } })} />

      <Card padding="none">
        <button type="button" onClick={() => setGuideOpen((v) => !v)} aria-expanded={guideOpen} aria-controls="tuner-guide" className="flex w-full items-center gap-3 p-4 text-left">
          <span className="text-gold">
            <Lightbulb size={22} aria-hidden />
          </span>
          <span className="flex-1 font-semibold">So stimmst du deine Gitarre</span>
          <span className="text-muted">{guideOpen ? <ChevronUp size={20} aria-hidden /> : <ChevronDown size={20} aria-hidden />}</span>
        </button>
        {guideOpen && (
          <div id="tuner-guide" className="border-t border-border/70 px-4 pb-4 pt-3">
            <ol className="flex flex-col gap-3">
              {GUIDE_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-sm leading-relaxed text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed text-muted">
              <span className="font-semibold text-text">Hinweis: </span>
              Neue Nylonsaiten dehnen sich und verstimmen sich in den ersten Tagen schnell. Das ist normal – einfach vor jedem Üben kurz nachstimmen.
            </p>
          </div>
        )}
      </Card>

      <p className="text-sm text-muted">
        Als „richtig gestimmt“ gilt eine Abweichung bis ±{settings.tunerToleranceCents} Cent. Toleranz und Empfindlichkeit kannst du in den{' '}
        <Link to="/einstellungen" className="font-semibold text-gold underline-offset-2 hover:underline">
          Einstellungen
        </Link>{' '}
        ändern.
      </p>
    </div>
  );
}
