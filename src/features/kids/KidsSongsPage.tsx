import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router';
import { getDb } from '@/core/storage/db';
import type { SongRecord } from '@/core/storage/types';
import { KidsShell, StarRow } from './KidsShell';
import { KIDS_SONGS } from './kidsData';
import { useKidsProgress } from './kidsProgress';

/** Lieder der Bibliothek, die für Kinder freigegeben sind und Notendaten haben (Importe, Editor, Arrangements). */
function useLibraryKidsSongs(): SongRecord[] {
  const songs = useLiveQuery<SongRecord[]>(async () => {
    const db = getDb();
    const flagged = (await db.songs.toArray()).filter((s) => s.forKids);
    const result: SongRecord[] = [];
    for (const s of flagged) if ((await db.songVersions.where('songId').equals(s.id).count()) > 0) result.push(s);
    return result.sort((a, b) => a.title.localeCompare(b.title, 'de'));
  }, []);
  return songs ?? [];
}

/** Liederliste: große Kacheln mit Bild, Titel und bisher erreichten Sternen. */
export function KidsSongsPage() {
  const navigate = useNavigate();
  const progress = useKidsProgress();
  const library = useLibraryKidsSongs();
  return (
    <KidsShell title="Lieder" emoji="🎵" instruction="Such dir ein Lied aus. Ich spiele es dir vor, und dann spielst du mit.">
      <div className="flex flex-col gap-3">
        {KIDS_SONGS.map((song, i) => (
          <button key={song.id} type="button" onClick={() => navigate(`/kinder/lieder/${song.id}`)} data-testid={`kids-song-${song.id}`} className="flex items-center gap-4 rounded-[1.75rem] border-4 border-white/10 bg-white/5 px-4 py-4 text-left shadow-lg transition active:scale-[0.98]">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-4xl" style={{ backgroundColor: ['#e5484d', '#f2c94c', '#3fbf7f', '#3b8be8'][i % 4] }} aria-hidden>
              {song.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xl font-extrabold">{song.title}</span>
              <span className="block text-sm text-muted">{song.notes.length} Töne</span>
            </span>
            <StarRow stars={progress.songs[song.id] ?? 0} size={22} />
          </button>
        ))}
        {library.map((song) => (
          <button key={song.id} type="button" onClick={() => navigate(`/kinder/lieder/${song.id}`)} data-testid={`kids-song-${song.id}`} className="flex items-center gap-4 rounded-[1.75rem] border-4 border-white/10 bg-white/5 px-4 py-4 text-left shadow-lg transition active:scale-[0.98]">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#a66ce0] text-4xl" aria-hidden>
              🎶
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xl font-extrabold">{song.title}</span>
              <span className="block truncate text-sm text-muted">{song.artist}</span>
            </span>
            <StarRow stars={progress.songs[song.id] ?? 0} size={22} />
          </button>
        ))}
      </div>
      {library.length === 0 && <p className="text-center text-xs text-muted">Eltern: Eigene oder importierte Lieder erscheinen hier, wenn sie in der Bibliothek „Im Kinder-Modus zeigen“ eingeschaltet haben.</p>}
    </KidsShell>
  );
}
