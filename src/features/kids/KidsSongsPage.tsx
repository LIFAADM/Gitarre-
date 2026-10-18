import { useNavigate } from 'react-router';
import { KidsShell, StarRow } from './KidsShell';
import { KIDS_SONGS } from './kidsData';
import { useKidsProgress } from './kidsProgress';

/** Liederliste: große Kacheln mit Bild, Titel und bisher erreichten Sternen. */
export function KidsSongsPage() {
  const navigate = useNavigate();
  const progress = useKidsProgress();
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
      </div>
    </KidsShell>
  );
}
