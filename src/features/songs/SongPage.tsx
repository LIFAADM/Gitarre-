import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AudioLines, Download, Dumbbell, Heart, Info, PencilLine, Sparkles, Trash, Upload } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { Badge, Button, Card, EmptyState, IconButton, PageHeader, PressableCard, ProgressBar, Sheet, Toggle, useToast } from '@/components/ui';
import { getExercise } from '@/core/content/exercises';
import { createSongFile } from '@/core/import/gcjson';
import { getDb } from '@/core/storage/db';
import { SongRepository } from '@/core/storage/repositories';
import type { SongVersionRecord } from '@/core/storage/types';
import { simplifyScore } from '@/core/music/simplify';
import { SongPlayer } from '@/features/player/SongPlayer';
import { cn } from '@/lib/cn';
import { formatMinutes } from '@/lib/format';
import { DIFFICULTY_LABEL, RIGHTS_LABEL, STATUS_LABEL, downloadTextFile, slugify, songStatus, sortVersions } from './songUtils';

export function SongPage() {
  const { songId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const db = getDb();
  const repo = useMemo(() => new SongRepository(), []);
  const song = useLiveQuery(() => db.songs.get(songId), [songId]);
  const versions = useLiveQuery(() => db.songVersions.where('songId').equals(songId).toArray(), [songId]);
  const progress = useLiveQuery(() => db.songProgress.get(songId), [songId]);
  const sorted = useMemo(() => sortVersions(versions ?? []), [versions]);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SongVersionRecord | 'song' | null>(null);

  const selected = sorted.find((v) => v.id === versionId) ?? sorted[0] ?? null;

  useEffect(() => {
    if (song) void repo.markPlayed(song.id);
  }, [song?.id, repo, song]);

  if (song === undefined || versions === undefined) {
    return <PageHeader title="Song" back="/songs" />;
  }
  if (!song) {
    return (
      <>
        <PageHeader title="Song nicht gefunden" back="/songs" />
        <EmptyState title="Dieser Song existiert nicht mehr." action={<Button onClick={() => navigate('/songs')}>Zur Bibliothek</Button>} />
      </>
    );
  }

  const status = songStatus(song, sorted.length);
  const exercises = (song.prepExerciseIds ?? []).map(getExercise).filter((e): e is NonNullable<typeof e> => Boolean(e));

  const exportSong = (): void => {
    const file = createSongFile(song, sorted);
    downloadTextFile(`${slugify(song.title) || 'song'}.gcjson`, JSON.stringify(file, null, 2));
    toast.show('Song als GuitarCoach-Datei exportiert.', 'success');
  };

  const createSimplified = async (): Promise<void> => {
    if (!selected) return;
    try {
      const simplified = simplifyScore(selected.score, { trackIndex: 0 });
      const v = await repo.addVersion({
        songId: song.id,
        label: 'Vereinfacht',
        kind: 'simplified',
        score: simplified,
        description: `Automatisch vereinfacht aus „${selected.label}“: nur ein Ton pro Schlag (Melodie), ohne Spieltechniken, Sechzehntel zu Achteln zusammengefasst – keine originalgetreue Transkription.`,
      });
      setVersionId(v.id);
      setInfoOpen(false);
      toast.show('Vereinfachte Übungsversion erzeugt.', 'success');
    } catch (error) {
      toast.show(`Vereinfachung nicht möglich: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  const deleteVersion = async (v: SongVersionRecord): Promise<void> => {
    await repo.deleteVersion(v.id);
    setConfirmDelete(null);
    setVersionId(null);
    toast.show('Version gelöscht.', 'info');
  };

  const deleteSong = async (): Promise<void> => {
    await repo.delete(song.id);
    toast.show('Song gelöscht.', 'info');
    navigate('/songs');
  };

  return (
    <>
      <PageHeader
        title={song.title}
        subtitle={song.artist}
        back="/songs"
        compact
        actions={
          <>
            <IconButton label={song.isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'} onClick={() => void repo.toggleFavorite(song.id)} className={song.isFavorite ? 'text-bad' : ''}>
              <Heart size={22} fill={song.isFavorite ? 'currentColor' : 'none'} />
            </IconButton>
            <IconButton label="Informationen" onClick={() => setInfoOpen(true)}>
              <Info size={22} />
            </IconButton>
          </>
        }
      />

      <div className="flex flex-col gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={status === 'ready' ? 'ok' : status === 'imported' ? 'info' : 'warn'}>{STATUS_LABEL[status]}</Badge>
          <Badge tone="neutral">{song.genre}</Badge>
          <Badge tone="neutral">{DIFFICULTY_LABEL[song.difficulty]}</Badge>
          {song.originalTempo && <Badge tone="neutral">Original ca. ♩ = {song.originalTempo}</Badge>}
          {progress && progress.progressPercent > 0 && <Badge tone="gold">{progress.progressPercent} % gelernt</Badge>}
        </div>

        {sorted.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
            {sorted.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVersionId(v.id)}
                className={cn('shrink-0 rounded-2xl border px-3 py-2 text-left', selected?.id === v.id ? 'border-gold bg-gold/15' : 'border-border bg-surface')}
              >
                <span className="block text-sm font-semibold">{v.label}</span>
                <span className="block text-[11px] text-muted">
                  {v.noteCount} Töne · {v.barCount} Takte · bis Bund {v.maxFret}
                  {v.kind === 'simplified' && ' · vereinfacht'}
                </span>
              </button>
            ))}
          </div>
        )}

        {selected ? (
          <>
            {selected.description && <p className="text-sm text-muted">{selected.description}</p>}
            <SongPlayer key={selected.id} score={selected.score} songId={song.id} title={song.title} listenHref={`/songs/${song.id}/spiel-mit?version=${selected.id}`} highwayHref={`/songs/${song.id}/bahn?version=${selected.id}`} {...(selected.sourceFileId ? { sourceFileId: selected.sourceFileId } : {})} />
          </>
        ) : (
          <EmptyState
            icon={<Upload size={34} />}
            title="Noch keine spielbaren Noten"
            text={
              song.rightsStatus === 'needs-import'
                ? 'Dieser Song ist urheberrechtlich geschützt. Importiere eine eigene, rechtmäßig erworbene Guitar-Pro- oder MusicXML-Datei – danach kannst du ihn hier abspielen, verlangsamen und Note für Note üben.'
                : 'Importiere eine Tab-Datei oder erstelle eine Melodie im Tab-Editor.'
            }
            action={
              <div className="flex flex-col gap-2">
                <Button variant="primary" icon={<Upload size={18} />} onClick={() => navigate(`/songs/import?songId=${song.id}`)}>
                  Tab-Datei importieren
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/werkzeuge/editor?songId=${song.id}`)}>
                  Im Tab-Editor erstellen
                </Button>
              </div>
            }
          />
        )}

        {selected && (
          <PressableCard padding="sm" onClick={() => navigate(`/songs/${song.id}/mitspielen`)}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                <AudioLines size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Mit eigener Aufnahme mitspielen</span>
                <span className="block text-xs text-muted">MP3/WAV/M4A zuordnen, Zeitmarken setzen, Tabs laufen synchron</span>
              </span>
            </div>
          </PressableCard>
        )}

        {exercises.length > 0 && (
          <Card>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Dumbbell size={18} className="text-gold" /> Vorübungen für diesen Song
            </h2>
            <p className="mt-1 text-sm text-muted">Eigene GuitarCoach-Übungen, die die Techniken dieses Songs vorbereiten.</p>
            <ul className="mt-3 flex flex-col gap-2">
              {exercises.map((ex) => (
                <li key={ex.id}>
                  <PressableCard padding="sm" tone="muted" onClick={() => navigate(`/ueben/uebung/${ex.id}`)}>
                    <span className="block font-semibold">{ex.title}</span>
                    <span className="block text-xs text-muted">{ex.techniques.join(' · ')} · ♩ = {ex.tempo}</span>
                  </PressableCard>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {progress && (
          <Card>
            <h2 className="text-base font-bold">Dein Fortschritt</h2>
            <ProgressBar value={progress.progressPercent} className="mt-2" label="Lernfortschritt" />
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted">Geübt</dt>
                <dd className="font-semibold">{formatMinutes(progress.totalSec / 60)}</dd>
              </div>
              <div>
                <dt className="text-muted">Durchläufe</dt>
                <dd className="font-semibold">{progress.completedPlaythroughs}</dd>
              </div>
              <div>
                <dt className="text-muted">Bestes Tempo</dt>
                <dd className="font-semibold">{progress.bestTempoFactor > 0 ? `${Math.round(progress.bestTempoFactor * 100)} %` : '–'}</dd>
              </div>
              <div>
                <dt className="text-muted">Trefferquote</dt>
                <dd className="font-semibold">{progress.bestAccuracy !== undefined ? `${Math.round(progress.bestAccuracy)} %` : '–'}</dd>
              </div>
            </dl>
          </Card>
        )}
      </div>

      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title="Song-Informationen">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Titel</dt>
          <dd>{song.title}</dd>
          <dt className="text-muted">Interpret</dt>
          <dd>{song.artist}</dd>
          <dt className="text-muted">Stil</dt>
          <dd>{song.genre}</dd>
          {song.year && (
            <>
              <dt className="text-muted">Jahr</dt>
              <dd>{song.year}</dd>
            </>
          )}
          <dt className="text-muted">Schwierigkeit</dt>
          <dd>{DIFFICULTY_LABEL[song.difficulty]}</dd>
          {song.originalTempo && (
            <>
              <dt className="text-muted">Originaltempo</dt>
              <dd>ca. ♩ = {song.originalTempo}</dd>
            </>
          )}
          <dt className="text-muted">Rechte</dt>
          <dd>{RIGHTS_LABEL[song.rightsStatus]}</dd>
          <dt className="text-muted">Versionen</dt>
          <dd>{sorted.length === 0 ? 'keine Notendaten' : sorted.map((v) => v.label).join(', ')}</dd>
        </dl>
        {song.notes && <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm text-muted">{song.notes}</p>}
        <Toggle
          checked={song.forKids ?? false}
          onChange={(v) => void db.songs.update(song.id, { forKids: v })}
          label="Im Kinder-Modus zeigen"
          description={sorted.length > 0 ? 'Erscheint bei den Kinderliedern auf der Mitspiel-Bahn (Stimme 1, höchster Ton je Schlag).' : 'Erscheint im Kinder-Modus, sobald Notendaten importiert sind.'}
        />
        <div className="mt-2 flex flex-col gap-2">
          <Button variant="secondary" icon={<Upload size={18} />} onClick={() => navigate(`/songs/import?songId=${song.id}`)}>
            Weitere Tab-Datei importieren
          </Button>
          {sorted.length > 0 && (
            <Button variant="secondary" icon={<Download size={18} />} onClick={exportSong}>
              Als GuitarCoach-Datei exportieren
            </Button>
          )}
          {selected && selected.kind !== 'arrangement' && (
            <Button variant="secondary" icon={<PencilLine size={18} />} onClick={() => navigate(`/werkzeuge/editor/${selected.id}`)}>
              Version „{selected.label}“ im Tab-Editor bearbeiten
            </Button>
          )}
          {selected && selected.kind !== 'simplified' && (
            <Button variant="secondary" icon={<Sparkles size={18} />} onClick={() => void createSimplified()}>
              Vereinfachte Übungsversion aus „{selected.label}“ erzeugen
            </Button>
          )}
          {sorted
            .filter((v) => v.kind !== 'arrangement')
            .map((v) => (
              <Button key={v.id} variant="danger" icon={<Trash size={18} />} onClick={() => setConfirmDelete(v)}>
                Version „{v.label}“ löschen
              </Button>
            ))}
          {!song.isBuiltin && (
            <Button variant="danger" icon={<Trash size={18} />} onClick={() => setConfirmDelete('song')}>
              Song komplett löschen
            </Button>
          )}
          <Link to="/songs/import" className="text-center text-sm text-gold underline">
            Unterstützte Dateiformate ansehen
          </Link>
        </div>
      </Sheet>

      <Sheet open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Wirklich löschen?">
        <p className="text-sm text-muted">
          {confirmDelete === 'song' ? 'Der Song, alle Versionen, Importdateien und der Fortschritt werden entfernt.' : 'Diese Version und ihre Importdatei werden entfernt.'} Das kann nicht rückgängig gemacht werden.
        </p>
        <div className="mt-4 flex gap-2">
          <Button full onClick={() => setConfirmDelete(null)}>
            Abbrechen
          </Button>
          <Button full variant="danger" onClick={() => (confirmDelete === 'song' ? void deleteSong() : confirmDelete && void deleteVersion(confirmDelete))}>
            Löschen
          </Button>
        </div>
      </Sheet>
    </>
  );
}
