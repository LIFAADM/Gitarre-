import { Check, Lock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { sayNow } from '@/hooks/useSpeech';
import { KidsButton, KidsShell, StarRow } from './KidsShell';
import { KIDS_LESSONS, isLessonUnlocked, nextKidsLesson } from './kidsCurriculum';
import { useKidsProgress } from './kidsProgress';
import { cn } from '@/lib/cn';

/** Übersicht der Kinder-Schule: Lektionen nacheinander, gesperrt bis die vorherige geschafft ist. */
export function KidsLessonsPage() {
  const navigate = useNavigate();
  const progress = useKidsProgress();
  const next = nextKidsLesson(progress.lessonsDone);
  return (
    <KidsShell title="Gitarrenschule" emoji="🎓" instruction={next ? `Hier lernst du Schritt für Schritt. Als Nächstes kommt: ${next.title}. Tippe auf die große Taste.` : 'Du hast alle Lektionen geschafft! Spiel jetzt die Lieder.'}>
      {next && <KidsButton emoji="▶️" label={`Weiter: ${next.title}`} onClick={() => navigate(`/kinder/lernen/${next.id}`)} testId="kids-next-lesson" className="h-24" />}
      <ol className="flex flex-col gap-2">
        {KIDS_LESSONS.map((l, i) => {
          const done = progress.lessonsDone.includes(l.id);
          const unlocked = isLessonUnlocked(l.id, progress.lessonsDone);
          return (
            <li key={l.id}>
              <button
                type="button"
                disabled={!unlocked}
                aria-disabled={!unlocked}
                onClick={() => {
                  if (!unlocked) {
                    void sayNow('kids', 'Diese Lektion ist noch zu. Mach erst die davor fertig.');
                    return;
                  }
                  navigate(`/kinder/lernen/${l.id}`);
                }}
                data-testid={`kids-lesson-${l.id}`}
                className={cn('flex w-full items-center gap-3 rounded-[1.5rem] border-2 px-4 py-3 text-left transition active:scale-[0.98]', done ? 'border-ok/40 bg-ok/10' : unlocked ? 'border-white/15 bg-white/5' : 'border-white/5 bg-white/[0.02] opacity-60')}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/25 text-2xl" aria-hidden>
                  {unlocked ? l.emoji : <Lock size={20} className="text-muted" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-muted">Lektion {i + 1}</span>
                  <span className="block truncate text-lg font-extrabold">{l.title}</span>
                </span>
                {done ? (
                  <span className="flex items-center gap-2">
                    <StarRow stars={progress.lessonStars[l.id] ?? 0} size={18} />
                    <Check size={22} className="text-ok" />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </KidsShell>
  );
}
