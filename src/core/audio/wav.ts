/**
 * WAV-Dateien schreiben und lesen (PCM 16 Bit, mono) – für Export aus dem Erkennungs-Labor
 * und das Einlesen echter Aufnahmen im Benchmark. Keine Browser-APIs.
 */

export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

export interface DecodedWav {
  sampleRate: number;
  channels: number;
  /** Erster Kanal (bei Stereo: Mittel aus beiden), Werte −1 … 1. */
  samples: Float32Array;
}

/** Liest PCM-WAV (8/16/24/32 Bit Integer oder 32 Bit Float). */
export function decodeWav(buffer: ArrayBuffer): DecodedWav {
  const view = new DataView(buffer);
  const tag = (offset: number): string => String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Keine WAV-Datei');
  let offset = 12;
  let format = 0;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let dataOffset = -1;
  let dataLength = 0;
  while (offset + 8 <= view.byteLength) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
      if (format === 0xfffe && size >= 26) format = view.getUint16(body + 24, true);
    } else if (id === 'data') {
      dataOffset = body;
      dataLength = Math.min(size, view.byteLength - body);
      break;
    }
    offset = body + size + (size % 2);
  }
  if (dataOffset < 0 || channels === 0 || sampleRate === 0) throw new Error('WAV-Datei unvollständig');
  const bytesPerSample = bits / 8;
  const frames = Math.floor(dataLength / (bytesPerSample * channels));
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      const p = dataOffset + (i * channels + c) * bytesPerSample;
      let v: number;
      if (format === 3 && bits === 32) v = view.getFloat32(p, true);
      else if (bits === 16) v = view.getInt16(p, true) / 0x8000;
      else if (bits === 24) v = ((view.getUint8(p) | (view.getUint8(p + 1) << 8) | (view.getInt8(p + 2) << 16)) << 8) / 0x80000000;
      else if (bits === 32) v = view.getInt32(p, true) / 0x80000000;
      else if (bits === 8) v = (view.getUint8(p) - 128) / 128;
      else throw new Error(`WAV mit ${bits} Bit wird nicht unterstützt`);
      sum += v;
    }
    samples[i] = sum / channels;
  }
  return { sampleRate, channels, samples };
}
