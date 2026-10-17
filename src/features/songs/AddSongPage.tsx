import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, PageHeader, Segmented, useToast } from '@/components/ui';
import { SongRepository } from '@/core/storage/repositories';
import { GENRES, type Genre } from '@/core/storage/types';

export function AddSongPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState<Genre>('Rock');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [tempo, setTempo] = useState('');
  const [own, setOwn] = useState<'protected' | 'own'>('protected');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) {
      toast.show('Bitte einen Titel eingeben.', 'warn');
      return;
    }
    setSaving(true);
    const repo = new SongRepository();
    const tempoValue = Number(tempo);
    const song = await repo.create({
      title: title.trim(),
      artist: artist.trim() || 'Unbekannt',
      genre,
      difficulty,
      rightsStatus: own === 'own' ? 'user-created' : 'needs-import',
      ...(tempoValue > 0 ? { originalTempo: Math.round(tempoValue) } : {}),
    });
    toast.show('Song angelegt. Jetzt eine Tab-Datei importieren oder im Editor erstellen.', 'success');
    navigate(`/songs/${song.id}`, { replace: true });
  };

  const inputClass = 'h-12 w-full rounded-2xl border border-border bg-surface px-4 text-[15px] outline-none focus:border-gold';

  return (
    <>
      <PageHeader title="Song hinzufügen" back="/songs" />
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Titel *</span>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Hotel California" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Interpret</span>
            <input className={inputClass} value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="z. B. Eagles" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Musikrichtung</span>
            <select className={inputClass} value={genre} onChange={(e) => setGenre(e.target.value as Genre)}>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="mb-1 block text-sm text-muted">Schwierigkeit</span>
            <Segmented
              value={difficulty}
              onChange={setDifficulty}
              options={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
                { value: 4, label: '4' },
                { value: 5, label: '5' },
              ]}
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Originaltempo (BPM, optional)</span>
            <input className={inputClass} inputMode="numeric" value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="z. B. 120" />
          </label>
          <div>
            <span className="mb-1 block text-sm text-muted">Rechte</span>
            <Segmented
              value={own}
              onChange={setOwn}
              options={[
                { value: 'protected', label: 'Fremder Song (Tab importieren)' },
                { value: 'own', label: 'Eigene Musik' },
              ]}
            />
          </div>
        </Card>
        <Button type="submit" variant="primary" size="lg" loading={saving}>
          Song anlegen
        </Button>
      </form>
    </>
  );
}
