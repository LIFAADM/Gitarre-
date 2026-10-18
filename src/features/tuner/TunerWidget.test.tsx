import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { centsBetween, midiToFrequency } from '@/core/music/notes';
import { usePitchDetection, type PitchDetection } from '@/hooks/usePitchDetection';
import { evaluateReading, formatCents, formatHz, TunerWidget } from './TunerWidget';
import { tuningStrings } from '@/core/music/tuning';

vi.mock('@/hooks/usePitchDetection', () => ({ usePitchDetection: vi.fn() }));
vi.mock('@/hooks/usePracticeSession', () => ({ usePracticeSession: () => ({ elapsedSec: () => 0, flush: async () => undefined }) }));
vi.mock('@/core/audio/guitarSynth', () => ({ playReferenceTone: vi.fn(() => vi.fn()) }));
vi.mock('@/core/audio/audioContext', () => ({ unlockAudio: vi.fn(async () => ({})), getAudioContext: vi.fn(() => ({})) }));

function detection(partial: Partial<PitchDetection> = {}): PitchDetection {
  return {
    pitch: null,
    level: 0,
    status: 'idle',
    error: null,
    supported: true,
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    pause: vi.fn(),
    ...partial,
  };
}

/** Stabile Tonhöhe bei `frequency` Hz, wie sie der PitchTracker liefern würde. */
function stablePitch(frequency: number) {
  const midiFloat = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(midiFloat);
  return { frequency, midi, cents: (midiFloat - midi) * 100, stable: true, level: 0.05 };
}

function mockDetection(partial: Partial<PitchDetection> = {}): PitchDetection {
  const value = detection(partial);
  vi.mocked(usePitchDetection).mockReturnValue(value);
  return value;
}

describe('TunerWidget', () => {
  beforeEach(() => {
    mockDetection();
  });
  afterEach(() => {
    cleanup();
  });

  it('zeigt E4 und „richtig gestimmt“ bei 330 Hz', () => {
    mockDetection({ status: 'listening', pitch: stablePitch(330), level: 0.05 });
    render(<TunerWidget />);
    expect(screen.getByTestId('tuner-note')).toHaveTextContent('E4');
    expect(screen.getByRole('status')).toHaveTextContent(/richtig gestimmt/);
    expect(screen.getByTestId('tuner-details')).toHaveTextContent('330,0 Hz');
    expect(screen.getByTestId('tuner-details')).toHaveTextContent('+2 Cent');
  });

  it('meldet „zu tief“ bei 320 Hz (E-Saite zu tief)', () => {
    mockDetection({ status: 'listening', pitch: stablePitch(320), level: 0.05 });
    render(<TunerWidget />);
    expect(screen.getByTestId('tuner-note')).toHaveTextContent('E4');
    expect(screen.getByRole('status')).toHaveTextContent(/zu tief/);
    expect(screen.getByRole('status')).toHaveTextContent(/Wirbel anziehen/);
  });

  it('meldet „zu hoch“ bei 113 Hz (A-Saite zu hoch)', () => {
    mockDetection({ status: 'listening', pitch: stablePitch(113), level: 0.05 });
    render(<TunerWidget />);
    expect(screen.getByTestId('tuner-note')).toHaveTextContent('A2');
    expect(screen.getByRole('status')).toHaveTextContent(/zu hoch/);
  });

  it('zeigt „–“ und den Anfänger-Hinweis, wenn nichts Stabiles erkannt wird', () => {
    mockDetection({ status: 'listening', pitch: null });
    render(<TunerWidget />);
    expect(screen.getByTestId('tuner-note')).toHaveTextContent('–');
    expect(screen.getByText(/Spiele eine Saite einzeln an/)).toBeInTheDocument();
  });

  it('verwendet deutsche Notennamen (H3) und zeigt alle sechs Saiten mit Zielfrequenz', () => {
    render(<TunerWidget />);
    for (const name of ['E2', 'A2', 'D3', 'G3', 'H3', 'E4']) {
      expect(screen.getByRole('button', { name: new RegExp(`^Saite \\d: ${name}`) })).toBeInTheDocument();
    }
    expect(screen.getByText('82,4 Hz')).toBeInTheDocument();
    expect(screen.getByText('329,6 Hz')).toBeInTheDocument();
  });

  it('startet das Mikrofon über die große Schaltfläche', () => {
    const d = mockDetection({ status: 'idle' });
    render(<TunerWidget />);
    fireEvent.click(screen.getByRole('button', { name: /Mikrofon starten/ }));
    expect(d.start).toHaveBeenCalledTimes(1);
  });

  it('stoppt das Mikrofon, wenn es läuft', () => {
    const d = mockDetection({ status: 'listening' });
    render(<TunerWidget />);
    fireEvent.click(screen.getByRole('button', { name: /Mikrofon stoppen/ }));
    expect(d.stop).toHaveBeenCalledTimes(1);
  });

  it('zeigt die Fehlermeldung mit „Erneut versuchen“', () => {
    const message = 'Der Mikrofonzugriff wurde verweigert. Bitte erlaube GuitarCoach den Zugriff in den Safari-/iOS-Einstellungen.';
    const d = mockDetection({ status: 'error', error: message });
    render(<TunerWidget />);
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/ }));
    expect(d.start).toHaveBeenCalledTimes(1);
  });

  it('bewertet im manuellen Modus gegen die gewählte Saite', () => {
    // 330 Hz ist für die hohe E-Saite richtig, für die gewählte tiefe E-Saite aber weit zu hoch.
    mockDetection({ status: 'listening', pitch: stablePitch(330), level: 0.05 });
    render(<TunerWidget />);
    fireEvent.click(screen.getByRole('button', { name: /^Saite 6: E2/ }));
    expect(screen.getByTestId('tuner-note')).toHaveTextContent('E2');
    expect(screen.getByRole('status')).toHaveTextContent(/zu hoch/);
    expect(screen.getByText(/Hast du die richtige Saite gewählt/)).toBeInTheDocument();
  });

  it('pausiert die Auswertung, während ein Referenzton erklingt', async () => {
    const d = mockDetection({ status: 'listening' });
    render(<TunerWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Referenzton A2 abspielen' }));
    expect(await screen.findByText(/Referenzton A2/)).toBeInTheDocument();
    expect(d.pause).toHaveBeenCalledWith(2800);
  });
});

describe('Hilfsfunktionen', () => {
  it('formatiert Frequenzen und Cent auf Deutsch', () => {
    expect(formatHz(329.63)).toBe('329,6 Hz');
    expect(formatHz(82.4069)).toBe('82,4 Hz');
    expect(formatCents(12.4)).toBe('+12 Cent');
    expect(formatCents(-3.6)).toBe('−4 Cent');
    expect(formatCents(0.2)).toBe('±0 Cent');
  });

  it('wählt im Automatikmodus die nächstgelegene Saite', () => {
    const strings = tuningStrings();
    const e2 = strings.find((s) => s.number === 6)!;
    const reading = evaluateReading(stablePitch(80), 'auto', e2, strings, 5, 'de');
    expect(reading.target.number).toBe(6);
    expect(reading.nameWithOctave).toBe('E2');
    expect(reading.cents).toBeCloseTo(centsBetween(80, midiToFrequency(40)), 6);
    expect(reading.state).toBe('far');
    expect(reading.direction).toBe('low');
    expect(reading.farOff).toBe(false);
  });

  it('kennzeichnet Toleranz, Nähe und große Abweichung', () => {
    const strings = tuningStrings();
    const g3 = strings.find((s) => s.number === 3)!;
    const ok = evaluateReading(stablePitch(196.3), 'manual', g3, strings, 5, 'de');
    expect(ok.state).toBe('ok');
    expect(ok.direction).toBe('ok');
    const near = evaluateReading(stablePitch(197.2), 'manual', g3, strings, 5, 'de');
    expect(near.state).toBe('near');
    expect(near.direction).toBe('high');
    const far = evaluateReading(stablePitch(246.94), 'manual', g3, strings, 5, 'de');
    expect(far.farOff).toBe(true);
    expect(far.nearestName).toBe('H3');
  });
});
