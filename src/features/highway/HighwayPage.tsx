import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gauge, Pause, Play, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Badge, Button, Card, EmptyState, PageHeader, Segmented } from '@/components/ui';
import { unlockAudio } from '@/core/audio/audioContext';
import { playClick } from '@/core/audio/metronome';
import { noteName, noteNameWithOctave } from '@/core/music/notes';
import { buildPlaybackPlan } from '@/core/music/playback';
import { openStringMidi } from '@/core/music/tuning';
import { countWords } from '@/core/speech/phrases';
import { ProgressRepository } from '@/core/storage/repositories';
import { Fretboard } from '@/features/fretboard/Fretboard';
import { HighwayEngine, type HighwayMode, type NoteResult } from '@/features/kids/highwayEngine';
import { NoteHighway } from '@/features/kids/NoteHighway';
import { OnsetGate } from '@/features/listen/listenLogic';
import { useListenTarget, type ListenTarget } from '@/features/listen/ListenPage';
import { useEngine } from '@/hooks/useEngine';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import { useSettings } from '@/hooks/useSettings';
import { sayNow } from '@/hooks/useSpeech';
import { cn } from '@/lib/cn';
import { barStats, judgeTiming, timelineFromPlan, type TimingJudgement } from './timeline';

type Mode = 'idle' | 'count' | 'play' | 'done';
const TEMPO_OPTIONS = [0.25, 0.5, 0.75, 1] as const;
const LEAD_IN_SEC = 1.5;

/** Mitspiel-Bahn für Songs und Übungen (wie Yousician): Noten laufen zur Trefflinie, das Mikrofon wertet Ton und Zeitpunkt. */
export function HighwayPage() {
  const { target, loading } = useListenTarget();
  if (loading) return <PageHeader title="Mitspiel-Bahn" back />;
  if (!target) {
    return (
      <>
        <PageHeader title="Mitspiel-Bahn" back />
        <EmptyState title="Keine Noten gefunden" text="Für diesen Song liegen noch keine spielbaren Notendaten vor." />
      </>
    );
  }
  return <HighwaySession key={target.refId + target.title} target={target} />;
}

function HighwaySession({ target }: { target: ListenTarget }) {
  const navigate = useNavigate();
  const engine = useEngine();
  const [settings] = useSettings();
  const plan = useMemo(() => buildPlaybackPlan(target.score, 0), [target.score]);
  const [tempoFactor, setTempoFactor] = useState<number>(0.5);
  const [playMode, setPlayMode] = useState<HighwayMode>('wait');
  const [mode, setMode] = useState<Mode>('idle');
  const timeline = useMemo(() => timelineFromPlan(plan, tempoFactor, LEAD_IN_SEC), [plan, tempoFactor]);
  const [results, setResults] = useState<NoteResult[]>(() => timeline.notes.map(() => 'pending'));
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [lastJudgement, setLastJudgement] = useState<TimingJudgement | null>(null);
  const [judgements, setJudgements] = useState<Record<TimingJudgement, number>>({ früh: 0, genau: 0, spät: 0 });
  const [hits, setHits] = useState(0);
  const hwRef = useRef<HighwayEngine | null>(null);
  const timers = useRef<number[]>([]);
  const gate = useRef(new OnsetGate());
  const startedAtRef = useRef(0);
  const detection = usePitchDetection({ enabled: true, sensitivity: settings.tunerSensitivity, a4Hz: settings.a4Hz, minStableMs: Math.min(settings.listenMinStableMs, 120) });

  const beatSec = 60 / (plan.barInstances[0]?.tempo ?? target.score.tempo) / tempoFactor;
  const totalSec = timeline.notes.length ? timeline.notes[timeline.notes.length - 1]!.time + timeline.notes[timeline.notes.length - 1]!.durationSec : 0;

  const clearTimers = (): void => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const getTime = useCallback((): number => ((mode === 'play' || mode === 'done') && hwRef.current ? hwRef.current.time : 0), [mode]);

  const finish = useCallback(
    async (hw: HighwayEngine): Promise<void> => {
      detection.stop();
      setMode('done');
      const total = timeline.notes.length;
      const repo = new ProgressRepository();
      await repo.recordSession({ kind: 'listen', startedAt: startedAtRef.current, refId: target.refId, title: `${target.title} · Mitspiel-Bahn`, details: { notesTotal: total, notesCorrect: hw.hits, tempoFactor, completed: true } });
      if (target.songId && total > 0) await repo.updateSongProgress(target.songId, { addSec: 0, tempoFactor, accuracy: (hw.hits / total) * 100 });
      void sayNow('tips', `Fertig. ${hw.hits} von ${total} Tönen getroffen.`);
    },
    [detection, timeline.notes.length, target.refId, target.title, target.songId, tempoFactor],
  );

  const start = async (): Promise<void> => {
    await unlockAudio();
    clearTimers();
    setResults(timeline.notes.map(() => 'pending'));
    setHits(0);
    setJudgements({ früh: 0, genau: 0, spät: 0 });
    setLastJudgement(null);
    setCurrentIndex(null);
    gate.current.reset();
    startedAtRef.current = Date.now();
    try {
      await detection.start();
    } catch {
      // Mikrofon fehlt – Fehlermeldung kommt aus dem Hook
    }
    setMode('count');
    const first = plan.barInstances[0];
    const beats = first ? Math.max(1, Math.round((first.endTick - first.startTick) / first.beatTicks)) : 4;
    const t0 = engine.ctx.currentTime + 0.15;
    const words = countWords(beats);
    words.forEach((w, i) => {
      playClick(engine.ctx, t0 + i * beatSec, i === 0, settings.metronomeVolume);
      if (settings.speechCountIn) timers.current.push(window.setTimeout(() => void sayNow('countIn', w), Math.max(0, (0.15 + i * beatSec) * 1000 - 80)));
    });
    if (playMode === 'flow') {
      const n = Math.ceil(totalSec / beatSec) + 1;
      for (let i = 0; i < n; i++) playClick(engine.ctx, t0 + (beats + i) * beatSec, i % beats === 0, settings.metronomeVolume * 0.6);
    }
    timers.current.push(
      window.setTimeout(() => {
        hwRef.current = new HighwayEngine(timeline.notes, { mode: playMode, earlySec: 0.25, lateSec: 0.35, toleranceCents: settings.listenToleranceCents });
        setMode('play');
      }, (0.15 + beats * beatSec) * 1000),
    );
  };

  const stop = (): void => {
    detection.stop();
    clearTimers();
    hwRef.current = null;
    setMode('idle');
    setCurrentIndex(null);
  };

  // Zeit und Ereignisse
  useEffect(() => {
    if (mode !== 'play') return;
    let raf = 0;
    const loop = (): void => {
      const hw = hwRef.current;
      if (!hw) return;
      const events = hw.tick(performance.now() / 1000);
      for (const ev of events) {
        if (ev.type === 'wait') setCurrentIndex(ev.index);
        else if (ev.type === 'miss') {
          setResults([...hw.results]);
          setCurrentIndex(hw.currentIndex);
        } else if (ev.type === 'end') {
          setResults([...hw.results]);
          void finish(hw);
          return;
        }
      }
      if (playMode === 'flow') {
        const idx = hw.currentIndex;
        setCurrentIndex((prev) => (prev === idx ? prev : idx));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, playMode, finish]);

  // Mikrofon → Engine
  useEffect(() => {
    if (mode !== 'play') return;
    const hw = hwRef.current;
    if (!hw) return;
    const now = performance.now();
    const pitch = detection.pitch;
    const armed = gate.current.update(detection.level, now, pitch !== null);
    if (!armed || !pitch || !pitch.stable) return;
    const ev = hw.onPitch(pitch.midi, pitch.cents);
    if (!ev || ev.type !== 'hit') return;
    gate.current.disarm(detection.level);
    const j = judgeTiming(ev.offsetSec);
    setLastJudgement(j);
    setJudgements((prev) => ({ ...prev, [j]: prev[j] + 1 }));
    setResults([...hw.results]);
    setHits(hw.hits);
    setCurrentIndex(hw.currentIndex);
  }, [detection.pitch, detection.level, mode]);

  const skip = (): void => {
    const hw = hwRef.current;
    if (!hw) return;
    hw.skip();
    setResults([...hw.results]);
    setCurrentIndex(hw.currentIndex);
  };

  const current = currentIndex !== null ? timeline.notes[currentIndex] : undefined;
  const total = timeline.notes.length;
  const accuracy = total ? Math.round((hits / total) * 100) : 0;
  const worstBars = mode === 'done' ? barStats(plan, timeline.instanceOfNote, results).filter((b) => b.hits < b.total).slice(0, 3) : [];
  const laneLabel = (s: number): string => noteName(openStringMidi(s), settings.noteNaming);

  return (
    <>
      <PageHeader title="Mitspiel-Bahn" subtitle={target.title} back={target.backHref} compact />
      <div className="flex flex-col gap-3 pt-1">
        <NoteHighway notes={timeline.notes} results={results} getTime={getTime} currentIndex={currentIndex} laneLabel={laneLabel} pxPerSec={tempoFactor <= 0.5 ? 170 : 150} />

        <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="highway-status">
          <span className="font-semibold">
            {mode === 'count' ? 'Einzähler …' : current ? `Jetzt: ${noteNameWithOctave(current.midi, settings.noteNaming)} · Saite ${current.string}, Bund ${current.fret}` : mode === 'idle' ? 'Bereit' : mode === 'done' ? 'Durchlauf beendet' : '…'}
          </span>
          {(mode === 'play' || mode === 'done') && (
            <Badge tone="ok">
              {hits} / {total} ({accuracy} %)
            </Badge>
          )}
          {lastJudgement && mode === 'play' && <Badge tone={lastJudgement === 'genau' ? 'ok' : 'warn'}>{lastJudgement === 'genau' ? 'genau' : `zu ${lastJudgement}`}</Badge>}
        </div>

        {mode !== 'done' && (
          <div className="rounded-card border border-border/70 bg-surface p-2">
            <div className="overflow-x-auto no-scrollbar">
              <Fretboard frets={Math.min(15, Math.max(5, ...timeline.notes.map((n) => n.fret)) + 1)} compact leftHanded={settings.leftHanded} orientation={settings.fretboardOrientation} naming={settings.noteNaming} highlights={current ? [{ string: current.string, fret: current.fret, tone: 'gold', pulse: mode === 'play' }] : []} />
            </div>
          </div>
        )}

        {mode === 'idle' && (
          <Card padding="sm" className="flex flex-col gap-3">
            <div>
              <span className="mb-1 block text-xs text-muted">Spielweise</span>
              <Segmented
                value={playMode}
                onChange={setPlayMode}
                options={[
                  { value: 'wait', label: 'Wartet auf dich' },
                  { value: 'flow', label: 'Im Takt (mit Klick)' },
                ]}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted">Tempo</span>
              <Segmented value={tempoFactor} onChange={(v) => setTempoFactor(v)} options={TEMPO_OPTIONS.map((f) => ({ value: f as number, label: `${Math.round(f * 100)} %` }))} />
            </div>
            <Button variant="primary" size="lg" icon={<Play size={20} />} onClick={() => void start()} data-testid="highway-start">
              Start (mit Einzähler)
            </Button>
            <p className="text-xs text-muted">
              Toleranz ± {settings.listenToleranceCents} Cent, Zeitfenster −0,25 s bis +0,35 s. Als „genau“ gilt ± 80 ms. Die Melodie wird während der Wertung nicht mitgespielt, damit das Mikrofon nur dich hört.
            </p>
          </Card>
        )}

        {(mode === 'count' || mode === 'play') && (
          <div className="flex gap-2">
            <Button size="lg" icon={<Pause size={18} />} onClick={stop} className="flex-1">
              Stopp
            </Button>
            {mode === 'play' && (
              <Button size="lg" variant="ghost" onClick={skip} data-testid="highway-skip">
                Note überspringen
              </Button>
            )}
          </div>
        )}
        {mode === 'play' && detection.status === 'error' && <p className="text-sm text-bad">Mikrofon nicht verfügbar: {detection.error}</p>}

        {mode === 'done' && (
          <Card tone="gold">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Gauge size={20} className="text-gold" /> Ergebnis
            </h2>
            <p className="mt-1 text-sm">
              {hits} von {total} Tönen getroffen ({accuracy} %) bei {Math.round(tempoFactor * 100)} % Tempo. Zeitpunkt: {judgements.genau} genau, {judgements.früh} zu früh, {judgements.spät} zu spät.
            </p>
            {worstBars.length > 0 && (
              <p className="mt-1 text-sm text-muted">
                Schwächste Takte: {worstBars.map((b) => `Takt ${b.barIndex + 1} (${b.hits}/${b.total})`).join(', ')}. Übe sie im Player mit der Schleife.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" icon={<RotateCcw size={16} />} onClick={() => void start()}>
                Noch einmal
              </Button>
              {accuracy >= 90 && tempoFactor < 1 && (
                <Button
                  onClick={() => {
                    setTempoFactor(TEMPO_OPTIONS.find((f) => f > tempoFactor) ?? 1);
                    setMode('idle');
                  }}
                >
                  Schneller: {Math.round((TEMPO_OPTIONS.find((f) => f > tempoFactor) ?? 1) * 100)} %
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate(target.backHref)}>
                Zurück zum Player
              </Button>
            </div>
          </Card>
        )}

        <p className={cn('text-xs text-muted', mode === 'done' && 'hidden')}>
          Die Bahn zeigt Stimme 1 der gewählten Version. Akkorde zählen, sobald einer ihrer Töne erkannt wird.{' '}
          <Link to={target.backHref} className="underline">
            Zurück zum Player
          </Link>
        </p>
      </div>
    </>
  );
}

