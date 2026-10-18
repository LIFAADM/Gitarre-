import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MetronomeState } from '@/core/audio/metronome';

// Vitest läuft ohne globale Hooks (`globals: false`), daher Aufräumen explizit registrieren.
afterEach(cleanup);

const mocks = vi.hoisted(() => {
  const defaults = { running: false, bpm: 80, numerator: 4, denominator: 4, accentFirst: true, volume: 0.7, subdivision: 1 as const };
  const state: MetronomeState = { ...defaults };
  const metronome = {
    start: vi.fn(),
    stop: vi.fn(),
    toggle: vi.fn(),
    setBpm: vi.fn(),
    setTimeSignature: vi.fn(),
    setVolume: vi.fn(),
    setAccentFirst: vi.fn(),
    setSubdivision: vi.fn(),
    getState: () => state,
    subscribe: () => () => undefined,
    currentBeat: () => null,
    beatsPerBar: () => (state.denominator === 8 && state.numerator % 3 === 0 && state.numerator > 3 ? state.numerator / 3 : state.numerator),
    beatSeconds: () => 60 / state.bpm,
  };
  const settings = { metronomeVolume: 0.7 };
  const updateSettings = vi.fn(() => Promise.resolve(settings));
  const unlockAudio = vi.fn(() => Promise.resolve());
  return { defaults, state, metronome, settings, updateSettings, unlockAudio };
});

vi.mock('@/core/audio/audioContext', () => ({ unlockAudio: mocks.unlockAudio }));
vi.mock('@/hooks/useEngine', () => ({
  useEngine: () => ({ ctx: { currentTime: 0 }, synth: {}, metronome: mocks.metronome, player: {}, setClickVolume: () => undefined }),
  useMetronomeState: () => mocks.state,
}));
vi.mock('@/hooks/useSettings', () => ({ useSettings: () => [mocks.settings, mocks.updateSettings] }));

import { MetronomeWidget, tempoWord } from './MetronomeWidget';

describe('MetronomeWidget', () => {
  beforeEach(() => {
    Object.assign(mocks.state, mocks.defaults);
    vi.clearAllMocks();
  });

  it('startet das Metronom mit „Start“ (und schaltet Audio frei)', () => {
    render(<MetronomeWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(mocks.unlockAudio).toHaveBeenCalledTimes(1);
    expect(mocks.metronome.start).toHaveBeenCalledTimes(1);
    expect(mocks.metronome.stop).not.toHaveBeenCalled();
  });

  it('zeigt bei laufendem Metronom „Stopp“ und stoppt', () => {
    mocks.state.running = true;
    render(<MetronomeWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Stopp' }));
    expect(mocks.metronome.stop).toHaveBeenCalledTimes(1);
    expect(mocks.metronome.start).not.toHaveBeenCalled();
  });

  it('„+1“ erhöht das Tempo von 80 auf 81, „−5“ senkt es auf 75', () => {
    render(<MetronomeWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Tempo um 1 erhöhen' }));
    expect(mocks.metronome.setBpm).toHaveBeenCalledWith(81);
    fireEvent.click(screen.getByRole('button', { name: 'Tempo um 5 verringern' }));
    expect(mocks.metronome.setBpm).toHaveBeenLastCalledWith(75);
  });

  it('der Regler setzt das Tempo direkt', () => {
    render(<MetronomeWidget />);
    fireEvent.change(screen.getByRole('slider', { name: 'Tempo in BPM' }), { target: { value: '100' } });
    expect(mocks.metronome.setBpm).toHaveBeenCalledWith(100);
  });

  it('3/4 setzt die Taktart', () => {
    render(<MetronomeWidget />);
    fireEvent.click(screen.getByRole('radio', { name: '3/4' }));
    expect(mocks.metronome.setTimeSignature).toHaveBeenCalledWith(3, 4);
    fireEvent.click(screen.getByRole('radio', { name: '6/8' }));
    expect(mocks.metronome.setTimeSignature).toHaveBeenLastCalledWith(6, 8);
  });

  it('Betonung und Unterteilung werden an das Metronom weitergegeben', () => {
    render(<MetronomeWidget />);
    fireEvent.click(screen.getByRole('switch', { name: /Erster Schlag betont/ }));
    expect(mocks.metronome.setAccentFirst).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole('radio', { name: 'Triolen' }));
    expect(mocks.metronome.setSubdivision).toHaveBeenCalledWith(3);
  });

  it('Lautstärke wird am Metronom gesetzt und in den Einstellungen gespeichert', () => {
    render(<MetronomeWidget />);
    fireEvent.change(screen.getByRole('slider', { name: 'Lautstärke des Metronoms' }), { target: { value: '0.5' } });
    expect(mocks.metronome.setVolume).toHaveBeenCalledWith(0.5);
    expect(mocks.updateSettings).toHaveBeenCalledWith({ metronomeVolume: 0.5 });
  });

  it('Tap-Tempo mittelt die letzten Tipps (4 Tipps im Abstand von 500 ms → 120 BPM)', () => {
    // performance.now wird auch von React selbst aufgerufen – daher eine steuerbare Uhr statt fester Rückgabefolge.
    let clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    render(<MetronomeWidget />);
    const tap = screen.getByRole('button', { name: 'Tempo tippen' });
    fireEvent.click(tap);
    expect(mocks.metronome.setBpm).not.toHaveBeenCalled();
    for (const t of [500, 1000, 1500]) {
      clock = t;
      fireEvent.click(tap);
    }
    expect(mocks.metronome.setBpm).toHaveBeenLastCalledWith(120);
    expect(screen.getByText('4× getippt')).toBeInTheDocument();
  });

  it('zeigt Tempo, Tempowort und die Schläge pro Takt', () => {
    render(<MetronomeWidget />);
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('Andante')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '4 Schläge pro Takt' })).toBeInTheDocument();
  });

  it('im Kompaktmodus fehlen Unterteilung und Lautstärke', () => {
    render(<MetronomeWidget compact />);
    expect(screen.queryByRole('radio', { name: 'Triolen' })).toBeNull();
    expect(screen.queryByRole('slider', { name: 'Lautstärke des Metronoms' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '3/4' })).toBeInTheDocument();
  });
});

describe('tempoWord', () => {
  it('ordnet BPM den italienischen Tempobezeichnungen zu', () => {
    expect(tempoWord(40).name).toBe('Largo');
    expect(tempoWord(59).name).toBe('Largo');
    expect(tempoWord(60).name).toBe('Adagio');
    expect(tempoWord(75).name).toBe('Adagio');
    expect(tempoWord(76).name).toBe('Andante');
    expect(tempoWord(107).name).toBe('Andante');
    expect(tempoWord(108).name).toBe('Moderato');
    expect(tempoWord(119).name).toBe('Moderato');
    expect(tempoWord(120).name).toBe('Allegro');
    expect(tempoWord(167).name).toBe('Allegro');
    expect(tempoWord(168).name).toBe('Presto');
    expect(tempoWord(220).name).toBe('Presto');
  });
});
