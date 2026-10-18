import { useSyncExternalStore } from 'react';

const MINUTE = 60_000;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) timer = setInterval(() => listeners.forEach((l) => l()), 15_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function snapshot(): number {
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}

/** Aktuelle Zeit, auf die Minute gerundet (stabil innerhalb eines Renders, aktualisiert sich automatisch). */
export function useNow(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
