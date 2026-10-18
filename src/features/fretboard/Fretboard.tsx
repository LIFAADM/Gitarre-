import { useId, useMemo, type KeyboardEvent } from 'react';
import { FRET_MARKERS, MAX_FRET, midiForPosition } from '@/core/music/fretboard';
import { noteName, noteNameWithOctave, type NoteNaming } from '@/core/music/notes';
import { STANDARD_TUNING } from '@/core/music/tuning';
import { cn } from '@/lib/cn';

/**
 * Interaktives Griffbrett (SVG) einer sechssaitigen Gitarre in Standardstimmung.
 *
 * - Saite 1 = hohe E-Saite (dünn), Saite 6 = tiefe E-Saite (dick); Bund 0 = leere Saite.
 * - Ausrichtung „tab“: Saite 1 oben (wie in der Tabulatur). „player-view“: tiefe E-Saite oben,
 *   so wie man beim Spielen auf die eigene Gitarre hinunterschaut.
 * - Rechtshänder: Sattel links, Bünde steigen nach rechts. Linkshänder: gespiegelt.
 * - Jede Position hat eine unsichtbare, große Tippfläche (≥ 40 × 40 px im Normalmodus).
 *
 * Das SVG hat eine feste Pixelbreite; in einem Container mit `overflow-x-auto` wird es
 * horizontal scrollbar, wenn es nicht auf den Bildschirm passt.
 */

export type FretboardTone = 'gold' | 'ok' | 'bad' | 'muted' | 'info';
export type FretboardOrientation = 'tab' | 'player-view';

export interface FretboardHighlight {
  /** Saite 1 (hohe E) … 6 (tiefe E). */
  string: number;
  /** Bund 0 = leere Saite. */
  fret: number;
  /** Finger der Greifhand (1 = Zeigefinger … 4 = kleiner Finger); wird im Kreis angezeigt. */
  finger?: 0 | 1 | 2 | 3 | 4;
  /** Eigener Text im Kreis (hat Vorrang vor der Fingernummer, max. 2–3 Zeichen). */
  label?: string;
  tone?: FretboardTone;
  /** Sanftes Pulsieren (z. B. „hier bist du dran“). */
  pulse?: boolean;
}

export interface FretboardTap {
  string: number;
  fret: number;
  midi: number;
}

export interface FretboardProps {
  highlights?: FretboardHighlight[];
  onTap?: (pos: FretboardTap) => void;
  /** Anzahl der dargestellten Bünde (1–19), Standard 12. */
  frets?: number;
  leftHanded?: boolean;
  orientation?: FretboardOrientation;
  /** Tonnamen (ohne Oktave) auf allen Positionen einblenden. */
  showNoteNames?: boolean;
  naming?: NoteNaming;
  /** Kleinere Darstellung zum Einbetten in Lektionen oder den Player. */
  compact?: boolean;
  /** Nur diese Saiten hervorheben, alle anderen abdunkeln. */
  activeStrings?: number[];
  className?: string;
}

const STRING_COUNT = 6;
/** Strichstärken der Saiten 1 … 6 (dünn → dick). */
const STRING_WIDTHS = [1.2, 1.5, 1.9, 2.4, 3.0, 3.6] as const;
const EMPTY_HIGHLIGHTS: FretboardHighlight[] = [];

const TONE_CLASSES: Record<FretboardTone, { fill: string; text: string; stroke: string }> = {
  gold: { fill: 'fill-gold', text: 'fill-[#1b1507]', stroke: 'stroke-gold' },
  ok: { fill: 'fill-ok', text: 'fill-[#06160e]', stroke: 'stroke-ok' },
  bad: { fill: 'fill-bad', text: 'fill-white', stroke: 'stroke-bad' },
  muted: { fill: 'fill-surface-3', text: 'fill-text', stroke: 'stroke-muted' },
  info: { fill: 'fill-sky-300', text: 'fill-[#0a1e2c]', stroke: 'stroke-sky-300' },
};

interface Layout {
  width: number;
  height: number;
  padL: number;
  openW: number;
  nutX: number;
  nutW: number;
  boardX0: number;
  boardX1: number;
  boardY0: number;
  boardY1: number;
  gap: number;
  edge: number;
  /** x-Position der Bundstäbchen; Index 0 = Sattelkante, Index n = Bundstäbchen n. */
  wires: number[];
  /** x-Mitte jeder Griffposition; Index 0 = Zone der leeren Saite links vom Sattel. */
  centers: number[];
  fretNumberY: number;
  highlightR: number;
  markerR: number;
  font: { label: number; note: number; fret: number; highlight: number };
}

/**
 * Berechnet die Geometrie. Die Bundabstände folgen abgeschwächt der 17,817er-Regel
 * (jeder Bund ist etwas schmaler als der vorige), werden aber so gestreckt, dass auch
 * der 19. Bund noch eine gut tippbare Breite behält.
 */
function buildLayout(frets: number, compact: boolean): Layout {
  const gap = compact ? 26 : 40;
  const edge = compact ? 9 : 13;
  const padL = 6;
  const padR = 8;
  const padT = compact ? 8 : 10;
  const openW = compact ? 38 : 44;
  const nutW = compact ? 5 : 7;
  const meanFretWidth = compact ? 44 : 52;
  const tail = compact ? 8 : 10;

  const relative: number[] = [];
  let sum = 0;
  for (let n = 1; n <= frets; n++) {
    const r = 0.5 + 0.5 * Math.pow(2, -(n - 1) / 12);
    relative.push(r);
    sum += r;
  }
  const scale = (meanFretWidth * frets) / sum;

  const nutX = padL + openW;
  const boardX0 = nutX + nutW;
  const wires: number[] = [boardX0];
  for (const r of relative) wires.push(wires[wires.length - 1]! + r * scale);
  const centers: number[] = [padL + openW / 2];
  for (let n = 1; n <= frets; n++) centers.push((wires[n - 1]! + wires[n]!) / 2);

  const boardX1 = wires[frets]! + tail;
  const boardY0 = padT;
  const boardY1 = boardY0 + 2 * edge + (STRING_COUNT - 1) * gap;
  const fretNumberY = boardY1 + (compact ? 14 : 17);

  return {
    width: boardX1 + padR,
    height: fretNumberY + (compact ? 6 : 8),
    padL,
    openW,
    nutX,
    nutW,
    boardX0,
    boardX1,
    boardY0,
    boardY1,
    gap,
    edge,
    wires,
    centers,
    fretNumberY,
    highlightR: compact ? 10 : 15,
    markerR: compact ? 4 : 5.5,
    font: compact ? { label: 11, note: 9, fret: 10, highlight: 11 } : { label: 13, note: 10.5, fret: 11, highlight: 15 },
  };
}

export function Fretboard({
  highlights,
  onTap,
  frets = 12,
  leftHanded = false,
  orientation = 'tab',
  showNoteNames = false,
  naming = 'de',
  compact = false,
  activeStrings,
  className,
}: FretboardProps) {
  const fretCount = Math.min(MAX_FRET, Math.max(1, Math.round(frets)));
  const layout = useMemo(() => buildLayout(fretCount, compact), [fretCount, compact]);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradBoard = `gc-fb-board-${uid}`;
  const gradFret = `gc-fb-fret-${uid}`;

  const list = highlights ?? EMPTY_HIGHLIGHTS;
  const highlightMap = useMemo(() => {
    const map = new Map<string, FretboardHighlight>();
    for (const h of list) {
      if (h.string < 1 || h.string > STRING_COUNT || h.fret < 0 || h.fret > fretCount) continue;
      map.set(`${h.string}-${h.fret}`, h);
    }
    return map;
  }, [list, fretCount]);

  // Spiegelung für Linkshänder: alle x-Koordinaten werden an der Mitte gespiegelt.
  const mx = (x: number): number => (leftHanded ? layout.width - x : x);
  const rectX = (x: number, w: number): number => (leftHanded ? layout.width - x - w : x);
  const rowOf = (string: number): number => (orientation === 'tab' ? string - 1 : STRING_COUNT - string);
  const yOf = (string: number): number => layout.boardY0 + layout.edge + rowOf(string) * layout.gap;
  const isActive = (string: number): boolean => !activeStrings || activeStrings.includes(string);

  const tap = (string: number, fret: number): void => {
    onTap?.({ string, fret, midi: midiForPosition({ string, fret }) });
  };
  const onKey = (event: KeyboardEvent<SVGRectElement>, string: number, fret: number): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      tap(string, fret);
    }
  };

  const strings = Array.from({ length: STRING_COUNT }, (_, i) => i + 1);
  const fretIndices = Array.from({ length: fretCount }, (_, i) => i + 1);
  const boardH = layout.boardY1 - layout.boardY0;
  const markerY = (row: number): number => layout.boardY0 + layout.edge + row * layout.gap;

  return (
    <svg
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={cn('tab-svg block shrink-0 select-none', className)}
      role="group"
      aria-label={`Griffbrett mit ${fretCount} Bünden${leftHanded ? ' (Linkshänder)' : ''}`}
      data-left-handed={leftHanded ? 'true' : 'false'}
      data-orientation={orientation}
    >
      <defs>
        <linearGradient id={gradBoard} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a362d" />
          <stop offset="0.5" stopColor="#382922" />
          <stop offset="1" stopColor="#2a1d17" />
        </linearGradient>
        <linearGradient id={gradFret} x1={leftHanded ? '1' : '0'} y1="0" x2={leftHanded ? '0' : '1'} y2="0">
          <stop offset="0" stopColor="#f1ede3" />
          <stop offset="0.55" stopColor="#b6b1a6" />
          <stop offset="1" stopColor="#77726a" />
        </linearGradient>
      </defs>

      {/* Griffbrett (beginnt unter dem Sattel, damit die runden Ecken dort verdeckt sind) */}
      <rect x={rectX(layout.nutX, layout.boardX1 - layout.nutX)} y={layout.boardY0} width={layout.boardX1 - layout.nutX} height={boardH} rx={5} fill={`url(#${gradBoard})`} />
      <rect x={rectX(layout.nutX, layout.boardX1 - layout.nutX)} y={layout.boardY0} width={layout.boardX1 - layout.nutX} height={1} fill="#ffffff" opacity={0.08} />

      {/* Bundmarkierungen: einfach bei 3, 5, 7, 9, 15, 17, 19 – doppelt bei 12 */}
      {FRET_MARKERS.filter((f) => f <= fretCount).map((f) =>
        f === 12 ? (
          <g key={f} fill="#d9d0ba" opacity={0.55}>
            <circle cx={mx(layout.centers[f]!)} cy={markerY(1.5)} r={layout.markerR} />
            <circle cx={mx(layout.centers[f]!)} cy={markerY(3.5)} r={layout.markerR} />
          </g>
        ) : (
          <circle key={f} cx={mx(layout.centers[f]!)} cy={markerY(2.5)} r={layout.markerR} fill="#d9d0ba" opacity={0.55} />
        ),
      )}

      {/* Bundstäbchen */}
      {fretIndices.map((n) => (
        <rect key={n} x={rectX(layout.wires[n]! - 1.5, 3)} y={layout.boardY0} width={3} height={boardH} fill={`url(#${gradFret})`} />
      ))}

      {/* Sattel */}
      <rect data-testid="fretboard-nut" x={rectX(layout.nutX, layout.nutW)} y={layout.boardY0 - 1} width={layout.nutW} height={boardH + 2} rx={1.5} fill="#eadfc6" />
      <rect x={rectX(leftHanded ? layout.nutX : layout.nutX + layout.nutW - 1.2, 1.2)} y={layout.boardY0 - 1} width={1.2} height={boardH + 2} fill="#b3a684" />

      {/* Saiten (dünn = hoch, dick = tief; Saiten 4–6 sind umsponnen) */}
      {strings.map((s) => {
        const y = yOf(s);
        const width = STRING_WIDTHS[s - 1]!;
        const wound = s >= 4;
        return (
          <g key={s} opacity={isActive(s) ? 1 : 0.3}>
            <line x1={mx(layout.padL + 2)} x2={mx(layout.nutX)} y1={y} y2={y} stroke={wound ? '#cfc7b4' : '#f3ecd8'} strokeWidth={width} opacity={0.35} />
            <line x1={mx(layout.nutX)} x2={mx(layout.boardX1)} y1={y} y2={y} stroke={wound ? '#cfc7b4' : '#f3ecd8'} strokeWidth={width} opacity={0.95} />
            {wound && (
              <line x1={mx(layout.nutX)} x2={mx(layout.boardX1)} y1={y} y2={y} stroke="#4a3a2c" strokeWidth={width} strokeDasharray="1.2 1.7" opacity={0.35} />
            )}
          </g>
        );
      })}

      {/* Saitennamen links vom Sattel (bei Leersaiten-Markierung in der Farbe der Markierung) */}
      {strings.map((s) => {
        const open = highlightMap.get(`${s}-0`);
        const tone = TONE_CLASSES[open?.tone ?? 'gold'];
        return (
          <text
            key={s}
            data-testid={`fb-string-label-${s}`}
            x={mx(layout.centers[0]!)}
            y={yOf(s)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={layout.font.label}
            fontWeight={700}
            className={open ? tone.fill : 'fill-muted'}
            opacity={isActive(s) ? 1 : 0.4}
          >
            {open?.label ?? noteName(STANDARD_TUNING.midi[s - 1]!, naming)}
          </text>
        );
      })}

      {/* Tonnamen auf allen Positionen (optional) */}
      {showNoteNames &&
        strings.map((s) =>
          fretIndices.map((f) => {
            if (highlightMap.has(`${s}-${f}`)) return null;
            return (
              <text
                key={`${s}-${f}`}
                data-testid={`fb-note-${s}-${f}`}
                x={mx(layout.centers[f]!)}
                y={yOf(s)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={layout.font.note}
                fontWeight={600}
                fill="#f3f1ea"
                stroke="#241a15"
                strokeWidth={3}
                paintOrder="stroke"
                opacity={isActive(s) ? 0.85 : 0.3}
              >
                {noteName(midiForPosition({ string: s, fret: f }), naming)}
              </text>
            );
          }),
        )}

      {/* Bundnummern unter dem Griffbrett */}
      {[0, ...fretIndices].map((f) => (
        <text key={f} x={mx(layout.centers[f]!)} y={layout.fretNumberY} textAnchor="middle" fontSize={layout.font.fret} fontWeight={f === 0 || FRET_MARKERS.includes(f) ? 700 : 500} className="fill-muted">
          {f}
        </text>
      ))}

      {/* Markierungen */}
      {[...highlightMap.values()].map((h) => {
        const tone = TONE_CLASSES[h.tone ?? 'gold'];
        const cx = mx(layout.centers[h.fret]!);
        const cy = yOf(h.string);
        const key = `${h.string}-${h.fret}`;
        if (h.fret === 0) {
          // Leere Saite: Ring um den Saitennamen (der Text wird oben in der Markierungsfarbe gezeichnet)
          return (
            <g key={key} data-testid={`fb-highlight-${key}`} className={cn(h.pulse && 'animate-pulse-soft')}>
              <circle cx={cx} cy={cy} r={layout.highlightR} className={tone.fill} opacity={0.18} />
              <circle cx={cx} cy={cy} r={layout.highlightR} fill="none" strokeWidth={compact ? 2.5 : 3} className={tone.stroke} />
            </g>
          );
        }
        const text = h.label ?? (h.finger !== undefined ? String(h.finger) : '');
        return (
          <g key={key} data-testid={`fb-highlight-${key}`} className={cn(h.pulse && 'animate-pulse-soft')}>
            <circle cx={cx} cy={cy + 1.5} r={layout.highlightR} fill="#000" opacity={0.35} />
            <circle cx={cx} cy={cy} r={layout.highlightR} className={tone.fill} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={1.5} />
            {text && (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={layout.font.highlight} fontWeight={800} className={tone.text}>
                {text}
              </text>
            )}
          </g>
        );
      })}

      {/* Unsichtbare Tippflächen (zuoberst) */}
      {strings.map((s) => {
        const y = yOf(s) - layout.gap / 2;
        return [0, ...fretIndices].map((f) => {
          const x0 = f === 0 ? layout.padL : layout.wires[f - 1]!;
          const x1 = f === 0 ? layout.nutX : layout.wires[f]!;
          const midi = midiForPosition({ string: s, fret: f });
          const where = f === 0 ? 'leere Saite' : `Bund ${f}`;
          return (
            <rect
              key={`${s}-${f}`}
              data-testid={`fb-target-${s}-${f}`}
              data-string={s}
              data-fret={f}
              x={rectX(x0, x1 - x0)}
              y={y}
              width={x1 - x0}
              height={layout.gap}
              rx={6}
              fill="transparent"
              pointerEvents="all"
              role="button"
              tabIndex={0}
              aria-label={`Saite ${s}, ${where} (${noteNameWithOctave(midi, naming)})`}
              className="cursor-pointer outline-none active:fill-white/10 focus-visible:stroke-gold focus-visible:stroke-2"
              onClick={() => tap(s, f)}
              onKeyDown={(e) => onKey(e, s, f)}
            />
          );
        });
      })}
    </svg>
  );
}
