import { useEffect, useRef } from 'react';
import { ProgressRepository } from '@/core/storage/repositories';
import type { PracticeKind, PracticeSessionRecord } from '@/core/storage/types';

/**
 * Misst die Zeit auf einer Übungsseite und speichert sie als Übungssitzung,
 * sobald die Seite verlassen oder die App in den Hintergrund geschickt wird.
 * Nur aktive Zeit zählt: Wird `active` auf false gesetzt, pausiert die Messung.
 */
export function usePracticeSession(kind: PracticeKind, options: { refId?: string; title?: string; active?: boolean; details?: () => PracticeSessionRecord['details'] } = {}): { elapsedSec: () => number; flush: () => Promise<void> } {
  const { refId, title, active = true } = options;
  const detailsRef = useRef(options.details);
  const segmentStart = useRef<number | null>(null);
  const accumulated = useRef(0);
  const flushedAt = useRef(0);

  const elapsedSec = (): number => {
    const running = segmentStart.current ? (Date.now() - segmentStart.current) / 1000 : 0;
    return accumulated.current + running;
  };

  const flush = async (): Promise<void> => {
    if (segmentStart.current) {
      accumulated.current += (Date.now() - segmentStart.current) / 1000;
      segmentStart.current = active ? Date.now() : null;
    }
    const total = accumulated.current - flushedAt.current;
    if (total < 5) return;
    const now = Date.now();
    const input: Parameters<ProgressRepository['recordSession']>[0] = { kind, startedAt: now - total * 1000, endedAt: now };
    if (refId) input.refId = refId;
    if (title) input.title = title;
    const details = detailsRef.current?.();
    if (details) input.details = details;
    flushedAt.current = accumulated.current;
    await new ProgressRepository().recordSession(input);
  };

  const flushRef = useRef(flush);
  useEffect(() => {
    detailsRef.current = options.details;
    flushRef.current = flush;
  });

  useEffect(() => {
    if (active) segmentStart.current = Date.now();
    else if (segmentStart.current) {
      accumulated.current += (Date.now() - segmentStart.current) / 1000;
      segmentStart.current = null;
    }
  }, [active]);

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') void flushRef.current();
      else if (active && !segmentStart.current) segmentStart.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
      void flushRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, refId]);

  return { elapsedSec, flush };
}
