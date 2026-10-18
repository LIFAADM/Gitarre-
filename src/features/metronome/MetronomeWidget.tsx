import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { Play, Square } from 'lucide-react';
import { Button, Card, Segmented, Slider, Toggle, type SegmentedOption } from '@/components/ui';
import { unlockAudio } from '@/core/audio/audioContext';
import { METRONOME_MAX_BPM, METRONOME_MIN_BPM, type MetronomeState } from '@/core/audio/metronome';
import { useEngine, useMetronomeState } from '@/hooks/useEngine';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';

/**
 * Metronom-Bedienfeld: Tempo (Anzeige, Regler, Schrittknöpfe, Tap-Tempo), Start/Stopp,
 * Taktart, Betonung, Unterteilung, Lautstärke und eine Schlaganzeige.
 * `compact` blendet Unterteilung und Lautstärke aus (z. B. im Player).
 */

export interface TempoWord {
  name: string;
  /** Deutsche Erklärung, z. B. „gehend“. */
  de: string;
  /** Untergrenze in BPM. */
  min: number;
}

export const TEMPO_WORDS: readonly TempoWord[] = [
  { name: 'Largo', de: 'sehr langsam', min: 0 },
  { name: 'Adagio', de: 'langsam', min: 60 },
  { name: 'Andante', de: 'gehend', min: 76 },
  { name: 'Moderato', de: 'mäßig', min: 108 },
  { name: 'Allegro', de: 'schnell', min: 120 },
  { name: 'Presto', de: 'sehr schnell', min: 168 },
];

/** Italienische Tempobezeichnung für ein Tempo in BPM. */
export function tempoWord(bpm: number): TempoWord {
  let best = TEMPO_WORDS[0]!;
  for (const word of TEMPO_WORDS) if (bpm >= word.min) best = word;
  return best;
}

const TIME_SIGNATURES = [
  { value: '2/4', numerator: 2, denominator: 4 },
  { value: '3/4', numerator: 3, denominator: 4 },
  { value: '4/4', numerator: 4, denominator: 4 },
  { value: '6/8', numerator: 6, denominator: 8 },
] as const;

const SUBDIVISIONS: SegmentedOption<MetronomeState['subdivision']>[] = [
  { value: 1, label: 'Viertel' },
  { value: 2, label: 'Achtel' },
  { value: 3, label: 'Triolen' },
  { value: 4, label: 'Sechzehntel' },
];

const HOLD_DELAY_MS = 450;
const HOLD_REPEAT_MS = 110;
/** Pause, nach der Tap-Tempo von vorn zählt. */
const TAP_RESET_MS = 2000;
const TAP_WINDOW = 4;

/**
 * Knopf mit Wiederholung bei gedrückt halten: ein Tipp = ein Schritt,
 * nach kurzer Verzögerung läuft der Schritt automatisch weiter.
 */
function useHoldRepeat(step: () => void) {
  const timers = useRef<{ delay: number | null; repeat: number | null; repeated: boolean }>({ delay: null, repeat: null, repeated: false });

  const stop = (): void => {
    const t = timers.current;
    if (t.delay !== null) window.clearTimeout(t.delay);
    if (t.repeat !== null) window.clearInterval(t.repeat);
    t.delay = null;
    t.repeat = null;
  };

  useEffect(() => {
    const t = timers.current;
    return () => {
      if (t.delay !== null) window.clearTimeout(t.delay);
      if (t.repeat !== null) window.clearInterval(t.repeat);
    };
  }, []);

  const onPointerDown = (): void => {
    stop();
    const t = timers.current;
    t.repeated = false;
    t.delay = window.setTimeout(() => {
      t.repeat = window.setInterval(() => {
        t.repeated = true;
        step();
      }, HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  const onClick = (): void => {
    const t = timers.current;
    // Nach einer Halte-Wiederholung keinen zusätzlichen Schritt beim Loslassen auslösen.
    if (t.repeated) {
      t.repeated = false;
      return;
    }
    step();
  };

  return {
    onPointerDown,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick,
    onContextMenu: (event: SyntheticEvent) => event.preventDefault(),
  };
}

function StepButton({ delta, compact, onStep }: { delta: number; compact: boolean; onStep: (delta: number) => void }) {
  const hold = useHoldRepeat(() => onStep(delta));
  const amount = Math.abs(delta);
  return (
    <Button
      variant="secondary"
      size={compact ? 'sm' : 'md'}
      aria-label={`Tempo um ${amount} ${delta > 0 ? 'erhöhen' : 'verringern'}`}
      className="tabular-nums"
      style={{ WebkitTouchCallout: 'none' }}
      {...hold}
    >
      {delta > 0 ? `+${amount}` : `−${amount}`}
    </Button>
  );
}

/** Tap-Tempo: Mittelwert der letzten vier Tipps; nach 2 s Pause wird neu gezählt. */
function useTapTempo(onTempo: (bpm: number) => void) {
  const taps = useRef<number[]>([]);
  const [display, setDisplay] = useState<{ count: number; serial: number }>({ count: 0, serial: 0 });

  useEffect(() => {
    if (display.count === 0) return;
    const timer = window.setTimeout(() => setDisplay({ count: 0, serial: 0 }), TAP_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [display]);

  const tap = (): void => {
    const now = performance.now();
    const list = taps.current;
    const last = list[list.length - 1];
    if (last !== undefined && now - last > TAP_RESET_MS) list.length = 0;
    list.push(now);
    while (list.length > TAP_WINDOW) list.shift();
    setDisplay((d) => ({ count: list.length, serial: d.serial + 1 }));
    if (list.length >= 2) {
      const first = list[0]!;
      const avgInterval = (now - first) / (list.length - 1);
      onTempo(Math.round(60_000 / avgInterval));
    }
  };

  return { tap, count: display.count };
}

function BeatIndicator({ beats, current, accentFirst, compact, running }: { beats: number; current: number | null; accentFirst: boolean; compact: boolean; running: boolean }) {
  const label = running && current !== null ? `Schlag ${current + 1} von ${beats}` : `${beats} Schläge pro Takt`;
  return (
    <div role="img" aria-label={label} className={cn('flex items-center justify-center', compact ? 'gap-2' : 'gap-3')}>
      {Array.from({ length: beats }, (_, i) => {
        const accent = accentFirst && i === 0;
        const active = running && current === i;
        return (
          <span
            key={i}
            className={cn(
              'flex items-center justify-center rounded-full font-bold tabular-nums transition-[transform,background-color,box-shadow,color,border-color]',
              compact ? (accent ? 'h-3.5 w-3.5' : 'h-3 w-3') : accent ? 'h-11 w-11 text-base' : 'h-9 w-9 text-sm',
              active
                ? cn('duration-0 scale-110', accent ? 'bg-gold-soft text-[#1b1507] shadow-[0_0_24px_rgba(217,169,78,0.9)]' : 'bg-gold text-[#1b1507] shadow-[0_0_14px_rgba(217,169,78,0.7)]')
                : 'duration-300 border border-border bg-surface-3 text-muted',
            )}
          >
            {!compact && i + 1}
          </span>
        );
      })}
    </div>
  );
}

export function MetronomeWidget({ compact = false }: { compact?: boolean }) {
  const engine = useEngine();
  const state = useMetronomeState();
  const [settings, updateSettings] = useSettings();
  const word = tempoWord(state.bpm);
  const beats = engine.metronome.beatsPerBar();

  // Schlaganzeige: per requestAnimationFrame vom Audio-Scheduler ablesen (nur bei laufendem Metronom).
  const [beat, setBeat] = useState<{ index: number; bar: number } | null>(null);
  useEffect(() => {
    if (!state.running || typeof requestAnimationFrame !== 'function') return;
    let frame = 0;
    let lastIndex = -1;
    let lastBar = -1;
    const loop = (): void => {
      const info = engine.metronome.currentBeat();
      if (info && (info.beatInBar !== lastIndex || info.bar !== lastBar)) {
        lastIndex = info.beatInBar;
        lastBar = info.bar;
        setBeat({ index: info.beatInBar, bar: info.bar });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.running, engine]);

  const setBpm = (bpm: number): void => engine.metronome.setBpm(bpm);
  const stepBpm = (delta: number): void => engine.metronome.setBpm(engine.metronome.getState().bpm + delta);
  const { tap, count: tapCount } = useTapTempo(setBpm);

  const toggleRunning = (): void => {
    if (state.running) {
      engine.metronome.stop();
      return;
    }
    setBeat(null);
    void unlockAudio();
    engine.metronome.start();
  };

  const onTimeSignature = (value: string): void => {
    const sig = TIME_SIGNATURES.find((s) => s.value === value);
    if (sig) engine.metronome.setTimeSignature(sig.numerator, sig.denominator);
  };

  const onVolume = (volume: number): void => {
    engine.metronome.setVolume(volume);
    void updateSettings({ metronomeVolume: volume });
  };

  const tapButton = (
    <Button variant="outline" size={compact ? 'md' : 'lg'} aria-label="Tempo tippen" onClick={tap} className="shrink-0">
      <span className="flex flex-col items-center leading-tight">
        <span className={compact ? 'text-sm font-bold' : 'text-base font-bold'}>Tap</span>
        <span className="text-[10px] font-medium opacity-80">{tapCount > 0 ? `${tapCount}× getippt` : 'Tempo tippen'}</span>
      </span>
    </Button>
  );

  const startButton = (
    <Button variant="primary" size={compact ? 'md' : 'xl'} full icon={state.running ? <Square size={compact ? 18 : 24} /> : <Play size={compact ? 18 : 24} />} onClick={toggleRunning}>
      {state.running ? 'Stopp' : 'Start'}
    </Button>
  );

  const tempoSlider = (
    <Slider aria-label="Tempo in BPM" value={state.bpm} min={METRONOME_MIN_BPM} max={METRONOME_MAX_BPM} step={1} onChange={setBpm} />
  );

  const timeSignature = (
    <Segmented
      ariaLabel="Taktart"
      size={compact ? 'sm' : 'md'}
      value={`${state.numerator}/${state.denominator}`}
      options={TIME_SIGNATURES.map((s) => ({ value: s.value, label: s.value }))}
      onChange={onTimeSignature}
    />
  );

  const accentToggle = (
    <Toggle checked={state.accentFirst} onChange={(v) => engine.metronome.setAccentFirst(v)} label="Erster Schlag betont" description={compact ? undefined : 'Der erste Schlag im Takt klingt höher – so hörst du, wo der Takt beginnt.'} />
  );

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold leading-none tabular-nums tracking-tight">{state.bpm}</span>
            <span className="text-xs text-muted">
              BPM · <span className="text-gold">{word.name}</span>
            </span>
          </div>
          {tapButton}
        </div>
        {tempoSlider}
        <div className="flex items-center gap-2">
          <StepButton delta={-5} compact onStep={stepBpm} />
          <StepButton delta={-1} compact onStep={stepBpm} />
          <div className="flex-1">{startButton}</div>
          <StepButton delta={1} compact onStep={stepBpm} />
          <StepButton delta={5} compact onStep={stepBpm} />
        </div>
        <BeatIndicator beats={beats} current={beat?.index ?? null} accentFirst={state.accentFirst} compact running={state.running} />
        {timeSignature}
        {accentToggle}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Tempo</div>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-bold leading-none tabular-nums tracking-tight">{state.bpm}</span>
              <span className="text-lg font-semibold text-muted">BPM</span>
            </div>
            <div className="mt-2 text-sm">
              <span className="font-semibold text-gold">{word.name}</span> <span className="text-muted">· {word.de}</span>
            </div>
          </div>
          {tapButton}
        </div>
        <div className="mt-3">{tempoSlider}</div>
        <div className="mt-1 grid grid-cols-4 gap-2">
          <StepButton delta={-5} compact={false} onStep={stepBpm} />
          <StepButton delta={-1} compact={false} onStep={stepBpm} />
          <StepButton delta={1} compact={false} onStep={stepBpm} />
          <StepButton delta={5} compact={false} onStep={stepBpm} />
        </div>
        <div className="mt-5">
          <BeatIndicator beats={beats} current={beat?.index ?? null} accentFirst={state.accentFirst} compact={false} running={state.running} />
        </div>
        <div className="mt-5">{startButton}</div>
      </Card>

      <Card>
        <Section title="Taktart">{timeSignature}</Section>
        <div className="mt-1 border-t border-border/60">{accentToggle}</div>
        <Section title="Unterteilung" hint="Zusätzliche, leisere Klicks zwischen den Schlägen.">
          <Segmented ariaLabel="Unterteilung" size="sm" value={state.subdivision} options={SUBDIVISIONS} onChange={(v) => engine.metronome.setSubdivision(v)} />
        </Section>
        <div className="mt-4">
          <Slider label="Lautstärke" aria-label="Lautstärke des Metronoms" value={settings.metronomeVolume} min={0} max={1} step={0.05} onChange={onVolume} format={(v) => `${Math.round(v * 100)} %`} />
        </div>
      </Card>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
