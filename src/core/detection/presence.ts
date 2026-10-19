import { goertzelPower, noisePowerHann } from './goertzel';

/**
 * Erwartungsgeführte Prüfung „Ist der Zielton da?“.
 *
 * Statt zu fragen „welcher Ton klingt?“ wird gefragt, ob die Energie an Grundton und Obertönen
 * des erwarteten Tons vorhanden ist – robuster gegen Nachklang, Nebengeräusche und Akkorde,
 * weil nur die Teiltöne des Zieltons geprüft werden.
 *
 * Für jeden Teilton k (1–5) wird verglichen:
 *  - E_k: Energie bei k·f0 (Goertzel auf dem Hann-gefensterten Fenster)
 *  - N_k: Energie bei k·f0 einen Halbton tiefer/höher (Nachbarn) – der Teilton muss näher am Ziel liegen
 *  - Untergrenze: Rauschen (aus der Kalibrierung) und der Hintergrund zwischen den Teiltönen
 * Oktavfehler:
 *  - „tiefer“: Energie bei f0/2 und 1,5·f0 (ungerade Teiltöne der unteren Oktave) → gespielt wurde die Oktave darunter;
 *    beide müssen vorhanden sein, damit eine mitklingende Quinte (nur 1,5·f0) nicht als Oktavfehler zählt
 *  - „höher“: nur gerade Teiltöne treffen (2·f0, 4·f0), Grundton und 3·f0 fehlen → gespielt wurde die Oktave darüber
 */

export type OctaveIssue = 'keine' | 'tiefer' | 'hoeher';

export interface PresenceResult {
  hz: number;
  /** 0–1: Anteil der getroffenen Teiltöne (gewichtet), nach Oktav-Abzug. */
  score: number;
  /** Getroffene Teiltöne als Bitmaske (Bit 0 = Grundton). */
  matched: number;
  /** Summe der Teilton-Energien (Amplitude²) – Maß für die Lautstärke des Zieltons. */
  energy: number;
  octave: OctaveIssue;
}

export interface PresenceOptions {
  sampleRate: number;
  /** Effektivwert des Grundrauschens (aus der Kalibrierung); 0 = unbekannt. */
  noiseRms?: number;
  /** Anzahl der geprüften Teiltöne (1–6). Standard 5. */
  harmonics?: number;
  /** Die Oktave unter dem Ziel wird selbst erwartet (z. B. Akkord mit A2 und A3) – dann ist sie kein Oktavfehler. */
  lowerOctaveExpected?: boolean;
}

/** Gewichte der Teiltöne 1–6 (Grundton am wichtigsten, hohe Teiltöne bei Nylon leise). */
export const HARMONIC_WEIGHTS = [0.35, 0.25, 0.2, 0.12, 0.08, 0.05] as const;

const SEMITONE = 2 ** (1 / 12);
/** Energie muss den Hintergrund zwischen den Teiltönen um diesen Faktor übersteigen. */
const BACKGROUND_FACTOR = 3;
/** Rauschleistung × Faktor als absolute Untergrenze. */
const NOISE_FACTOR = 10;
/** Absolute Untergrenze (Amplitude²), falls keine Kalibrierung vorliegt (≈ −80 dBFS). */
const ABSOLUTE_FLOOR = 1e-8;

/** Unterer Median – bei geradem Umfang der kleinere der beiden mittleren Werte (Teiltöne anderer Akkordtöne sollen den Hintergrund nicht aufblähen). */
function lowerMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)]!;
}

/** Ab diesem Wert gilt ein Zielton als vorhanden (Phase 2 passt das anhand echter Aufnahmen an). */
export const PRESENCE_THRESHOLD = 0.5;

/**
 * Prüft, ob der Ton mit Grundfrequenz `hz` im (bereits Hann-gefensterten) Puffer vorhanden ist.
 * `windowSum` ist die Summe der Fensterwerte (Normierung der Goertzel-Amplituden).
 */
export function targetPresence(windowed: Float32Array, windowSum: number, hz: number, options: PresenceOptions): PresenceResult {
  const { sampleRate } = options;
  const n = windowed.length;
  const nyquist = sampleRate / 2;
  const count = Math.min(6, Math.max(1, options.harmonics ?? 5));
  const noiseFloor = Math.max(ABSOLUTE_FLOOR, noisePowerHann(options.noiseRms ?? 0, n) * NOISE_FACTOR);
  const at = (f: number): number => (f < nyquist ? goertzelPower(windowed, sampleRate, f, windowSum) : 0);

  const energies: number[] = [];
  const neighbours: number[] = [];
  const background: number[] = [];
  for (let k = 1; k <= count; k++) {
    const f = k * hz;
    if (f >= nyquist) break;
    energies.push(at(f));
    neighbours.push(Math.max(at(f / SEMITONE), at(f * SEMITONE)));
    if (k < count) background.push(at((k + 0.5) * hz));
  }
  if (energies.length === 0) return { hz, score: 0, matched: 0, energy: 0, octave: 'keine' };

  const floor = Math.max(noiseFloor, lowerMedian(background) * BACKGROUND_FACTOR);
  let matched = 0;
  let weightSum = 0;
  let score = 0;
  let energy = 0;
  for (let i = 0; i < energies.length; i++) {
    const w = HARMONIC_WEIGHTS[i]!;
    weightSum += w;
    const e = energies[i]!;
    if (e > floor && e >= 0.9 * neighbours[i]!) {
      matched |= 1 << i;
      score += w;
      energy += e;
    }
  }
  score = weightSum > 0 ? score / weightSum : 0;

  let octave: OctaveIssue = 'keine';
  const e1 = energies[0]!;
  const e2 = energies[1] ?? 0;
  // Untere Oktave gespielt? Dann liegen deren ungerade Teiltöne bei 0,5·f0 UND 1,5·f0.
  // Beide müssen da sein – eine Quinte über dem Ziel (nur 1,5·f0) darf nicht als Oktavfehler gelten.
  const subFundamental = at(hz / 2);
  const subThird = background[0] ?? 0;
  const sub = Math.min(subFundamental, subThird) * 2;
  if (!options.lowerOctaveExpected && subFundamental > noiseFloor && subThird > noiseFloor && sub > 0.35 * (e1 + e2)) {
    octave = 'tiefer';
    score *= 0.3;
  } else if (score > 0 && (matched & 0b101) === 0 && (matched & 0b010) !== 0) {
    // Nur gerade Teiltöne – vermutlich die Oktave darüber.
    octave = 'hoeher';
    score *= 0.4;
  }
  return { hz, score, matched, energy, octave };
}
