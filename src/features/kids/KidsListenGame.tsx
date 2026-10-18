import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { unlockAudio } from '@/core/audio/audioContext';
import { centsBetween } from '@/core/music/notes';
import { STANDARD_TUNING, detectClosestString } from '@/core/music/tuning';
import { OnsetGate } from '@/features/listen/listenLogic';
import { useEngine } from '@/hooks/useEngine';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import { useSettings } from '@/hooks/useSettings';
import { sayNow } from '@/hooks/useSpeech';
import { KidsButton, KidsShell, StarRow } from './KidsShell';
import { StringBars } from './StringBars';
import { kidString, makeListenRound, midiOf, mulberry32, starsFor } from './kidsData';
import { addKidsStars } from './kidsProgress';
import { cn } from '@/lib/cn';

const ROUNDS = 5;
type Phase = 'idle' | 'listen' | 'answer' | 'done';

interface Feedback {
  emoji: string;
  text: string;
  tone: 'ok' | 'bad' | 'neutral';
}

/** „Welche Saite?“: Die App spielt eine Saite, das Kind zupft sie an der Gitarre (Mikrofon) oder tippt die Farbe an. */
export function KidsListenGame() {
  const navigate = useNavigate();
  const engine = useEngine();
  const [settings] = useSettings();
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [tries, setTries] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({ emoji: '👂', text: 'Tippe auf Los!', tone: 'neutral' });
  const rngRef = useRef<() => number>(mulberry32(1));
  const gate = useRef(new OnsetGate());
  const timers = useRef<number[]>([]);
  const roundCorrectRef = useRef(true);

  const detection = usePitchDetection({ enabled: true, sensitivity: settings.tunerSensitivity, a4Hz: settings.a4Hz, minStableMs: 150 });

  useEffect(() => {
    rngRef.current = mulberry32((performance.now() * 1000) | 0);
    const pending = timers.current;
    return () => {
      for (const t of pending) window.clearTimeout(t);
    };
  }, []);

  const later = (fn: () => void, ms: number): void => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const sound = (n: number, delaySec = 0): void => {
    engine.synth.noteOn(midiOf(n, 0), engine.ctx.currentTime + 0.05 + delaySec, { string: n, velocity: 0.95, maxDurationSec: 1.6 });
  };

  const playTarget = useCallback(
    (t: number[]): void => {
      void unlockAudio().then(() => t.forEach((n, i) => sound(n, i * 0.9)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine],
  );

  const startRound = useCallback(
    (r: number, previous: number[]): void => {
      const t = makeListenRound(r, rngRef.current, previous);
      setRound(r);
      setTarget(t);
      setIdx(0);
      setTries(0);
      setHighlight(null);
      roundCorrectRef.current = true;
      setPhase('listen');
      setFeedback({ emoji: '👂', text: 'Hör gut zu …', tone: 'neutral' });
      gate.current.disarm(1);
      playTarget(t);
      later(() => {
        void sayNow('kids', t.length === 1 ? 'Welche Saite war das? Zupf sie an deiner Gitarre oder tippe auf die Farbe.' : 'Das waren zwei Saiten. Spiel sie nacheinander.');
        setPhase('answer');
        setFeedback({ emoji: '❓', text: t.length === 1 ? 'Welche Saite war das?' : 'Zwei Saiten – nacheinander!', tone: 'neutral' });
        gate.current.reset();
      }, t.length * 900 + 400);
    },
    [playTarget],
  );

  const finish = useCallback(
    (correct: number): void => {
      setPhase('done');
      detection.stop();
      const stars = starsFor(correct, ROUNDS);
      void addKidsStars('hoeren', stars);
      const praise = stars === 3 ? 'Drei Sterne, super!' : stars === 2 ? 'Zwei Sterne, toll gemacht!' : stars === 1 ? 'Ein Stern. Weiter so!' : 'Beim nächsten Mal klappt es besser.';
      setFeedback({ emoji: '🎉', text: `${correct} von ${ROUNDS} richtig!`, tone: 'ok' });
      void sayNow('kids', `Fertig! Du hast ${correct} von ${ROUNDS} richtig. ${praise}`);
    },
    [detection],
  );

  const answer = useCallback(
    (n: number): void => {
      if (phase !== 'answer') return;
      const expected = target[idx];
      if (expected === undefined) return;
      const s = kidString(n);
      if (n === expected) {
        void unlockAudio().then(() => sound(n));
        if (idx + 1 >= target.length) {
          const correctNow = correctRounds + (roundCorrectRef.current ? 1 : 0);
          if (roundCorrectRef.current) setCorrectRounds(correctNow);
          setPhase('listen');
          setHighlight(null);
          setFeedback({ emoji: '🎉', text: `Richtig! Die ${s.word} Saite!`, tone: 'ok' });
          void sayNow('kids', `Richtig! Die ${s.word} Saite!`);
          later(() => {
            if (round >= ROUNDS) finish(correctNow);
            else startRound(round + 1, target);
          }, 2000);
        } else {
          setIdx(idx + 1);
          setFeedback({ emoji: '👍', text: 'Ja! Und jetzt die nächste.', tone: 'ok' });
          void sayNow('kids', 'Ja! Und jetzt die nächste.');
        }
        return;
      }
      roundCorrectRef.current = false;
      const nextTries = tries + 1;
      setTries(nextTries);
      const e = kidString(expected);
      if (nextTries >= 2) {
        setHighlight(expected);
        setFeedback({ emoji: '💡', text: `Schau: die ${e.word} Saite leuchtet.`, tone: 'bad' });
        void sayNow('kids', `Das war die ${s.word} Saite. Schau, die ${e.word} Saite leuchtet. Spiel die.`);
      } else {
        setFeedback({ emoji: '🙈', text: `Das war die ${s.word} Saite. Hör noch mal!`, tone: 'bad' });
        void sayNow('kids', `Das war die ${s.word} Saite. Hör noch mal!`);
        later(() => playTarget(target.slice(idx)), 1800);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, target, idx, tries, correctRounds, round, finish, startRound, playTarget],
  );

  // Mikrofon: stabil erkannte leere Saite als Antwort werten (ereignisgesteuert).
  useEffect(() => {
    if (phase !== 'answer') return;
    const now = performance.now();
    const pitch = detection.pitch;
    const armed = gate.current.update(detection.level, now, pitch !== null);
    if (!armed || !pitch || !pitch.stable) return;
    const s = detectClosestString(pitch.frequency, STANDARD_TUNING, settings.a4Hz);
    if (Math.abs(centsBetween(pitch.frequency, s.frequency)) > 150) return;
    gate.current.disarm(detection.level);
    answer(s.number);
  }, [detection.pitch, detection.level, phase, settings.a4Hz, answer]);

  const start = async (): Promise<void> => {
    await unlockAudio();
    setCorrectRounds(0);
    try {
      await detection.start();
    } catch {
      // ohne Mikrofon geht es per Antippen weiter
    }
    startRound(1, []);
  };

  const toneClass = { ok: 'bg-ok/20 border-ok/50', bad: 'bg-bad/20 border-bad/50', neutral: 'bg-white/5 border-white/10' }[feedback.tone];

  return (
    <KidsShell title="Welche Saite?" emoji="👂" instruction="Ich spiele dir eine Saite vor. Dann zupfst du die gleiche Saite an deiner Gitarre. Oder du tippst auf die Farbe. Tippe auf Los!">
      <div className={cn('flex items-center gap-4 rounded-[1.75rem] border-2 px-5 py-4', toneClass)} aria-live="polite">
        <span className="text-5xl" aria-hidden>
          {feedback.emoji}
        </span>
        <p className="flex-1 text-xl font-extrabold leading-tight" data-testid="kids-feedback">
          {feedback.text}
        </p>
      </div>

      {phase !== 'idle' && phase !== 'done' && (
        <div className="flex items-center justify-center gap-2" aria-label={`Runde ${round} von ${ROUNDS}`}>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <span key={i} className={cn('h-4 w-4 rounded-full', i + 1 < round ? 'bg-gold' : i + 1 === round ? 'bg-white' : 'bg-white/20')} />
          ))}
        </div>
      )}

      {phase === 'done' ? (
        <div className="flex flex-col items-center gap-5 pt-4">
          <StarRow stars={starsFor(correctRounds, ROUNDS)} size={56} />
          <KidsButton emoji="🔁" label="Noch mal" onClick={() => void start()} />
          <KidsButton emoji="🏠" label="Zurück" color="#3b8be8" onClick={() => navigate('/kinder')} />
        </div>
      ) : (
        <>
          <StringBars onTap={answer} active={highlight} disabled={phase !== 'answer'} compact />
          {phase === 'idle' ? (
            <KidsButton emoji="▶️" label="Los!" onClick={() => void start()} testId="kids-start" />
          ) : (
            <KidsButton emoji="🔊" label="Noch mal hören" color="#3b8be8" onClick={() => playTarget(target.slice(idx))} disabled={phase !== 'answer'} />
          )}
          {detection.status === 'error' && <p className="text-center text-sm text-muted">Ohne Mikrofon: einfach die Farbe antippen.</p>}
        </>
      )}
    </KidsShell>
  );
}
