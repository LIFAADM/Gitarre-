import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui';
import { ACHIEVEMENTS, evaluateAchievements, newlyUnlocked } from '@/core/progress/achievements';
import { getDb } from '@/core/storage/db';

/** Live-Daten für Dashboard, Üben und Fortschritt (alles aus IndexedDB). */
export function useAppData() {
  const db = getDb();
  const sessions = useLiveQuery(() => db.practiceSessions.toArray(), []);
  const lessonProgress = useLiveQuery(() => db.lessonProgress.toArray(), []);
  const songProgress = useLiveQuery(() => db.songProgress.toArray(), []);
  const songs = useLiveQuery(() => db.songs.toArray(), []);
  const versions = useLiveQuery(() => db.songVersions.toArray(), []);
  const achievements = useLiveQuery(() => db.achievements.toArray(), []);
  const goals = useLiveQuery(() => db.goals.orderBy('order').toArray(), []);
  const playableSongIds = useMemo(() => new Set((versions ?? []).map((v) => v.songId)), [versions]);
  const loaded = sessions !== undefined && lessonProgress !== undefined && songProgress !== undefined && songs !== undefined && versions !== undefined && achievements !== undefined && goals !== undefined;
  return {
    loaded,
    sessions: sessions ?? [],
    lessonProgress: lessonProgress ?? [],
    songProgress: songProgress ?? [],
    songs: songs ?? [],
    versions: versions ?? [],
    achievements: achievements ?? [],
    goals: goals ?? [],
    playableSongIds,
  };
}

/** Prüft Erfolge anhand echter Daten und speichert neue mit Zeitstempel. */
export function useAchievementSync(data: ReturnType<typeof useAppData>): void {
  const toast = useToast();
  useEffect(() => {
    if (!data.loaded) return;
    const evaluated = evaluateAchievements({ sessions: data.sessions, lessons: data.lessonProgress, songs: data.songProgress });
    const fresh = newlyUnlocked(evaluated, data.achievements);
    if (fresh.length === 0) return;
    const now = Date.now();
    void getDb()
      .achievements.bulkPut(fresh.map((id) => ({ id, unlockedAt: now })))
      .then(() => {
        for (const id of fresh) {
          const def = ACHIEVEMENTS.find((a) => a.id === id);
          if (def) toast.show(`Erfolg freigeschaltet: ${def.title}`, 'success', 5000);
        }
      });
  }, [data.loaded, data.sessions, data.lessonProgress, data.songProgress, data.achievements, toast]);
}
