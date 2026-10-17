import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui';
import { unlockAudio } from '@/core/audio/audioContext';
import { buildPlaybackPlan } from '@/core/music/playback';
import { parseTabNotation } from '@/core/music/tabNotation';
import { TabView } from '@/features/player/TabView';
import { useEngine } from '@/hooks/useEngine';
import { useSettings } from '@/hooks/useSettings';

/**
 * Kleines, eigenständiges Tab-Beispiel für Erklärseiten: Anhören, Antippen einzelner Noten.
 * Nutzt den Synth direkt (unabhängig vom Haupt-Player).
 */
export function TabExample({ notation, tempo, timeSignature = [4, 4], caption }: { notation: string; tempo: number; timeSignature?: [number, number]; caption?: string }) {
  const engine = useEngine();
  const [settings] = useSettings();
  const score = useMemo(() => parseTabNotation(notation, { tempo, timeSignature }), [notation, tempo, timeSignature]);
  const plan = useMemo(() => buildPlaybackPlan(score), [score]);
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = (): void => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };

  useEffect(() => () => clear(), []);

  const stop = (): void => {
    clear();
    engine.synth.dampAll();
    setPlaying(false);
    setCurrent(null);
  };

  const play = async (): Promise<void> => {
    await unlockAudio();
    stop();
    setPlaying(true);
    const start = engine.ctx.currentTime + 0.1;
    for (const ev of plan.events) {
      if (ev.kind === 'note') engine.synth.noteOn(ev.midi, start + ev.sec, { string: ev.string, velocity: ev.velocity, maxDurationSec: ev.durationSec + 0.15, techniques: ev.techniques });
      else engine.synth.dampAll(start + ev.sec, 0.03);
    }
    for (const b of plan.beats.filter((x) => x.voice === 0)) {
      timers.current.push(window.setTimeout(() => setCurrent(b.index), Math.max(0, (b.sec + 0.1) * 1000)));
    }
    timers.current.push(
      window.setTimeout(
        () => {
          setPlaying(false);
          setCurrent(null);
        },
        (plan.totalSec + 0.3) * 1000,
      ),
    );
  };

  const tapBeat = (beatRef: number): void => {
    void unlockAudio().then(() => {
      const beat = plan.beats[beatRef];
      if (!beat) return;
      setCurrent(beatRef);
      for (const ev of plan.events) {
        if (ev.kind === 'note' && ev.beatRef === beatRef) engine.synth.noteOn(ev.midi, engine.ctx.currentTime + 0.02, { string: ev.string, maxDurationSec: Math.max(0.5, ev.durationSec) });
      }
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-2">
      <TabView plan={plan} tuning={score.tracks[0]!.tuning} currentBeatRef={current} currentInstance={null} loop={null} zoom={Math.max(1, settings.tabZoom)} showFingers={false} naming={settings.noteNaming} autoScroll={false} onBeatTap={tapBeat} />
      <div className="mt-1 flex items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted">{caption ?? 'Tippe auf eine Zahl, um den Ton zu hören.'}</p>
        <Button size="sm" variant={playing ? 'secondary' : 'primary'} icon={playing ? <Pause size={14} /> : <Play size={14} />} onClick={() => (playing ? stop() : void play())}>
          {playing ? 'Stopp' : 'Anhören'}
        </Button>
      </div>
    </div>
  );
}
