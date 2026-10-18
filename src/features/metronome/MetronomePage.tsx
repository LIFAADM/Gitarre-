import { Lightbulb } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { useMetronomeState } from '@/hooks/useEngine';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { MetronomeWidget } from './MetronomeWidget';

const TIPS: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: 'Langsam anfangen',
    text: 'Wähle ein Tempo, bei dem du jeden Ton sauber greifen kannst – lieber 60 als 100 BPM. Sauber und langsam ist besser als schnell und holprig.',
  },
  {
    title: 'Erst steigern, wenn es dreimal klappt',
    text: 'Erhöhe das Tempo erst um 5 BPM, wenn du eine Stelle dreimal hintereinander fehlerfrei gespielt hast.',
  },
  {
    title: 'Laut mitzählen',
    text: 'Zähle am Anfang laut mit („1 – 2 – 3 – 4“) und spiele genau auf den Klick. Der höhere Klick zeigt dir den Taktanfang.',
  },
  {
    title: 'Kurze Abschnitte üben',
    text: 'Übe schwierige Stellen einzeln (2–4 Takte) statt immer das ganze Stück von vorn.',
  },
  {
    title: 'Tempo abnehmen',
    text: 'Tippe mehrmals im Takt auf „Tap“, um das Tempo eines Songs zu übernehmen.',
  },
];

export function MetronomePage() {
  const state = useMetronomeState();
  // Nur die Zeit mit laufendem Metronom zählt als Übungszeit.
  usePracticeSession('metronome', { active: state.running, details: () => ({ bpm: state.bpm }) });

  return (
    <>
      <PageHeader title="Metronom" subtitle="Gleichmäßig üben – das Fundament für alles" back="/werkzeuge" />
      <div className="space-y-4 pt-1">
        <MetronomeWidget />
        <Card tone="muted">
          <h2 className="flex items-center gap-2 font-semibold">
            <Lightbulb size={18} className="text-gold" aria-hidden />
            So übst du mit dem Metronom
          </h2>
          <ol className="mt-3 space-y-3">
            {TIPS.map((tip, i) => (
              <li key={tip.title} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">{i + 1}</span>
                <span>
                  <span className="font-semibold">{tip.title}: </span>
                  <span className="text-muted">{tip.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
