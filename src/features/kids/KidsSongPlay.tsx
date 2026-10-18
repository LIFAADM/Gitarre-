import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { unlockAudio } from '@/core/audio/audioContext';
import { playClick } from '@/core/audio/metronome';
import { countWords } from '@/core/speech/phrases';
import { Fretboard } from '@/features/fretboard/Fretboard';
import { OnsetGate } from '@/features/listen/listenLogic';
import { useEngine } from '@/hooks/useEngine';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import { useSettings } from '@/hooks/useSettings';
import { sayNow } from '@/hooks/useSpeech';
import { KidsButton, KidsShell, StarRow } from './KidsShell';
import { NoteHighway } from './NoteHighway';
import { HighwayEngine, timelineFromBeats, type HighwayMode, type HighwayNote, type NoteResult } from './highwayEngine';
import { kidSong, midiOf, positionPhrase, starsFor, type KidSong } from './kidsData';
import { addKidsStars } from './kidsProgress';
import { cn } from '@/lib/cn';

type Mode = 'idle' | 'demo' | 'count' | 'play' | 'done';
const LEAD_IN_BEATS = 2;
const TEMPOS: { factor: number; emoji: string; label: string }[] = [
  { factor: 0.6, emoji: '🐢', label: 'Langsam' },
  { factor: 0.8, emoji: '🚶', label: 'Normal' },
  { factor: 1, emoji: '🐇', label: 'Schnell' },
];

/** Ein Kinderlied als Mitspiel-Bahn: Noten laufen auf die Trefflinie zu, gespielt wird an der Gitarre, das Mikrofon hört zu. */
export function KidsSongPlay() {
  const { songId = '' } = useParams();
  const navigate = useNavigate();
  const song = kidSong(songId);
  if (!song) {
    return (
      <KidsShell title="Lieder" emoji="🎵" instruction="Dieses Lied gibt es nicht.">
        <KidsButton emoji="🏠" label="Zurück" onClick={() => navigate('/kinder/lieder')} />
      </KidsShell>
    );
  }
  return <SongSession key={song.id} song={song} />;
}

function SongSession({ song }: { song: KidSong }) {
  const navigate = useNavigate();
  const engine = useEngine();
  const [settings] = useSettings();
  const [mode, setMode] = useState<Mode>('idle');
  const [playMode, setPlayMode] = useState<HighwayMode>('wait');
  const [tempoFactor, setTempoFactor] = useState(0.8);
  const [results, setResults] = useState<NoteResult[]>(() => song.notes.map(() => 'pending'));
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const [longWait, setLongWait] = useState(false);
  const highwayRef = useRef<HighwayEngine | null>(null);
  const demoStartRef = useRef<number | null>(null);
  const timers = useRef<number[]>([]);
  const gate = useRef(new OnsetGate());
  const waitingSinceRef = useRef<number | null>(null);
  const lastCueRef = useRef(0);
  const detection = usePitchDetection({ enabled: true, sensitivity: settings.tunerSensitivity, a4Hz: settings.a4Hz, minStableMs: 100 });

  const bpm = song.tempo * tempoFactor;
  const beatSec = 60 / bpm;
  const timeline: HighwayNote[] = useMemo(
    () => timelineFromBeats(song.notes.map((n) => ({ ...n, midi: midiOf(n.string, n.fret) })), bpm, LEAD_IN_BEATS * (60 / bpm)),
    [song.notes, bpm],
  );
  const totalSec = (timeline[timeline.length - 1]?.time ?? 0) + (timeline[timeline.length - 1]?.durationSec ?? 0);

  const clearTimers = (): void => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const stopAll = useCallback((): void => {
    clearTimers();
    engine.synth.dampAll(engine.ctx.currentTime, 0.05);
  }, [engine]);

  const getTime = useCallback((): number => {
    if (mode === 'demo' && demoStartRef.current !== null) return (performance.now() - demoStartRef.current) / 1000;
    if ((mode === 'play' || mode === 'done') && highwayRef.current) return highwayRef.current.time;
    if (mode === 'count') return 0;
    return 0;
  }, [mode]);

  /* ---------------------------------- Vorspielen ---------------------------------- */
  const demo = (): void => {
    void unlockAudio().then(() => {
      stopAll();
      setResults(song.notes.map(() => 'pending'));
      setMode('demo');
      const t0 = engine.ctx.currentTime + 0.1;
      demoStartRef.current = performance.now() + 100;
      for (const n of timeline) engine.synth.noteOn(n.midi, t0 + n.time, { string: n.string, velocity: 0.9, maxDurationSec: n.durationSec + 0.2 });
      timers.current.push(
        window.setTimeout(
          () => {
            setMode('idle');
            setCurrentIndex(null);
            demoStartRef.current = null;
          },
          (totalSec + 0.8) * 1000,
        ),
      );
    });
  };

  // Hervorhebung der aktuellen Note während des Vorspielens
  useEffect(() => {
    if (mode !== 'demo') return;
    let raf = 0;
    let last: number | null = null;
    const loop = (): void => {
      const t = getTime();
      let idx: number | null = null;
      for (const n of timeline) if (n.time <= t && t < n.time + n.durationSec) idx = n.index;
      if (idx !== last) {
        last = idx;
        setCurrentIndex(idx);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, getTime, timeline]);

  /* ----------------------------------- Spielen ----------------------------------- */
  const finish = useCallback(
    (hw: HighwayEngine): void => {
      detection.stop();
      setMode('done');
      const stars = starsFor(hw.hits, song.notes.length);
      void addKidsStars('lied', stars, song.id);
      void sayNow('kids', `Fertig! ${hw.hits} von ${song.notes.length} Tönen getroffen. ${stars === 3 ? 'Drei Sterne, wunderbar!' : stars === 2 ? 'Zwei Sterne, toll gespielt!' : stars === 1 ? 'Ein Stern. Noch mal?' : 'Probier es langsam noch einmal.'}`);
    },
    [detection, song.id, song.notes.length],
  );

  const start = async (): Promise<void> => {
    await unlockAudio();
    stopAll();
    setResults(song.notes.map(() => 'pending'));
    setHits(0);
    setCurrentIndex(null);
    setLongWait(false);
    gate.current.reset();
    try {
      await detection.start();
    } catch {
      // ohne Mikrofon bleibt die Weiter-Taste
    }
    setMode('count');
    // Einzähler: vier Klicks, mitgesprochen
    const t0 = engine.ctx.currentTime + 0.15;
    const words = countWords(4);
    words.forEach((w, i) => {
      playClick(engine.ctx, t0 + i * beatSec, i === 0, 0.5);
      timers.current.push(window.setTimeout(() => void sayNow('kids', w), Math.max(0, (0.15 + i * beatSec) * 1000 - 80)));
    });
    // Im Durchlaufmodus: Klick auf jedem Schlag, damit der Puls hörbar bleibt
    if (playMode === 'flow') {
      const beats = Math.ceil(totalSec / beatSec) + 1;
      for (let i = 0; i < beats; i++) playClick(engine.ctx, t0 + (4 + i) * beatSec, i % 4 === 0, 0.25);
    }
    timers.current.push(
      window.setTimeout(() => {
        highwayRef.current = new HighwayEngine(timeline, { mode: playMode, earlySec: 0.3, lateSec: 0.5, toleranceCents: 60 });
        waitingSinceRef.current = null;
        setMode('play');
      }, (0.15 + 4 * beatSec) * 1000),
    );
  };

  const stop = (): void => {
    detection.stop();
    stopAll();
    highwayRef.current = null;
    demoStartRef.current = null;
    setMode('idle');
    setCurrentIndex(null);
  };

  // Zeit voranbringen, Ereignisse der Engine in Anzeige umsetzen
  useEffect(() => {
    if (mode !== 'play') return;
    let raf = 0;
    const loop = (): void => {
      const hw = highwayRef.current;
      if (!hw) return;
      const events = hw.tick(performance.now() / 1000);
      for (const ev of events) {
        if (ev.type === 'wait') {
          setCurrentIndex(ev.index);
          waitingSinceRef.current = performance.now();
          lastCueRef.current = 0;
          setLongWait(false);
          const n = timeline[ev.index]!;
          void sayNow('kids', positionPhrase(n.string, n.fret));
        } else if (ev.type === 'miss') {
          setResults([...hw.results]);
          setCurrentIndex(hw.currentIndex);
        } else if (ev.type === 'end') {
          setResults([...hw.results]);
          finish(hw);
          return;
        }
      }
      if (playMode === 'flow') {
        const idx = hw.currentIndex;
        setCurrentIndex((prev) => (prev === idx ? prev : idx));
      }
      // Wartemodus: nach einigen Sekunden den erwarteten Ton leise vorspielen (Mikrofon pausiert dabei)
      if (hw.isWaiting && waitingSinceRef.current !== null) {
        const waited = performance.now() - waitingSinceRef.current;
        if (waited > 5000 && performance.now() - lastCueRef.current > 6000) {
          lastCueRef.current = performance.now();
          const n = timeline[hw.currentIndex ?? 0];
          if (n) {
            detection.pause(1300);
            gate.current.disarm(1);
            engine.synth.noteOn(n.midi, engine.ctx.currentTime + 0.02, { string: n.string, velocity: 0.7, maxDurationSec: 0.9 });
            timers.current.push(window.setTimeout(() => gate.current.reset(), 1300));
          }
        }
        if (waited > 10_000) setLongWait(true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, playMode, timeline, finish, detection, engine]);

  // Mikrofon → Engine (ereignisgesteuert)
  useEffect(() => {
    if (mode !== 'play') return;
    const hw = highwayRef.current;
    if (!hw) return;
    const now = performance.now();
    const pitch = detection.pitch;
    const armed = gate.current.update(detection.level, now, pitch !== null);
    if (!armed || !pitch || !pitch.stable) return;
    const ev = hw.onPitch(pitch.midi, pitch.cents);
    if (!ev) return;
    gate.current.disarm(detection.level);
    setResults([...hw.results]);
    setHits(hw.hits);
    setCurrentIndex(hw.currentIndex);
    waitingSinceRef.current = null;
    setLongWait(false);
  }, [detection.pitch, detection.level, mode]);

  const skip = (): void => {
    const hw = highwayRef.current;
    if (!hw) return;
    hw.skip();
    setResults([...hw.results]);
    setCurrentIndex(hw.currentIndex);
    waitingSinceRef.current = null;
    setLongWait(false);
    if (hw.currentIndex === null) {
      // letzte Note übersprungen → Ende abwarten (tick erledigt das)
    }
  };

  const current = currentIndex !== null ? song.notes[currentIndex] : undefined;
  const stars = starsFor(hits, song.notes.length);
  const showSkip = mode === 'play' && (detection.status === 'error' || longWait);

  return (
    <KidsShell title={song.title} emoji={song.emoji} instruction={`${song.title}. Tippe auf Vorspielen und hör zu. Dann tippe auf Spielen: Die Farben laufen auf die weiße Linie zu. Spiel den Ton an deiner Gitarre, wenn die Farbe die Linie erreicht.`}>
      <NoteHighway notes={timeline} results={results} getTime={getTime} currentIndex={currentIndex} />

      <div className="flex items-center justify-between text-lg font-extrabold">
        <span data-testid="kids-current-note" className="min-w-0 flex-1 truncate">
          {mode === 'count' ? 'Achtung …' : current ? positionPhrase(current.string, current.fret).replace(/\.$/, '') : mode === 'play' ? '…' : 'Bereit?'}
        </span>
        {(mode === 'play' || mode === 'done') && (
          <span className="text-ok" data-testid="kids-hits">
            ⭐ {hits} / {song.notes.length}
          </span>
        )}
      </div>

      {mode !== 'done' && (
        <div className="rounded-[1.5rem] border-2 border-white/10 bg-white/5 p-2">
          <div className="overflow-x-auto no-scrollbar">
            <Fretboard frets={5} compact leftHanded={settings.leftHanded} orientation="player-view" naming={settings.noteNaming} highlights={current ? [{ string: current.string, fret: current.fret, tone: 'gold', pulse: mode === 'play' }] : []} />
          </div>
        </div>
      )}

      {mode === 'done' ? (
        <div className="flex flex-col items-center gap-5 pt-2">
          <p className="text-3xl font-extrabold">🎉 Geschafft!</p>
          <StarRow stars={stars} size={56} />
          <KidsButton emoji="🔁" label="Noch mal" onClick={() => void start()} />
          <KidsButton emoji="🎵" label="Andere Lieder" color="#3fbf7f" onClick={() => navigate('/kinder/lieder')} />
        </div>
      ) : mode === 'idle' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <KidsButton emoji="▶️" label="Vorspielen" color="#3b8be8" onClick={demo} testId="kids-demo" />
            <KidsButton emoji="🎸" label="Spielen" onClick={() => void start()} testId="kids-play" />
          </div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Spielweise">
            <button type="button" onClick={() => setPlayMode('wait')} aria-pressed={playMode === 'wait'} className={cn('h-14 rounded-2xl text-base font-extrabold transition', playMode === 'wait' ? 'bg-white text-[#1a1830]' : 'bg-white/10 text-text')}>
              ⏸ Wartet auf dich
            </button>
            <button type="button" onClick={() => setPlayMode('flow')} aria-pressed={playMode === 'flow'} className={cn('h-14 rounded-2xl text-base font-extrabold transition', playMode === 'flow' ? 'bg-white text-[#1a1830]' : 'bg-white/10 text-text')}>
              🏃 Im Takt
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tempo">
            {TEMPOS.map((t) => (
              <button key={t.factor} type="button" onClick={() => setTempoFactor(t.factor)} aria-pressed={tempoFactor === t.factor} className={cn('flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-extrabold transition', tempoFactor === t.factor ? 'bg-white text-[#1a1830]' : 'bg-white/10 text-text')}>
                <span aria-hidden>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <KidsButton emoji="⏹" label="Stopp" color="#e5484d" onClick={stop} />
          {showSkip && (
            <button type="button" onClick={skip} data-testid="kids-next" className="h-12 rounded-2xl bg-white/10 text-sm font-bold text-muted">
              Diesen Ton überspringen (für Eltern)
            </button>
          )}
          {mode === 'play' && detection.status === 'error' && <p className="text-center text-sm text-muted">Kein Mikrofon: Dann hört GuitarCoach nicht zu. Bitte Mikrofon erlauben.</p>}
        </div>
      )}
    </KidsShell>
  );
}
