import { describe, expect, it } from 'vitest';
import { decodeWav, encodeWav } from './wav';

describe('WAV', () => {
  it('schreibt einen gültigen Kopf und liest die Samples zurück', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25]);
    const buffer = encodeWav(samples, 48000);
    expect(buffer.byteLength).toBe(44 + samples.length * 2);
    const text = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
    expect(text).toBe('RIFF');
    const decoded = decodeWav(buffer);
    expect(decoded.sampleRate).toBe(48000);
    expect(decoded.channels).toBe(1);
    expect(decoded.samples.length).toBe(samples.length);
    for (let i = 0; i < samples.length; i++) expect(decoded.samples[i]!).toBeCloseTo(samples[i]!, 3);
  });

  it('lehnt andere Dateien ab', () => {
    expect(() => decodeWav(new ArrayBuffer(12))).toThrow();
  });
});
