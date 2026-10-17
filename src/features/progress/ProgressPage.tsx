import { useMemo, useState } from 'react';
import { Award, Check, Flame, GraduationCap, ListMusic, Lock, Plus, Target, Timer, Trash } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Badge, Button, Card, PageHeader, PressableCard, Stat } from '@/components/ui';
import { ALL_LESSONS } from '@/core/content/lessons';
import { ACHIEVEMENTS } from '@/core/progress/achievements';
import { difficultItems, minutesPerDay, summarize } from '@/core/progress/stats';
import { getDb, newId } from '@/core/storage/db';
import type { GoalRecord } from '@/core/storage/types';
import { useAchievementSync, useAppData } from '@/hooks/useAppData';
import { useSettings } from '@/hooks/useSettings';
import { formatMinutes, formatRelativeDay } from '@/lib/format';
import { cn } from '@/lib/cn';

async function toggleGoalRecord(g: GoalRecord): Promise<number> {
  const now = Date.now();
  return getDb().goals.update(g.id, { done: !g.done, doneAt: !g.done ? now : undefined });
}

const KIND_LABEL: Record<string, string> = {
  tuner: 'Stimmen',
  lesson: 'Lektion',
  song: 'Song',
  metronome: 'Metronom',
  fretboard: 'Griffbrett',
  listen: 'Spiel mit',
  exercise: 'Übung',
  editor: 'Tab-Editor',
};

export function ProgressPage() {
  const navigate = useNavigate();
  const [settings] = useSettings();
  const data = useAppData();
  useAchievementSync(data);
  const summary = useMemo(() => summarize(data.sessions, data.lessonProgress, data.songProgress), [data.sessions, data.lessonProgress, data.songProgress]);
  const week = useMemo(() => minutesPerDay(data.sessions, 7), [data.sessions]);
  const month = useMemo(() => minutesPerDay(data.sessions, 30), [data.sessions]);
  const maxWeek = Math.max(settings.dailyGoalMinutes, ...week.map((d) => d.minutes));
  const weak = useMemo(() => difficultItems(data.sessions, 5), [data.sessions]);
  const best = useMemo(() => {
    const longest = [...data.sessions].sort((a, b) => b.durationSec - a.durationSec)[0];
    const bestDay = [...month].sort((a, b) => b.minutes - a.minutes)[0];
    const fastest = [...data.songProgress].sort((a, b) => b.bestTempoFactor - a.bestTempoFactor)[0];
    return { longest, bestDay, fastest };
  }, [data.sessions, month, data.songProgress]);
  const unlocked = new Map(data.achievements.map((a) => [a.id, a.unlockedAt]));
  const recent = useMemo(() => [...data.sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 10), [data.sessions]);
  const [newGoal, setNewGoal] = useState('');
  const songById = useMemo(() => new Map(data.songs.map((s) => [s.id, s])), [data.songs]);

  const toggleGoal = (g: GoalRecord): Promise<number> => toggleGoalRecord(g);
  const addGoal = async (): Promise<void> => {
    const title = newGoal.trim();
    if (!title) return;
    await getDb().goals.put({ id: newId('goal-'), title, group: 'lang', order: 100 + data.goals.length, done: false, custom: true });
    setNewGoal('');
  };

  const groups: Array<{ key: GoalRecord['group']; title: string }> = [
    { key: 'anfaenger', title: 'Anfängerziele' },
    { key: 'mittel', title: 'Mittelfristige Ziele' },
    { key: 'lang', title: 'Langfristige Ziele' },
  ];

  return (
    <>
      <PageHeader title="Mein Fortschritt" back="/" />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Geübte Minuten" value={formatMinutes(summary.totalMinutes)} icon={<Timer size={14} />} tone="gold" />
          <Stat label="Übungstage" value={summary.practiceDays} hint={`${summary.streak} in Folge`} icon={<Flame size={14} />} />
          <Stat label="Lektionen" value={`${summary.lessonsDone} / ${ALL_LESSONS.length}`} icon={<GraduationCap size={14} />} />
          <Stat label="Songs durchgespielt" value={summary.songsCompleted} icon={<ListMusic size={14} />} />
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Letzte 7 Tage</h2>
            <span className="text-xs text-muted">{formatMinutes(summary.weekMinutes)} · Ziel {settings.dailyGoalMinutes} Min./Tag</span>
          </div>
          <div className="mt-3 flex h-28 items-end gap-2">
            {week.map((d) => {
              const pct = maxWeek > 0 ? (d.minutes / maxWeek) * 100 : 0;
              const reached = d.minutes >= settings.dailyGoalMinutes;
              return (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums text-muted">{d.minutes > 0 ? Math.round(d.minutes) : ''}</span>
                  <div className="flex w-full flex-1 items-end rounded-md bg-surface-2">
                    <div className={cn('w-full rounded-md transition-[height]', reached ? 'bg-ok' : 'bg-gold')} style={{ height: `${Math.max(d.minutes > 0 ? 6 : 0, pct)}%` }} aria-label={`${d.weekdayShort}: ${Math.round(d.minutes)} Minuten`} />
                  </div>
                  <span className="text-[11px] text-muted">{d.weekdayShort}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Letzte 30 Tage: {formatMinutes(month.reduce((s, d) => s + d.minutes, 0))} an {month.filter((d) => d.minutes >= 1).length} Tagen.</p>
        </Card>

        <Card>
          <h2 className="text-base font-bold">Persönliche Bestleistungen</h2>
          <dl className="mt-2 grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Längste Sitzung</dt>
              <dd className="font-semibold">{best.longest ? `${formatMinutes(best.longest.durationSec / 60)} (${KIND_LABEL[best.longest.kind] ?? best.longest.kind})` : '–'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Bester Tag (30 Tage)</dt>
              <dd className="font-semibold">{best.bestDay && best.bestDay.minutes > 0 ? `${formatMinutes(best.bestDay.minutes)} am ${new Date(best.bestDay.date).toLocaleDateString('de-DE')}` : '–'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Schnellster Song</dt>
              <dd className="font-semibold">{best.fastest && best.fastest.bestTempoFactor > 0 ? `${songById.get(best.fastest.songId)?.title ?? best.fastest.songId} bei ${Math.round(best.fastest.bestTempoFactor * 100)} %` : '–'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Beste Trefferquote</dt>
              <dd className="font-semibold">{summary.bestAccuracy !== null ? `${Math.round(summary.bestAccuracy)} %` : '–'}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Target size={18} className="text-gold" /> Meine Lernziele
          </h2>
          {groups.map((g) => {
            const items = data.goals.filter((x) => x.group === g.key).sort((a, b) => a.order - b.order);
            if (items.length === 0) return null;
            return (
              <div key={g.key} className="mt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</h3>
                <ul className="mt-1 flex flex-col">
                  {items.map((goal) => (
                    <li key={goal.id} className="flex items-center gap-2">
                      <button type="button" onClick={() => void toggleGoal(goal)} className="flex flex-1 items-center gap-3 py-2 text-left" aria-pressed={goal.done}>
                        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', goal.done ? 'border-ok bg-ok text-[#06160e]' : 'border-border')}>{goal.done && <Check size={14} />}</span>
                        <span className={cn('text-sm', goal.done && 'text-muted line-through')}>{goal.title}</span>
                      </button>
                      {goal.linkedSongId && (
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/songs/${goal.linkedSongId}`)}>
                          Song
                        </Button>
                      )}
                      {goal.linkedLessonId && (
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/lernen/${goal.linkedLessonId}`)}>
                          Lektion
                        </Button>
                      )}
                      {goal.custom && (
                        <Button size="sm" variant="ghost" aria-label="Ziel löschen" onClick={() => void getDb().goals.delete(goal.id)}>
                          <Trash size={16} />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="mt-3 flex gap-2">
            <input value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="Eigenes Ziel hinzufügen" className="h-11 flex-1 rounded-2xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-gold" aria-label="Eigenes Ziel" />
            <Button icon={<Plus size={18} />} onClick={() => void addGoal()} disabled={!newGoal.trim()}>
              Hinzufügen
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Award size={18} className="text-gold" /> Erfolge
          </h2>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.map((a) => {
              const at = unlocked.get(a.id);
              return (
                <li key={a.id} className={cn('rounded-2xl border p-3', at ? 'border-gold/40 bg-gold/10' : 'border-border bg-surface-2/60 opacity-70')}>
                  <div className="flex items-center gap-2">
                    {at ? <Award size={16} className="text-gold" /> : <Lock size={16} className="text-muted" />}
                    <span className="text-sm font-semibold">{a.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{a.description}</p>
                  {at && <p className="mt-1 text-[11px] text-gold">{formatRelativeDay(at)}</p>}
                </li>
              );
            })}
          </ul>
        </Card>

        {weak.length > 0 && (
          <Card>
            <h2 className="text-base font-bold">Schwierige Passagen</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {weak.map((w) => (
                <li key={w.refId}>
                  <PressableCard padding="sm" tone="muted" onClick={() => navigate(w.refId.startsWith('ex-') ? `/ueben/uebung/${w.refId}/spiel-mit` : `/songs/${w.refId}/spiel-mit`)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{w.title}</span>
                      <span className="text-xs text-muted">
                        {w.attempts}× · <Badge tone="warn">{Math.round(w.accuracy)} %</Badge>
                      </span>
                    </div>
                  </PressableCard>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <h2 className="text-base font-bold">Letzte Übungssitzungen</h2>
          {recent.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Noch keine Sitzungen – sobald du übst, erscheinen sie hier.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border/60">
              {recent.map((s) => (
                <li key={s.id ?? s.startedAt} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.title ?? KIND_LABEL[s.kind] ?? s.kind}</span>
                    <span className="block text-xs text-muted">
                      {KIND_LABEL[s.kind] ?? s.kind} · {formatRelativeDay(s.startedAt)}
                      {s.details?.notesTotal ? ` · ${s.details.notesCorrect ?? 0}/${s.details.notesTotal} richtig` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">{formatMinutes(s.durationSec / 60)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
