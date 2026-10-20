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
 *  - N_k: Energie bei k·f0 einen Halbton tiefer/höher (Nachbarn) – der Teilton muss ein Gipfel sein (E_k ≥ N_k)
 *  - Untergrenze: Rauschen (aus der Kalibrierung) und der Hintergrund zwischen den Teiltönen
 * Oktavfehler:
 *  - „tiefer“: ein tieferer Ton (Oktave f0/2 oder Duodezime f0/3) liefert mit seinem Teilton die Energie bei f0;
 *    erkennbar am starken Grundton des tieferen Tons plus einem weiteren seiner Teiltöne (1,5·f0 bzw. 2·f0/3)
 *  - „höher“: Grundton fehlt, 2·f0 trifft → gespielt wurde die Oktave darüber
 *  - erwartete Töne an diesen Stellen (Akkord mit A2 und A3) sind kein Fehler
 * Lautstärke: Die Teilton-Energie muss einen Mindestanteil der Fensterleistung tragen (Nachklang zählt nicht).
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
  /**
   * Weitere erwartete Töne (Hz), z. B. die übrigen Akkordtöne. Liegt einer bei f0/2 oder f0/3, ist
   * dessen Energie kein Oktav- bzw. Duodezimfehler (A2 und A3 im a-Moll-Akkord).
   */
  otherExpectedHz?: readonly number[];
  /**
   * Leistung des ganzen Fensters (Amplitude²-Äquivalent, gleiche Normierung wie Goertzel). Der Zielton
   * muss einen Mindestanteil davon tragen – ein leiser Nachklang zählt nicht als „gespielt“.
   */
  signalPower?: number;
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
/** Mindestanteil der Zielton-Energie an der Fensterleistung (≈ −23 dB), sonst gilt der Ton als Nachklang. */
export const MIN_SALIENCE = 0.005;
const SEMITONE_CENTS = 50;

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
    if (e > floor && e >= neighbours[i]!) {
      matched |= 1 << i;
      score += w;
      energy += e;
    }
  }
  score = weightSum > 0 ? score / weightSum : 0;

  let octave: OctaveIssue = 'keine';
  const e1 = energies[0]!;
  const e2 = energies[1] ?? 0;
  const expectedNear = (f: number): boolean => (options.otherExpectedHz ?? []).some((other) => Math.abs(1200 * Math.log2(other / f)) < SEMITONE_CENTS);

  // Tieferer Ton gespielt, dessen Teilton auf f0 fällt: Oktave darunter (f0/2) oder Duodezime darunter (f0/3).
  // Kennzeichen: dessen Grundton ist mindestens halb so stark wie unsere „Grundton“-Energie, und ein weiterer
  // Teilton von ihm (1,5·f0 bzw. 2·f0/3) ist da. Erwartete Töne an dieser Stelle sind kein Fehler.
  for (const divisor of [2, 3] as const) {
    const baseHz = hz / divisor;
    if (expectedNear(baseHz)) continue;
    const base = at(baseHz);
    // Der tiefere Grundton muss selbst ein Gipfel sein – sonst ist es nur Leckenergie eines Nachbarhalbtons
    // (bei tiefen Frequenzen liegen Halbtöne innerhalb der Hauptkeule des Fensters).
    const basePeak = base >= at(baseHz / SEMITONE) && base >= at(baseHz * SEMITONE);
    const partner = divisor === 2 ? (background[0] ?? 0) : at((2 * hz) / 3);
    if (basePeak && base > floor && base > 0.5 * e1 && partner > floor) {
      octave = 'tiefer';
      score *= 0.3;
      break;
    }
  }
  // Oktave darüber gespielt: Grundton fehlt, der 2. Teilton ist da – und entweder fehlt auch der 3. Teilton
  // oder der Grundton ist gegenüber dem 2. Teilton verschwindend (bei echten tiefen Tönen ist er höchstens schwächer).
  if (octave === 'keine' && (matched & 0b001) === 0 && (matched & 0b010) !== 0 && ((matched & 0b100) === 0 || e1 < e2 / 10)) {
    octave = 'hoeher';
    score *= 0.4;
  }
  // Zu leise im Verhältnis zum Gesamtsignal: Nachklang oder Übersprechen, nicht der gespielte Ton.
  if (options.signalPower !== undefined && options.signalPower > 0 && energy < MIN_SALIENCE * options.signalPower) score = Math.min(score, 0.25);

  return { hz, score, matched, energy, octave };
}
