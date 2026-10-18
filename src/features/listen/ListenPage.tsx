import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Ear, MicOff, Pause, Play, RotateCcw, SkipForward, Volume2 } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Badge, Button, Card, EmptyState, IconButton, PageHeader, ProgressBar, Toggle } from '@/components/ui';
import { unlockAudio } from '@/core/audio/audioContext';
import { getExercise } from '@/core/content/exercises';
import { preferredPositionForMidi } from '@/core/music/fretboard';
import { noteNameWithOctave } from '@/core/music/notes';
import { buildPlaybackPlan, type PlaybackPlan } from '@/core/music/playback';
import type { Score } from '@/core/music/score';
import { parseTabNotation } from '@/core/music/tabNotation';
import { getDb } from '@/core/storage/db';
import { ProgressRepository } from '@/core/storage/repositories';
import type { SongRecord, SongVersionRecord } from '@/core/storage/types';
import { Fretboard, type FretboardHighlight } from '@/features/fretboard/Fretboard';
import { TabView, type TabViewHandle } from '@/features/player/TabView';
import { useEngine } from '@/hooks/useEngine';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';
import { OnsetGate, evaluatePitch, summarizeResults, type ListenStep, type StepResult, type Verdict } from './listenLogic';

interface Target {
  score: Score;
  title: string;
  refId: string;
  songId?: string;
  backHref: string;
}

function useTarget(): { target: Target | null; loading: boolean } {
  const { songId, exerciseId } = useParams();
  const [params] = useSearchParams();
  const versionId = params.get('version');
  const versions = useLiveQuery<SongVersionRecord[]>(async () => (songId ? getDb().songVersions.where('songId').equals(songId).toArray() : []), [songId]);
  const song = useLiveQuery<SongRecord | undefined>(async () => (songId ? getDb().songs.get(songId) : undefined), [songId]);
  return useMemo(() => {
    if (exerciseId) {
      const ex = getExercise(exerciseId);
      if (!ex) return { target: null, loading: false };
      return {
        target: { score: parseTabNotation(ex.notation, { tempo: ex.tempo, timeSignature: ex.timeSignature, title: ex.title }), title: ex.title, refId: ex.id, backHref: `/ueben/uebung/${ex.id}` },
        loading: false,
      };
    }
    if (songId) {
      if (versions === undefined || song === undefined) return { target: null, loading: true };
      const sorted = [...versions].sort((a, b) => a.order - b.order);
      const version = sorted.find((v) => v.id === versionId) ?? sorted[0];
      if (!version || !song) return { target: null, loading: false };
      return { target: { score: version.score, title: `${song.title} (${version.label})`, refId: song.id, songId: song.id, backHref: `/songs/${song.id}` }, loading: false };
    }
    return { target: null, loading: false };
  }, [exerciseId, songId, versions, song, versionId]);
}

function buildSteps(plan: PlaybackPlan): ListenStep[] {
  return plan.beats
    .filter((b) => b.voice === 0 && !b.isRest && b.beat.notes.some((n) => !n.tieFromPrevious))
    .map((b) => ({
      beatRef: b.index,
      midis: b.beat.notes.filter((n) => !n.tieFromPrevious).map((n) => n.midi),
      positions: b.beat.notes.filter((n) => !n.tieFromPrevious).map((n) => ({ string: n.string, fret: n.fret, midi: n.midi, ...(n.finger !== undefined ? { finger: n.finger } : {}) })),
    }));
}

export function ListenPage() {
  const { target, loading } = useTarget();
  if (loading) return <PageHeader title="Spiel mit" back />;
  if (!target) {
    return (
      <>
        <PageHeader title="Spiel mit" back />
        <EmptyState title="Keine Noten gefunden" text="Für diesen Song liegen noch keine spielbaren Notendaten vor." />
      </>
    );
  }
  return <ListenSession key={target.refId + target.title} target={target} />;
}

function ListenSession({ target }: { target: Target }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lessonId = params.get('lesson');
  const engine = useEngine();
  const [settings] = useSettings();
  const plan = useMemo(() => buildPlaybackPlan(target.score, 0), [target.score]);
  const steps = useMemo(() => buildSteps(plan), [plan]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<StepResult[]>(() => steps.map(() => 'pending'));
  const [running, setRunning] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [finished, setFinished] = useState(false);
  const [wrongStreak, setWrongStreak] = useState(0);
  const gate = useRef(new OnsetGate());
  const advanceTimer = useRef<number | null>(null);
  const tabRef = useRef<TabViewHandle | null>(null);
  const lastVerdictAt = useRef(0);

  // Der Hook startet nicht automatisch; Start/Stopp erfolgen explizit über die Schaltflächen.
  const detection = usePitchDetection({ enabled: true, sensitivity: settings.tunerSensitivity, a4Hz: settings.a4Hz, minStableMs: settings.listenMinStableMs });
  const summary = summarizeResults(results);
  const detailsRef = useRef({ notesTotal: 0, notesCorrect: 0 });
  useEffect(() => {
    detailsRef.current = { notesTotal: summary.correct + summary.skipped, notesCorrect: summary.correct };
  }, [summary.correct, summary.skipped]);
  const { flush } = usePracticeSession('listen', { refId: target.refId, title: target.title, details: () => ({ ...detailsRef.current }) });

  const current = steps[index];

  const finish = useCallback(async () => {
    setRunning(false);
    detection.stop();
    setFinished(true);
    const s = summarizeResults(results);
    await flush();
    const repo = new ProgressRepository();
    if (target.songId && s.total > 0) await repo.updateSongProgress(target.songId, { addSec: 0, tempoFactor: 0, accuracy: s.accuracy });
    if (lessonId && s.total > 0) {
      const existing = await getDb().lessonProgress.get(lessonId);
      if (existing) await getDb().lessonProgress.update(lessonId, { bestAccuracy: Math.max(existing.bestAccuracy ?? 0, s.accuracy) });
    }
  }, [results, flush, target.songId, lessonId, detection]);

  const goTo = useCallback(
    (next: number) => {
      if (next >= steps.length) {
        void finish();
        return;
      }
      setIndex(Math.max(0, next));
      setVerdict(null);
      setWrongStreak(0);
      gate.current.reset();
      const beatRef = steps[Math.max(0, next)]?.beatRef;
      if (beatRef !== undefined) tabRef.current?.scrollToBeat(beatRef);
    },
    [steps, finish],
  );

  // Auswertung der Tonerkennung: reagiert auf neue Messwerte des Mikrofon-Hooks (ereignisgesteuert, daher setState im Effekt beabsichtigt).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!running || !current || finished) return;
    const now = performance.now();
    const pitch = detection.pitch;
    const armed = gate.current.update(detection.level, now, pitch !== null);
    if (!armed || !pitch || !pitch.stable) return;
    if (advanceTimer.current !== null) return;
    const v = evaluatePitch(current.midis, { midi: pitch.midi, cents: pitch.cents }, settings.listenToleranceCents);
    if (v.kind === 'match') {
      setVerdict(v);
      setResults((r) => r.map((x, i) => (i === index ? 'correct' : x)));
      gate.current.disarm(detection.level);
      lastVerdictAt.current = now;
      if (autoAdvance) {
        advanceTimer.current = window.setTimeout(() => {
          advanceTimer.current = null;
          goTo(index + 1);
        }, 450);
      }
    } else if (now - lastVerdictAt.current > 350) {
      setVerdict(v);
      setWrongStreak((n) => n + 1);
      gate.current.disarm(detection.level);
      lastVerdictAt.current = now;
    }
  }, [detection.pitch, detection.level, running, current, index, settings.listenToleranceCents, autoAdvance, goTo, finished]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  const playReference = (): void => {
    if (!current) return;
    void unlockAudio().then(() => {
      detection.pause(1400);
      gate.current.disarm(1);
      const t = engine.ctx.currentTime + 0.02;
      for (const p of current.positions) engine.synth.noteOn(p.midi, t, { string: p.string, maxDurationSec: 1.2 });
      window.setTimeout(() => gate.current.reset(), 1400);
    });
  };

  const start = async (): Promise<void> => {
    await unlockAudio();
    setFinished(false);
    setRunning(true);
    await detection.start();
  };

  const pauseListening = (): void => {
    setRunning(false);
    detection.stop();
  };

  const restart = (): void => {
    setResults(steps.map(() => 'pending'));
    setFinished(false);
    setVerdict(null);
    goTo(0);
  };

  const highlights: FretboardHighlight[] = useMemo(() => {
    if (!current) return [];
    const list: FretboardHighlight[] = current.positions.map((p) => ({
      string: p.string,
      fret: p.fret,
      tone: verdict?.kind === 'match' ? 'ok' : 'gold',
      ...(settings.showFingerNumbers && p.finger && p.fret > 0 ? { finger: p.finger as FretboardHighlight['finger'] } : { label: noteNameWithOctave(p.midi, settings.noteNaming).replace(/\d+$/, '') }),
      pulse: verdict === null,
    }));
    if (verdict && verdict.kind !== 'match') {
      const pos = preferredPositionForMidi(verdict.midi);
      if (pos && !list.some((h) => h.string === pos.string && h.fret === pos.fret)) list.push({ string: pos.string, fret: pos.fret, tone: 'bad', label: noteNameWithOctave(verdict.midi, settings.noteNaming).replace(/\d+$/, '') });
    }
    return list;
  }, [current, verdict, settings.showFingerNumbers, settings.noteNaming]);

  const maxFret = Math.max(5, ...steps.flatMap((s) => s.positions.map((p) => p.fret))) + 1;

  const feedback = ((): { tone: 'ok' | 'bad' | 'warn' | 'neutral'; title: string; text: string } => {
    if (finished) return { tone: 'ok', title: 'Fertig!', text: `${summary.correct} von ${summary.total} Tönen richtig (${Math.round(summary.accuracy)} %).` };
    if (!current) return { tone: 'neutral', title: 'Keine Noten', text: '' };
    const expectedName = current.midis.map((m) => noteNameWithOctave(m, settings.noteNaming)).join(' + ');
    if (!running) return { tone: 'neutral', title: `Nächster Ton: ${expectedName}`, text: 'Tippe auf Start, erlaube das Mikrofon und spiele den markierten Ton.' };
    if (detection.status === 'error') return { tone: 'bad', title: 'Mikrofon nicht verfügbar', text: detection.error ?? '' };
    if (detection.status === 'starting') return { tone: 'neutral', title: 'Mikrofon wird gestartet …', text: '' };
    if (!verdict) {
      return detection.level < 0.004 ? { tone: 'neutral', title: `Spiele: ${expectedName}`, text: 'GuitarCoach hört zu. Schlage die Saite einzeln an.' } : { tone: 'warn', title: 'Noch nicht eindeutig erkannt', text: 'Lass den Ton klingen und vermeide Nebengeräusche.' };
    }
    switch (verdict.kind) {
      case 'match':
        return { tone: 'ok', title: `Richtig! ${noteNameWithOctave(verdict.midi, settings.noteNaming)}`, text: `${verdict.cents >= 0 ? '+' : ''}${Math.round(verdict.cents)} Cent` };
      case 'near':
        return { tone: 'warn', title: `Fast – etwas zu ${verdict.direction}`, text: `Gespielt: ${noteNameWithOctave(verdict.midi, settings.noteNaming)} (${Math.round(verdict.cents)} Cent). ${verdict.direction === 'tief' ? 'Ein Bund höher oder Saite nachstimmen.' : 'Ein Bund tiefer oder Saite nachstimmen.'}` };
      case 'octave':
        return { tone: 'warn', title: 'Richtiger Ton, falsche Oktave', text: `Gespielt: ${noteNameWithOctave(verdict.midi, settings.noteNaming)}. Prüfe, ob du die richtige Saite erwischt hast.` };
      default:
        return { tone: 'bad', title: `Falscher Ton: ${noteNameWithOctave(verdict.midi, settings.noteNaming)}`, text: `Erwartet wird ${noteNameWithOctave(verdict.expected, settings.noteNaming)}.${wrongStreak >= 3 ? ' Tipp: Referenzton anhören und Fingerposition im Griffbrett vergleichen.' : ''}` };
    }
  })();

  const toneClass = { ok: 'border-ok/50 bg-ok/15', bad: 'border-bad/50 bg-bad/15', warn: 'border-warn/50 bg-warn/15', neutral: 'border-border bg-surface' }[feedback.tone];

  return (
    <>
      <PageHeader title="Spiel mit" subtitle={target.title} back={target.backHref} compact />
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Ton {Math.min(index + 1, steps.length)} von {steps.length}
          </span>
          <span>
            <span className="text-ok">{summary.correct} richtig</span> · {summary.skipped} übersprungen
          </span>
        </div>
        <ProgressBar value={summary.correct + summary.skipped} max={steps.length} tone="ok" label="Fortschritt" />

        <div className={cn('rounded-card border p-4 transition-colors', toneClass)} aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/20">
              {running ? <Ear size={22} className={cn(detection.status === 'listening' && 'animate-pulse-soft')} /> : <MicOff size={22} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold leading-tight">{feedback.title}</p>
              {feedback.text && <p className="text-sm text-text/80">{feedback.text}</p>}
            </div>
          </div>
          {running && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/20" aria-hidden>
              <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${Math.min(100, detection.level * 800)}%` }} />
            </div>
          )}
        </div>

        {current && (
          <div className="rounded-card border border-border/70 bg-surface p-2">
            <div className="mb-1 flex items-center justify-between px-1 text-xs text-muted">
              <span>Fingerposition</span>
              <span className="text-text">{current.positions.map((p) => `${noteNameWithOctave(p.midi, settings.noteNaming)} · Saite ${p.string}, Bund ${p.fret}`).join(' | ')}</span>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <Fretboard highlights={highlights} frets={Math.min(15, maxFret)} leftHanded={settings.leftHanded} orientation={settings.fretboardOrientation} naming={settings.noteNaming} compact />
            </div>
          </div>
        )}

        <div className="rounded-card border border-border/70 bg-surface px-1 py-3">
          <TabView ref={tabRef} plan={plan} tuning={target.score.tracks[0]!.tuning} currentBeatRef={current?.beatRef ?? null} currentInstance={plan.beats[current?.beatRef ?? 0]?.instanceIndex ?? null} loop={null} zoom={settings.tabZoom} showFingers={settings.showFingerNumbers} naming={settings.noteNaming} autoScroll={settings.autoScroll} onBeatTap={(ref) => goTo(steps.findIndex((s) => s.beatRef === ref))} />
        </div>

        <Card padding="sm">
          <div className="flex items-center justify-between gap-2">
            <IconButton label="Vorheriger Ton" size="lg" onClick={() => goTo(index - 1)} disabled={index === 0}>
              <ChevronLeft size={26} />
            </IconButton>
            <IconButton label="Referenzton anhören" size="lg" variant="secondary" onClick={playReference}>
              <Volume2 size={22} />
            </IconButton>
            {!running ? (
              <button type="button" onClick={() => void start()} aria-label="Start" className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-[#1b1507] shadow-lg transition active:scale-95">
                <Play size={30} className="ml-1" />
              </button>
            ) : (
              <button type="button" onClick={pauseListening} aria-label="Analyse pausieren" className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-3 text-text transition active:scale-95">
                <Pause size={30} />
              </button>
            )}
            <IconButton
              label="Ton überspringen"
              size="lg"
              variant="secondary"
              onClick={() => {
                setResults((r) => r.map((x, i) => (i === index && x === 'pending' ? 'skipped' : x)));
                goTo(index + 1);
              }}
            >
              <SkipForward size={22} />
            </IconButton>
            <IconButton label="Nächster Ton" size="lg" onClick={() => goTo(index + 1)} disabled={index >= steps.length - 1}>
              <ChevronRight size={26} />
            </IconButton>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Toggle checked={autoAdvance} onChange={setAutoAdvance} label={<span className="text-sm">Bei richtigem Ton automatisch weiter</span>} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" icon={<RotateCcw size={16} />} onClick={restart}>
              Von vorn
            </Button>
            <Link to={target.backHref} className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-semibold text-muted hover:text-text">
              Ohne Mikrofon üben
            </Link>
            <Badge tone="neutral">Toleranz ± {settings.listenToleranceCents} Cent</Badge>
          </div>
        </Card>

        {finished && (
          <Card tone="gold">
            <h2 className="text-lg font-bold">Ergebnis</h2>
            <p className="mt-1 text-sm">
              {summary.correct} von {summary.total} Tönen richtig erkannt ({Math.round(summary.accuracy)} %), {summary.skipped} übersprungen. {summary.accuracy >= 80 ? 'Sehr gut – versuche es jetzt etwas schneller oder mit der nächsten Version.' : 'Übe die schwierigen Stellen noch einmal langsam im Player.'}
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" onClick={restart}>
                Noch einmal
              </Button>
              <Button onClick={() => navigate(target.backHref)}>Zurück zum Player</Button>
            </div>
          </Card>
        )}

        <p className="text-xs text-muted">
          Hinweis: Die Erkennung ist für einzeln gespielte Töne ausgelegt. Bei Akkorden genügt es, wenn ein Ton des Akkords erkannt wird. Während ein Referenzton abgespielt wird, pausiert die Analyse.
        </p>
      </div>
    </>
  );
}
