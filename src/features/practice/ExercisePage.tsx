import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { getExercise } from '@/core/content/exercises';
import { parseTabNotation } from '@/core/music/tabNotation';
import { SongPlayer } from '@/features/player/SongPlayer';

/** Einzelne technische Übung im Player (Vorübung für Songs). */
export function ExercisePage() {
  const { exerciseId = '' } = useParams();
  const exercise = getExercise(exerciseId);
  const score = useMemo(
    () => (exercise ? parseTabNotation(exercise.notation, { tempo: exercise.tempo, timeSignature: exercise.timeSignature, title: exercise.title, artist: 'GuitarCoach' }) : null),
    [exercise],
  );
  if (!exercise || !score) {
    return (
      <>
        <PageHeader title="Übung" back="/ueben" />
        <EmptyState title="Diese Übung gibt es nicht." />
      </>
    );
  }
  return (
    <>
      <PageHeader title={exercise.title} subtitle={`♩ = ${exercise.tempo} · Schwierigkeit ${exercise.difficulty}/5`} back compact />
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex flex-wrap gap-1.5">
          {exercise.techniques.map((t) => (
            <Badge key={t} tone="gold">
              {t}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted">{exercise.description}</p>
        <SongPlayer
          key={exercise.id}
          score={score}
          title={exercise.title}
          practiceKind="exercise"
          practiceRefId={exercise.id}
          initialTempoFactor={exercise.startTempoPercent ? exercise.startTempoPercent / 100 : 1}
          listenHref={`/ueben/uebung/${exercise.id}/spiel-mit`}
        />
        {exercise.tips && exercise.tips.length > 0 && (
          <Card>
            <h2 className="text-base font-bold">Tipps</h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-text/90">
              {exercise.tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
