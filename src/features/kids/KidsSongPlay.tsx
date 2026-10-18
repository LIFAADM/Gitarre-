import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { unlockAudio } from '@/core/audio/audioContext';
import { Fretboard } from '@/features/fretboard/Fretboard';
import { OnsetGate, evaluatePitch } from '@/features/listen/listenLogic';
import { useEngine } from '@/hooks/useEngine';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import { useSettings } from '@/hooks/useSettings';
import { sayNow } from '@/hooks/useSpeech';
import { KidsButton, KidsShell, StarRow } from './KidsShell';
import { kidSong, kidString, midiOf, positionPhrase, starsFor } from './kidsData';
import { addKidsStars } from './kidsProgress';
import { cn } from '@/lib/cn';

type Mode = 'idle' | 'demo' | 'play' | 'done';

/** Ein Kinderlied: farbige Kreise statt Noten, Vorspielen, Mitspielen mit Mikrofon oder „Weiter“-Taste. */
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

function SongSession({ song }: { song: NonNullable<ReturnType<typeof kidSong>> }) {
  const navigate = useNavigate();
  const engine = useEngine();
  const [settings] = useSettings();
  const [mode, setMode] = useState<Mode>('idle');
  const [pos, setPos] = useState(0);
  const [skips, setSkips] = useState(0);
  const [hit, setHit] = useState(false);
  const timers = useRef<number[]>([]);
  const gate = useRef(new OnsetGate());
  const rowRef = useRef<HTMLDivElement | null>(null);
  const detection = usePitchDetection({ enabled: true, sensitivity: settings.tunerSensitivity, a4Hz: settings.a4Hz, minStableMs: 140 });
  const notes = song.notes;
  const current = notes[pos];

  const clearTimers = (): void => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  // Aktuellen Kreis in Sicht halten
  useEffect(() => {
    rowRef.current?.querySelector<HTMLElement>(`[data-pos="${pos}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [pos]);

  const stopAll = useCallback((): void => {
    clearTimers();
    engine.synth.dampAll(engine.ctx.currentTime, 0.05);
  }, [engine]);

  const demo = (): void => {
    void unlockAudio().then(() => {
      stopAll();
      setMode('demo');
      setPos(0);
      const t0 = engine.ctx.currentTime + 0.15;
      let acc = 0;
      const beatSec = 60 / song.tempo;
      notes.forEach((nt, i) => {
        const dur = nt.beats * beatSec;
        engine.synth.noteOn(midiOf(nt.string, nt.fret), t0 + acc, { string: nt.string, velocity: 0.9, maxDurationSec: dur + 0.2 });
        timers.current.push(window.setTimeout(() => setPos(i), Math.max(0, (acc + 0.15) * 1000)));
        acc += dur;
      });
      timers.current.push(
        window.setTimeout(
          () => {
            setMode('idle');
            setPos(0);
          },
          (acc + 0.6) * 1000,
        ),
      );
    });
  };

  const finish = useCallback(
    (skipped: number): void => {
      detection.stop();
      setMode('done');
      const stars = starsFor(notes.length - skipped, notes.length);
      void addKidsStars('lied', stars, song.id);
      void sayNow('kids', `Fertig! Du hast ${song.title} gespielt! ${stars === 3 ? 'Drei Sterne, wunderbar!' : stars === 2 ? 'Zwei Sterne, toll!' : 'Ein Stern. Noch mal üben?'}`);
    },
    [detection, notes.length, song.id, song.title],
  );

  const advance = useCallback(
    (skipped: number): void => {
      const next = pos + 1;
      if (next >= notes.length) {
        finish(skipped);
        return;
      }
      setPos(next);
      setHit(false);
      gate.current.reset();
      const nt = notes[next]!;
      void sayNow('kids', positionPhrase(nt.string, nt.fret), { interrupt: false });
    },
    [pos, notes, finish],
  );

  const play = async (): Promise<void> => {
    await unlockAudio();
    stopAll();
    setMode('play');
    setPos(0);
    setSkips(0);
    setHit(false);
    try {
      await detection.start();
    } catch {
      // ohne Mikrofon: „Weiter“-Taste
    }
    const first = notes[0]!;
    void sayNow('kids', `Los geht's! ${positionPhrase(first.string, first.fret)}`);
  };

  const stop = (): void => {
    detection.stop();
    stopAll();
    setMode('idle');
    setPos(0);
  };

  const skip = (): void => {
    const s = skips + 1;
    setSkips(s);
    advance(s);
  };

  // Mikrofon-Auswertung (ereignisgesteuert): passender Ton (auch eine Oktave daneben) zählt.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (mode !== 'play' || !current || hit) return;
    const now = performance.now();
    const pitch = detection.pitch;
    const armed = gate.current.update(detection.level, now, pitch !== null);
    if (!armed || !pitch || !pitch.stable) return;
    const v = evaluatePitch([midiOf(current.string, current.fret)], { midi: pitch.midi, cents: pitch.cents }, 60);
    if (v.kind !== 'match' && v.kind !== 'octave') return;
    gate.current.disarm(detection.level);
    setHit(true);
    timers.current.push(window.setTimeout(() => advance(skips), 350));
  }, [detection.pitch, detection.level, mode, current, hit, advance, skips]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const stars = starsFor(notes.length - skips, notes.length);

  return (
    <KidsShell title={song.title} emoji={song.emoji} instruction={`${song.title}. Tippe auf Vorspielen und hör zu. Dann tippe auf Mitspielen und spiel die Farben nach.`}>
      <div ref={rowRef} className="-mx-4 flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar" aria-label="Töne des Liedes">
        {notes.map((nt, i) => {
          const s = kidString(nt.string);
          const isCurrent = i === pos && mode !== 'idle';
          const played = mode === 'play' && i < pos;
          return (
            <div key={i} data-pos={i} className="flex shrink-0 flex-col items-center gap-1">
              <span
                className={cn('flex items-center justify-center rounded-full font-extrabold text-white shadow-lg transition-all', isCurrent ? 'h-20 w-20 text-3xl ring-4 ring-white' : 'h-14 w-14 text-xl', played && 'opacity-40', isCurrent && hit && 'ring-ok')}
                style={{ backgroundColor: s.color, width: isCurrent ? undefined : 56 + nt.beats * 4 }}
                aria-label={positionPhrase(nt.string, nt.fret)}
              >
                {nt.fret > 0 ? nt.fret : ''}
              </span>
              {isCurrent && <span className="text-xs font-bold text-muted">{nt.fret > 0 ? `${nt.fret}. Bund` : 'leer'}</span>}
            </div>
          );
        })}
      </div>

      {current && mode !== 'done' && (
        <div className="rounded-[1.75rem] border-2 border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-center text-lg font-extrabold" data-testid="kids-current-note">
            {mode === 'idle' ? 'Bereit?' : hit ? '✅ Super!' : positionPhrase(current.string, current.fret).replace(/\.$/, '')}
          </p>
          <div className="overflow-x-auto no-scrollbar">
            <Fretboard frets={5} compact leftHanded={settings.leftHanded} orientation="player-view" naming={settings.noteNaming} highlights={mode === 'idle' ? [] : [{ string: current.string, fret: current.fret, tone: hit ? 'ok' : 'gold', pulse: !hit }]} />
          </div>
        </div>
      )}

      {mode === 'done' ? (
        <div className="flex flex-col items-center gap-5 pt-2">
          <p className="text-3xl font-extrabold">🎉 Geschafft!</p>
          <StarRow stars={stars} size={56} />
          <KidsButton emoji="🔁" label="Noch mal" onClick={() => void play()} />
          <KidsButton emoji="🎵" label="Andere Lieder" color="#3fbf7f" onClick={() => navigate('/kinder/lieder')} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {mode === 'demo' ? <KidsButton emoji="⏹" label="Stopp" color="#e5484d" onClick={stop} /> : <KidsButton emoji="▶️" label="Vorspielen" color="#3b8be8" onClick={demo} disabled={mode === 'play'} testId="kids-demo" />}
          {mode === 'play' ? <KidsButton emoji="⏹" label="Stopp" color="#e5484d" onClick={stop} /> : <KidsButton emoji="🎤" label="Mitspielen" onClick={() => void play()} disabled={mode === 'demo'} testId="kids-play" />}
          {mode === 'play' && <KidsButton emoji="⏭" label="Weiter" color="#3fbf7f" className="col-span-2" onClick={skip} testId="kids-next" />}
        </div>
      )}
      {mode === 'play' && detection.status === 'error' && <p className="text-center text-sm text-muted">Ohne Mikrofon: nach jedem Ton auf „Weiter“ tippen.</p>}
    </KidsShell>
  );
}
