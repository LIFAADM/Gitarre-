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
import { StringBars } from './StringBars';
import { isLessonUnlocked, kidsLesson, lessonAfter, pickCheckTarget, targetMidi, targetPhrase, type KidTarget, type KidsLesson, type KidsStep } from './kidsCurriculum';
import { mulberry32 } from './kidsData';
import { completeKidsLesson, useKidsProgress } from './kidsProgress';
import { cn } from '@/lib/cn';

const NOTE_GAP_SEC = 0.9;
const HELP_AFTER_MS = 8000;
const SKIP_AFTER_MS = 15_000;

/** Eine Lektion der Kinder-Schule: Erklären, Vormachen, Nachmachen, Üben, Verstehen – Schritt für Schritt mit Ansage. */
export function KidsLessonRunner() {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const progress = useKidsProgress();
  const lesson = kidsLesson(lessonId);
  if (!lesson) {
    return (
      <KidsShell title="Gitarrenschule" emoji="🎓" instruction="Diese Lektion gibt es nicht.">
        <KidsButton emoji="🏠" label="Zur Übersicht" onClick={() => navigate('/kinder/lernen')} />
      </KidsShell>
    );
  }
  if (!isLessonUnlocked(lesson.id, progress.lessonsDone)) {
    return (
      <KidsShell title={lesson.title} emoji="🔒" instruction="Diese Lektion ist noch zu. Mach erst die Lektion davor fertig.">
        <KidsButton emoji="🎓" label="Zur Übersicht" onClick={() => navigate('/kinder/lernen')} />
      </KidsShell>
    );
  }
  return <LessonSession key={lesson.id} lesson={lesson} />;
}

type Phase = 'ready' | 'step' | 'between' | 'done';

function LessonSession({ lesson }: { lesson: KidsLesson }) {
  const navigate = useNavigate();
  const engine = useEngine();
  const [settings] = useSettings();
  const [phase, setPhase] = useState<Phase>('ready');
  const [stepIdx, setStepIdx] = useState(0);
  const [targetIdx, setTargetIdx] = useState(0);
  const [repeatDone, setRepeatDone] = useState(0);
  const [checkRound, setCheckRound] = useState(0);
  const [checkTarget, setCheckTarget] = useState<KidTarget | null>(null);
  const [checkTries, setCheckTries] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  const [explainReady, setExplainReady] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [feedback, setFeedback] = useState<{ emoji: string; text: string } | null>(null);
  const [parentSkips, setParentSkips] = useState(0);
  const [longWait, setLongWait] = useState(false);
  const [stars, setStars] = useState(0);
  const timers = useRef<number[]>([]);
  const gate = useRef(new OnsetGate());
  const rng = useRef(mulberry32(42));
  const activeSince = useRef<number | null>(null);
  const helpedAt = useRef(0);
  const lastWrongAt = useRef(0);
  const detection = usePitchDetection({ enabled: true, sensitivity: settings.tunerSensitivity, a4Hz: settings.a4Hz, minStableMs: 120 });

  const step: KidsStep | undefined = lesson.steps[stepIdx];
  const later = (fn: () => void, ms: number): void => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => {
    rng.current = mulberry32((performance.now() * 1000) | 0);
    const pending = timers.current;
    return () => {
      for (const t of pending) window.clearTimeout(t);
    };
  }, []);

  /** Spielt Ziele vor; das Mikrofon pausiert so lange. */
  const playTargets = useCallback(
    (targets: readonly KidTarget[], onDone?: () => void): void => {
      void unlockAudio().then(() => {
        const totalMs = targets.length * NOTE_GAP_SEC * 1000 + 600;
        detection.pause(totalMs);
        gate.current.disarm(1);
        targets.forEach((tg, i) => engine.synth.noteOn(targetMidi(tg), engine.ctx.currentTime + 0.05 + i * NOTE_GAP_SEC, { string: tg.string, velocity: 0.9, maxDurationSec: 1.4 }));
        later(() => {
          gate.current.reset();
          onDone?.();
        }, totalMs);
      });
    },
    [detection, engine],
  );

  const expectedTarget = ((): KidTarget | null => {
    if (!step || phase !== 'step') return null;
    if (step.kind === 'imitate' || step.kind === 'practice') return step.targets[targetIdx] ?? null;
    if (step.kind === 'check') return checkTarget;
    return null;
  })();

  /** Schritt starten: ansagen, dann je nach Art vormachen oder auf das Kind warten. */
  const beginStep = useCallback(
    (idx: number): void => {
      const s = lesson.steps[idx];
      if (!s) return;
      setStepIdx(idx);
      setPhase('step');
      setTargetIdx(0);
      setRepeatDone(0);
      setCheckRound(0);
      setCheckTries(0);
      setCheckTarget(null);
      setHintVisible(s.kind !== 'check');
      setExplainReady(false);
      setShowDone(false);
      setFeedback(null);
      setLongWait(false);
      activeSince.current = null;
      helpedAt.current = 0;
      gate.current.reset();
      const spoken = sayNow('kids', s.speak);
      if (s.kind === 'explain') later(() => setExplainReady(true), 1500);
      if (s.kind === 'show') void spoken.then(() => playTargets(s.targets, () => setShowDone(true)));
      if (s.kind === 'imitate' || s.kind === 'practice') void spoken.then(() => (activeSince.current = performance.now()));
      if (s.kind === 'check') {
        void spoken.then(() => {
          const tg = pickCheckTarget(s.pool, rng.current);
          setCheckTarget(tg);
          playTargets([tg], () => (activeSince.current = performance.now()));
        });
      }
    },
    [lesson.steps, playTargets],
  );

  const finishLesson = useCallback((): void => {
    const earned = parentSkips === 0 ? 3 : parentSkips <= 2 ? 2 : 1;
    setStars(earned);
    setPhase('done');
    detection.stop();
    void completeKidsLesson(lesson.id, earned);
    const next = lessonAfter(lesson.id);
    void sayNow('kids', `Lektion geschafft! ${earned === 3 ? 'Drei Sterne, ganz allein!' : 'Gut gemacht!'} ${next ? `Als Nächstes kommt: ${next.title}.` : 'Du hast alle Lektionen geschafft!'}`);
  }, [parentSkips, lesson.id, detection]);

  const advance = useCallback((): void => {
    const nextIdx = stepIdx + 1;
    if (nextIdx >= lesson.steps.length) {
      finishLesson();
      return;
    }
    setPhase('between');
    later(() => beginStep(nextIdx), 900);
  }, [stepIdx, lesson.steps.length, finishLesson, beginStep]);

  const start = async (): Promise<void> => {
    await unlockAudio();
    try {
      await detection.start();
    } catch {
      // ohne Mikrofon: Eltern-Taste
    }
    beginStep(0);
  };

  /** Richtig gespielt. */
  const onCorrect = useCallback((): void => {
    if (!step) return;
    setFeedback({ emoji: '✅', text: 'Richtig!' });
    activeSince.current = performance.now();
    helpedAt.current = 0;
    setLongWait(false);
    if (step.kind === 'imitate' || step.kind === 'practice') {
      const nextTarget = targetIdx + 1;
      if (nextTarget < step.targets.length) {
        setTargetIdx(nextTarget);
        return;
      }
      const repeats = step.kind === 'practice' ? step.repeat : 1;
      const doneNow = repeatDone + 1;
      setRepeatDone(doneNow);
      setTargetIdx(0);
      if (doneNow < repeats) {
        void sayNow('kids', doneNow === repeats - 1 ? 'Noch einmal!' : 'Und noch mal!');
        return;
      }
      void sayNow('kids', 'Super!');
      later(advance, 1400);
      return;
    }
    if (step.kind === 'check') {
      const round = checkRound + 1;
      setCheckRound(round);
      setCheckTries(0);
      setHintVisible(false);
      if (round >= step.rounds) {
        void sayNow('kids', 'Alles richtig. Du hast es verstanden!');
        later(advance, 1600);
        return;
      }
      void sayNow('kids', 'Richtig! Und der nächste.').then(() => {
        const tg = pickCheckTarget(step.pool, rng.current, checkTarget ?? undefined);
        setCheckTarget(tg);
        playTargets([tg]);
      });
    }
  }, [step, targetIdx, repeatDone, checkRound, checkTarget, advance, playTargets]);

  /** Falsch gespielt (gedrosselt). */
  const onWrong = useCallback((): void => {
    if (!step || !expectedTarget) return;
    const now = performance.now();
    if (now - lastWrongAt.current < 3000) return;
    lastWrongAt.current = now;
    setFeedback({ emoji: '🙈', text: 'Nicht ganz.' });
    if (step.kind === 'check') {
      const tries = checkTries + 1;
      setCheckTries(tries);
      if (tries >= 2) {
        setHintVisible(true);
        void sayNow('kids', `Schau: ${targetPhrase(expectedTarget)} Die Saite leuchtet.`);
      } else {
        void sayNow('kids', 'Nicht ganz. Hör noch mal.').then(() => playTargets([expectedTarget]));
      }
      return;
    }
    void sayNow('kids', `Nicht ganz. ${targetPhrase(expectedTarget)}`);
  }, [step, expectedTarget, checkTries, playTargets]);

  // Mikrofon auswerten (ereignisgesteuert: reagiert auf neue Messwerte, daher setState im Effekt beabsichtigt)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!expectedTarget || phase !== 'step') return;
    const now = performance.now();
    const pitch = detection.pitch;
    const armed = gate.current.update(detection.level, now, pitch !== null);
    if (!armed || !pitch || !pitch.stable) return;
    const v = evaluatePitch([targetMidi(expectedTarget)], { midi: pitch.midi, cents: pitch.cents }, 70);
    gate.current.disarm(detection.level);
    if (v.kind === 'match' || v.kind === 'octave') onCorrect();
    else onWrong();
  }, [detection.pitch, detection.level, expectedTarget, phase, onCorrect, onWrong]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Hilfe bei langem Warten: Ziel noch einmal vorspielen, später Eltern-Taste anbieten
  useEffect(() => {
    if (!expectedTarget || phase !== 'step') return;
    const id = window.setInterval(() => {
      if (activeSince.current === null) return;
      const waited = performance.now() - activeSince.current;
      if (waited > HELP_AFTER_MS && performance.now() - helpedAt.current > HELP_AFTER_MS) {
        helpedAt.current = performance.now();
        void sayNow('kids', `${targetPhrase(expectedTarget)} Hör noch mal.`).then(() => playTargets([expectedTarget]));
      }
      if (waited > SKIP_AFTER_MS) setLongWait(true);
    }, 1000);
    return () => window.clearInterval(id);
  }, [expectedTarget, phase, playTargets]);

  const parentSkip = (): void => {
    setParentSkips((n) => n + 1);
    advance();
  };

  const nextLesson = lessonAfter(lesson.id);
  const highlightTarget = step?.kind === 'explain' ? (step.show ?? null) : expectedTarget && hintVisible ? expectedTarget : null;
  const showFretboard = highlightTarget !== null && highlightTarget.fret > 0;
  const stepLabel = step ? { explain: 'Erklären', show: 'Vormachen', imitate: 'Nachmachen', practice: 'Üben', check: 'Verstehen', song: 'Lied' }[step.kind] : '';
  const counter =
    step?.kind === 'practice' ? `${repeatDone + 1}. von ${step.repeat} Mal · Ton ${targetIdx + 1} von ${step.targets.length}` : step?.kind === 'imitate' && step.targets.length > 1 ? `Ton ${targetIdx + 1} von ${step.targets.length}` : step?.kind === 'check' ? `Frage ${Math.min(checkRound + 1, step.rounds)} von ${step.rounds}` : '';

  return (
    <KidsShell title={lesson.title} emoji={lesson.emoji} instruction={phase === 'ready' ? `${lesson.goal} Tippe auf Los, dann geht es los.` : (step?.speak ?? lesson.goal)}>
      {/* Schrittanzeige */}
      <div className="flex items-center justify-center gap-1.5" aria-label={`Schritt ${Math.min(stepIdx + 1, lesson.steps.length)} von ${lesson.steps.length}`}>
        {lesson.steps.map((s, i) => (
          <span key={i} className={cn('h-3 rounded-full transition-all', i < stepIdx || phase === 'done' ? 'w-3 bg-gold' : i === stepIdx && phase !== 'ready' ? 'w-8 bg-white' : 'w-3 bg-white/20')} title={s.kind} />
        ))}
      </div>

      {phase === 'ready' && (
        <>
          <div className="rounded-[1.75rem] border-2 border-white/10 bg-white/5 px-5 py-6 text-center">
            <p className="text-6xl" aria-hidden>
              {lesson.emoji}
            </p>
            <p className="mt-3 text-xl font-extrabold">{lesson.goal}</p>
          </div>
          <KidsButton emoji="▶️" label="Los!" onClick={() => void start()} testId="kids-lesson-start" />
        </>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-5 pt-2">
          <p className="text-3xl font-extrabold">🎉 Lektion geschafft!</p>
          <StarRow stars={stars} size={56} />
          {nextLesson ? <KidsButton emoji="▶️" label={`Weiter: ${nextLesson.title}`} onClick={() => navigate(`/kinder/lernen/${nextLesson.id}`)} testId="kids-lesson-next" /> : <KidsButton emoji="🎵" label="Zu den Liedern" onClick={() => navigate('/kinder/lieder')} />}
          <KidsButton emoji="🎓" label="Zur Übersicht" color="#3b8be8" onClick={() => navigate('/kinder/lernen')} />
        </div>
      )}

      {step && (phase === 'step' || phase === 'between') && (
        <>
          <div className="flex items-center gap-4 rounded-[1.75rem] border-2 border-white/10 bg-white/5 px-5 py-4" aria-live="polite">
            <span className="text-5xl" aria-hidden>
              {feedback?.emoji ?? step.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gold">{stepLabel}</p>
              <p className="text-xl font-extrabold leading-tight" data-testid="kids-step-text">
                {feedback?.text ?? step.text}
              </p>
              {counter && <p className="text-sm text-muted">{counter}</p>}
            </div>
          </div>

          {showFretboard && highlightTarget ? (
            <div className="rounded-[1.5rem] border-2 border-white/10 bg-white/5 p-2">
              <p className="mb-1 text-center text-base font-extrabold">{targetPhrase(highlightTarget).replace(/\.$/, '')}</p>
              <div className="overflow-x-auto no-scrollbar">
                <Fretboard frets={5} compact leftHanded={settings.leftHanded} orientation="player-view" naming={settings.noteNaming} highlights={[{ string: highlightTarget.string, fret: highlightTarget.fret, tone: 'gold', pulse: true }]} />
              </div>
            </div>
          ) : (
            <StringBars active={highlightTarget?.fret === 0 ? highlightTarget.string : null} disabled compact />
          )}

          {phase === 'step' && step.kind === 'explain' && <KidsButton emoji="👍" label="Weiter" onClick={advance} disabled={!explainReady} testId="kids-step-continue" />}
          {phase === 'step' && step.kind === 'show' && showDone && <KidsButton emoji="👍" label="Weiter" onClick={advance} testId="kids-step-continue" />}
          {phase === 'step' && step.kind === 'song' && <KidsButton emoji="🎵" label="Lied spielen" onClick={() => navigate(`/kinder/lieder/${step.songId}?lektion=${lesson.id}`)} testId="kids-step-song" />}
          {phase === 'step' && (step.kind === 'imitate' || step.kind === 'practice' || step.kind === 'check') && (longWait || detection.status === 'error') && (
            <button type="button" onClick={parentSkip} data-testid="kids-step-skip" className="h-12 rounded-2xl bg-white/10 text-sm font-bold text-muted">
              Schritt überspringen (für Eltern)
            </button>
          )}
          {detection.status === 'error' && (step.kind === 'imitate' || step.kind === 'practice' || step.kind === 'check') && <p className="text-center text-sm text-muted">Kein Mikrofon: Bitte erlauben, sonst kann GuitarCoach nicht zuhören.</p>}
        </>
      )}
    </KidsShell>
  );
}
