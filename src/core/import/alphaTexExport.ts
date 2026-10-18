import type { Beat, Note, Score, Track } from '../music/score';
import { noteNameWithOctave } from '../music/notes';

/**
 * Export des internen Modells nach alphaTex (für die Notenschrift-Ansicht mit alphaTab
 * und als Austauschformat). Saite 1 = hohe E – identisch mit der alphaTex-Konvention.
 */

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function durationToken(beat: Beat): string {
  const base = beat.duration.base;
  let token = `.${base}`;
  const effects: string[] = [];
  if (beat.duration.dots === 1) effects.push('d');
  if (beat.duration.dots === 2) effects.push('dd');
  if (beat.duration.tuplet) effects.push(`tu ${beat.duration.tuplet}`);
  if (beat.text) effects.push(`txt "${escapeText(beat.text)}"`);
  if (effects.length) token += `{${effects.join(' ')}}`;
  return token;
}

function noteToken(note: Note, origins: WeakSet<Note>): string {
  const fret = note.techniques?.includes('dead') ? 'x' : note.tieFromPrevious ? '-' : String(note.fret);
  const effects: string[] = [];
  const t = note.techniques ?? [];
  // alphaTex markiert Hammer-on/Pull-off an der Ausgangsnote; unser Modell an der Zielnote
  if (origins.has(note)) effects.push('h');
  if (t.includes('slide')) effects.push('sl');
  if (t.includes('vibrato')) effects.push('v');
  if (t.includes('palm-mute')) effects.push('pm');
  if (t.includes('let-ring')) effects.push('lr');
  if (t.includes('staccato')) effects.push('st');
  return `${fret}.${note.string}${effects.length ? `{${effects.join(' ')}}` : ''}`;
}

function beatToken(beat: Beat, origins: WeakSet<Note>): string {
  if (beat.isRest || beat.notes.length === 0) return `r${durationToken(beat)}`;
  if (beat.notes.length === 1) return `${noteToken(beat.notes[0]!, origins)}${durationToken(beat)}`;
  return `(${beat.notes.map((n) => noteToken(n, origins)).join(' ')})${durationToken(beat)}`;
}

/** Ermittelt die Ausgangsnoten von Hammer-ons/Pull-offs (vorherige Note auf derselben Saite). */
function hammerPullOrigins(track: Track): WeakSet<Note> {
  const origins = new WeakSet<Note>();
  const beats = track.bars.flatMap((bar) => bar.voices[0] ?? []);
  for (let i = 1; i < beats.length; i++) {
    for (const note of beats[i]!.notes) {
      if (!note.techniques?.some((t) => t === 'hammer-on' || t === 'pull-off')) continue;
      for (let j = i - 1; j >= 0; j--) {
        const prev = beats[j]!;
        if (prev.isRest) break;
        const origin = prev.notes.find((n) => n.string === note.string);
        if (origin) {
          origins.add(origin);
          break;
        }
      }
    }
  }
  return origins;
}

function tuningToken(track: Track): string {
  return track.tuning.map((midi) => noteNameWithOctave(midi, 'intl').replace('#', '#')).join(' ');
}

/** Erzeugt alphaTex für alle Spuren (oder eine ausgewählte Spur). */
export function exportAlphaTex(score: Score, options: { trackIndex?: number } = {}): string {
  const lines: string[] = [];
  lines.push(`\\title "${escapeText(score.title)}"`);
  if (score.artist) lines.push(`\\artist "${escapeText(score.artist)}"`);
  lines.push(`\\tempo ${Math.round(score.tempo)}`);
  lines.push('.');
  const tracks = options.trackIndex !== undefined ? [score.tracks[options.trackIndex]].filter((t): t is Track => Boolean(t)) : score.tracks;
  tracks.forEach((track, ti) => {
    if (tracks.length > 1 || ti > 0) lines.push(`\\track "${escapeText(track.name)}" \\tuning ${tuningToken(track)}`);
    else if (track.tuning.join(',') !== '64,59,55,50,45,40') lines.push(`\\track "${escapeText(track.name)}" \\tuning ${tuningToken(track)}`);
    let prevTs = '';
    let prevTempo: number | undefined;
    const origins = hammerPullOrigins(track);
    const barTokens: string[] = [];
    track.bars.forEach((bar, bi) => {
      const mb = score.masterBars[bi];
      const meta: string[] = [];
      if (mb) {
        const ts = `${mb.timeSignature.numerator} ${mb.timeSignature.denominator}`;
        if (ts !== prevTs) {
          meta.push(`\\ts ${ts}`);
          prevTs = ts;
        }
        if (mb.tempo && mb.tempo !== prevTempo && bi > 0) meta.push(`\\tempo ${Math.round(mb.tempo)}`);
        if (mb.tempo) prevTempo = mb.tempo;
        if (mb.repeatStart) meta.push('\\ro');
        if (mb.repeatCount && mb.repeatCount > 1) meta.push(`\\rc ${mb.repeatCount}`);
        if (mb.section) meta.push(`\\section "${escapeText(mb.section)}"`);
      }
      const voice = bar.voices[0] ?? [];
      const beats = voice.length > 0 ? voice.map((b) => beatToken(b, origins)) : ['r.1'];
      barTokens.push([...meta, ...beats].join(' '));
    });
    lines.push(barTokens.join(' |\n') + ' |');
  });
  return lines.join('\n');
}
