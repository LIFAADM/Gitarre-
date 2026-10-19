import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, Mic, MicOff, Play, RotateCcw, Square, TriangleAlert, Volume2 } from 'lucide-react';
import { Badge, Button, Card, Segmented, useToast } from '@/components/ui';
import { unlockAudio } from '@/core/audio/audioContext';
import { playReferenceTone } from '@/core/audio/guitarSynth';
import type { TrackedPitch } from '@/core/audio/pitch/pitchTracker';
import { centsBetween, clamp, noteName, octaveOf, type NoteNaming } from '@/core/music/notes';
import { STANDARD_TUNING, tuningStrings, type TuningString } from '@/core/music/tuning';
import { useDetection } from '@/hooks/useDetection';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';

/**
 * Stimmgerät-Anzeige (wiederverwendbar: Werkzeugseite und später Lektionen).
 *
 * Automatikmodus: Die gemessene Tonhöhe wird mit der nächstgelegenen Leersaite verglichen
 * („Gitarrenmodus“ wie bei einem Clip-Stimmgerät) – für Anfänger verständlicher als eine
 * chromatische Anzeige, bei der eine stark verstimmte E-Saite plötzlich als „Dis, zu hoch“ erscheint.
 * Manueller Modus: Die Abweichung bezieht sich auf die ausgewählte Saite.
 */

export type TunerMode = 'auto' | 'manual';
export type TuneState = 'ok' | 'near' | 'far';
export type TuneDirection = 'low' | 'high' | 'ok';

export interface TunerReading {
  /** Zielsaite, auf die sich die Anzeige bezieht. */
  target: TuningString;
  name: string;
  octave: number;
  nameWithOctave: string;
  frequency: number;
  /** Abweichung zur Zielsaite in Cent (positiv = zu hoch). */
  cents: number;
  state: TuneState;
  direction: TuneDirection;
  /** Nächstgelegene Note (chromatisch) – für Hinweise bei großen Abweichungen. */
  nearestName: string;
  /** Mehr als 1,5 Halbtöne von der Zielsaite entfernt – vermutlich eine andere Saite/ein gegriffener Ton. */
  farOff: boolean;
}

export interface TunerWidgetProps {
  compact?: boolean;
  onAllStringsTuned?: () => void;
}

export const TUNER_TEXT = {
  low: 'zu tief – Saite etwas höher stimmen (Wirbel anziehen)',
  high: 'zu hoch – Saite etwas tiefer stimmen (Wirbel lösen)',
  ok: 'richtig gestimmt ✓',
  hintPlay: 'Spiele eine Saite einzeln an und lass sie klingen. Halte das iPhone nah an das Schallloch.',
  idle: 'Tippe auf „Mikrofon starten“, um loszulegen.',
  starting: 'Mikrofon wird gestartet …',
  error: 'Mikrofon nicht verfügbar',
  allTuned: 'Alle sechs Saiten sind gestimmt – super gemacht!',
} as const;

/** Bis zu dieser Abweichung (Cent) gilt der Ton als „fast richtig“ (Bernsteinfarbe). */
const NEAR_CENTS = 15;
/** Ab dieser Abweichung ist es vermutlich eine andere Saite oder ein gegriffener Ton. */
const FAR_OFF_CENTS = 150;
/** So lange muss eine Saite stabil im Toleranzbereich bleiben, bis sie als gestimmt gilt. */
const IN_TUNE_HOLD_MS = 1000;
const REFERENCE_SECONDS = 2.5;
const REFERENCE_PAUSE_EXTRA_MS = 300;

const MODE_OPTIONS: { value: TunerMode; label: string }[] = [
  { value: 'auto', label: 'Automatisch' },
  { value: 'manual', label: 'Manuell' },
];

/** „329,6 Hz“ – mit deutschem Dezimalkomma. */
export function formatHz(hz: number): string {
  return `${hz.toFixed(1).replace('.', ',')} Hz`;
}

/** „+12 Cent“, „−3 Cent“, „±0 Cent“. */
export function formatCents(cents: number): string {
  const rounded = Math.round(cents);
  if (rounded === 0) return '±0 Cent';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)} Cent`;
}

export function tuneState(cents: number, toleranceCents: number): TuneState {
  const abs = Math.abs(cents);
  if (abs <= toleranceCents) return 'ok';
  if (abs <= NEAR_CENTS) return 'near';
  return 'far';
}

/** Leersaite, die der Frequenz am nächsten liegt (logarithmischer Abstand). */
export function closestString(frequency: number, strings: readonly TuningString[]): TuningString {
  let best = strings[0]!;
  let bestAbs = Number.POSITIVE_INFINITY;
  for (const s of strings) {
    const abs = Math.abs(centsBetween(frequency, s.frequency));
    if (abs < bestAbs) {
      bestAbs = abs;
      best = s;
    }
  }
  return best;
}

/** Bewertet eine stabil erkannte Tonhöhe gegenüber der Ziel- bzw. nächstgelegenen Saite. */
export function evaluateReading(pitch: TrackedPitch, mode: TunerMode, selected: TuningString, strings: readonly TuningString[], toleranceCents: number, naming: NoteNaming): TunerReading {
  const target = mode === 'manual' ? selected : closestString(pitch.frequency, strings);
  const cents = centsBetween(pitch.frequency, target.frequency);
  const state = tuneState(cents, toleranceCents);
  const direction: TuneDirection = state === 'ok' ? 'ok' : cents < 0 ? 'low' : 'high';
  const octave = octaveOf(target.midi);
  return {
    target,
    name: target.name,
    octave,
    nameWithOctave: `${target.name}${octave}`,
    frequency: pitch.frequency,
    cents,
    state,
    direction,
    nearestName: `${noteName(pitch.midi, naming)}${octaveOf(pitch.midi)}`,
    farOff: Math.abs(cents) > FAR_OFF_CENTS,
  };
}

const STATE_TEXT_CLASS: Record<TuneState, string> = { ok: 'text-ok', near: 'text-warn', far: 'text-bad' };
const STATE_COLOR: Record<TuneState, string> = { ok: 'var(--color-ok)', near: 'var(--color-warn)', far: 'var(--color-bad)' };

/* ----------------------------- Nadelanzeige ----------------------------- */

const GAUGE = { width: 320, height: 196, cx: 160, cy: 176, r: 140, spanDeg: 60 } as const;
const TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
const LABELS = [-50, -25, 0, 25, 50];

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: GAUGE.cx + radius * Math.sin(a), y: GAUGE.cy - radius * Math.cos(a) };
}

function arcPath(fromDeg: number, toDeg: number, radius: number): string {
  const p1 = polar(fromDeg, radius);
  const p2 = polar(toDeg, radius);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

function centsToAngle(cents: number): number {
  return (clamp(cents, -50, 50) / 50) * GAUGE.spanDeg;
}

function NeedleGauge({ cents, toleranceCents, state, compact }: { cents: number | null; toleranceCents: number; state: TuneState | null; compact: boolean }) {
  const angle = cents === null ? 0 : centsToAngle(cents);
  const color = state ? STATE_COLOR[state] : 'var(--color-muted)';
  const tolAngle = centsToAngle(toleranceCents);
  const nearAngle = centsToAngle(NEAR_CENTS);
  const { cx, cy, r } = GAUGE;
  return (
    <svg
      viewBox={`0 0 ${GAUGE.width} ${GAUGE.height}`}
      className={cn('mx-auto block w-full', compact ? 'max-w-[240px]' : 'max-w-[330px]')}
      role="img"
      aria-label={cents === null ? 'Keine Tonhöhe erkannt' : `Abweichung ${formatCents(cents)}`}
    >
      <path d={arcPath(-GAUGE.spanDeg, GAUGE.spanDeg, r)} fill="none" stroke="var(--color-surface-3)" strokeWidth={16} strokeLinecap="round" />
      <path d={arcPath(-nearAngle, nearAngle, r)} fill="none" stroke="var(--color-warn)" strokeOpacity={0.35} strokeWidth={16} />
      <path d={arcPath(-tolAngle, tolAngle, r)} fill="none" stroke="var(--color-ok)" strokeOpacity={0.9} strokeWidth={16} />
      {TICKS.map((c) => {
        const a = centsToAngle(c);
        const major = c % 50 === 0;
        const p1 = polar(a, r - 16);
        const p2 = polar(a, r - (major ? 32 : 25));
        return <line key={c} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--color-muted)" strokeOpacity={major ? 0.95 : 0.5} strokeWidth={major ? 2.5 : 1.5} strokeLinecap="round" />;
      })}
      {LABELS.map((c) => {
        const p = polar(centsToAngle(c), r - 48);
        const label = c > 0 ? `+${c}` : c < 0 ? `−${Math.abs(c)}` : '0';
        return (
          <text key={c} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={600} fill="var(--color-muted)">
            {label}
          </text>
        );
      })}
      <g
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transformBox: 'view-box',
          transition: 'transform 120ms ease-out, opacity 200ms',
          opacity: cents === null ? 0.3 : 1,
        }}
      >
        <line x1={cx} y1={cy} x2={cx} y2={cy - (r - 2)} stroke={color} strokeWidth={4} strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r={10} fill="var(--color-surface-2)" stroke={color} strokeWidth={4} />
    </svg>
  );
}

/* ------------------------------ Pegelanzeige ------------------------------ */

/** RMS → Prozent (−60 dBFS = 0 %, 0 dBFS = 100 %). */
function levelToPercent(level: number): number {
  if (level <= 0) return 0;
  const db = 20 * Math.log10(level);
  return clamp(((db + 60) / 60) * 100, 0, 100);
}

function LevelMeter({ level, gate, active }: { level: number; gate: number; active: boolean }) {
  const pct = active ? levelToPercent(level) : 0;
  const gatePct = levelToPercent(gate);
  const aboveGate = active && level >= gate;
  return (
    <div className="flex items-center gap-2" title="Eingangspegel – die goldene Marke zeigt den Mindestpegel">
      <Volume2 size={14} className="shrink-0 text-muted" aria-hidden />
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-3" role="meter" aria-label="Eingangspegel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div className={cn('h-full rounded-full transition-[width] duration-75', aboveGate ? 'bg-ok' : 'bg-muted/70')} style={{ width: `${pct}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-gold/80" style={{ left: `${gatePct}%` }} aria-hidden />
      </div>
    </div>
  );
}

/* --------------------------------- Widget --------------------------------- */

export function TunerWidget({ compact = false, onAllStringsTuned }: TunerWidgetProps) {
  const [settings] = useSettings();
  const naming = settings.noteNaming;
  const a4Hz = settings.a4Hz;
  const toleranceCents = clamp(settings.tunerToleranceCents, 1, 25);
  const sensitivity = settings.tunerSensitivity;
  const toast = useToast();

  const strings = useMemo(() => tuningStrings(STANDARD_TUNING, naming, a4Hz), [naming, a4Hz]);

  const [mode, setMode] = useState<TunerMode>('auto');
  const [selectedNumber, setSelectedNumber] = useState(6);
  const [tuned, setTuned] = useState<ReadonlySet<number>>(() => new Set<number>());
  const [referencePlaying, setReferencePlaying] = useState<number | null>(null);

  const { pitch, level, status, error, supported, start, stop, pause, gate } = useDetection({ enabled: true, sensitivity, a4Hz });
  const listening = status === 'listening';

  const selected = strings.find((s) => s.number === selectedNumber) ?? strings[0]!;
  const reading = useMemo<TunerReading | null>(
    () => (pitch && pitch.stable ? evaluateReading(pitch, mode, selected, strings, toleranceCents, naming) : null),
    [pitch, mode, selected, strings, toleranceCents, naming],
  );
  const activeStringNumber = mode === 'manual' ? selected.number : (reading?.target.number ?? null);

  /* ---- Pro Saite „gestimmt“ merken (≥ 1 s stabil im Toleranzbereich) ---- */
  const inTuneRef = useRef<{ string: number; since: number } | null>(null);
  useEffect(() => {
    if (!reading || reading.state !== 'ok') {
      inTuneRef.current = null;
      return;
    }
    const now = Date.now();
    const current = inTuneRef.current;
    if (!current || current.string !== reading.target.number) {
      inTuneRef.current = { string: reading.target.number, since: now };
      return;
    }
    if (now - current.since >= IN_TUNE_HOLD_MS) {
      const number = reading.target.number;
      setTuned((prev) => (prev.has(number) ? prev : new Set(prev).add(number)));
    }
  }, [reading]);

  const celebratedRef = useRef(false);
  useEffect(() => {
    if (tuned.size < strings.length || celebratedRef.current) return;
    celebratedRef.current = true;
    toast.show(TUNER_TEXT.allTuned, 'success');
    onAllStringsTuned?.();
  }, [tuned, strings.length, toast, onAllStringsTuned]);

  /* ---- Referenzton ---- */
  const stopReferenceRef = useRef<(() => void) | null>(null);
  const referenceTimerRef = useRef<number | null>(null);

  const stopReference = useCallback((): void => {
    if (referenceTimerRef.current !== null) {
      window.clearTimeout(referenceTimerRef.current);
      referenceTimerRef.current = null;
    }
    if (stopReferenceRef.current) {
      stopReferenceRef.current();
      stopReferenceRef.current = null;
      // Der Ton klingt noch kurz aus – so lange nicht mitmessen.
      pause(REFERENCE_PAUSE_EXTRA_MS);
    }
    setReferencePlaying(null);
  }, [pause]);

  const playReference = useCallback(
    async (string: TuningString): Promise<void> => {
      stopReference();
      let stopTone: () => void;
      try {
        const ctx = await unlockAudio();
        stopTone = playReferenceTone(ctx, string.frequency, REFERENCE_SECONDS, 0.5);
      } catch {
        toast.show('Der Referenzton konnte nicht abgespielt werden.', 'error');
        return;
      }
      stopReferenceRef.current = stopTone;
      setReferencePlaying(string.number);
      // Während der Ton erklingt, nicht die eigene Ausgabe messen.
      pause(REFERENCE_SECONDS * 1000 + REFERENCE_PAUSE_EXTRA_MS);
      referenceTimerRef.current = window.setTimeout(() => {
        referenceTimerRef.current = null;
        stopReferenceRef.current = null;
        setReferencePlaying(null);
      }, REFERENCE_SECONDS * 1000);
    },
    [pause, stopReference, toast],
  );

  useEffect(
    () => () => {
      if (referenceTimerRef.current !== null) window.clearTimeout(referenceTimerRef.current);
      stopReferenceRef.current?.();
    },
    [],
  );

  const selectString = (string: TuningString): void => {
    setSelectedNumber(string.number);
    setMode('manual');
  };

  /* ---- Texte und Farben ---- */
  const referenceString = referencePlaying === null ? null : strings.find((s) => s.number === referencePlaying);
  let statusText: string;
  let hint: string | null = null;
  let toneClass = 'text-muted';
  if (referenceString) {
    statusText = `Referenzton ${referenceString.nameWithOctave} – höre genau hin und vergleiche.`;
    hint = 'Die Auswertung pausiert, bis der Ton verklungen ist.';
  } else if (listening) {
    if (reading) {
      statusText = reading.direction === 'ok' ? TUNER_TEXT.ok : reading.direction === 'low' ? TUNER_TEXT.low : TUNER_TEXT.high;
      toneClass = STATE_TEXT_CLASS[reading.state];
      if (reading.farOff) {
        hint =
          mode === 'manual'
            ? `Gemessen wird eher ${reading.nearestName}. Hast du die richtige Saite gewählt?`
            : `Gemessen wird ${reading.nearestName} – spiele die Saite leer (ohne zu greifen) und einzeln an.`;
      }
    } else {
      statusText = '–';
      hint = TUNER_TEXT.hintPlay;
    }
  } else if (status === 'starting') {
    statusText = TUNER_TEXT.starting;
  } else if (status === 'error') {
    statusText = TUNER_TEXT.error;
    toneClass = 'text-bad';
  } else {
    statusText = TUNER_TEXT.idle;
  }

  const noteSize = compact ? 'text-6xl' : 'text-7xl';

  return (
    <div className={cn('flex flex-col', compact ? 'gap-3' : 'gap-4')}>
      {status === 'error' && error && (
        <Card role="alert" className="border-bad/40 bg-bad/10">
          <div className="flex items-start gap-3">
            <TriangleAlert size={22} className="mt-0.5 shrink-0 text-bad" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-bad">{TUNER_TEXT.error}</p>
              <p className="mt-1 text-sm leading-relaxed">{error}</p>
              <Button size="sm" variant="outline" className="mt-3" icon={<RotateCcw size={16} />} onClick={() => void start()}>
                Erneut versuchen
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card padding={compact ? 'sm' : 'md'}>
        <div className="flex items-center justify-between gap-3">
          <Segmented ariaLabel="Modus" size="sm" value={mode} options={MODE_OPTIONS} onChange={setMode} className="max-w-[240px]" />
          <Badge tone={listening ? 'ok' : status === 'starting' ? 'gold' : 'neutral'} icon={listening ? <Mic size={12} /> : <MicOff size={12} />}>
            {listening ? 'hört zu' : status === 'starting' ? 'startet …' : 'aus'}
          </Badge>
        </div>

        <div className={cn('flex flex-col items-center text-center', compact ? 'mt-3' : 'mt-5')}>
          <div data-testid="tuner-note" className={cn('flex items-start justify-center font-bold leading-none tracking-tight tabular-nums', reading ? STATE_TEXT_CLASS[reading.state] : 'text-muted')}>
            {reading ? (
              <>
                <span className={noteSize}>{reading.name}</span>
                <span className={cn('ml-1 mt-1 font-semibold text-muted', compact ? 'text-xl' : 'text-2xl')}>{reading.octave}</span>
              </>
            ) : (
              <span className={noteSize} aria-label="keine Note erkannt">
                –
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted tabular-nums" data-testid="tuner-details">
            {reading ? (
              <>
                <span>{formatHz(reading.frequency)}</span>
                <span aria-hidden>·</span>
                <span className={cn('font-semibold', STATE_TEXT_CLASS[reading.state])}>{formatCents(reading.cents)}</span>
              </>
            ) : (
              <span>{mode === 'manual' ? `Ziel: ${selected.nameWithOctave} · ${formatHz(selected.frequency)}` : 'Ziel: nächstgelegene Saite'}</span>
            )}
          </div>
        </div>

        <div className={compact ? 'mt-1' : 'mt-2'}>
          <NeedleGauge cents={reading ? reading.cents : null} toleranceCents={toleranceCents} state={reading ? reading.state : null} compact={compact} />
        </div>

        <p role="status" aria-live="polite" className={cn('text-center font-semibold', compact ? 'text-sm' : 'text-base', toneClass)}>
          {statusText}
        </p>
        {hint && <p className="mt-1 text-center text-sm leading-relaxed text-muted">{hint}</p>}

        <div className={compact ? 'mt-3' : 'mt-4'}>
          <LevelMeter level={level} gate={gate} active={listening} />
        </div>
      </Card>

      <div>
        {!compact && <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Saiten – von dick (6) nach dünn (1)</p>}
        <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Saiten">
          {strings.map((s) => {
            const isActive = activeStringNumber === s.number;
            const isTuned = tuned.has(s.number);
            const isPlaying = referencePlaying === s.number;
            return (
              <div key={s.number} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => selectString(s)}
                  aria-pressed={mode === 'manual' && selected.number === s.number}
                  aria-label={`Saite ${s.number}: ${s.nameWithOctave}${isTuned ? ' (gestimmt)' : ''}`}
                  className={cn(
                    'relative flex min-h-14 flex-col items-center justify-center rounded-2xl border px-0.5 py-2 transition active:scale-95 focus-visible:outline-2 focus-visible:outline-gold',
                    isActive ? 'border-gold bg-gold/15 text-gold' : 'border-border bg-surface text-text',
                    isTuned && !isActive && 'border-ok/60',
                  )}
                >
                  {isTuned && <CircleCheck size={14} className="absolute right-1 top-1 text-ok" aria-hidden />}
                  <span className="text-lg font-bold leading-none">{s.nameWithOctave}</span>
                  <span className="mt-1 text-[10px] leading-none text-muted tabular-nums">{formatHz(s.frequency)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => (isPlaying ? stopReference() : void playReference(s))}
                  aria-label={isPlaying ? `Referenzton ${s.nameWithOctave} stoppen` : `Referenzton ${s.nameWithOctave} abspielen`}
                  aria-pressed={isPlaying}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-xl border transition active:scale-95 focus-visible:outline-2 focus-visible:outline-gold',
                    isPlaying ? 'border-gold bg-gold text-[#1b1507]' : 'border-border bg-surface-2 text-text hover:bg-surface-3',
                  )}
                >
                  {isPlaying ? <Square size={14} /> : <Play size={14} />}
                </button>
              </div>
            );
          })}
        </div>
        {!compact && <p className="mt-2 text-xs text-muted">▶︎ spielt einen Referenzton zum Vergleichen. Tippe auf eine Saite, um sie gezielt zu stimmen.</p>}
      </div>

      <Button
        size="xl"
        full
        variant={listening ? 'secondary' : 'primary'}
        icon={listening ? <MicOff size={22} /> : <Mic size={22} />}
        loading={status === 'starting'}
        disabled={!supported}
        onClick={listening ? stop : () => void start()}
      >
        {status === 'starting' ? TUNER_TEXT.starting : listening ? 'Mikrofon stoppen' : 'Mikrofon starten'}
      </Button>
      {!supported && <p className="text-center text-sm text-muted">Dieser Browser unterstützt keinen Mikrofonzugriff.</p>}
    </div>
  );
}
