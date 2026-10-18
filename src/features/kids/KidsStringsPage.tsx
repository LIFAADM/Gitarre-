import { useEffect, useRef, useState } from 'react';
import { unlockAudio } from '@/core/audio/audioContext';
import { useEngine } from '@/hooks/useEngine';
import { sayNow } from '@/hooks/useSpeech';
import { KidsButton, KidsShell } from './KidsShell';
import { StringBars } from './StringBars';
import { KIDS_STRINGS, kidString, midiOf } from './kidsData';
import { addKidsStars } from './kidsProgress';

/** „Saiten“: Farben entdecken – antippen, hören, Namen hören. Ein Stern, wenn alle sechs gefunden sind. */
export function KidsStringsPage() {
  const engine = useEngine();
  const [tapped, setTapped] = useState<ReadonlySet<number>>(() => new Set());
  const [active, setActive] = useState<number | null>(null);
  const awarded = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );

  const sound = (n: number, delaySec = 0): void => {
    void unlockAudio().then(() => engine.synth.noteOn(midiOf(n, 0), engine.ctx.currentTime + 0.02 + delaySec, { string: n, velocity: 0.95, maxDurationSec: 2 }));
  };

  const tap = (n: number): void => {
    sound(n);
    setActive(n);
    timers.current.push(window.setTimeout(() => setActive((a) => (a === n ? null : a)), 900));
    const s = kidString(n);
    void sayNow('kids', `${s.colorName}! Die ${s.word} Saite.`);
    const already = tapped.has(n);
    const nextSize = already ? tapped.size : tapped.size + 1;
    if (!already) setTapped(new Set(tapped).add(n));
    if (nextSize === KIDS_STRINGS.length && !awarded.current) {
      awarded.current = true;
      void addKidsStars('saiten', 1);
      timers.current.push(window.setTimeout(() => void sayNow('kids', 'Super! Du hast alle sechs Saiten gefunden. Ein Stern für dich!'), 1500));
    }
  };

  const strum = (): void => {
    KIDS_STRINGS.forEach((s, i) => sound(s.number, i * 0.12));
    void sayNow('kids', 'Alle Saiten zusammen!');
  };

  return (
    <KidsShell title="Saiten" emoji="🌈" instruction="Tippe auf eine Farbe und hör zu. Die dicke rote Saite ist oben, die dünne lila Saite unten. Genau wie an deiner Gitarre.">
      <StringBars onTap={tap} active={active} done={tapped} />
      <KidsButton emoji="🎶" label="Alle zusammen" onClick={strum} color="#3fbf7f" />
      <p className="text-center text-sm text-muted">
        {tapped.size === KIDS_STRINGS.length ? 'Alle sechs gefunden!' : `${tapped.size} von 6 Saiten gefunden`}
      </p>
    </KidsShell>
  );
}
