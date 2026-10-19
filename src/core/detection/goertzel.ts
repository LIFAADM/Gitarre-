/**
 * Goertzel-Verfahren: Energie eines Signals bei einer beliebigen (auch nicht bin-genauen) Frequenz.
 *
 * Im Gegensatz zur FFT lässt sich damit exakt bei 82,41 Hz (E2) oder bei 3 · 82,41 Hz nachsehen,
 * ohne an das Raster der FFT-Bins gebunden zu sein. Aufwand O(N) je Frequenz.
 */

/**
 * Amplituden-Schätzung² bei `hz` für einen bereits gefensterten Puffer.
 * Ein Sinus mit Amplitude A liefert ≈ A² (bei `windowSum` = Σ Fensterwerte).
 */
export function goertzelPower(buffer: Float32Array, sampleRate: number, hz: number, windowSum: number): number {
  const n = buffer.length;
  if (n === 0 || !(hz > 0) || hz >= sampleRate / 2 || !(windowSum > 0)) return 0;
  const omega = (2 * Math.PI * hz) / sampleRate;
  const coeff = 2 * Math.cos(omega);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    const s0 = buffer[i]! + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  const amplitude = (2 * Math.sqrt(Math.max(0, power))) / windowSum;
  return amplitude * amplitude;
}

/**
 * Erwartete Goertzel-Leistung von weißem Rauschen mit Effektivwert `noiseRms` bei Hann-Fensterung
 * der Länge n: E[A²] = 6 σ² / n. Dient als absolute Untergrenze für „Ton vorhanden“.
 */
export function noisePowerHann(noiseRms: number, n: number): number {
  if (!(noiseRms > 0) || n <= 0) return 0;
  return (6 * noiseRms * noiseRms) / n;
}
