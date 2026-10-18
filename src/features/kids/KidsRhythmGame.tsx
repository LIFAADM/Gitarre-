import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { outputLatencySeconds, unlockAudio } from '@/core/audio/audioContext';
import { useEngine } from '@/hooks/useEngine';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import { useSettings } from '@/hooks/useSettings';
import { sayNow } from '@/hooks/useSpeech';
import { KidsButton, KidsShell, StarRow } from './KidsShell';
import { starsFor } from './kidsData';
import { addKidsStars } from './kidsProgress';
import { cn } from '@/lib/cn';

const BPM = 72;
const BEATS_PER_BAR = 4;
/** Takt 0 ist Einzähler, danach vier Takte werten. */
const SCORED_BARS = 4;
const TOTAL_BEATS = SCORED_BARS * BEATS_PER_BAR;
const TOLERANCE_SEC = 0.18;

type Mode = 'idle' | 'run' | 'done';

/** „Klatschen“: ein Ball hüpft im Takt, das Kind klatscht oder schlägt die Saiten an – Treffer werden gezählt. */
export function KidsRhythmGame() {
  const navigate = useNavigate();
  const engine = useEngine();
  const [settings] = useSettings();
  const [mode, setMode] = useState<Mode>('idle');
  const [hits, setHits] = useState(0);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const [bar, setBar] = useState(0);
  const ballRef = useRef<HTMLDivElement | null>(null);
  const hitKeys = useRef(new Set<number>());
  const lastLevel = useRef(0);
  const lastOnsetAt = useRef(0);
  const timers = useRef<number[]>([]);
  const detection = usePitchDetection({ enabled: true, sensitivity: settings.tunerSensitivity, a4Hz: settings.a4Hz, minStableMs: 60 });
  const { metronome } = engine;

  const finish = useCallback(
    (count: number): void => {
      metronome.stop();
      detection.stop();
      setMode('done');
      const stars = starsFor(count, TOTAL_BEATS);
      void addKidsStars('klatschen', stars);
      void sayNow('kids', `Fertig! ${count} von ${TOTAL_BEATS} Schlägen getroffen. ${stars === 3 ? 'Drei Sterne, du hast den Takt im Blut!' : stars === 2 ? 'Zwei Sterne, prima!' : 'Weiter üben, das wird!'}`);
    },
    [metronome, detection],
  );

  useEffect(
    () => () => {
      metronome.stop();
      for (const t of timers.current) window.clearTimeout(t);
    },
    [metronome],
  );

  /** Ein Anschlag/Klatscher: Abstand zum nächsten Schlag messen. */
  const registerHit = useCallback((): void => {
    if (mode !== 'run') return;
    const info = metronome.currentBeat(engine.ctx.currentTime);
    if (!info || info.bar < 1 || info.bar > SCORED_BARS) return;
    const beatSec = metronome.beatSeconds();
    const roundUp = info.progress >= 0.5;
    const offset = (roundUp ? info.progress - 1 : info.progress) * beatSec;
    const key = info.bar * BEATS_PER_BAR + info.beatInBar + (roundUp ? 1 : 0);
    const ok = Math.abs(offset) <= TOLERANCE_SEC && !hitKeys.current.has(key) && key < (SCORED_BARS + 1) * BEATS_PER_BAR;
    if (ok) {
      hitKeys.current.add(key);
      setHits((h) => h + 1);
    }
    setFlash(ok ? 'hit' : 'miss');
    timers.current.push(window.setTimeout(() => setFlash(null), 250));
  }, [mode, metronome, engine.ctx]);

  // Mikrofon: plötzlicher Pegelsprung = Klatschen oder Anschlag
  useEffect(() => {
    if (mode !== 'run') return;
    const level = detection.level;
    const now = performance.now();
    if (level > 0.012 && level > lastLevel.current * 2.5 && now - lastOnsetAt.current > 180) {
      lastOnsetAt.current = now;
      registerHit();
    }
    lastLevel.current = level;
  }, [detection.level, mode, registerHit]);

  // Ball-Animation und Taktzählung
  useEffect(() => {
    if (mode !== 'run') return;
    let raf = 0;
    let lastBar = -1;
    const loop = (): void => {
      const info = metronome.currentBeat(engine.ctx.currentTime - outputLatencySeconds());
      if (info) {
        const y = Math.abs(Math.sin(info.progress * Math.PI));
        if (ballRef.current) ballRef.current.style.transform = `translateY(${-(y * 140)}px) scale(${1 - y * 0.1})`;
        if (info.bar !== lastBar) {
          lastBar = info.bar;
          setBar(info.bar);
        }
        if (info.bar > SCORED_BARS) {
          finish(hitKeys.current.size);
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, metronome, engine.ctx, finish]);

  const start = async (): Promise<void> => {
    await unlockAudio();
    hitKeys.current.clear();
    setHits(0);
    setBar(0);
    try {
      await detection.start();
    } catch {
      // ohne Mikrofon: Trommel-Taste
    }
    metronome.setBpm(BPM);
    metronome.setTimeSignature(BEATS_PER_BAR, 4);
    metronome.setSubdivision(1);
    metronome.setAccentFirst(true);
    metronome.start();
    setMode('run');
    void sayNow('kids', 'Hör auf den Takt. Immer wenn der Ball unten ankommt: klatschen oder alle Saiten anschlagen!');
  };

  const stop = (): void => {
    metronome.stop();
    detection.stop();
    setMode('idle');
  };

  return (
    <KidsShell title="Klatschen" emoji="👏" instruction="Der Ball hüpft im Takt. Klatsche immer, wenn er unten ankommt. Oder schlag alle Saiten an. Tippe auf Los!">
      <div className="relative flex h-64 items-end justify-center overflow-hidden rounded-[2rem] border-2 border-white/10 bg-white/5">
        <div ref={ballRef} className={cn('mb-4 h-20 w-20 rounded-full shadow-2xl transition-colors', flash === 'hit' ? 'bg-ok' : flash === 'miss' ? 'bg-bad' : 'bg-gold')} style={{ willChange: 'transform' }} aria-hidden />
        <div className="absolute inset-x-8 bottom-3 h-1.5 rounded-full bg-white/20" aria-hidden />
        <div className="absolute left-4 top-3 text-lg font-extrabold text-muted">{mode === 'run' ? (bar === 0 ? 'Achtung …' : `Takt ${Math.min(bar, SCORED_BARS)} / ${SCORED_BARS}`) : ''}</div>
        <div className="absolute right-4 top-3 text-2xl font-extrabold text-ok" data-testid="kids-hits">
          {mode !== 'idle' ? `✅ ${hits}` : ''}
        </div>
      </div>

      {mode === 'done' ? (
        <div className="flex flex-col items-center gap-5 pt-2">
          <p className="text-2xl font-extrabold">
            {hits} von {TOTAL_BEATS} getroffen
          </p>
          <StarRow stars={starsFor(hits, TOTAL_BEATS)} size={56} />
          <KidsButton emoji="🔁" label="Noch mal" onClick={() => void start()} />
          <KidsButton emoji="🏠" label="Zurück" color="#3b8be8" onClick={() => navigate('/kinder')} />
        </div>
      ) : mode === 'run' ? (
        <>
          <KidsButton emoji="🥁" label="Trommel" color="#f08c2e" onClick={registerHit} className="h-28" testId="kids-drum" />
          <KidsButton emoji="⏹" label="Stopp" color="#e5484d" onClick={stop} />
        </>
      ) : (
        <KidsButton emoji="▶️" label="Los!" onClick={() => void start()} testId="kids-start" />
      )}
      {mode === 'run' && detection.status === 'error' && <p className="text-center text-sm text-muted">Ohne Mikrofon: im Takt auf die Trommel tippen.</p>}
    </KidsShell>
  );
}
