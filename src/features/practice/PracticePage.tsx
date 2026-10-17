import { useMemo } from 'react';
import { Check, Dumbbell, Ear, Gauge, GraduationCap, ListMusic, RotateCcw, Target } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Badge, Card, PageHeader, PressableCard, ProgressBar } from '@/components/ui';
import { EXERCISES } from '@/core/content/exercises';
import { nextOpenLesson } from '@/core/progress/recommendations';
import { difficultItems, minutesOf, sessionsOnDay, startOfDay } from '@/core/progress/stats';
import { useAppData } from '@/hooks/useAppData';
import { useNow } from '@/hooks/useNow';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';

interface PlanBlock {
  id: string;
  title: string;
  minutes: number;
  doneMinutes: number;
  href: string;
  icon: React.ReactNode;
  hint: string;
}

export function PracticePage() {
  const navigate = useNavigate();
  const [settings] = useSettings();
  const data = useAppData();
  const now = useNow();
  const today = useMemo(() => sessionsOnDay(data.sessions, now), [data.sessions, now]);
  const next = nextOpenLesson(data.lessonProgress);
  const favorite = data.songs.find((s) => s.isFavorite && data.playableSongIds.has(s.id)) ?? data.songs.find((s) => data.playableSongIds.has(s.id) && s.goalTier === 'anfaenger');
  const factor = settings.dailyGoalMinutes / 20;
  const blocks: PlanBlock[] = [
    { id: 'tune', title: 'Stimmen', minutes: Math.max(1, Math.round(3 * factor)), doneMinutes: minutesOf(today.filter((s) => s.kind === 'tuner')), href: '/werkzeuge/stimmgeraet', icon: <Gauge size={20} />, hint: 'Alle sechs Saiten mit dem Stimmgerät.' },
    { id: 'fingers', title: 'Fingerübungen', minutes: Math.max(2, Math.round(5 * factor)), doneMinutes: minutesOf(today.filter((s) => s.kind === 'exercise' || s.kind === 'fretboard')), href: '/ueben/uebung/ex-chromatik-1234', icon: <Dumbbell size={20} />, hint: 'Fingergymnastik 1–2–3–4 oder Wechselschlag.' },
    { id: 'technique', title: 'Technik / Lektion', minutes: Math.max(2, Math.round(5 * factor)), doneMinutes: minutesOf(today.filter((s) => s.kind === 'lesson' || s.kind === 'listen')), href: next ? `/lernen/${next.id}` : '/lernen', icon: <GraduationCap size={20} />, hint: next ? `Nächste Lektion: ${next.title}` : 'Alle Lektionen abgeschlossen – wiederhole eine.' },
    { id: 'song', title: 'Lieblingssong', minutes: Math.max(3, Math.round(7 * factor)), doneMinutes: minutesOf(today.filter((s) => s.kind === 'song')), href: favorite ? `/songs/${favorite.id}` : '/songs', icon: <ListMusic size={20} />, hint: favorite ? `${favorite.title} – langsam, in Schleifen, Note für Note.` : 'Wähle einen spielbereiten Song.' },
  ];
  const totalDone = minutesOf(today);
  const weekStart = startOfDay(now) - 6 * 86_400_000;
  const weekDays = new Set(data.sessions.filter((s) => s.startedAt >= weekStart && s.durationSec >= 60).map((s) => startOfDay(s.startedAt))).size;
  const weak = useMemo(() => difficultItems(data.sessions, 3), [data.sessions]);
  const listenTargets = useMemo(() => data.songs.filter((s) => data.playableSongIds.has(s.id)).slice(0, 4), [data.songs, data.playableSongIds]);

  return (
    <>
      <PageHeader title="Üben" subtitle={`Heute ${Math.round(totalDone)} von ${settings.dailyGoalMinutes} Minuten · diese Woche ${weekDays}/${settings.weeklyGoalDays} Tage`} />
      <div className="flex flex-col gap-4">
        <Card tone="gold">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Target size={18} className="text-gold" /> Mein Lernplan für heute
            </h2>
            <Badge tone={totalDone >= settings.dailyGoalMinutes ? 'ok' : 'neutral'}>{settings.dailyGoalMinutes} Min.</Badge>
          </div>
          <ProgressBar value={totalDone} max={settings.dailyGoalMinutes} className="mt-2" label="Tagesziel" />
          <ul className="mt-3 flex flex-col gap-2">
            {blocks.map((b) => {
              const done = b.doneMinutes >= b.minutes;
              return (
                <li key={b.id}>
                  <PressableCard padding="sm" tone="muted" onClick={() => navigate(b.href)}>
                    <div className="flex items-center gap-3">
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', done ? 'bg-ok/20 text-ok' : 'bg-gold/15 text-gold')}>{done ? <Check size={20} /> : b.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {b.title} <span className="text-xs font-normal text-muted">· {b.minutes} Min.</span>
                        </p>
                        <p className="truncate text-xs text-muted">{b.hint}</p>
                      </div>
                      <span className="text-xs tabular-nums text-muted">{Math.round(b.doneMinutes)}/{b.minutes}</span>
                    </div>
                  </PressableCard>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">Tagesziel und Wochenziel kannst du in den Einstellungen anpassen.</p>
        </Card>

        {weak.length > 0 && (
          <Card>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <RotateCcw size={18} className="text-warn" /> Wiederholungsbedarf
            </h2>
            <p className="text-xs text-muted">Hier lag deine Trefferquote im Spiel-mit-Modus unter 80 %.</p>
            <ul className="mt-2 flex flex-col gap-2">
              {weak.map((w) => (
                <li key={w.refId}>
                  <PressableCard padding="sm" tone="muted" onClick={() => navigate(w.refId.startsWith('ex-') ? `/ueben/uebung/${w.refId}/spiel-mit` : `/songs/${w.refId}/spiel-mit`)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{w.title}</span>
                      <Badge tone="warn">{Math.round(w.accuracy)} %</Badge>
                    </div>
                  </PressableCard>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Ear size={18} className="text-gold" /> Spiel mit – GuitarCoach hört zu
          </h2>
          <p className="mt-1 text-sm text-muted">Das Mikrofon prüft Ton für Ton, ob du richtig spielst. Für Einzeltöne gedacht; Akkorde gelten, sobald ein Ton stimmt.</p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <PressableCard padding="sm" tone="muted" onClick={() => navigate('/ueben/uebung/ex-leere-saiten/spiel-mit')}>
              <span className="font-semibold">Einzeltonübung: Die sechs leeren Saiten</span>
              <span className="block text-xs text-muted">Der ideale Einstieg in die Lernkontrolle.</span>
            </PressableCard>
            <PressableCard padding="sm" tone="muted" onClick={() => navigate('/ueben/uebung/ex-bund-1-2-3/spiel-mit')}>
              <span className="font-semibold">Einzeltonübung: Bund 1 bis 3</span>
            </PressableCard>
            {listenTargets.map((s) => (
              <PressableCard key={s.id} padding="sm" tone="muted" onClick={() => navigate(`/songs/${s.id}/spiel-mit`)}>
                <span className="font-semibold">{s.title}</span>
                <span className="block text-xs text-muted">{s.artist}</span>
              </PressableCard>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Dumbbell size={18} className="text-gold" /> Alle Technik-Übungen
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {[...EXERCISES]
              .sort((a, b) => a.difficulty - b.difficulty)
              .map((ex) => (
                <li key={ex.id}>
                  <PressableCard padding="sm" tone="muted" onClick={() => navigate(`/ueben/uebung/${ex.id}`)}>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{ex.title}</p>
                        <p className="truncate text-xs text-muted">{ex.techniques.join(' · ')}</p>
                      </div>
                      <span className="inline-flex items-center gap-0.5" aria-label={`Schwierigkeit ${ex.difficulty} von 5`}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i <= ex.difficulty ? 'bg-gold' : 'bg-surface-3')} />
                        ))}
                      </span>
                    </div>
                  </PressableCard>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
