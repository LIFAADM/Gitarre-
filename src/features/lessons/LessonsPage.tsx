import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Check, ChevronDown, ChevronRight, Circle, CircleDot, Play } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Badge, Button, Card, PageHeader, ProgressBar } from '@/components/ui';
import { ALL_LESSONS, CHAPTERS, levelLabel } from '@/core/content/lessons';
import { nextOpenLesson } from '@/core/progress/recommendations';
import { getDb } from '@/core/storage/db';
import { cn } from '@/lib/cn';
import { chapterStats, progressMap } from './lessonProgressUtils';

export function LessonsPage() {
  const navigate = useNavigate();
  const records = useLiveQuery(() => getDb().lessonProgress.toArray(), []);
  const map = useMemo(() => progressMap(records), [records]);
  const doneCount = [...map.values()].filter((r) => r.status === 'done').length;
  const next = nextOpenLesson(records ?? []);
  const level = levelLabel(new Set([...map.values()].filter((r) => r.status === 'done').map((r) => r.lessonId)));
  const currentChapterId = next ? CHAPTERS.find((c) => c.lessons.some((l) => l.id === next.id))?.id : undefined;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string): boolean => open[id] ?? id === (currentChapterId ?? 'k1');

  return (
    <>
      <PageHeader title="Gitarrenschule" subtitle={`${doneCount} von ${ALL_LESSONS.length} Lektionen abgeschlossen · ${level.label}`} />
      <div className="flex flex-col gap-3">
        <Card tone="gold">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">Weiter lernen</p>
              <h2 className="truncate text-lg font-bold">{next ? next.title : 'Alle Lektionen geschafft!'}</h2>
              {next && <p className="truncate text-sm text-muted">{next.goal}</p>}
            </div>
            {next && (
              <Button variant="primary" icon={<Play size={18} />} onClick={() => navigate(`/lernen/${next.id}`)}>
                Start
              </Button>
            )}
          </div>
          <ProgressBar value={doneCount} max={ALL_LESSONS.length} className="mt-3" label="Gesamtfortschritt" />
        </Card>

        <button type="button" onClick={() => navigate('/lernen/tabs-lesen')} className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left">
          <BookOpen className="text-gold" size={22} />
          <span className="flex-1">
            <span className="block font-semibold">Tabs verstehen – interaktive Einführung</span>
            <span className="block text-xs text-muted">Linien, Zahlen, Pausen und Rhythmus – zum Anhören und Antippen</span>
          </span>
          <ChevronRight className="text-muted" size={20} />
        </button>

        {CHAPTERS.map((chapter) => {
          const stats = chapterStats(chapter, map);
          const expanded = isOpen(chapter.id);
          return (
            <Card key={chapter.id} padding="none" className="overflow-hidden">
              <button type="button" onClick={() => setOpen((o) => ({ ...o, [chapter.id]: !expanded }))} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={expanded}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold', stats.done === stats.total ? 'bg-ok/20 text-ok' : 'bg-gold/15 text-gold')}>
                  {stats.done === stats.total ? <Check size={20} /> : chapter.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{chapter.title}</span>
                  <span className="block truncate text-xs text-muted">{chapter.subtitle}</span>
                </span>
                <Badge tone={stats.done === stats.total ? 'ok' : 'neutral'}>
                  {stats.done}/{stats.total}
                </Badge>
                <ChevronDown size={18} className={cn('text-muted transition-transform', expanded && 'rotate-180')} />
              </button>
              {expanded && (
                <ul className="border-t border-border/60">
                  {chapter.lessons.map((lesson) => {
                    const status = map.get(lesson.id)?.status ?? 'open';
                    const isNext = next?.id === lesson.id;
                    return (
                      <li key={lesson.id}>
                        <button type="button" onClick={() => navigate(`/lernen/${lesson.id}`)} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2', isNext && 'bg-gold/5')}>
                          {status === 'done' ? <Check size={18} className="shrink-0 text-ok" /> : status === 'started' ? <CircleDot size={18} className="shrink-0 text-gold" /> : <Circle size={18} className="shrink-0 text-muted" />}
                          <span className="min-w-0 flex-1">
                            <span className={cn('block text-[15px]', status === 'done' ? 'text-muted' : 'font-medium')}>{lesson.title}</span>
                            <span className="block truncate text-xs text-muted">{lesson.goal}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted">{lesson.minutes} Min.</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
