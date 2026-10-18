import { useMemo } from 'react';
import { ArrowRight, BookOpen, Flame, Gauge, GraduationCap, Guitar, Heart, ListMusic, Settings, Sparkles, Timer, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Badge, Card, IconButton, PressableCard, ProgressBar, Stat } from '@/components/ui';
import { ALL_LESSONS, CHAPTERS, levelLabel } from '@/core/content/lessons';
import { buildRecommendations, nextOpenLesson } from '@/core/progress/recommendations';
import { summarize } from '@/core/progress/stats';
import { useAchievementSync, useAppData } from '@/hooks/useAppData';
import { useSettings } from '@/hooks/useSettings';
import { formatMinutes, formatRelativeDay } from '@/lib/format';
import { cn } from '@/lib/cn';

function greeting(name: string): string {
  const h = new Date().getHours();
  const base = h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
  return name ? `${base}, ${name}!` : `${base}!`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [settings] = useSettings();
  const data = useAppData();
  useAchievementSync(data);

  const summary = useMemo(() => summarize(data.sessions, data.lessonProgress, data.songProgress), [data.sessions, data.lessonProgress, data.songProgress]);
  const doneIds = useMemo(() => new Set(data.lessonProgress.filter((l) => l.status === 'done').map((l) => l.lessonId)), [data.lessonProgress]);
  const level = levelLabel(doneIds);
  const next = nextOpenLesson(data.lessonProgress);
  const nextChapter = next ? CHAPTERS.find((c) => c.lessons.some((l) => l.id === next.id)) : undefined;
  const chapterDone = nextChapter ? nextChapter.lessons.filter((l) => doneIds.has(l.id)).length : 0;
  const recs = useMemo(
    () => buildRecommendations({ sessions: data.sessions, lessonProgress: data.lessonProgress, songProgress: data.songProgress, songs: data.songs, playableSongIds: data.playableSongIds }),
    [data.sessions, data.lessonProgress, data.songProgress, data.songs, data.playableSongIds],
  );
  const recentSongs = useMemo(() => data.songs.filter((s) => s.lastPlayedAt).sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0)).slice(0, 3), [data.songs]);
  const progressMap = useMemo(() => new Map(data.songProgress.map((p) => [p.songId, p])), [data.songProgress]);
  const favorite = useMemo(() => {
    const favs = data.songs.filter((s) => s.isFavorite);
    return favs.sort((a, b) => (progressMap.get(b.id)?.lastPracticedAt ?? 0) - (progressMap.get(a.id)?.lastPracticedAt ?? 0))[0];
  }, [data.songs, progressMap]);
  const practiceSong = favorite && data.playableSongIds.has(favorite.id) ? favorite : data.songs.find((s) => data.playableSongIds.has(s.id) && s.goalTier === 'anfaenger');
  const goalMinutes = settings.dailyGoalMinutes;
  const todayPct = Math.min(100, (summary.todayMinutes / goalMinutes) * 100);
  const isFirstRun = data.loaded && data.sessions.length === 0 && doneIds.size === 0;

  return (
    <>
      <header className="sticky top-0 z-20 -mx-4 px-4 safe-top bg-bg/85 backdrop-blur-md">
        <div className="flex items-center gap-2 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">GuitarCoach</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">{greeting(settings.userName)}</h1>
          </div>
          <IconButton label="Mein Fortschritt" onClick={() => navigate('/fortschritt')}>
            <Trophy size={22} />
          </IconButton>
          <IconButton label="Einstellungen" onClick={() => navigate('/einstellungen')}>
            <Settings size={22} />
          </IconButton>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {/* Tagesziel */}
        <Card tone="gold" className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle cx="40" cy="40" r="34" fill="none" stroke="#d9a94e" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(todayPct / 100) * 213.6} 213.6`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold tabular-nums">{Math.round(summary.todayMinutes)}</span>
              <span className="text-[10px] text-muted">/ {goalMinutes} Min.</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">Heutiges Lernziel</p>
            <p className="text-lg font-bold leading-tight">
              {summary.todayMinutes >= goalMinutes ? 'Tagesziel erreicht – stark!' : summary.todayMinutes > 0 ? `Noch ${Math.ceil(goalMinutes - summary.todayMinutes)} Minuten bis zum Ziel.` : `Heute üben wir ${goalMinutes} Minuten.`}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Flame size={14} className={cn(summary.streak > 0 ? 'text-gold' : '')} /> {summary.streak} {summary.streak === 1 ? 'Tag' : 'Tage'} in Folge
              </span>
              <span>Niveau: {level.label}</span>
            </div>
          </div>
        </Card>

        {isFirstRun && (
          <Card>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Sparkles size={18} className="text-gold" /> Willkommen bei GuitarCoach!
            </h2>
            <p className="mt-1 text-sm text-text/90">So startest du am besten:</p>
            <ol className="mt-2 flex flex-col gap-1.5 text-sm">
              <li className="flex gap-2"><span className="font-bold text-gold">1.</span> Gitarre stimmen (Stimmgerät unten).</li>
              <li className="flex gap-2"><span className="font-bold text-gold">2.</span> Kapitel 1 der Gitarrenschule öffnen – es holt dich bei null ab.</li>
              <li className="flex gap-2"><span className="font-bold text-gold">3.</span> Danach „Happy Birthday“ unter „Meine Songs“ Note für Note lernen.</li>
            </ol>
            <p className="mt-2 text-xs text-muted">Tipp fürs iPhone: Über „Teilen → Zum Home-Bildschirm“ wird GuitarCoach zur App und funktioniert offline.</p>
          </Card>
        )}

        {/* Schnellstart */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Schnellstart</h2>
          <div className="grid grid-cols-2 gap-2">
            <QuickButton icon={<Gauge size={22} />} label="Gitarre stimmen" onClick={() => navigate('/werkzeuge/stimmgeraet')} />
            <QuickButton icon={<GraduationCap size={22} />} label={next ? 'Unterricht fortsetzen' : 'Gitarrenschule'} onClick={() => navigate(next ? `/lernen/${next.id}` : '/lernen')} />
            <QuickButton icon={<ListMusic size={22} />} label="Song üben" onClick={() => navigate(practiceSong ? `/songs/${practiceSong.id}` : '/songs')} />
            <QuickButton icon={<Guitar size={22} />} label="Griffbrett öffnen" onClick={() => navigate('/werkzeuge/griffbrett')} />
            <QuickButton icon={<Timer size={22} />} label="Metronom starten" onClick={() => navigate('/werkzeuge/metronom')} className="col-span-2" />
          </div>
        </section>

        {/* Aktuelle Lektion */}
        {next && nextChapter && (
          <PressableCard onClick={() => navigate(`/lernen/${next.id}`)}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <BookOpen size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  Kapitel {nextChapter.number} · {nextChapter.title} · Lektion {chapterDone + 1}/{nextChapter.lessons.length}
                </p>
                <p className="truncate font-semibold">{next.title}</p>
                <ProgressBar value={chapterDone} max={nextChapter.lessons.length} className="mt-2 h-1.5" label="Kapitelfortschritt" />
              </div>
              <ArrowRight size={18} className="text-muted" />
            </div>
          </PressableCard>
        )}

        {/* Empfehlungen */}
        {recs.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Empfohlen für heute</h2>
            <ul className="flex flex-col gap-2">
              {recs.map((r) => (
                <li key={r.id}>
                  <PressableCard padding="sm" onClick={() => navigate(r.href)}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{r.title}</p>
                        <p className="truncate text-xs text-muted">{r.reason}</p>
                      </div>
                      <Badge tone={r.kind === 'repeat' ? 'warn' : 'neutral'}>{r.minutes} Min.</Badge>
                    </div>
                  </PressableCard>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Statistik */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Übungstage" value={summary.practiceDays} icon={<Flame size={14} />} tone="gold" />
          <Stat label="Lektionen" value={`${summary.lessonsDone}/${ALL_LESSONS.length}`} icon={<GraduationCap size={14} />} />
          <Stat label="Gesamt" value={formatMinutes(summary.totalMinutes)} icon={<Timer size={14} />} />
        </div>

        {/* Zuletzt gespielt & Lieblingslied */}
        {(recentSongs.length > 0 || favorite) && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Meine Songs</h2>
            <div className="flex flex-col gap-2">
              {favorite && (
                <PressableCard padding="sm" onClick={() => navigate(`/songs/${favorite.id}`)}>
                  <div className="flex items-center gap-3">
                    <Heart size={18} className="shrink-0 text-bad" fill="currentColor" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted">Mein aktuelles Lieblingslied</p>
                      <p className="truncate font-semibold">
                        {favorite.title} <span className="font-normal text-muted">· {favorite.artist}</span>
                      </p>
                    </div>
                    {progressMap.get(favorite.id) && <Badge tone="gold">{progressMap.get(favorite.id)!.progressPercent} %</Badge>}
                  </div>
                </PressableCard>
              )}
              {recentSongs
                .filter((s) => s.id !== favorite?.id)
                .map((s) => (
                  <PressableCard key={s.id} padding="sm" onClick={() => navigate(`/songs/${s.id}`)}>
                    <div className="flex items-center gap-3">
                      <ListMusic size={18} className="shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.title}</p>
                        <p className="truncate text-xs text-muted">
                          {s.artist} · zuletzt {formatRelativeDay(s.lastPlayedAt ?? 0)}
                        </p>
                      </div>
                      {progressMap.get(s.id) && <Badge tone="neutral">{progressMap.get(s.id)!.progressPercent} %</Badge>}
                    </div>
                  </PressableCard>
                ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-muted">
          Alle Zahlen stammen aus deinen echten Übungssitzungen.{' '}
          <Link to="/fortschritt" className="text-gold underline">
            Details ansehen
          </Link>
        </p>
      </div>
    </>
  );
}

function QuickButton({ icon, label, onClick, className }: { icon: React.ReactNode; label: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex h-16 items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left font-semibold transition active:scale-[0.98] hover:bg-surface-2', className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">{icon}</span>
      <span className="text-[15px]">{label}</span>
    </button>
  );
}
