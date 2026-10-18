import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/core/storage/db';

/** Sterne der Kinderspiele – klein, deshalb im Meta-Speicher statt in einer eigenen Tabelle. */
export interface KidsProgress {
  stars: number;
  byGame: Record<string, number>;
  /** Beste Sternezahl je Lied. */
  songs: Record<string, number>;
  /** Geschaffte Lektionen der Kinder-Schule (IDs in Reihenfolge des Abschlusses). */
  lessonsDone: string[];
  /** Beste Sterne je Lektion. */
  lessonStars: Record<string, number>;
}

const KEY = 'kidsProgress';
const EMPTY: KidsProgress = { stars: 0, byGame: {}, songs: {}, lessonsDone: [], lessonStars: {} };

function normalize(value: unknown): KidsProgress {
  if (!value || typeof value !== 'object') return { ...EMPTY };
  const v = value as Partial<KidsProgress>;
  return {
    stars: typeof v.stars === 'number' ? v.stars : 0,
    byGame: { ...(v.byGame ?? {}) },
    songs: { ...(v.songs ?? {}) },
    lessonsDone: Array.isArray(v.lessonsDone) ? [...v.lessonsDone] : [],
    lessonStars: { ...(v.lessonStars ?? {}) },
  };
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

/** Lektion abschließen: schaltet die nächste frei; Sterne nur für Verbesserungen. */
export async function completeKidsLesson(lessonId: string, stars: number): Promise<KidsProgress> {
  const current = await loadKidsProgress();
  if (!current.lessonsDone.includes(lessonId)) current.lessonsDone.push(lessonId);
  const best = current.lessonStars[lessonId] ?? 0;
  const gained = Math.max(0, stars - best);
  current.lessonStars[lessonId] = Math.max(best, stars);
  current.stars += gained;
  current.byGame.schule = (current.byGame.schule ?? 0) + gained;
  await getDb().meta.put({ key: KEY, value: current });
  return current;
}

export function useKidsProgress(): KidsProgress {
  const value = useLiveQuery<KidsProgress>(async () => normalize((await getDb().meta.get(KEY))?.value), []);
  return value ?? EMPTY;
}
