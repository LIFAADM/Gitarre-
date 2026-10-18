import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, Eye, EyeOff, Guitar, Hand, RotateCcw, Target, Volume2 } from 'lucide-react';
import { Badge, Button, Card, PageHeader, Segmented, Stat } from '@/components/ui';
import { unlockAudio } from '@/core/audio/audioContext';
import { FINGER_NAMES_DE, midiForPosition, positionsForMidi, suggestFinger } from '@/core/music/fretboard';
import { midiToFrequency, noteName, noteNameWithOctave, type NoteNaming } from '@/core/music/notes';
import { STANDARD_TUNING } from '@/core/music/tuning';
import { useEngine } from '@/hooks/useEngine';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { useSettings } from '@/hooks/useSettings';
import { Fretboard, type FretboardHighlight, type FretboardTap } from './Fretboard';

/**
 * Seite „Griffbrett“: Töne erkunden (tippen → hören → verstehen) und das Quiz
 * „Zeige mir den Ton“ für die erste Lage (Bünde 0–4).
 */

type Mode = 'explore' | 'quiz';

const FRETS_SHOWN = 12;
/** Höchster Bund im Quiz (erste Lage). */
const QUIZ_MAX_FRET = 4;
/** Nur eine Komfort-Einstellung dieses Geräts – nicht Teil der App-Einstellungen. */
const NOTE_NAMES_STORAGE_KEY = 'gc.fretboard.showNoteNames';

function readNoteNamesPreference(): boolean {
  try {
    return window.localStorage.getItem(NOTE_NAMES_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeNoteNamesPreference(value: boolean): void {
  try {
    window.localStorage.setItem(NOTE_NAMES_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // z. B. privater Modus – dann gilt die Einstellung nur für diese Sitzung
  }
}

/** „220,0 Hz“ – mit Dezimalkomma. */
function formatHz(hz: number): string {
  return `${hz.toFixed(1).replace('.', ',')} Hz`;
}

function openStringName(string: number, naming: NoteNaming): string {
  return noteName(STANDARD_TUNING.midi[string - 1]!, naming);
}

/** „Saite 3 (G)“ */
function stringLabel(string: number, naming: NoteNaming): string {
  return `Saite ${string} (${openStringName(string, naming)})`;
}

/** „Saite 2 (H), Bund 1“ bzw. „Saite 3 (G), leer“ */
function positionLabel(pos: FretboardTap, naming: NoteNaming): string {
  return `${stringLabel(pos.string, naming)}, ${pos.fret === 0 ? 'leer' : `Bund ${pos.fret}`}`;
}

/** Zufällige Zielposition in der ersten Lage, nie dieselbe wie zuvor. */
function randomTarget(previous: FretboardTap | null): FretboardTap {
  let pick: FretboardTap;
  let tries = 0;
  do {
    const string = 1 + Math.floor(Math.random() * 6);
    const fret = Math.floor(Math.random() * (QUIZ_MAX_FRET + 1));
    pick = { string, fret, midi: midiForPosition({ string, fret }) };
    tries++;
  } while (previous && previous.string === pick.string && previous.fret === pick.fret && tries < 20);
  return pick;
}

function ToggleChip({ pressed, onClick, icon, children, disabled, title }: { pressed: boolean; onClick: () => void; icon: ReactNode; children: ReactNode; disabled?: boolean; title?: string }) {
  return (
    <Button size="sm" variant={pressed ? 'outline' : 'secondary'} aria-pressed={pressed} onClick={onClick} icon={icon} disabled={disabled} title={title}>
      {children}
    </Button>
  );
}

export function FretboardPage() {
  const engine = useEngine();
  const [settings, updateSettings] = useSettings();
  const naming = settings.noteNaming;

  const [mode, setMode] = useState<Mode>('explore');
  const [showNoteNames, setShowNoteNames] = useState<boolean>(readNoteNamesPreference);

  // Erkunden
  const [selected, setSelected] = useState<FretboardTap | null>(null);

  // Quiz „Zeige mir den Ton“
  const [target, setTarget] = useState<FretboardTap | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState<FretboardTap | null>(null);
  const [wrongFlash, setWrongFlash] = useState<FretboardTap | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  usePracticeSession('fretboard', {
    details: () => (attempts > 0 ? { notesTotal: attempts, notesCorrect: correct } : undefined),
  });

  // Linkshänder: Sattel liegt rechts → zur ersten Lage scrollen.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = settings.leftHanded ? el.scrollWidth : 0;
  }, [settings.leftHanded]);

  // Nach „Richtig!“ kurz feiern, dann die nächste Aufgabe stellen.
  useEffect(() => {
    if (!solved) return;
    const timer = window.setTimeout(() => {
      setTarget(randomTarget(target));
      setSolved(null);
      setRevealed(false);
      setHint(null);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [solved, target]);

  // Rotes Aufblitzen bei einem falschen Tipp.
  useEffect(() => {
    if (!wrongFlash) return;
    const timer = window.setTimeout(() => setWrongFlash(null), 900);
    return () => window.clearTimeout(timer);
  }, [wrongFlash]);

  const play = (pos: FretboardTap): void => {
    void unlockAudio();
    engine.synth.noteOn(pos.midi, engine.ctx.currentTime, { string: pos.string, velocity: 0.9 });
  };

  const switchMode = (next: Mode): void => {
    setMode(next);
    setSelected(null);
    setSolved(null);
    setWrongFlash(null);
    setHint(null);
    setRevealed(false);
    if (next === 'quiz') setTarget(randomTarget(target));
  };

  const restartQuiz = (): void => {
    setCorrect(0);
    setAttempts(0);
    setHintsUsed(0);
    setSolved(null);
    setWrongFlash(null);
    setHint(null);
    setRevealed(false);
    setTarget(randomTarget(target));
  };

  const onExploreTap = (pos: FretboardTap): void => {
    setSelected(pos);
    play(pos);
  };

  const onQuizTap = (pos: FretboardTap): void => {
    if (!target || solved) return;
    play(pos);
    setAttempts((n) => n + 1);
    if (pos.string === target.string && pos.fret === target.fret) {
      setCorrect((n) => n + 1);
      setSolved(pos);
      setWrongFlash(null);
      setHint(null);
      return;
    }
    setWrongFlash(pos);
    const tapped = noteNameWithOctave(pos.midi, naming);
    const wanted = noteNameWithOctave(target.midi, naming);
    if (pos.midi === target.midi) {
      setHint(`Das ist auch ein ${tapped} – aber auf ${stringLabel(pos.string, naming)}. Gesucht ist die ${openStringName(target.string, naming)}-Saite.`);
    } else {
      setHint(`Das war ${tapped} (${positionLabel(pos, naming)}) – gesucht ist ${wanted} auf der ${openStringName(target.string, naming)}-Saite.`);
    }
  };

  const reveal = (): void => {
    if (!target) return;
    setRevealed(true);
    setHintsUsed((n) => n + 1);
    play(target);
  };

  // Markierungen auf dem Griffbrett
  const highlights: FretboardHighlight[] = [];
  if (mode === 'explore' && selected) {
    const finger = suggestFinger(selected.fret);
    highlights.push({
      string: selected.string,
      fret: selected.fret,
      tone: 'gold',
      ...(settings.showFingerNumbers && selected.fret >= 1 && selected.fret <= QUIZ_MAX_FRET ? { finger } : {}),
    });
    for (const p of positionsForMidi(selected.midi, STANDARD_TUNING, FRETS_SHOWN)) {
      if (p.string !== selected.string || p.fret !== selected.fret) highlights.push({ string: p.string, fret: p.fret, tone: 'muted' });
    }
  }
  if (mode === 'quiz' && target) {
    if (solved) highlights.push({ string: solved.string, fret: solved.fret, tone: 'ok', finger: suggestFinger(solved.fret) });
    else if (revealed) highlights.push({ string: target.string, fret: target.fret, tone: 'gold', finger: suggestFinger(target.fret), pulse: true });
    if (wrongFlash && !solved) highlights.push({ string: wrongFlash.string, fret: wrongFlash.fret, tone: 'bad', label: '✕' });
  }

  const samePitchElsewhere = selected ? positionsForMidi(selected.midi, STANDARD_TUNING, FRETS_SHOWN).filter((p) => p.string !== selected.string || p.fret !== selected.fret) : [];

  return (
    <>
      <PageHeader title="Griffbrett" subtitle="Tippe auf eine Position – du hörst den Ton" back="/werkzeuge" />
      <div className="space-y-4 pt-1">
        <Segmented
          ariaLabel="Modus"
          value={mode}
          options={[
            { value: 'explore', label: 'Erkunden' },
            { value: 'quiz', label: 'Zeige mir den Ton' },
          ]}
          onChange={switchMode}
        />

        <div ref={scrollRef} className="no-scrollbar -mx-4 overflow-x-auto">
          <div className="flex w-max min-w-full justify-center px-4 py-1">
            <Fretboard
              frets={FRETS_SHOWN}
              highlights={highlights}
              onTap={mode === 'explore' ? onExploreTap : onQuizTap}
              leftHanded={settings.leftHanded}
              orientation={settings.fretboardOrientation}
              naming={naming}
              showNoteNames={mode === 'explore' && showNoteNames}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ToggleChip
            pressed={showNoteNames}
            disabled={mode === 'quiz'}
            title={mode === 'quiz' ? 'Im Quiz sind die Tonnamen ausgeblendet' : undefined}
            icon={showNoteNames ? <Eye size={16} /> : <EyeOff size={16} />}
            onClick={() => {
              const next = !showNoteNames;
              setShowNoteNames(next);
              writeNoteNamesPreference(next);
            }}
          >
            Tonnamen anzeigen
          </ToggleChip>
          <ToggleChip pressed={settings.leftHanded} icon={<Hand size={16} />} onClick={() => void updateSettings({ leftHanded: !settings.leftHanded })}>
            Linkshänder
          </ToggleChip>
          <ToggleChip
            pressed={settings.fretboardOrientation === 'player-view'}
            icon={<Guitar size={16} />}
            title="Tiefe E-Saite oben – so wie du beim Spielen auf deine Gitarre schaust"
            onClick={() => void updateSettings({ fretboardOrientation: settings.fretboardOrientation === 'player-view' ? 'tab' : 'player-view' })}
          >
            Blick auf die Gitarre
          </ToggleChip>
        </div>

        {mode === 'explore' ? (
          selected ? (
            <Card tone="gold" className="animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Dein Ton</div>
                  <div className="text-5xl font-bold tracking-tight">{noteNameWithOctave(selected.midi, naming)}</div>
                  <div className="mt-1 text-sm text-muted tabular-nums">{formatHz(midiToFrequency(selected.midi, settings.a4Hz))}</div>
                </div>
                <Button variant="outline" icon={<Volume2 size={18} />} onClick={() => play(selected)}>
                  Nochmal anhören
                </Button>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Saite</dt>
                  <dd className="font-semibold">{stringLabel(selected.string, naming)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Bund</dt>
                  <dd className="font-semibold">{selected.fret === 0 ? 'Leere Saite' : `${selected.fret}. Bund`}</dd>
                </div>
                <div>
                  <dt className="text-muted">Finger</dt>
                  <dd className="font-semibold">
                    {selected.fret === 0
                      ? 'keiner – Saite leer anschlagen'
                      : selected.fret <= QUIZ_MAX_FRET
                        ? `${suggestFinger(selected.fret)} · ${FINGER_NAMES_DE[suggestFinger(selected.fret)]}`
                        : 'je nach Lage (außerhalb der ersten Lage)'}
                  </dd>
                </div>
              </dl>
              {samePitchElsewhere.length > 0 && (
                <p className="mt-3 text-sm text-muted">
                  Derselbe Ton liegt auch hier: {samePitchElsewhere.map((p) => `${stringLabel(p.string, naming)}, Bund ${p.fret}`).join(' · ')}
                </p>
              )}
            </Card>
          ) : (
            <Card tone="muted">
              <p className="text-sm text-muted">
                Tippe auf eine Stelle des Griffbretts. Du hörst den Ton und erfährst, wie er heißt, auf welcher Saite er liegt und mit welchem Finger du ihn greifst.
              </p>
              <p className="mt-2 text-sm text-muted">
                Saite 1 ist die dünne, hohe E-Saite (im Tab oben), Saite 6 die dicke, tiefe E-Saite. Links vom Sattel tippst du die leere Saite an.
              </p>
            </Card>
          )
        ) : (
          <>
            <Card tone="gold" className="animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Target size={14} className="text-gold" /> Aufgabe
              </div>
              {target && (
                <p className="mt-1 text-2xl font-bold">
                  Spiele {noteNameWithOctave(target.midi, naming)} auf der {openStringName(target.string, naming)}-Saite
                  <span className="ml-2 text-base font-medium text-muted">(Saite {target.string})</span>
                </p>
              )}
              {solved ? (
                <div className="mt-3 flex items-center gap-2 text-lg font-bold text-ok">
                  <CircleCheck size={22} /> Richtig!
                </div>
              ) : (
                <>
                  {hint && <p className="mt-3 rounded-2xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-text">{hint}</p>}
                  {revealed ? (
                    <p className="mt-3 text-sm text-muted">
                      Die goldene Markierung zeigt dir die Stelle{target && target.fret > 0 ? ` – greife mit dem ${FINGER_NAMES_DE[suggestFinger(target.fret)]} (${suggestFinger(target.fret)})` : ' – schlage die Saite leer an'}. Tippe sie jetzt an.
                    </p>
                  ) : (
                    <Button className="mt-3" full variant="secondary" icon={<Eye size={18} />} onClick={reveal}>
                      Zeige mir, wo ich meinen Finger hinsetzen muss
                    </Button>
                  )}
                </>
              )}
            </Card>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Richtig" value={correct} tone="ok" />
              <Stat label="Versuche" value={attempts} />
              <Stat label="Tipps" value={hintsUsed} />
            </div>
            <div className="flex items-center justify-between gap-3">
              {attempts > 0 ? (
                <Badge tone={correct === attempts ? 'ok' : 'neutral'}>
                  {correct} von {attempts} richtig
                </Badge>
              ) : (
                <span className="text-sm text-muted">Noch kein Versuch</span>
              )}
              <Button size="sm" variant="ghost" icon={<RotateCcw size={16} />} onClick={restartQuiz}>
                Neu starten
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
