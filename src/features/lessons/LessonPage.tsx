import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, BookOpen, Check, CircleCheck, Ear, ExternalLink, Guitar, Lightbulb, Square, Target, Volume2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { Badge, Button, Card, EmptyState, Markdown, PageHeader, useToast } from '@/components/ui';
import { getExercise } from '@/core/content/exercises';
import { chapterOfLesson, getLesson, nextLesson, type LessonExercise } from '@/core/content/lessons';
import { parseTabNotation } from '@/core/music/tabNotation';
import type { Score } from '@/core/music/score';
import { getDb } from '@/core/storage/db';
import { ProgressRepository } from '@/core/storage/repositories';
import { Fretboard, type FretboardTap } from '@/features/fretboard/Fretboard';
import { MetronomeWidget } from '@/features/metronome/MetronomeWidget';
import { SongPlayer } from '@/features/player/SongPlayer';
import { TunerWidget } from '@/features/tuner/TunerWidget';
import { useEngine } from '@/hooks/useEngine';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { useSettings } from '@/hooks/useSettings';
import { useSpeech } from '@/hooks/useSpeech';
import { cancelSpeech } from '@/core/speech/speech';
import { markdownToSpeech } from '@/core/speech/phrases';
import { unlockAudio } from '@/core/audio/audioContext';
import { noteNameWithOctave } from '@/core/music/notes';
import { cn } from '@/lib/cn';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const speech = useSpeech();
  const lesson = getLesson(lessonId);
  const chapter = chapterOfLesson(lessonId);
  const next = nextLesson(lessonId);
  const record = useLiveQuery(() => getDb().lessonProgress.get(lessonId), [lessonId]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [checkedLessonId, setCheckedLessonId] = useState(lessonId);
  if (checkedLessonId !== lessonId) {
    setCheckedLessonId(lessonId);
    setChecked({});
  }
  const repo = useMemo(() => new ProgressRepository(), []);
  const { elapsedSec } = usePracticeSession('lesson', { refId: lessonId, title: lesson?.title ?? lessonId });

  useEffect(() => {
    if (lesson) void repo.touchLesson(lesson.id, 0);
  }, [lesson, repo]);

  // Beim Verlassen oder Lektionswechsel nicht weitersprechen.
  useEffect(() => () => cancelSpeech(), [lessonId]);

  if (!lesson) {
    return (
      <>
        <PageHeader title="Lektion" back="/lernen" />
        <EmptyState title="Diese Lektion gibt es nicht." action={<Button onClick={() => navigate('/lernen')}>Zur Gitarrenschule</Button>} />
      </>
    );
  }

  const done = record?.status === 'done';
  const canRead = speech.enabled && speech.scopeOn('lessons');
  const readAloud = (text: string): void => {
    if (speech.speaking) {
      speech.cancel();
      return;
    }
    void speech.say('lessons', text);
  };
  const lessonSpeechText = (): string => {
    const parts = [lesson.goal, markdownToSpeech(lesson.content), `Übung: ${lesson.practice}`];
    if (lesson.tips && lesson.tips.length > 0) parts.push(`Tipps: ${lesson.tips.join(' ')}`);
    return parts.join(' ');
  };
  const complete = async (): Promise<void> => {
    const addSec = Math.round(elapsedSec());
    await repo.touchLesson(lesson.id, addSec);
    await repo.completeLesson(lesson.id);
    toast.show(`Lektion „${lesson.title}“ abgeschlossen!`, 'success');
  };

  return (
    <>
      <PageHeader title={lesson.title} subtitle={chapter ? `Kapitel ${chapter.number} · ${chapter.title}` : undefined} back="/lernen" compact />
      <div className="flex flex-col gap-4 pt-1">
        <Card tone="gold" padding="sm" className="flex items-start gap-3">
          <Target size={20} className="mt-0.5 shrink-0 text-gold" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">Lernziel · ca. {lesson.minutes} Min.</p>
            <p className="text-[15px] font-medium">{lesson.goal}</p>
            {canRead && (
              <Button size="sm" variant={speech.speaking ? 'primary' : 'outline'} className="mt-2" icon={speech.speaking ? <Square size={14} /> : <Volume2 size={16} />} onClick={() => readAloud(lessonSpeechText())}>
                {speech.speaking ? 'Vorlesen stoppen' : 'Lektion vorlesen'}
              </Button>
            )}
          </div>
          {done && <Badge tone="ok" icon={<Check size={12} />}>erledigt</Badge>}
        </Card>

        <Card>
          <Markdown text={lesson.content} />
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Guitar size={18} className="text-gold" /> Übung
          </h2>
          <p className="mt-1 text-sm text-text/90">{lesson.practice}</p>
          {canRead && (
            <Button size="sm" variant="ghost" className="mt-1 -ml-2" icon={<Volume2 size={16} />} onClick={() => readAloud(`Übung: ${lesson.practice}`)}>
              Anweisung vorlesen
            </Button>
          )}
          <div className="mt-3">
            <LessonExerciseBlock lesson={{ id: lesson.id, title: lesson.title }} exercise={lesson.exercise} />
          </div>
        </Card>

        {lesson.tips && lesson.tips.length > 0 && (
          <Card tone="muted">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Lightbulb size={18} className="text-gold" /> Tipps
            </h2>
            <ul className="mt-2 flex flex-col gap-1.5">
              {lesson.tips.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm text-text/90">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {lesson.checklist && lesson.checklist.length > 0 && (
          <Card>
            <h2 className="text-base font-bold">Selbstkontrolle</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {lesson.checklist.map((item, i) => (
                <li key={item}>
                  <button type="button" onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))} className="flex w-full items-center gap-3 py-2 text-left" aria-pressed={checked[i] ?? false}>
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', checked[i] || done ? 'border-ok bg-ok text-[#06160e]' : 'border-border')}>
                      {(checked[i] || done) && <Check size={14} />}
                    </span>
                    <span className="text-sm">{item}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          {!done ? (
            <Button variant="primary" size="lg" icon={<CircleCheck size={20} />} onClick={() => void complete()}>
              Lektion abschließen
            </Button>
          ) : (
            <Button variant="secondary" size="lg" onClick={() => void complete()}>
              Erneut als erledigt speichern
            </Button>
          )}
          {next && (
            <Button variant={done ? 'primary' : 'secondary'} size="lg" iconRight={<ArrowRight size={18} />} onClick={() => navigate(`/lernen/${next.id}`)}>
              Nächste Lektion: {next.title}
            </Button>
          )}
          {record && record.attempts > 1 && <p className="text-center text-xs text-muted">{record.attempts}. Mal geöffnet · bisher {Math.round(record.totalSec / 60)} Min. geübt</p>}
        </div>
      </div>
    </>
  );
}

function LessonExerciseBlock({ lesson, exercise }: { lesson: { id: string; title: string }; exercise: LessonExercise }) {
  switch (exercise.kind) {
    case 'tuner':
      return <TunerWidget compact trackPractice={false} />;
    case 'metronome':
      return <MetronomePreset bpm={exercise.bpm} timeSignature={exercise.timeSignature} />;
    case 'tab-reading':
      return (
        <Link to="/lernen/tabs-lesen" className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 font-semibold text-gold">
          <BookOpen size={20} /> Interaktive Einführung „Tabs verstehen“ öffnen <ExternalLink size={16} className="ml-auto" />
        </Link>
      );
    case 'fretboard':
      return <FretboardExplore mode={exercise.mode ?? 'explore'} />;
    case 'exercise': {
      const def = getExercise(exercise.exerciseId);
      if (!def) return <p className="text-sm text-bad">Übung nicht gefunden.</p>;
      const score = parseTabNotation(def.notation, { tempo: def.tempo, timeSignature: def.timeSignature, title: def.title, artist: 'GuitarCoach' });
      const percent = exercise.tempoPercent ?? def.startTempoPercent ?? 100;
      return (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">
            {def.title} · ♩ = {def.tempo} · Start bei {percent} %
          </p>
          <SongPlayer key={def.id} score={score} title={def.title} practiceKind="lesson" practiceRefId={lesson.id} initialTempoFactor={percent / 100} compact listenHref={`/ueben/uebung/${def.id}/spiel-mit?lesson=${lesson.id}`} />
        </div>
      );
    }
    case 'tab': {
      const score = parseTabNotation(exercise.notation, { tempo: exercise.tempo, timeSignature: exercise.timeSignature, title: exercise.title, artist: 'GuitarCoach' });
      return <SongPlayer key={lesson.id} score={score} title={exercise.title} practiceKind="lesson" practiceRefId={lesson.id} initialTempoFactor={(exercise.tempoPercent ?? 100) / 100} compact />;
    }
    case 'song':
      return <LessonSong songId={exercise.songId} versionLabel={exercise.versionLabel} lessonId={lesson.id} />;
    default:
      return null;
  }
}

function MetronomePreset({ bpm, timeSignature }: { bpm?: number; timeSignature?: [number, number] }) {
  const engine = useEngine();
  useEffect(() => {
    if (bpm) engine.metronome.setBpm(bpm);
    if (timeSignature) engine.metronome.setTimeSignature(timeSignature[0], timeSignature[1]);
    return () => engine.metronome.stop();
  }, [engine, bpm, timeSignature]);
  return <MetronomeWidget compact />;
}

function FretboardExplore({ mode }: { mode: 'explore' | 'find' }) {
  const engine = useEngine();
  const [settings] = useSettings();
  const [last, setLast] = useState<FretboardTap | null>(null);
  const onTap = (pos: FretboardTap): void => {
    void unlockAudio().then(() => engine.synth.noteOn(pos.midi, engine.ctx.currentTime, { string: pos.string, velocity: 0.9 }));
    setLast(pos);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
        <Fretboard
          frets={5}
          compact
          leftHanded={settings.leftHanded}
          orientation={settings.fretboardOrientation}
          naming={settings.noteNaming}
          showNoteNames
          onTap={onTap}
          highlights={last ? [{ string: last.string, fret: last.fret, tone: 'gold', label: noteNameWithOctave(last.midi, settings.noteNaming).replace(/\d+$/, '') }] : []}
        />
      </div>
      <p className="text-xs text-muted">{last ? `${noteNameWithOctave(last.midi, settings.noteNaming)} – Saite ${last.string}, Bund ${last.fret}` : 'Tippe auf eine Position, um den Ton zu hören.'}</p>
      <Link to="/werkzeuge/griffbrett" className="inline-flex items-center gap-2 text-sm font-semibold text-gold">
        {mode === 'find' ? 'Griffbrett-Werkzeug mit „Zeige mir den Ton“ öffnen' : 'Großes Griffbrett öffnen'} <ExternalLink size={14} />
      </Link>
    </div>
  );
}

function LessonSong({ songId, versionLabel, lessonId }: { songId: string; versionLabel?: string; lessonId: string }) {
  const versions = useLiveQuery(() => getDb().songVersions.where('songId').equals(songId).toArray(), [songId]);
  const song = useLiveQuery(() => getDb().songs.get(songId), [songId]);
  const version = useMemo(() => {
    if (!versions) return undefined;
    const sorted = [...versions].sort((a, b) => a.order - b.order);
    return sorted.find((v) => v.label === versionLabel) ?? sorted[0];
  }, [versions, versionLabel]);
  if (versions === undefined) return <p className="text-sm text-muted">Lade Lied …</p>;
  if (!version || !song) return <p className="text-sm text-bad">Das Lied wurde nicht gefunden.</p>;
  const score: Score = version.score;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          {song.title} · Version „{version.label}“
        </span>
        <Link to={`/songs/${song.id}`} className="inline-flex items-center gap-1 font-semibold text-gold">
          Alle Versionen <ExternalLink size={12} />
        </Link>
      </div>
      <SongPlayer key={version.id} score={score} songId={song.id} title={song.title} practiceKind="lesson" practiceRefId={lessonId} compact listenHref={`/songs/${song.id}/spiel-mit?version=${version.id}&lesson=${lessonId}`} />
      <p className="flex items-center gap-1 text-xs text-muted">
        <Ear size={12} /> Tipp: „Spiel mit“ prüft deine Töne über das Mikrofon.
      </p>
    </div>
  );
}
