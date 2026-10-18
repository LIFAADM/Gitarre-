import { describe, expect, it } from 'vitest';
import { buildSilentWav } from './mediaSession';

describe('buildSilentWav', () => {
  it('erzeugt eine gültige PCM-WAV-Datei mit Stille', () => {
    const wav = buildSilentWav(0.5, 8000);
    const text = (o: number, n: number) => String.fromCharCode(...wav.subarray(o, o + n));
    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 4)).toBe('WAVE');
    expect(text(36, 4)).toBe('data');
    const view = new DataView(wav.buffer);
    expect(view.getUint32(40, true)).toBe(4000);
    expect(wav.length).toBe(44 + 4000);
    expect(wav.subarray(44).every((b) => b === 128)).toBe(true);
  });
});
