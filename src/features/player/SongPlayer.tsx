import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Guitar, Hand, Pause, Play, Repeat, SkipBack, Square, Timer, ZoomIn, ZoomOut } from 'lucide-react';
import { Badge, Button, IconButton, Segmented, Sheet, Slider, Toggle, useToast } from '@/components/ui';
import { outputLatencySeconds, unlockAudio } from '@/core/audio/audioContext';
import { countWords } from '@/core/speech/phrases';
import { primeSpeech } from '@/core/speech/speech';
import { sayNow } from '@/hooks/useSpeech';
import { TEMPO_FACTORS, type LoopRange } from '@/core/audio/tabPlayer';
import { formatSeconds } from '@/core/music/durations';
import { noteNameWithOctave } from '@/core/music/notes';
import { buildPlaybackPlan, type BeatRef } from '@/core/music/playback';
import type { Score } from '@/core/music/score';
import { Fretboard, type FretboardHighlight } from '@/features/fretboard/Fretboard';
import { useEngine, usePlayerSnapshot } from '@/hooks/useEngine';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';
import { ScoreView } from './ScoreView';
import { TabView, type TabViewHandle } from './TabView';

export interface SongPlayerProps {
  score: Score;
  title?: string;
  initialTempoFactor?: number;
  /** Kompakte Darstellung ohne Ansichtsumschaltung. */
  compact?: boolean;
}

const TEMPO_PRESETS = [0.25, 0.5, 0.75, 1] as const;
/** Vorlauf, damit das gesprochene Zählwort ungefähr mit dem Klick zusammenfällt (Sprachausgabe startet verzögert). */
const SPEECH_LEAD_MS = 80;

export function SongPlayer({ score, initialTempoFactor, compact = false }: SongPlayerProps) {
  const engine = useEngine();
  const { player, synth } = engine;
  const snapshot = usePlayerSnapshot();
  const [settings, updateSettings] = useSettings();
  const toast = useToast();

  const safeTrackIndex = 0;
  const plan = useMemo(() => buildPlaybackPlan(score, safeTrackIndex), [score]);
  const track = score.tracks[safeTrackIndex]!;
  const voice0Beats = useMemo(() => plan.beats.filter((b) => b.voice === 0), [plan]);

  const [currentBeat, setCurrentBeat] = useState<BeatRef | null>(null);
  const [positionSec, setPositionSec] = useState(0);
  const [selectingLoop, setSelectingLoop] = useState(false);
  const [loopAnchor, setLoopAnchor] = useState<number | null>(null);
  const [loopSheet, setLoopSheet] = useState(false);
  const [tempoSheet, setTempoSheet] = useState(false);
  const [showFretboard, setShowFretboard] = useState(!compact);
  const [fineTempo, setFineTempo] = useState(Math.round((initialTempoFactor ?? 1) * 100));
  const [view, setView] = useState<'tab' | 'score'>(compact ? 'tab' : settings.defaultNotationView);
  const tabRef = useRef<TabViewHandle | null>(null);
  const startedFromBeginning = useRef(true);

  // Plan laden
  useEffect(() => {
    player.load(plan);
    player.setTempoFactor(initialTempoFactor ?? 1);
    player.setMetronome(false);
    player.setCountIn(settings.countIn);
    const midis = new Set<number>();
    for (const e of plan.events) if (e.kind === 'note') midis.add(e.midi);
    try {
      synth.preload(midis);
    } catch {
      // AudioContext evtl. noch nicht verfügbar – Puffer werden beim Abspielen erzeugt
    }
    return () => {
      player.stop();
      player.load(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, player, synth]);

  // Gesprochener Einzähler („eins, zwei, drei, vier“) parallel zu den Metronom-Klicks
  useEffect(() => {
    let timers: number[] = [];
    const clear = (): void => {
      for (const t of timers) window.clearTimeout(t);
      timers = [];
    };
    const offCountIn = player.onCountIn(({ beats, beatSec, firstClickTime }) => {
      clear();
      if (!settings.spokenCountIn) return;
      const base = (firstClickTime - engine.ctx.currentTime) * 1000 - SPEECH_LEAD_MS;
      countWords(beats).forEach((word, i) => {
        timers.push(window.setTimeout(() => void sayNow('countIn', word), Math.max(0, base + i * beatSec * 1000)));
      });
    });
    const offStatus = player.subscribe((s) => {
      if (s.status !== 'counting') clear();
    });
    return () => {
      clear();
      offCountIn();
      offStatus();
    };
  }, [player, engine.ctx, settings.spokenCountIn]);

  // Durchlauf beendet
  useEffect(() => {
    return player.onEnded(() => {
      if (!startedFromBeginning.current || snapshot.loop) return;
      toast.show(`Durchlauf geschafft (${Math.round(player.snapshot().tempoFactor * 100)} % Tempo)!`, 'success');
    });
  }, [player, toast, snapshot.loop]);

  // Positions-Loop (rAF)
  useEffect(() => {
    let raf = 0;
    let lastBeat: number | null = null;
    let lastPosUpdate = 0;
    const loop = (): void => {
      const now = engine.ctx.currentTime - outputLatencySeconds();
      const pos = player.getPositionSec(now);
      let lo = 0;
      let hi = voice0Beats.length - 1;
      let beat: BeatRef | null = null;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const b = voice0Beats[mid]!;
        if (b.sec <= pos + 1e-6) {
          beat = b;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      if (beat && beat.index !== lastBeat) {
        lastBeat = beat.index;
        setCurrentBeat(beat);
      }
      const status = player.getStatus();
      if (beat) {
        const span = Math.max(1e-6, beat.endSec - beat.sec);
        const fraction = status === 'playing' ? (pos - beat.sec) / span : 0;
        tabRef.current?.setPlayhead(beat.index, fraction);
      }
      const t = performance.now();
      if (t - lastPosUpdate > 120) {
        lastPosUpdate = t;
        setPositionSec(pos);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine.ctx, player, voice0Beats]);

  const isPlaying = snapshot.status === 'playing' || snapshot.status === 'counting';

  const handlePlayPause = useCallback(async () => {
    // iOS: Sprachausgabe einmalig aus der Berührung heraus freischalten, sonst bleibt der spätere Einzähler stumm.
    if (settings.spokenCountIn) primeSpeech();
    await unlockAudio();
    if (isPlaying) player.pause();
    else {
      startedFromBeginning.current = player.getPositionSec() < 0.01;
      player.play();
    }
  }, [isPlaying, player, settings.spokenCountIn]);

  const setTempo = (factor: number): void => {
    player.setTempoFactor(factor);
    setFineTempo(Math.round(factor * 100));
  };

  const handleBeatTap = (beatRef: number): void => {
    void unlockAudio().then(() => player.playBeat(beatRef));
  };

  const handleBarTap = (instanceIndex: number): void => {
    if (loopAnchor === null) {
      setLoopAnchor(instanceIndex);
      toast.show('Jetzt den letzten Takt der Schleife antippen.', 'info', 2500);
      return;
    }
    const start = Math.min(loopAnchor, instanceIndex);
    const end = Math.max(loopAnchor, instanceIndex);
    player.setLoop({ startInstance: start, endInstance: end });
    setLoopAnchor(null);
    setSelectingLoop(false);
    toast.show(`Schleife: Takt ${plan.barInstances[start]!.barIndex + 1} bis ${plan.barInstances[end]!.barIndex + 1}`, 'success', 2500);
  };

  const toggleLoop = (): void => {
    if (snapshot.loop) {
      player.setLoop(null);
      setSelectingLoop(false);
      setLoopAnchor(null);
    } else setLoopSheet(true);
  };

  const step = (dir: 1 | -1): void => {
    void unlockAudio().then(() => {
      const b = dir === 1 ? player.stepNext() : player.stepPrev();
      if (b) tabRef.current?.scrollToBeat(b.index);
      else toast.show(dir === 1 ? 'Das war die letzte Note.' : 'Das ist die erste Note.', 'info', 1800);
    });
  };

  const zoom = settings.tabZoom;
  const setZoom = (z: number): void => {
    void updateSettings({ tabZoom: Math.min(1.8, Math.max(0.7, Math.round(z * 10) / 10)) });
  };

  const currentInstance = currentBeat?.instanceIndex ?? null;
  const effectiveBpm = Math.round((plan.barInstances[currentInstance ?? 0]?.tempo ?? score.tempo) * snapshot.tempoFactor);
  const totalScaled = plan.totalSec / snapshot.tempoFactor;
  const posScaled = positionSec / snapshot.tempoFactor;

  const fretboardHighlights: FretboardHighlight[] = useMemo(() => {
    if (!currentBeat || currentBeat.isRest) return [];
    return currentBeat.beat.notes.map((n) => {
      const h: FretboardHighlight = { string: n.string, fret: n.fret, tone: 'gold' };
      if (settings.showFingerNumbers && n.finger !== undefined && n.fret > 0) h.finger = n.finger;
      if (n.fret === 0 || !settings.showFingerNumbers) h.label = noteNameWithOctave(n.midi, settings.noteNaming).replace(/\d+$/, '');
      return h;
    });
  }, [currentBeat, settings.showFingerNumbers, settings.noteNaming]);

  const loopRange: LoopRange | null = snapshot.loop;
  const loopStepper = (field: 'startInstance' | 'endInstance', delta: number): void => {
    const current = loopRange ?? { startInstance: currentInstance ?? 0, endInstance: Math.min(plan.barInstances.length - 1, (currentInstance ?? 0) + 3) };
    const next = { ...current, [field]: Math.min(plan.barInstances.length - 1, Math.max(0, current[field] + delta)) };
    if (next.startInstance > next.endInstance) {
      if (field === 'startInstance') next.endInstance = next.startInstance;
      else next.startInstance = next.endInstance;
    }
    player.setLoop(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Statuszeile */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted" data-testid="player-status">
        <span>
          Takt <span className="font-semibold text-text tabular-nums">{(currentInstance ?? 0) + 1}</span> / {plan.barInstances.length}
        </span>
        <span className="tabular-nums">
          {formatSeconds(posScaled)} / {formatSeconds(totalScaled)}
        </span>
        <span data-testid="player-bpm">
          ♩ = <span className="font-semibold text-text tabular-nums">{effectiveBpm}</span>
          {snapshot.tempoFactor !== 1 && <span> ({Math.round(snapshot.tempoFactor * 100)} %)</span>}
        </span>
        {snapshot.loop && (
          <Badge tone="ok" icon={<Repeat size={12} />}>
            Takt {plan.barInstances[snapshot.loop.startInstance]!.barIndex + 1}–{plan.barInstances[snapshot.loop.endInstance]!.barIndex + 1}
          </Badge>
        )}
        {snapshot.status === 'counting' && <Badge tone="gold">Einzähler …</Badge>}
        {selectingLoop && <Badge tone="warn">Takte antippen: {loopAnchor === null ? 'Anfang' : 'Ende'}</Badge>}
      </div>

      {/* Fortschrittsbalken (antippen = springen) */}
      <button
        type="button"
        aria-label="Abspielposition"
        className="group relative h-6 w-full"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const fraction = (e.clientX - rect.left) / rect.width;
          player.seekSec(fraction * plan.totalSec);
        }}
      >
        <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-3" />
        <span className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gold" style={{ width: `${plan.totalSec > 0 ? (positionSec / plan.totalSec) * 100 : 0}%` }} />
      </button>

      {/* Ansicht: Tabulatur oder Noten + Tab */}
      {!compact && (
        <Segmented
          size="sm"
          ariaLabel="Darstellung"
          value={view}
          onChange={(v) => {
            setView(v);
            void updateSettings({ defaultNotationView: v });
          }}
          options={[
            { value: 'tab', label: 'Tabulatur' },
            { value: 'score', label: 'Noten + Tab' },
          ]}
        />
      )}
      {view === 'score' && !compact && (
        <div className="rounded-card border border-border/70 bg-surface px-1 py-2">
          <ScoreView score={score} trackIndex={safeTrackIndex} zoom={zoom} />
          <p className="px-2 pt-1 text-[11px] text-muted">Partitur-Ansicht (klassische Notenschrift + Tab). Abspielmarke, Schleifen-Auswahl und Antippen von Noten gibt es in der Tabulatur-Ansicht.</p>
        </div>
      )}
      <div className={cn('rounded-card border border-border/70 bg-surface px-1 py-3 overflow-hidden', view === 'score' && !compact && 'hidden')}>
        <TabView
          ref={tabRef}
          plan={plan}
          tuning={track.tuning}
          currentBeatRef={currentBeat?.index ?? null}
          currentInstance={currentInstance}
          loop={snapshot.loop}
          zoom={zoom}
          showFingers={settings.showFingerNumbers}
          naming={settings.noteNaming}
          selectingLoop={selectingLoop}
          loopAnchor={loopAnchor}
          autoScroll={settings.autoScroll && isPlaying}
          onBeatTap={handleBeatTap}
          onBarTap={handleBarTap}
        />
      </div>

      {/* Griffbrett */}
      {showFretboard && (
        <div className="rounded-card border border-border/70 bg-surface p-2">
          <div className="mb-1 flex items-center justify-between px-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Hand size={14} /> Fingerposition
            </span>
            {currentBeat && !currentBeat.isRest && (
              <span className="text-text">
                {currentBeat.beat.notes.map((n) => `${noteNameWithOctave(n.midi, settings.noteNaming)} · Saite ${n.string}, Bund ${n.fret}`).join(' | ')}
              </span>
            )}
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <Fretboard
              highlights={fretboardHighlights}
              frets={Math.max(5, Math.min(15, Math.max(...plan.events.map((e) => (e.kind === 'note' ? e.fret : 0)), 0) + 1))}
              leftHanded={settings.leftHanded}
              orientation={settings.fretboardOrientation}
              naming={settings.noteNaming}
              compact
            />
          </div>
        </div>
      )}

      {/* Transport */}
      <div className="rounded-card border border-border/70 bg-surface-2/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <IconButton label="Zum Anfang" size="lg" onClick={() => player.stop()}>
            <SkipBack size={24} />
          </IconButton>
          <IconButton label="Vorherige Note" size="lg" onClick={() => step(-1)}>
            <ChevronLeft size={28} />
          </IconButton>
          <button
            type="button"
            onClick={() => void handlePlayPause()}
            aria-label={isPlaying ? 'Wiedergabe pausieren' : 'Abspielen'}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-[#1b1507] shadow-[0_10px_30px_-10px_rgba(217,169,78,0.9)] transition active:scale-95"
          >
            {isPlaying ? <Pause size={30} /> : <Play size={30} className="ml-1" />}
          </button>
          <IconButton label="Nächste Note" size="lg" onClick={() => step(1)}>
            <ChevronRight size={28} />
          </IconButton>
          <IconButton label="Stopp" size="lg" onClick={() => player.stop()}>
            <Square size={22} />
          </IconButton>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Segmented
            ariaLabel="Tempo"
            size="sm"
            value={TEMPO_PRESETS.includes(snapshot.tempoFactor as (typeof TEMPO_PRESETS)[number]) ? snapshot.tempoFactor : -1}
            options={[...TEMPO_PRESETS.map((f) => ({ value: f as number, label: `${Math.round(f * 100)} %` })), { value: -1, label: snapshot.tempoFactor > 1 || !TEMPO_PRESETS.includes(snapshot.tempoFactor as (typeof TEMPO_PRESETS)[number]) ? `${Math.round(snapshot.tempoFactor * 100)} %` : '…' }]}
            onChange={(v) => {
              if (v === -1) setTempoSheet(true);
              else setTempo(v);
            }}
          />
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <Button size="sm" variant={snapshot.loop ? 'success' : 'secondary'} icon={<Repeat size={16} />} onClick={toggleLoop}>
            Schleife
          </Button>
          <Button size="sm" variant={snapshot.metronome ? 'primary' : 'secondary'} icon={<Timer size={16} />} onClick={() => player.setMetronome(!snapshot.metronome)}>
            Metronom
          </Button>
          {!compact && (
            <Button size="sm" variant={showFretboard ? 'primary' : 'secondary'} icon={<Guitar size={16} />} onClick={() => setShowFretboard((v) => !v)}>
              Griffbrett
            </Button>
          )}
          <div className="flex items-center justify-end gap-1">
            <IconButton label="Verkleinern" size="sm" variant="secondary" onClick={() => setZoom(zoom - 0.1)}>
              <ZoomOut size={16} />
            </IconButton>
            <IconButton label="Vergrößern" size="sm" variant="secondary" onClick={() => setZoom(zoom + 0.1)}>
              <ZoomIn size={16} />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Tempo-Sheet */}
      <Sheet open={tempoSheet} onClose={() => setTempoSheet(false)} title="Tempo fein einstellen">
        <Slider
          label="Wiedergabetempo"
          value={fineTempo}
          min={25}
          max={150}
          step={5}
          onChange={(v) => {
            setFineTempo(v);
            player.setTempoFactor(v / 100);
          }}
          format={(v) => `${v} % · ♩ = ${Math.round(score.tempo * (v / 100))}`}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {TEMPO_FACTORS.map((f) => (
            <Button key={f} size="sm" variant={Math.abs(snapshot.tempoFactor - f) < 0.001 ? 'primary' : 'secondary'} onClick={() => setTempo(f)}>
              {Math.round(f * 100)} %
            </Button>
          ))}
        </div>
        <div className="mt-4 border-t border-border pt-2">
          <Toggle
            checked={snapshot.countIn}
            onChange={(v) => {
              player.setCountIn(v);
              void updateSettings({ countIn: v });
            }}
            label="Einzähler"
            description="Ein Takt Metronom vor dem Start (nur wenn das Metronom an ist)."
          />
          <Toggle
            checked={settings.spokenCountIn}
            onChange={(v) => {
              if (v) primeSpeech();
              void updateSettings({ spokenCountIn: v });
            }}
            label="Einzähler mitsprechen" description="„Eins, zwei, drei, vier“ zu den Klicks (Systemstimme)." />
          <Toggle checked={settings.autoScroll} onChange={(v) => void updateSettings({ autoScroll: v })} label="Automatisch scrollen" />
          <Toggle checked={settings.showFingerNumbers} onChange={(v) => void updateSettings({ showFingerNumbers: v })} label="Fingersatz anzeigen" description="Kleine Ziffern über der Tabulatur (1 = Zeigefinger … 4 = kleiner Finger)." />
        </div>
      </Sheet>

      {/* Schleifen-Sheet */}
      <Sheet open={loopSheet} onClose={() => setLoopSheet(false)} title="Abschnitt wiederholen">
        <p className="text-sm text-muted">Wähle den Bereich, den GuitarCoach endlos wiederholen soll.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(['startInstance', 'endInstance'] as const).map((field) => {
            const inst = loopRange ? plan.barInstances[loopRange[field]] : undefined;
            return (
              <div key={field} className="rounded-2xl border border-border bg-surface-2 p-3 text-center">
                <div className="text-xs text-muted">{field === 'startInstance' ? 'Von Takt' : 'Bis Takt'}</div>
                <div className="my-1 text-2xl font-bold tabular-nums">{inst ? inst.barIndex + 1 : '–'}</div>
                <div className="flex justify-center gap-2">
                  <Button size="sm" onClick={() => loopStepper(field, -1)} aria-label="Takt zurück">
                    −
                  </Button>
                  <Button size="sm" onClick={() => loopStepper(field, 1)} aria-label="Takt vor">
                    +
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const start = currentInstance ?? 0;
              player.setLoop({ startInstance: start, endInstance: Math.min(plan.barInstances.length - 1, start + 3) });
            }}
          >
            Aktuellen Takt + 3 wiederholen
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setLoopSheet(false);
              setSelectingLoop(true);
              setLoopAnchor(null);
              toast.show('Tippe in der Tabulatur auf den ersten Takt der Schleife.', 'info', 3000);
            }}
          >
            Takte in der Tabulatur antippen
          </Button>
          {loopRange && (
            <Button variant="danger" onClick={() => player.setLoop(null)}>
              Schleife aufheben
            </Button>
          )}
          <Button variant="primary" onClick={() => setLoopSheet(false)} disabled={!loopRange}>
            Fertig
          </Button>
        </div>
      </Sheet>

    </div>
  );
}
