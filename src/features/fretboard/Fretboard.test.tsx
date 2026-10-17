import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Fretboard } from './Fretboard';

// Vitest läuft ohne globale Hooks (`globals: false`), daher Aufräumen explizit registrieren.
afterEach(cleanup);

function labelTexts(): string[] {
  return [1, 2, 3, 4, 5, 6].map((s) => screen.getByTestId(`fb-string-label-${s}`).textContent ?? '');
}

function targetX(string: number, fret: number): number {
  return Number(screen.getByTestId(`fb-target-${string}-${fret}`).getAttribute('x'));
}

describe('Fretboard', () => {
  it('zeigt die sechs Saitennamen – deutsch mit H, international mit B', () => {
    const { unmount } = render(<Fretboard naming="de" />);
    // Saite 1 (hohe E) … Saite 6 (tiefe E)
    expect(labelTexts()).toEqual(['E', 'H', 'G', 'D', 'A', 'E']);
    unmount();
    render(<Fretboard naming="intl" />);
    expect(labelTexts()).toEqual(['E', 'B', 'G', 'D', 'A', 'E']);
  });

  it('meldet Saite, Bund und MIDI-Ton beim Tippen', () => {
    const onTap = vi.fn();
    render(<Fretboard onTap={onTap} />);
    fireEvent.click(screen.getByRole('button', { name: 'Saite 3, Bund 2 (A3)' }));
    expect(onTap).toHaveBeenCalledWith({ string: 3, fret: 2, midi: 57 });
    fireEvent.click(screen.getByRole('button', { name: 'Saite 6, leere Saite (E2)' }));
    expect(onTap).toHaveBeenLastCalledWith({ string: 6, fret: 0, midi: 40 });
  });

  it('reagiert auch auf die Tastatur (Enter)', () => {
    const onTap = vi.fn();
    render(<Fretboard onTap={onTap} />);
    fireEvent.keyDown(screen.getByTestId('fb-target-1-1'), { key: 'Enter' });
    expect(onTap).toHaveBeenCalledWith({ string: 1, fret: 1, midi: 65 });
  });

  it('hat große Tippflächen (mindestens 40 × 40 px) und 12 Bünde als Standard', () => {
    render(<Fretboard />);
    const targets = screen.getAllByRole('button');
    expect(targets).toHaveLength(6 * 13);
    for (const t of targets) {
      expect(Number(t.getAttribute('width'))).toBeGreaterThanOrEqual(40);
      expect(Number(t.getAttribute('height'))).toBeGreaterThanOrEqual(40);
    }
  });

  it('zeichnet Markierungen mit Fingernummer bzw. eigenem Text', () => {
    render(
      <Fretboard
        highlights={[
          { string: 2, fret: 1, finger: 1 },
          { string: 3, fret: 2, finger: 2, tone: 'ok' },
          { string: 4, fret: 3, label: 'R', tone: 'bad' },
          { string: 1, fret: 0, tone: 'gold' },
        ]}
      />,
    );
    expect(screen.getByTestId('fb-highlight-2-1')).toHaveTextContent('1');
    expect(screen.getByTestId('fb-highlight-3-2')).toHaveTextContent('2');
    expect(screen.getByTestId('fb-highlight-4-3')).toHaveTextContent('R');
    // Leere Saite: Ring um den Saitennamen, kein zusätzlicher Text
    expect(screen.getByTestId('fb-highlight-1-0')).toBeInTheDocument();
    expect(screen.getByTestId('fb-string-label-1')).toHaveTextContent('E');
  });

  it('spiegelt das Griffbrett für Linkshänder', () => {
    const { unmount } = render(<Fretboard />);
    const nutRight = Number(screen.getByTestId('fretboard-nut').getAttribute('x'));
    expect(targetX(1, 1)).toBeLessThan(targetX(1, 2));
    expect(targetX(1, 0)).toBeLessThan(nutRight);
    unmount();

    render(<Fretboard leftHanded />);
    const nutLeft = Number(screen.getByTestId('fretboard-nut').getAttribute('x'));
    expect(nutLeft).toBeGreaterThan(nutRight);
    expect(targetX(1, 1)).toBeGreaterThan(targetX(1, 2));
    expect(targetX(1, 0)).toBeGreaterThan(nutLeft);
  });

  it('kann die tiefe E-Saite oben zeigen (Blick auf die Gitarre)', () => {
    render(<Fretboard orientation="player-view" />);
    const yOf = (s: number): number => Number(screen.getByTestId(`fb-target-${s}-1`).getAttribute('y'));
    expect(yOf(6)).toBeLessThan(yOf(1));
    expect(labelTexts()).toEqual(['E', 'H', 'G', 'D', 'A', 'E']);
  });

  it('blendet Tonnamen auf Wunsch ein', () => {
    const { rerender } = render(<Fretboard />);
    expect(screen.queryByTestId('fb-note-2-1')).toBeNull();
    rerender(<Fretboard showNoteNames />);
    expect(screen.getByTestId('fb-note-2-1')).toHaveTextContent('C');
    expect(screen.getByTestId('fb-note-6-3')).toHaveTextContent('G');
  });

  it('begrenzt die Bundzahl und ignoriert Markierungen außerhalb', () => {
    render(<Fretboard frets={5} highlights={[{ string: 1, fret: 9, finger: 4 }]} />);
    expect(screen.getAllByRole('button')).toHaveLength(6 * 6);
    expect(screen.queryByTestId('fb-highlight-1-9')).toBeNull();
  });
});
