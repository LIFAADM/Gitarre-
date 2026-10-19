import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Check, Mic, Timer, Volume2, Waves } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Card, PageHeader, ProgressBar, Stat } from '@/components/ui';
import { playClick } from '@/core/audio/metronome';
import { levelVerdict, noiseVerdict, type CalibrationProfile } from '@/core/detection/calibration';
import { CalibrationSession, type CalibrationState } from '@/core/detection/calibrationSession';
import type { AnalysisFrame } from '@/core/detection/engine';
import { deviceKey, saveCalibration } from '@/core/storage/calibration';
import { useDetection } from '@/hooks/useDetection';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';

/**
 * Kalibrierung des Mikrofons in drei kurzen Schritten (Stille, Anschlag, Latenz).
 * Jeder Schritt hat genau eine Hauptaktion; Ergebnis wird je Gerät gespeichert.
 */

const CLICK_COUNT = 8;
const CLICK_BPM = 80;
const COUNT_IN_SEC = 1.2;

type Phase = 'intro' | 'laeuft' | 'fertig';

const STEP_TEXT = {
  stille: { title: 'Schritt 1: Bitte zwei Sekunden Ruhe', text: 'Nicht spielen, nicht sprechen. Die App misst das Grundrauschen des Raums.' },
  anschlag: { title: 'Schritt 2: Einmal kräftig über alle Saiten', text: 'Schlage alle sechs Saiten mit dem Daumen an und lass sie klingen.' },
  latenz: { title: 'Schritt 3: Zum Klick spielen', text: `Spiele bei jedem Klick einen Ton (z. B. die leere A-Saite). ${CLICK_COUNT} Klicks, dann ist es geschafft.` },
  fertig: { title: 'Fertig', text: '' },
} as const;

function formatDb(db: number): string {
  return `${Math.round(db)} dB`;
}

export function CalibrationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [settings] = useSettings();
  const returnTo = params.get('zurueck') ?? '/';

  const [phase, setPhase] = useState<Phase>('intro');
  const [state, setState] = useState<CalibrationState | null>(null);
  const [saving, setSaving] = useState(false);
  const sessionRef = useRef<CalibrationSession | null>(null);
  const clicksScheduledRef = useRef(false);
  const clickTimersRef = useRef<number[]>([]);
  const lastUiUpdateRef = useRef(0);

  const onFrame = useCallback((frame: AnalysisFrame): void => {
    const session = sessionRef.current;
    if (!session) return;
    const next = session.push(frame);
    const now = performance.now();
    if (next.step !== 'fertig' && now - lastUiUpdateRef.current < 100) return;
    lastUiUpdateRef.current = now;
    setState(next);
  }, []);

  const detection = useDetection({ enabled: true, sensitivity: settings.tunerSensitivity, a4Hz: settings.a4Hz, onFrame });
  const { status, error, supported, start, stop, audioContext } = detection;

  const begin = async (): Promise<void> => {
    sessionRef.current = new CalibrationSession({ clickCount: CLICK_COUNT });
    clicksScheduledRef.current = false;
    setState(null);
    setPhase('laeuft');
    await start();
  };

  // Klicks für die Latenzmessung planen, sobald der Schritt beginnt (auf der AudioContext-Uhr).
  const step = state?.step ?? null;
  useEffect(() => {
    if (step !== 'latenz' || clicksScheduledRef.current) return;
    const ctx = audioContext();
    const session = sessionRef.current;
    if (!ctx || !session) return;
    clicksScheduledRef.current = true;
    const interval = 60 / CLICK_BPM;
    const first = ctx.currentTime + COUNT_IN_SEC;
    for (let i = 0; i < CLICK_COUNT; i++) {
      const time = first + i * interval;
      playClick(ctx, time, i === 0, Math.max(0.5, settings.metronomeVolume));
      session.addClick(time);
    }
    // Klick-Zähler in der Oberfläche mitlaufen lassen.
    for (let i = 0; i < CLICK_COUNT; i++) {
      const delay = Math.max(0, (first + i * interval - ctx.currentTime) * 1000);
      clickTimersRef.current.push(window.setTimeout(() => setState((prev) => (prev && sessionRef.current ? sessionRef.current.state(first + i * interval) : prev)), delay));
    }
  }, [step, audioContext, settings.metronomeVolume]);

  useEffect(
    () => () => {
      for (const t of clickTimersRef.current) window.clearTimeout(t);
    },
    [],
  );

  // Nach dem letzten Schritt Mikrofon freigeben und Ergebnis anzeigen (ereignisgesteuert: Schrittwechsel aus dem Frame-Callback).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (step !== 'fertig' || phase === 'fertig') return;
    stop();
    setPhase('fertig');
  }, [step, phase, stop]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const skipStep = (): void => {
    const session = sessionRef.current;
    if (!session) return;
    session.skip();
    setState(session.state());
  };

  const profile = useMemo<CalibrationProfile | null>(() => {
    if (!state || state.step !== 'fertig') return null;
    const r = state.result;
    return {
      deviceKey: deviceKey(detection.sampleRate || 48000),
      createdAt: new Date().toISOString(),
      appVersion: __APP_VERSION__,
      sampleRate: detection.sampleRate || 48000,
      noiseFloorRms: r.noiseFloorRms,
      noiseFloorDb: r.noiseFloorDb,
      strumPeakRms: r.strumPeakRms,
      strumPeakDb: r.strumPeakDb,
      gateRms: r.gateRms,
      latencyMs: r.latency && r.latency.reliable ? Math.round(r.latency.medianMs) : null,
      latencySamplesMs: r.latencySamplesMs.map((v) => Math.round(v)),
    };
  }, [state, detection.sampleRate]);

  const save = async (): Promise<void> => {
    if (!profile) return;
    setSaving(true);
    await saveCalibration(profile);
    setSaving(false);
    navigate(returnTo, { replace: true });
  };

  const noise = profile ? noiseVerdict(profile.noiseFloorDb) : null;
  const level = profile ? levelVerdict(profile.strumPeakDb) : null;

  return (
    <div className="flex flex-col gap-4 pb-4">
      <PageHeader title="Mikrofon einrichten" subtitle="Dauert etwa eine Minute" back={returnTo} />

      {phase === 'intro' && (
        <Card tone="gold" className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed">Die App misst dein Mikrofon: Rauschen des Raums, Lautstärke der Gitarre und Verzögerung. So weiß sie später sicher, ob dein Ton da ist.</p>
          <ol className="flex flex-col gap-2 text-sm">
            {[
              ['Zwei Sekunden Ruhe', <Volume2 key="1" size={16} />],
              ['Einmal über alle Saiten', <Waves key="2" size={16} />],
              [`${CLICK_COUNT} Töne zum Klick`, <Timer key="3" size={16} />],
            ].map(([text, icon], i) => (
              <li key={i} className="flex items-center gap-2 text-text/90">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-gold">{icon}</span>
                {text}
              </li>
            ))}
          </ol>
          <Button variant="primary" size="xl" icon={<Mic size={22} />} onClick={() => void begin()} disabled={!supported} data-testid="calibration-start">
            Los geht's
          </Button>
          {!supported && <p className="text-sm text-bad">Dieser Browser unterstützt Mikrofon oder Audio-Analyse nicht.</p>}
        </Card>
      )}

      {phase === 'laeuft' && (
        <Card className="flex flex-col gap-3">
          {status === 'error' && error ? (
            <>
              <p className="font-semibold text-bad">Mikrofon nicht verfügbar</p>
              <p className="text-sm leading-relaxed">{error}</p>
              <Button variant="primary" onClick={() => void begin()}>
                Erneut versuchen
              </Button>
            </>
          ) : status !== 'listening' || !state ? (
            <p className="text-sm text-muted">Mikrofon wird gestartet …</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                Schritt {state.step === 'stille' ? 1 : state.step === 'anschlag' ? 2 : 3} von 3
              </p>
              <h2 className="text-xl font-bold leading-tight" data-testid="calibration-step">
                {STEP_TEXT[state.step].title}
              </h2>
              <p className="text-sm leading-relaxed text-muted">{STEP_TEXT[state.step].text}</p>
              <ProgressBar value={state.progress * 100} label="Fortschritt" />
              {state.step === 'anschlag' && (
                <p className={cn('text-sm font-semibold', state.strumDetected ? 'text-ok' : 'text-muted')}>{state.strumDetected ? 'Anschlag erkannt – klingen lassen …' : 'Warte auf den Anschlag …'}</p>
              )}
              {state.step === 'latenz' && (
                <p className="text-sm font-semibold tabular-nums">
                  Klick {Math.min(CLICK_COUNT, state.clicksPlayed)} / {CLICK_COUNT} · {state.latencyHits} Töne erkannt
                </p>
              )}
              <div className="mt-1 flex items-center gap-2">
                <Activity size={16} className="text-muted" aria-hidden />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-gold transition-[width] duration-75" style={{ width: `${Math.min(100, Math.max(0, (20 * Math.log10(Math.max(1e-5, detection.level)) + 60) / 0.6))}%` }} />
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={skipStep} className="self-end">
                Schritt überspringen
              </Button>
            </>
          )}
        </Card>
      )}

      {phase === 'fertig' && profile && (
        <>
          <Card tone="gold" className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ok/15 text-ok">
                <Check size={20} />
              </span>
              <h2 className="text-xl font-bold">Mikrofon eingerichtet</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Grundrauschen" value={formatDb(profile.noiseFloorDb)} hint={noise === 'ruhig' ? 'ruhiger Raum' : noise === 'ok' ? 'in Ordnung' : 'recht laut'} tone={noise === 'laut' ? 'default' : 'ok'} />
              <Stat label="Anschlag" value={formatDb(profile.strumPeakDb)} hint={level === 'gut' ? 'guter Pegel' : level === 'leise' ? 'eher leise – näher ans Schallloch' : 'sehr laut – etwas Abstand'} tone={level === 'gut' ? 'ok' : 'default'} />
              <Stat label="Mindestpegel" value={formatDb(20 * Math.log10(profile.gateRms))} hint="ab hier wird gehört" />
              <Stat label="Verzögerung" value={profile.latencyMs === null ? '–' : `${profile.latencyMs} ms`} hint={profile.latencyMs === null ? 'nicht gemessen' : `${profile.latencySamplesMs.length} Messungen`} />
            </div>
            {noise === 'laut' && <p className="text-sm text-warn">Der Raum ist laut. Für die Erkennung ist ein ruhigerer Ort besser – du kannst die Kalibrierung jederzeit wiederholen.</p>}
            <Button variant="primary" size="xl" loading={saving} onClick={() => void save()} data-testid="calibration-save">
              Speichern und weiter
            </Button>
            <Button variant="ghost" onClick={() => void begin()}>
              Noch einmal messen
            </Button>
          </Card>
        </>
      )}

      <p className="text-xs text-muted">Audio wird nur auf dem Gerät analysiert und nie übertragen. Die Kalibrierung gilt für dieses Gerät und diesen Browser.</p>
    </div>
  );
}
