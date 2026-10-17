import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BeatRef, PlaybackPlan } from '@/core/music/playback';
import type { Beat, Note } from '@/core/music/score';
import type { LoopRange } from '@/core/audio/tabPlayer';
import { noteName, type NoteNaming } from '@/core/music/notes';
import { beatTicks } from '@/core/music/durations';
import { layoutTab, stringY, type SystemLayout, type TabLayout, type TabMetrics } from './tabLayout';

/**
 * Tabulatur-Ansicht (SVG). Zeigt den entrollten Abspielplan als Systeme mit sechs Linien,
 * Bundzahlen, Rhythmusnotation, Pausen, Bindungen, Techniken, Fingersatz und Text.
 */

export interface TabViewHandle {
  /** Bewegt die Abspielmarke (ohne React-Rerender). */
  setPlayhead(beatRef: number | null, fraction: number): void;
  scrollToBeat(beatRef: number, behavior?: ScrollBehavior): void;
  scrollToInstance(instanceIndex: number, behavior?: ScrollBehavior): void;
}

export interface TabViewProps {
  plan: PlaybackPlan;
  tuning: number[];
  currentBeatRef: number | null;
  currentInstance: number | null;
  loop: LoopRange | null;
  zoom: number;
  showFingers: boolean;
  naming: NoteNaming;
  selectingLoop?: boolean;
  loopAnchor?: number | null;
  autoScroll?: boolean;
  onBeatTap?: (beatRef: number) => void;
  onBarTap?: (instanceIndex: number) => void;
  className?: string;
}

const COLORS = {
  string: '#6b6b75',
  barline: '#8d8d98',
  text: '#f3f1ea',
  muted: '#a8a69d',
  gold: '#d9a94e',
  goldText: '#1b1507',
  ok: '#4fbf84',
  surface: '#1e1e22',
  currentBar: 'rgba(217,169,78,0.09)',
  loop: 'rgba(79,191,132,0.14)',
  loopEdge: 'rgba(79,191,132,0.8)',
  anchor: 'rgba(217,169,78,0.25)',
};

function useContainerWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(360);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (): void => setWidth(Math.max(240, Math.floor(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export const TabView = forwardRef<TabViewHandle, TabViewProps>(function TabView(
  { plan, tuning, currentBeatRef, currentInstance, loop, zoom, showFingers, naming, selectingLoop, loopAnchor, autoScroll = true, onBeatTap, onBarTap, className },
  ref,
) {
  const [containerRef, width] = useContainerWidth();
  const layout = useMemo(() => layoutTab(plan, { width, zoom }), [plan, width, zoom]);
  const systemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const beatByRef = useMemo(() => new Map(plan.beats.map((b) => [b.index, b])), [plan]);

  const scrollToSystem = (systemIndex: number, behavior: ScrollBehavior = 'smooth'): void => {
    const el = systemRefs.current[systemIndex];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportTop = 120;
    const viewportBottom = window.innerHeight - 220;
    if (rect.top < viewportTop || rect.bottom > viewportBottom) {
      const target = window.scrollY + rect.top - Math.max(viewportTop, window.innerHeight * 0.28);
      window.scrollTo({ top: Math.max(0, target), behavior });
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      setPlayhead(beatRef, fraction) {
        const el = playheadRef.current;
        if (!el) return;
        if (beatRef === null) {
          el.style.opacity = '0';
          return;
        }
        const pos = layout.beatPositions.get(beatRef);
        const system = systemRefs.current[pos?.system ?? -1];
        if (!pos || !system) {
          el.style.opacity = '0';
          return;
        }
        const x = pos.x + Math.min(1, Math.max(0, fraction)) * pos.width;
        el.style.opacity = '1';
        el.style.transform = `translate(${x}px, ${system.offsetTop}px)`;
        el.style.height = `${layout.systems[pos.system]?.height ?? 0}px`;
      },
      scrollToBeat(beatRef, behavior) {
        const pos = layout.beatPositions.get(beatRef);
        if (pos) scrollToSystem(pos.system, behavior);
      },
      scrollToInstance(instanceIndex, behavior) {
        const sys = layout.instanceSystems.get(instanceIndex);
        if (sys !== undefined) scrollToSystem(sys, behavior);
      },
    }),
    [layout],
  );

  // Auto-Scroll beim Systemwechsel
  const lastSystemRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoScroll || currentBeatRef === null) return;
    const pos = layout.beatPositions.get(currentBeatRef);
    if (!pos) return;
    if (lastSystemRef.current !== pos.system) {
      lastSystemRef.current = pos.system;
      scrollToSystem(pos.system);
    }
  }, [currentBeatRef, autoScroll, layout]);

  return (
    <div ref={containerRef} className={`relative select-none ${className ?? ''}`}>
      {layout.systems.map((system) => (
        <div
          key={system.index}
          ref={(el) => {
            systemRefs.current[system.index] = el;
          }}
          style={{ marginBottom: layout.metrics.systemGap }}
        >
          <SystemSvg
            system={system}
            metrics={layout.metrics}
            width={width}
            plan={plan}
            beatByRef={beatByRef}
            tuning={tuning}
            currentBeatRef={currentBeatRef}
            currentInstance={currentInstance}
            loop={loop}
            showFingers={showFingers}
            naming={naming}
            selectingLoop={selectingLoop ?? false}
            loopAnchor={loopAnchor ?? null}
            onBeatTap={onBeatTap}
            onBarTap={onBarTap}
            layout={layout}
          />
        </div>
      ))}
      <div
        ref={playheadRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 w-[2px] rounded-full bg-gold shadow-[0_0_8px_rgba(217,169,78,0.9)] transition-opacity"
        style={{ opacity: 0 }}
      />
    </div>
  );
});

interface SystemSvgProps {
  system: SystemLayout;
  metrics: TabMetrics;
  width: number;
  plan: PlaybackPlan;
  beatByRef: Map<number, BeatRef>;
  tuning: number[];
  currentBeatRef: number | null;
  currentInstance: number | null;
  loop: LoopRange | null;
  showFingers: boolean;
  naming: NoteNaming;
  selectingLoop: boolean;
  loopAnchor: number | null;
  onBeatTap?: (beatRef: number) => void;
  onBarTap?: (instanceIndex: number) => void;
  layout: TabLayout;
}

function SystemSvg({ system, metrics: m, width, plan, beatByRef, tuning, currentBeatRef, currentInstance, loop, showFingers, naming, selectingLoop, loopAnchor, onBeatTap, onBarTap, layout }: SystemSvgProps) {
  const stringCount = Math.max(4, tuning.length);
  const yTop = stringY(m, 1);
  const yBottom = stringY(m, stringCount);
  const height = system.height + (stringCount - 6) * m.stringGap;
  const left = system.bars[0]?.x ?? m.margin;
  const right = system.bars.length ? system.bars[system.bars.length - 1]!.x + system.bars[system.bars.length - 1]!.width : width - m.margin;
  const rhythmY = yBottom + 10 * m.zoom;
  const stemBottom = rhythmY + 20 * m.zoom;
  const textY = stemBottom + 15 * m.zoom;
  const fontFamily = 'inherit';

  const elements: ReactNode[] = [];
  const overlays: ReactNode[] = [];
  const hits: ReactNode[] = [];

  // Saitenlinien
  for (let s = 1; s <= stringCount; s++) {
    const y = stringY(m, s);
    elements.push(<line key={`str-${s}`} x1={left} x2={right} y1={y} y2={y} stroke={COLORS.string} strokeWidth={1 + (s - 1) * 0.12} />);
  }

  system.bars.forEach((bar, barPos) => {
    const inst = plan.barInstances[bar.instanceIndex]!;
    const inLoop = loop !== null && bar.instanceIndex >= loop.startInstance && bar.instanceIndex <= loop.endInstance;
    if (inLoop) {
      overlays.unshift(<rect key={`loop-${bar.instanceIndex}`} x={bar.x} y={yTop - 14 * m.zoom} width={bar.width} height={yBottom - yTop + 28 * m.zoom} fill={COLORS.loop} />);
      if (bar.instanceIndex === loop!.startInstance) overlays.push(<rect key={`loop-a-${bar.instanceIndex}`} x={bar.x} y={yTop - 14 * m.zoom} width={3} height={yBottom - yTop + 28 * m.zoom} fill={COLORS.loopEdge} />);
      if (bar.instanceIndex === loop!.endInstance) overlays.push(<rect key={`loop-b-${bar.instanceIndex}`} x={bar.x + bar.width - 3} y={yTop - 14 * m.zoom} width={3} height={yBottom - yTop + 28 * m.zoom} fill={COLORS.loopEdge} />);
    }
    if (currentInstance === bar.instanceIndex) {
      overlays.unshift(<rect key={`cur-${bar.instanceIndex}`} x={bar.x} y={yTop - 14 * m.zoom} width={bar.width} height={yBottom - yTop + 28 * m.zoom} fill={COLORS.currentBar} rx={6} />);
    }
    if (selectingLoop && loopAnchor === bar.instanceIndex) {
      overlays.push(<rect key={`anchor-${bar.instanceIndex}`} x={bar.x + 1} y={yTop - 16 * m.zoom} width={bar.width - 2} height={yBottom - yTop + 32 * m.zoom} fill={COLORS.anchor} stroke={COLORS.gold} strokeDasharray="4 3" rx={6} />);
    }

    // Taktstriche
    elements.push(<line key={`bl-${bar.instanceIndex}`} x1={bar.x} x2={bar.x} y1={yTop} y2={yBottom} stroke={COLORS.barline} strokeWidth={barPos === 0 ? 2 : 1.2} />);
    if (barPos === system.bars.length - 1) {
      const isLast = bar.instanceIndex === plan.barInstances.length - 1;
      elements.push(<line key={`bl-end-${bar.instanceIndex}`} x1={bar.x + bar.width} x2={bar.x + bar.width} y1={yTop} y2={yBottom} stroke={COLORS.barline} strokeWidth={isLast ? 3 : 1.2} />);
      if (isLast) elements.push(<line key={`bl-end2-${bar.instanceIndex}`} x1={bar.x + bar.width - 5} x2={bar.x + bar.width - 5} y1={yTop} y2={yBottom} stroke={COLORS.barline} strokeWidth={1.2} />);
    }

    // Taktnummer, Abschnitt, Tempo, Taktart
    const barNumberY = yTop - 20 * m.zoom;
    elements.push(
      <text key={`bn-${bar.instanceIndex}`} x={bar.x + 3} y={barNumberY} fontSize={9.5 * m.zoom} fill={COLORS.muted} fontFamily={fontFamily}>
        {bar.barIndex + 1}
      </text>,
    );
    const section = inst.section;
    if (section) {
      elements.push(
        <text key={`sec-${bar.instanceIndex}`} x={bar.x + 14 * m.zoom} y={barNumberY} fontSize={10.5 * m.zoom} fontWeight={700} fill={COLORS.gold} fontFamily={fontFamily}>
          {section}
        </text>,
      );
    }
    if (bar.tempo !== undefined && (barPos === 0 || bar.instanceIndex === 0 || tempoChanged(plan, bar.instanceIndex))) {
      elements.push(
        <text key={`tempo-${bar.instanceIndex}`} x={bar.x + bar.width - 4} y={barNumberY} fontSize={9.5 * m.zoom} fill={COLORS.muted} textAnchor="end" fontFamily={fontFamily}>
          ♩ = {Math.round(bar.tempo)}
        </text>,
      );
    }
    if (bar.showTimeSignature) {
      const tx = bar.x + m.barPadLeft + m.timeSigWidth / 2 - 4 * m.zoom;
      const midY = (yTop + yBottom) / 2;
      elements.push(
        <g key={`ts-${bar.instanceIndex}`} fontFamily={fontFamily} fontWeight={700} fill={COLORS.text} textAnchor="middle">
          <text x={tx} y={midY - 3 * m.zoom} fontSize={17 * m.zoom}>
            {bar.timeSignature.numerator}
          </text>
          <text x={tx} y={midY + 15 * m.zoom} fontSize={17 * m.zoom}>
            {bar.timeSignature.denominator}
          </text>
        </g>,
      );
    }

    // Beats
    const grid = beatTicks(inst.timeSignature.numerator, inst.timeSignature.denominator);
    const voice0 = bar.beats.filter((b) => b.voice === 0);
    renderBeams(elements, voice0, beatByRef, inst.startTick, grid, rhythmY, stemBottom, m);

    for (const bl of bar.beats) {
      const ref = beatByRef.get(bl.beatRef);
      if (!ref) continue;
      const beat = ref.beat;
      const isCurrent = currentBeatRef === bl.beatRef;
      const cx = bl.x + Math.min(bl.width, 26 * m.zoom) / 2 + 2 * m.zoom;
      if (beat.isRest) {
        if (ref.voice === 0) elements.push(renderRest(beat, cx, rhythmY, m, `rest-${bl.beatRef}`));
      } else {
        if (isCurrent) {
          elements.push(
            <rect key={`curbeat-${bl.beatRef}`} x={cx - 11 * m.zoom} y={yTop - 10 * m.zoom} width={22 * m.zoom} height={yBottom - yTop + 20 * m.zoom} rx={6 * m.zoom} fill={COLORS.gold} opacity={0.95} />,
          );
        }
        for (const note of beat.notes) {
          const y = stringY(m, note.string);
          const label = note.techniques?.includes('dead') ? 'x' : String(note.fret);
          const w = (label.length * 7.5 + 5) * m.zoom;
          if (!isCurrent) elements.push(<rect key={`bg-${bl.beatRef}-${note.string}`} x={cx - w / 2} y={y - 7 * m.zoom} width={w} height={14 * m.zoom} fill={COLORS.surface} />);
          elements.push(
            <text
              key={`fr-${bl.beatRef}-${note.string}`}
              x={cx}
              y={y + 4.5 * m.zoom}
              fontSize={m.fontSize}
              fontWeight={700}
              textAnchor="middle"
              fill={isCurrent ? COLORS.goldText : note.tieFromPrevious ? COLORS.muted : COLORS.text}
              fontFamily={fontFamily}
              opacity={note.tieFromPrevious ? 0.75 : 1}
            >
              {note.tieFromPrevious ? `(${label})` : label}
            </text>,
          );
          if (note.techniques?.includes('harmonic')) {
            elements.push(<rect key={`harm-${bl.beatRef}-${note.string}`} x={cx - 8 * m.zoom} y={y - 8 * m.zoom} width={16 * m.zoom} height={16 * m.zoom} fill="none" stroke={COLORS.gold} transform={`rotate(45 ${cx} ${y})`} />);
          }
          if (showFingers && note.fret > 0 && note.finger && !note.tieFromPrevious) {
            if (beat.notes.length === 1) {
              elements.push(
                <g key={`fg-${bl.beatRef}-${note.string}`}>
                  <circle cx={cx} cy={yTop - 13 * m.zoom} r={5.5 * m.zoom} fill="none" stroke={COLORS.gold} strokeWidth={1} />
                  <text x={cx} y={yTop - 10 * m.zoom} fontSize={8 * m.zoom} textAnchor="middle" fill={COLORS.gold} fontFamily={fontFamily} fontWeight={700}>
                    {note.finger}
                  </text>
                </g>,
              );
            } else {
              elements.push(
                <text key={`fg-${bl.beatRef}-${note.string}`} x={cx + w / 2 + 1} y={y - 1} fontSize={7 * m.zoom} fill={COLORS.gold} fontFamily={fontFamily} fontWeight={700}>
                  {note.finger}
                </text>,
              );
            }
          }
          // Techniken
          const techs = note.techniques ?? [];
          const next = nextNoteOnString(plan, ref, note.string);
          const nextPos = next ? layout.beatPositions.get(next.ref.index) : undefined;
          const nextX = nextPos && nextPos.system === system.index ? nextPos.x + Math.min(nextPos.width, 26 * m.zoom) / 2 + 2 * m.zoom : null;
          if (note.tieToNext) {
            const endX = nextX ?? bar.x + bar.width;
            elements.push(<path key={`tie-${bl.beatRef}-${note.string}`} d={`M ${cx + 6 * m.zoom} ${y + 8 * m.zoom} Q ${(cx + endX) / 2} ${y + 17 * m.zoom} ${endX - 6 * m.zoom} ${y + 8 * m.zoom}`} fill="none" stroke={COLORS.muted} strokeWidth={1.2} />);
          }
          if (next && (next.note.techniques?.includes('hammer-on') || next.note.techniques?.includes('pull-off')) && nextX !== null) {
            const letter = next.note.techniques.includes('hammer-on') ? 'H' : 'P';
            elements.push(
              <g key={`hp-${bl.beatRef}-${note.string}`}>
                <path d={`M ${cx + 5 * m.zoom} ${y - 8 * m.zoom} Q ${(cx + nextX) / 2} ${y - 17 * m.zoom} ${nextX - 5 * m.zoom} ${y - 8 * m.zoom}`} fill="none" stroke={COLORS.muted} strokeWidth={1.2} />
                <text x={(cx + nextX) / 2} y={y - 12 * m.zoom} fontSize={8.5 * m.zoom} textAnchor="middle" fill={COLORS.text} fontFamily={fontFamily} fontWeight={700}>
                  {letter}
                </text>
              </g>,
            );
          }
          if (techs.includes('slide') && nextX !== null && next) {
            const up = next.note.fret >= note.fret;
            elements.push(<line key={`sl-${bl.beatRef}-${note.string}`} x1={cx + 7 * m.zoom} y1={y + (up ? 5 : -5) * m.zoom} x2={nextX - 7 * m.zoom} y2={y + (up ? -5 : 5) * m.zoom} stroke={COLORS.text} strokeWidth={1.3} />);
          }
          if (techs.includes('vibrato')) {
            elements.push(
              <text key={`vib-${bl.beatRef}-${note.string}`} x={cx + 9 * m.zoom} y={y - 6 * m.zoom} fontSize={10 * m.zoom} fill={COLORS.text} fontFamily={fontFamily}>
                ~~
              </text>,
            );
          }
          if (techs.includes('bend')) {
            elements.push(
              <text key={`bend-${bl.beatRef}-${note.string}`} x={cx + 8 * m.zoom} y={y - 7 * m.zoom} fontSize={8.5 * m.zoom} fill={COLORS.gold} fontFamily={fontFamily} fontWeight={700}>
                b
              </text>,
            );
          }
        }
        const anyPm = beat.notes.some((n) => n.techniques?.includes('palm-mute'));
        if (anyPm) {
          elements.push(
            <text key={`pm-${bl.beatRef}`} x={cx} y={yTop - 24 * m.zoom + 14 * m.zoom} fontSize={7.5 * m.zoom} textAnchor="middle" fill={COLORS.muted} fontFamily={fontFamily}>
              P.M.
            </text>,
          );
        }
        if (beat.notes.some((n) => n.techniques?.includes('let-ring'))) {
          elements.push(
            <text key={`lr-${bl.beatRef}`} x={cx} y={yBottom + 8 * m.zoom} fontSize={7 * m.zoom} textAnchor="middle" fill={COLORS.muted} fontFamily={fontFamily}>
              let ring
            </text>,
          );
        }
      }
      if (beat.text && ref.voice === 0) {
        elements.push(
          <text key={`txt-${bl.beatRef}`} x={cx} y={textY} fontSize={10 * m.zoom} textAnchor="middle" fill={COLORS.muted} fontFamily={fontFamily}>
            {beat.text}
          </text>,
        );
      }
      // Trefferfläche
      if (onBeatTap && !selectingLoop) {
        hits.push(
          <rect
            key={`hit-${bl.beatRef}`}
            x={bl.x}
            y={0}
            width={Math.max(bl.width, 16)}
            height={height}
            fill="transparent"
            role="button"
            tabIndex={-1}
            aria-label={beat.isRest ? 'Pause' : `Note ${beat.notes.map((n) => `${noteName(n.midi, naming)} Saite ${n.string} Bund ${n.fret}`).join(', ')}`}
            style={{ cursor: 'pointer' }}
            onClick={() => onBeatTap(bl.beatRef)}
          />,
        );
      }
    }
    if (selectingLoop && onBarTap) {
      hits.push(
        <rect
          key={`barhit-${bar.instanceIndex}`}
          x={bar.x}
          y={0}
          width={bar.width}
          height={height}
          fill="transparent"
          role="button"
          tabIndex={-1}
          aria-label={`Takt ${bar.barIndex + 1} auswählen`}
          style={{ cursor: 'pointer' }}
          onClick={() => onBarTap(bar.instanceIndex)}
        />,
      );
    }
  });

  // Saitennamen am linken Rand des ersten Systems (klein)
  if (system.index === 0) {
    for (let s = 1; s <= stringCount; s++) {
      const midi = tuning[s - 1];
      if (midi === undefined) continue;
      elements.push(
        <text key={`sn-${s}`} x={left - 1} y={stringY(m, s) + 3 * m.zoom} fontSize={7.5 * m.zoom} fill={COLORS.muted} textAnchor="end" fontFamily={fontFamily}>
          {noteName(midi, naming)}
        </text>,
      );
    }
  }

  return (
    <svg className="tab-svg block" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Tabulatur, Zeile ${system.index + 1}`}>
      {overlays}
      {elements}
      {hits}
    </svg>
  );
}

function tempoChanged(plan: PlaybackPlan, instanceIndex: number): boolean {
  const inst = plan.barInstances[instanceIndex];
  const prev = plan.barInstances[instanceIndex - 1];
  return !!inst && !!prev && inst.tempo !== prev.tempo;
}

function nextNoteOnString(plan: PlaybackPlan, ref: BeatRef, string: number): { ref: BeatRef; note: Note } | null {
  for (let i = ref.index + 1; i < plan.beats.length; i++) {
    const b = plan.beats[i]!;
    if (b.voice !== ref.voice) continue;
    if (b.isRest) return null;
    const note = b.beat.notes.find((n) => n.string === string);
    if (note) return { ref: b, note };
    if (b.tick > ref.endTick + 1) return null;
  }
  return null;
}

function renderRest(beat: Beat, cx: number, y: number, m: TabMetrics, key: string): ReactNode {
  const z = m.zoom;
  const base = beat.duration.base;
  const color = COLORS.muted;
  const dot = beat.duration.dots ? <circle cx={cx + 9 * z} cy={y + 8 * z} r={1.6 * z} fill={color} /> : null;
  if (base === 1) {
    return (
      <g key={key}>
        <rect x={cx - 5 * z} y={y + 2 * z} width={10 * z} height={4 * z} fill={color} />
        {dot}
      </g>
    );
  }
  if (base === 2) {
    return (
      <g key={key}>
        <rect x={cx - 5 * z} y={y + 6 * z} width={10 * z} height={4 * z} fill={color} />
        {dot}
      </g>
    );
  }
  if (base === 4) {
    return (
      <g key={key}>
        <path d={`M ${cx - 2 * z} ${y} l ${4 * z} ${5 * z} l ${-4 * z} ${5 * z} l ${4 * z} ${5 * z} q ${-5 * z} ${-1 * z} ${-3 * z} ${4 * z}`} fill="none" stroke={color} strokeWidth={1.6 * z} strokeLinejoin="round" />
        {dot}
      </g>
    );
  }
  const flags = base === 8 ? 1 : base === 16 ? 2 : 3;
  return (
    <g key={key}>
      <line x1={cx + 4 * z} y1={y + 2 * z} x2={cx - 2 * z} y2={y + 18 * z} stroke={color} strokeWidth={1.4 * z} />
      {Array.from({ length: flags }, (_, i) => (
        <circle key={i} cx={cx - 1 * z} cy={y + 4 * z + i * 5 * z} r={2 * z} fill={color} />
      ))}
      {dot}
    </g>
  );
}

/** Rhythmusnotation unter der Tabulatur: Hälse, Fähnchen, Balken, Punkte. */
function renderBeams(out: ReactNode[], beats: Array<{ beatRef: number; x: number; width: number }>, beatByRef: Map<number, BeatRef>, barStartTick: number, grid: number, topY: number, bottomY: number, m: TabMetrics): void {
  const z = m.zoom;
  const color = COLORS.text;
  interface Item {
    x: number;
    ref: BeatRef;
    group: number;
  }
  const items: Item[] = [];
  for (const bl of beats) {
    const ref = beatByRef.get(bl.beatRef);
    if (!ref || ref.isRest) continue;
    const cx = bl.x + Math.min(bl.width, 26 * z) / 2 + 2 * z;
    items.push({ x: cx, ref, group: Math.floor((ref.tick - barStartTick) / grid) });
  }
  // Gruppen für Balken: aufeinanderfolgende Achtel/Sechzehntel innerhalb eines Schlags
  let i = 0;
  while (i < items.length) {
    const it = items[i]!;
    const base = it.ref.beat.duration.base;
    const dots = it.ref.beat.duration.dots ?? 0;
    const tuplet = it.ref.beat.duration.tuplet;
    if (base >= 8) {
      let j = i;
      while (j + 1 < items.length && items[j + 1]!.group === it.group && items[j + 1]!.ref.beat.duration.base >= 8) j++;
      const group = items.slice(i, j + 1);
      for (const g of group) out.push(<line key={`stem-${g.ref.index}`} x1={g.x} x2={g.x} y1={topY} y2={bottomY} stroke={color} strokeWidth={1.3 * z} />);
      if (group.length > 1) {
        const x1 = group[0]!.x;
        const x2 = group[group.length - 1]!.x;
        out.push(<rect key={`beam-${it.ref.index}`} x={x1} y={bottomY - 2.5 * z} width={x2 - x1} height={2.5 * z} fill={color} />);
        // zweiter Balken für Sechzehntel (nur zwischen benachbarten 16teln)
        for (let k = 0; k < group.length; k++) {
          const g = group[k]!;
          if (g.ref.beat.duration.base >= 16) {
            const nxt = group[k + 1];
            const prv = group[k - 1];
            const toX = nxt && nxt.ref.beat.duration.base >= 16 ? nxt.x : prv && prv.ref.beat.duration.base >= 16 ? g.x : g.x + (nxt ? Math.min(8 * z, nxt.x - g.x) : -8 * z);
            if (toX !== g.x) out.push(<rect key={`beam2-${g.ref.index}`} x={Math.min(g.x, toX)} y={bottomY - 6.5 * z} width={Math.abs(toX - g.x)} height={2.5 * z} fill={color} />);
          }
        }
        if (tuplet) {
          out.push(
            <text key={`tup-${it.ref.index}`} x={(x1 + x2) / 2} y={bottomY + 9 * z} fontSize={8 * z} textAnchor="middle" fill={COLORS.muted}>
              {tuplet}
            </text>,
          );
        }
      } else {
        const flags = base === 8 ? 1 : base === 16 ? 2 : 3;
        for (let f = 0; f < flags; f++) {
          out.push(<path key={`flag-${it.ref.index}-${f}`} d={`M ${it.x} ${bottomY - f * 4.5 * z} q ${6 * z} ${-2 * z} ${7 * z} ${-8 * z}`} fill="none" stroke={color} strokeWidth={1.4 * z} />);
        }
        if (tuplet) {
          out.push(
            <text key={`tup-${it.ref.index}`} x={it.x} y={bottomY + 9 * z} fontSize={8 * z} textAnchor="middle" fill={COLORS.muted}>
              {tuplet}
            </text>,
          );
        }
      }
      for (const g of group) {
        if (g.ref.beat.duration.dots) out.push(<circle key={`dot-${g.ref.index}`} cx={g.x + 5 * z} cy={bottomY - 5 * z} r={1.6 * z} fill={color} />);
      }
      i = j + 1;
      continue;
    }
    if (base === 4) {
      out.push(<line key={`stem-${it.ref.index}`} x1={it.x} x2={it.x} y1={topY} y2={bottomY} stroke={color} strokeWidth={1.3 * z} />);
    } else if (base === 2) {
      out.push(<line key={`stem-${it.ref.index}`} x1={it.x} x2={it.x} y1={topY + 5 * z} y2={bottomY} stroke={color} strokeWidth={1.3 * z} />);
      out.push(<circle key={`half-${it.ref.index}`} cx={it.x} cy={topY + 3 * z} r={3 * z} fill="none" stroke={color} strokeWidth={1.3 * z} />);
    } else {
      out.push(<ellipse key={`whole-${it.ref.index}`} cx={it.x} cy={topY + 6 * z} rx={4 * z} ry={3 * z} fill="none" stroke={color} strokeWidth={1.4 * z} />);
    }
    if (dots) out.push(<circle key={`dot-${it.ref.index}`} cx={it.x + 5 * z} cy={bottomY - 5 * z} r={1.6 * z} fill={color} />);
    i++;
  }
}
