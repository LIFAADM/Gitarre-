/**
 * Reine DSP-Funktionen (ohne Web-Audio-Abhängigkeit) zur Klangerzeugung einer gezupften Nylonsaite
 * nach dem erweiterten Karplus-Strong-Verfahren. Dadurch gut testbar.
 */

export interface PluckOptions {
  /** Länge des erzeugten Signals in Sekunden. */
  seconds?: number;
  /** Zeit bis −60 dB in Sekunden. */
  t60?: number;
  /** Anschlagposition relativ zur Saitenlänge (0.1–0.3 klingt natürlich). */
  pickPosition?: number;
  /** Dämpfung des Anschlaggeräuschs (0 = hell/metallisch, 1 = sehr weich). */
  softness?: number;
  /** Zufallsquelle (für deterministische Tests). */
  random?: () => number;
}

/** Empfohlene Ausklingzeit (T60) für eine Nylonsaite je nach Tonhöhe. */
export function defaultT60ForMidi(midi: number): number {
  // tiefe Saiten klingen länger nach als hohe
  const t = 4.2 - (midi - 40) * 0.065;
  return Math.min(4.2, Math.max(1.4, t));
}

/**
 * Erzeugt ein Mono-Signal einer gezupften Saite.
 * Fraktionale Verzögerung sorgt für exakte Tonhöhe (wichtig für Referenztöne).
 */
export function renderPluck(frequencyHz: number, sampleRate: number, options: PluckOptions = {}): Float32Array<ArrayBuffer> {
  if (!(frequencyHz > 0)) throw new RangeError('Frequenz muss größer als 0 sein');
  const seconds = options.seconds ?? 2.0;
  const t60 = options.t60 ?? 2.0;
  const pickPosition = options.pickPosition ?? 0.17;
  const softness = options.softness ?? 0.55;
  const random = options.random ?? Math.random;

  const total = Math.max(1, Math.floor(seconds * sampleRate));
  const period = sampleRate / frequencyHz;
  // Verzögerung der Schleife: L − 0.5 − f  (Mittelwertfilter = 0.5 Sample, lineare Interpolation = f)
  const L = Math.max(3, Math.ceil(period + 0.5));
  const f = Math.min(0.999, Math.max(0, L - 0.5 - period));
  // Dämpfung pro Umlauf für gewünschte T60
  const g = Math.pow(10, -3 / (t60 * frequencyHz));

  // Anregung: gefiltertes Rauschen (weich für Nylon) + Anschlagpositions-Kammfilter
  const excitation = new Float32Array(L);
  let lp = 0;
  const a = 0.15 + 0.8 * Math.min(1, Math.max(0, softness));
  for (let i = 0; i < L; i++) {
    const white = random() * 2 - 1;
    lp = a * lp + (1 - a) * white;
    excitation[i] = lp;
  }
  const pickDelay = Math.max(1, Math.round(pickPosition * L));
  const buffer = new Float32Array(L);
  for (let i = 0; i < L; i++) {
    const delayed = i - pickDelay >= 0 ? excitation[i - pickDelay]! : 0;
    buffer[i] = excitation[i]! - delayed;
  }
  // Normalisieren
  let peak = 0;
  for (let i = 0; i < L; i++) peak = Math.max(peak, Math.abs(buffer[i]!));
  if (peak > 0) for (let i = 0; i < L; i++) buffer[i] = buffer[i]! / peak;

  const out = new Float32Array(total);
  let k = 0;
  for (let n = 0; n < total; n++) {
    const i1 = k + 1 >= L ? k + 1 - L : k + 1;
    const i2 = k + 2 >= L ? k + 2 - L : k + 2;
    const avg1 = 0.5 * (buffer[k]! + buffer[i1]!);
    const avg2 = 0.5 * (buffer[i1]! + buffer[i2]!);
    const y = g * ((1 - f) * avg1 + f * avg2);
    buffer[k] = y;
    out[n] = y;
    k = i1;
  }
  // kurzer Fade-in (1 ms) gegen Knacken, Fade-out am Ende
  const fadeIn = Math.min(total, Math.floor(sampleRate * 0.001));
  for (let i = 0; i < fadeIn; i++) out[i] = out[i]! * (i / fadeIn);
  const fadeOut = Math.min(total, Math.floor(sampleRate * 0.05));
  for (let i = 0; i < fadeOut; i++) {
    const idx = total - 1 - i;
    out[idx] = out[idx]! * (i / fadeOut);
  }
  return out;
}

/** Kurzes, perkussives Rauschen für abgedämpfte („tote“) Noten. */
export function renderDeadNote(sampleRate: number, seconds = 0.06, random: () => number = Math.random): Float32Array<ArrayBuffer> {
  const total = Math.max(1, Math.floor(seconds * sampleRate));
  const out = new Float32Array(total);
  let lp = 0;
  for (let i = 0; i < total; i++) {
    const white = random() * 2 - 1;
    lp = 0.6 * lp + 0.4 * white;
    const env = Math.exp(-i / (total * 0.25));
    out[i] = lp * env * 0.7;
  }
  return out;
}

/**
 * Schätzt die Grundfrequenz eines Signals über Autokorrelation (nur für Tests der Synthese).
 */
export function estimateFrequencyByAutocorrelation(signal: Float32Array, sampleRate: number, minHz = 60, maxHz = 1200): number {
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.min(signal.length - 1, Math.ceil(sampleRate / minHz));
  let bestLag = minLag;
  let best = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < signal.length; i++) sum += signal[i]! * signal[i + lag]!;
    if (sum > best) {
      best = sum;
      bestLag = lag;
    }
  }
  // parabolische Interpolation
  const r = (lag: number): number => {
    let sum = 0;
    for (let i = 0; i + lag < signal.length; i++) sum += signal[i]! * signal[i + lag]!;
    return sum;
  };
  const y0 = r(bestLag - 1);
  const y1 = r(bestLag);
  const y2 = r(bestLag + 1);
  const denom = y0 - 2 * y1 + y2;
  const shift = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0;
  return sampleRate / (bestLag + shift);
}
