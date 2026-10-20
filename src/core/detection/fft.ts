/**
 * Reelle FFT (Radix-2, iterativ, in-place) für Analysefenster mit Zweierpotenz-Länge.
 *
 * Läuft ohne Browser-APIs – im AudioWorklet, in Vitest und im Node-Benchmark.
 * Es wird nur das Betragsspektrum benötigt (Anschlagerkennung über Spectral Flux, Pegel je Band);
 * die Zieltonprüfung nutzt stattdessen Goertzel auf exakten Frequenzen.
 */
export class RealFFT {
  readonly size: number;
  readonly bins: number;
  private readonly cosTable: Float32Array;
  private readonly sinTable: Float32Array;
  private readonly reverse: Uint32Array;
  private readonly re: Float32Array;
  private readonly im: Float32Array;

  constructor(size: number) {
    if (size < 4 || (size & (size - 1)) !== 0) throw new Error(`FFT-Größe muss eine Zweierpotenz ≥ 4 sein (erhalten: ${size})`);
    this.size = size;
    this.bins = size / 2 + 1;
    this.cosTable = new Float32Array(size / 2);
    this.sinTable = new Float32Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      const angle = (-2 * Math.PI * i) / size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }
    const levels = Math.log2(size);
    this.reverse = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
      let r = 0;
      for (let b = 0; b < levels; b++) r |= ((i >>> b) & 1) << (levels - 1 - b);
      this.reverse[i] = r;
    }
    this.re = new Float32Array(size);
    this.im = new Float32Array(size);
  }

  /**
   * Betragsspektrum (`bins` Werte, Bin 0 = Gleichanteil, letzter Bin = Nyquist) des Eingangs.
   * Der Eingang wird nicht verändert; ein Fenster muss vorher angewendet sein.
   */
  magnitudes(input: Float32Array, out: Float32Array = new Float32Array(this.bins)): Float32Array {
    const n = this.size;
    if (input.length < n) throw new Error('Eingang kürzer als die FFT-Größe');
    const re = this.re;
    const im = this.im;
    for (let i = 0; i < n; i++) {
      re[this.reverse[i]!] = input[i]!;
      im[i] = 0;
    }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >>> 1;
      const step = n / len;
      for (let start = 0; start < n; start += len) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const wr = this.cosTable[k]!;
          const wi = this.sinTable[k]!;
          const a = start + j;
          const b = a + half;
          const xr = re[b]! * wr - im[b]! * wi;
          const xi = re[b]! * wi + im[b]! * wr;
          re[b] = re[a]! - xr;
          im[b] = im[a]! - xi;
          re[a] = re[a]! + xr;
          im[a] = im[a]! + xi;
        }
      }
    }
    for (let i = 0; i < this.bins; i++) out[i] = Math.hypot(re[i]!, im[i]!);
    return out;
  }
}

/** Hann-Fenster der Länge n (periodische Form). */
export function hannWindow(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
  return w;
}

/** Summe der Fensterwerte – zur Normierung von Amplituden. */
export function windowSum(window: Float32Array): number {
  let s = 0;
  for (let i = 0; i < window.length; i++) s += window[i]!;
  return s;
}

/** Wendet ein Fenster auf `input` an und schreibt das Ergebnis nach `out`. */
export function applyWindow(input: Float32Array, window: Float32Array, out: Float32Array): Float32Array {
  const n = window.length;
  for (let i = 0; i < n; i++) out[i] = input[i]! * window[i]!;
  return out;
}

/** Frequenz (Hz) eines FFT-Bins. */
export function binFrequency(bin: number, fftSize: number, sampleRate: number): number {
  return (bin * sampleRate) / fftSize;
}
