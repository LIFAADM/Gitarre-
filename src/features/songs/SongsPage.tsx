import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Heart, ListMusic, Plus, Search, Upload } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Badge, EmptyState, IconButton, PageHeader, PressableCard, ProgressBar, Segmented } from '@/components/ui';
import { getDb } from '@/core/storage/db';
import { SongRepository } from '@/core/storage/repositories';
import { GENRES, type Genre, type SongRecord } from '@/core/storage/types';
import { cn } from '@/lib/cn';
import { STATUS_LABEL, songStatus, type SongStatus } from './songUtils';

type Filter = 'alle' | 'ready' | 'needs-import' | 'favoriten';

function statusRank(status: SongStatus): number {
  return status === 'ready' ? 0 : status === 'imported' ? 1 : 2;
}

export function SongsPage() {
  const navigate = useNavigate();
  const db = getDb();
  const songs = useLiveQuery(() => db.songs.toArray(), []);
  const versions = useLiveQuery(() => db.songVersions.toArray(), []);
  const progress = useLiveQuery(() => db.songProgress.toArray(), []);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('alle');
  const [genre, setGenre] = useState<Genre | 'alle'>('alle');

  const versionCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of versions ?? []) map.set(v.songId, (map.get(v.songId) ?? 0) + 1);
    return map;
  }, [versions]);
  const progressMap = useMemo(() => new Map((progress ?? []).map((p) => [p.songId, p])), [progress]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (songs ?? [])
      .filter((s) => {
        const status = songStatus(s, versionCount.get(s.id) ?? 0);
        if (filter === 'ready' && status === 'needs-import') return false;
        if (filter === 'needs-import' && status !== 'needs-import') return false;
        if (filter === 'favoriten' && !s.isFavorite) return false;
        if (genre !== 'alle' && s.genre !== genre) return false;
        if (q && !`${s.title} ${s.artist} ${s.genre}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => statusRank(songStatus(a, versionCount.get(a.id) ?? 0)) - statusRank(songStatus(b, versionCount.get(b.id) ?? 0)) || a.artist.localeCompare(b.artist, 'de') || a.title.localeCompare(b.title, 'de'));
  }, [songs, versionCount, filter, genre, query]);

  const genresInUse = useMemo(() => GENRES.filter((g) => (songs ?? []).some((s) => s.genre === g)), [songs]);
  const readyCount = (songs ?? []).filter((s) => songStatus(s, versionCount.get(s.id) ?? 0) !== 'needs-import').length;

  return (
    <>
      <PageHeader
        title="Meine Songs"
        subtitle={songs ? `${songs.length} Songs · ${readyCount} spielbereit · ${songs.length - readyCount} benötigen eine Tab-Datei` : 'Lade …'}
        actions={
          <>
            <IconButton label="Tab-Datei importieren" onClick={() => navigate('/songs/import')}>
              <Upload size={22} />
            </IconButton>
            <IconButton label="Song hinzufügen" onClick={() => navigate('/songs/neu')}>
              <Plus size={24} />
            </IconButton>
          </>
        }
      />
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3">
          <Search size={18} className="text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Titel oder Interpret suchen"
            className="h-11 w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            aria-label="Songs durchsuchen"
          />
        </label>
        <Segmented
          size="sm"
          ariaLabel="Filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'alle', label: 'Alle' },
            { value: 'ready', label: 'Spielbereit' },
            { value: 'needs-import', label: 'Tab nötig' },
            { value: 'favoriten', label: '♥' },
          ]}
        />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
          {(['alle', ...genresInUse] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(g)}
              className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold', genre === g ? 'border-gold bg-gold text-[#1b1507]' : 'border-border bg-surface text-muted')}
            >
              {g === 'alle' ? 'Alle Stile' : g}
            </button>
          ))}
        </div>

        {songs && filtered.length === 0 && (
          <EmptyState icon={<ListMusic size={36} />} title="Keine Songs gefunden" text="Ändere Suche oder Filter – oder füge einen eigenen Song hinzu." />
        )}

        <ul className="flex flex-col gap-2">
          {filtered.map((song) => {
            const count = versionCount.get(song.id) ?? 0;
            const status = songStatus(song, count);
            const p = progressMap.get(song.id);
            return (
              <li key={song.id}>
                <SongRow song={song} status={status} versionCount={count} progress={p?.progressPercent ?? 0} onOpen={() => navigate(`/songs/${song.id}`)} />
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function SongRow({ song, status, versionCount, progress, onOpen }: { song: SongRecord; status: SongStatus; versionCount: number; progress: number; onOpen: () => void }) {
  const tone = status === 'ready' ? 'ok' : status === 'imported' ? 'info' : 'warn';
  return (
    <PressableCard padding="sm" onClick={onOpen} className="relative">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold">{song.title}</h3>
          </div>
          <p className="truncate text-sm text-muted">{song.artist}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>
            <Badge tone="neutral">{song.genre}</Badge>
            <span className="ml-1 inline-flex items-center gap-0.5" aria-label={`Schwierigkeit ${song.difficulty} von 5`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i <= song.difficulty ? 'bg-gold' : 'bg-surface-3')} />
              ))}
            </span>
            {versionCount > 1 && <span className="text-xs text-muted">{versionCount} Versionen</span>}
          </div>
          {progress > 0 && <ProgressBar value={progress} className="mt-2 h-1.5" label="Lernfortschritt" />}
        </div>
        <span
          role="button"
          tabIndex={0}
          aria-label={song.isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
          onClick={(e) => {
            e.stopPropagation();
            void new SongRepository().toggleFavorite(song.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              void new SongRepository().toggleFavorite(song.id);
            }
          }}
          className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', song.isFavorite ? 'text-bad' : 'text-muted')}
        >
          <Heart size={22} fill={song.isFavorite ? 'currentColor' : 'none'} />
        </span>
      </div>
    </PressableCard>
  );
}
