import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/core/storage/db';

/** Sterne der Kinderspiele – klein, deshalb im Meta-Speicher statt in einer eigenen Tabelle. */
export interface KidsProgress {
  stars: number;
  byGame: Record<string, number>;
  /** Beste Sternezahl je Lied. */
  songs: Record<string, number>;
}

const KEY = 'kidsProgress';
const EMPTY: KidsProgress = { stars: 0, byGame: {}, songs: {} };

function normalize(value: unknown): KidsProgress {
  if (!value || typeof value !== 'object') return { ...EMPTY };
  const v = value as Partial<KidsProgress>;
  return { stars: typeof v.stars === 'number' ? v.stars : 0, byGame: { ...(v.byGame ?? {}) }, songs: { ...(v.songs ?? {}) } };
}

export async function loadKidsProgress(): Promise<KidsProgress> {
  const rec = await getDb().meta.get(KEY);
  return normalize(rec?.value);
}

/** Schreibt gewonnene Sterne gut (Lieder: nur die beste Wertung zählt). */
export async function addKidsStars(game: string, stars: number, songId?: string): Promise<KidsProgress> {
  const current = await loadKidsProgress();
  let gained = Math.max(0, stars);
  if (songId) {
    const best = current.songs[songId] ?? 0;
    gained = Math.max(0, stars - best);
    current.songs[songId] = Math.max(best, stars);
  }
  current.stars += gained;
  current.byGame[game] = (current.byGame[game] ?? 0) + gained;
  await getDb().meta.put({ key: KEY, value: current });
  return current;
}

export function useKidsProgress(): KidsProgress {
  const value = useLiveQuery<KidsProgress>(async () => normalize((await getDb().meta.get(KEY))?.value), []);
  return value ?? EMPTY;
}
