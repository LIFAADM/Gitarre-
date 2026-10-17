import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CircleCheck, FileMusic, TriangleAlert, Upload } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { Badge, Button, Card, PageHeader, Segmented, useToast } from '@/components/ui';
import { ACCEPTED_EXTENSIONS, FORMAT_INFOS, formatLabel } from '@/core/import/formats';
import { importFileBytes, type ImportOutcome } from '@/core/import/importFile';
import type { Score } from '@/core/music/score';
import { getDb } from '@/core/storage/db';
import { SongRepository } from '@/core/storage/repositories';
import type { VersionLabel } from '@/core/storage/types';
import { formatBytes } from '@/lib/format';

type Step = { kind: 'idle' } | { kind: 'reading'; name: string } | { kind: 'preview'; name: string; size: number; outcome: ImportOutcome } | { kind: 'error'; message: string; name?: string };

const SAMPLES = [
  { file: 'guitarcoach-etuede-1.gp', label: 'GuitarCoach Etüde Nr. 1 (Guitar Pro 7, 2 Spuren)' },
  { file: 'guitarcoach-etuede-2.musicxml', label: 'GuitarCoach Etüde Nr. 2 (MusicXML)' },
];

const LABELS: VersionLabel[] = ['Import', 'Originalnah', 'Gitarrensolo', 'Mittel', 'Leicht', 'Anfänger'];

export function ImportPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const presetSongId = params.get('songId');
  const db = getDb();
  const songs = useLiveQuery(() => db.songs.orderBy('title').toArray(), []);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [targetSongId, setTargetSongId] = useState<string>(presetSongId ?? 'new');
  const [seenPreset, setSeenPreset] = useState(presetSongId);
  if (seenPreset !== presetSongId) {
    setSeenPreset(presetSongId);
    if (presetSongId) setTargetSongId(presetSongId);
  }
  const [label, setLabel] = useState<VersionLabel>('Import');
  const [selectedTracks, setSelectedTracks] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bytesRef = useRef<Uint8Array | null>(null);
  const mimeRef = useRef<string>('application/octet-stream');

  const processBytes = async (name: string, bytes: Uint8Array, mime: string): Promise<void> => {
    setStep({ kind: 'reading', name });
    bytesRef.current = bytes;
    mimeRef.current = mime;
    try {
      const outcome = await importFileBytes(name, bytes);
      if (outcome.kind === 'score') setSelectedTracks(outcome.result.tracks.map((t) => t.index));
      setStep({ kind: 'preview', name, size: bytes.byteLength, outcome });
    } catch (error) {
      setStep({ kind: 'error', message: error instanceof Error ? error.message : String(error), name });
    }
  };

  const onFile = async (file: File): Promise<void> => {
    if (file.size > 25 * 1024 * 1024) {
      setStep({ kind: 'error', message: 'Die Datei ist größer als 25 MB. Bitte eine kleinere Tab-Datei wählen.', name: file.name });
      return;
    }
    const buffer = await file.arrayBuffer();
    await processBytes(file.name, new Uint8Array(buffer), file.type || 'application/octet-stream');
  };

  const loadSample = async (file: string): Promise<void> => {
    try {
      const res = await fetch(`/samples/${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await processBytes(file, new Uint8Array(await res.arrayBuffer()), 'application/octet-stream');
    } catch (error) {
      setStep({ kind: 'error', message: `Beispieldatei konnte nicht geladen werden (${error instanceof Error ? error.message : String(error)}).` });
    }
  };

  const previewScore: Score | null = useMemo(() => {
    if (step.kind !== 'preview') return null;
    if (step.outcome.kind === 'gcjson') return step.outcome.file.versions[0]?.score ?? null;
    return step.outcome.result.score;
  }, [step]);

  const save = async (): Promise<void> => {
    if (step.kind !== 'preview' || !bytesRef.current) return;
    setSaving(true);
    const repo = new SongRepository();
    try {
      let songId = targetSongId;
      if (step.outcome.kind === 'gcjson') {
        const file = step.outcome.file;
        if (songId === 'new') {
          const song = await repo.create({ ...file.song, rightsStatus: file.song.rightsStatus === 'public-domain' ? 'user-import' : file.song.rightsStatus });
          songId = song.id;
        }
        const stored = await repo.saveImportFile({ name: step.name, mimeType: 'application/json', size: step.size, format: 'gcjson', blob: new Blob([bytesRef.current as BlobPart]), songId });
        for (const v of file.versions) {
          await repo.addVersion({ songId, label: v.label, kind: v.kind === 'arrangement' ? 'imported' : v.kind, score: v.score, sourceFileId: stored.id, sourceFormat: 'gcjson', ...(v.description ? { description: v.description } : {}) });
        }
      } else {
        const { score } = step.outcome.result;
        const tracks = score.tracks.filter((_, i) => selectedTracks.includes(i));
        if (tracks.length === 0) {
          toast.show('Bitte mindestens eine Spur auswählen.', 'warn');
          setSaving(false);
          return;
        }
        if (songId === 'new') {
          const song = await repo.create({
            title: score.title,
            artist: score.artist ?? 'Unbekannt',
            genre: 'Sonstiges',
            difficulty: 3,
            rightsStatus: 'user-import',
            originalTempo: Math.round(score.tempo),
          });
          songId = song.id;
        }
        const stored = await repo.saveImportFile({ name: step.name, mimeType: mimeRef.current, size: step.size, format: step.outcome.format, blob: new Blob([bytesRef.current as BlobPart]), songId });
        const versionScore: Score = { ...score, tracks };
        const warnings = step.outcome.result.warnings;
        await repo.addVersion({
          songId,
          label,
          kind: 'imported',
          score: versionScore,
          sourceFileId: stored.id,
          sourceFormat: step.outcome.format,
          description: `Importiert aus „${step.name}“ (${formatLabel(step.outcome.format)})${warnings.length ? ' – ' + warnings.join(' ') : ''}`,
        });
      }
      toast.show('Import erfolgreich – viel Spaß beim Üben!', 'success');
      navigate(`/songs/${songId}`, { replace: true });
    } catch (error) {
      setStep({ kind: 'error', message: `Speichern fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Tab-Datei importieren" subtitle="Eigene, rechtmäßig genutzte Tabulaturen" back={presetSongId ? `/songs/${presetSongId}` : '/songs'} />
      <div className="flex flex-col gap-4">
        <Card tone="gold">
          <p className="text-sm leading-relaxed">
            Importiere Guitar-Pro-, MusicXML-, alphaTex- oder MIDI-Dateien, die du besitzt oder selbst erstellt hast. Die Datei wird nur auf deinem Gerät verarbeitet und gespeichert – nichts wird hochgeladen.
          </p>
        </Card>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
        />
        <Button variant="primary" size="xl" icon={<Upload size={22} />} onClick={() => inputRef.current?.click()} loading={step.kind === 'reading'}>
          Datei auswählen
        </Button>

        {step.kind === 'idle' && (
          <Card padding="sm">
            <p className="px-1 text-sm text-muted">Noch keine eigene Datei zur Hand? Probiere den Import mit einer Beispieldatei (eigene GuitarCoach-Komposition):</p>
            <div className="mt-2 flex flex-col gap-2">
              {SAMPLES.map((s) => (
                <Button key={s.file} variant="secondary" icon={<FileMusic size={18} />} onClick={() => void loadSample(s.file)} className="justify-start">
                  {s.label}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {step.kind === 'error' && (
          <Card className="border-bad/40">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 shrink-0 text-bad" size={20} />
              <div>
                <h3 className="font-semibold">Import nicht möglich</h3>
                {step.name && <p className="text-xs text-muted">{step.name}</p>}
                <p className="mt-1 text-sm">{step.message}</p>
              </div>
            </div>
            <Button className="mt-3" onClick={() => setStep({ kind: 'idle' })}>
              Erneut versuchen
            </Button>
          </Card>
        )}

        {step.kind === 'preview' && previewScore && (
          <>
            <Card>
              <div className="flex items-start gap-3">
                <CircleCheck className="mt-0.5 shrink-0 text-ok" size={20} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">Datei erkannt</h3>
                  <p className="truncate text-xs text-muted">
                    {step.name} · {formatBytes(step.size)} · {formatLabel(step.outcome.format)}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted">Titel</dt>
                    <dd className="truncate">{previewScore.title}</dd>
                    <dt className="text-muted">Interpret</dt>
                    <dd className="truncate">{previewScore.artist ?? '–'}</dd>
                    <dt className="text-muted">Tempo</dt>
                    <dd>♩ = {Math.round(previewScore.tempo)}</dd>
                    <dt className="text-muted">Taktart</dt>
                    <dd>
                      {previewScore.masterBars[0]?.timeSignature.numerator}/{previewScore.masterBars[0]?.timeSignature.denominator}
                    </dd>
                    <dt className="text-muted">Takte</dt>
                    <dd>{previewScore.masterBars.length}</dd>
                  </dl>
                </div>
              </div>
              {step.outcome.kind === 'score' && step.outcome.result.warnings.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                  {step.outcome.result.warnings.map((w) => (
                    <li key={w} className="flex items-start gap-2 rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">
                      <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {w}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {step.outcome.kind === 'score' && (
              <Card>
                <h3 className="font-semibold">Gitarrenspuren</h3>
                <p className="text-xs text-muted">Wähle die Spuren, die übernommen werden sollen.</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {step.outcome.result.tracks.map((t) => {
                    const checked = selectedTracks.includes(t.index);
                    return (
                      <li key={t.index}>
                        <button
                          type="button"
                          onClick={() => setSelectedTracks((list) => (checked ? list.filter((i) => i !== t.index) : [...list, t.index]))}
                          className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left ${checked ? 'border-gold bg-gold/10' : 'border-border bg-surface-2'}`}
                          aria-pressed={checked}
                        >
                          <span>
                            <span className="block text-sm font-semibold">{t.name}</span>
                            <span className="block text-xs text-muted">
                              {t.noteCount} Töne · {t.barCount} Takte · {t.stringCount} Saiten{!t.tuningKnown && ' · Griffe berechnet'}
                            </span>
                          </span>
                          {checked && <Badge tone="gold">gewählt</Badge>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            <Card className="flex flex-col gap-3">
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Zu welchem Song gehört die Datei?</span>
                <select className="h-12 w-full rounded-2xl border border-border bg-surface px-3 text-[15px]" value={targetSongId} onChange={(e) => setTargetSongId(e.target.value)}>
                  <option value="new">Neuer Song („{previewScore.title}“)</option>
                  {(songs ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.artist} – {s.title}
                    </option>
                  ))}
                </select>
              </label>
              {step.outcome.kind === 'score' && (
                <div>
                  <span className="mb-1 block text-sm text-muted">Bezeichnung der Version</span>
                  <Segmented size="sm" value={label} onChange={setLabel} options={LABELS.map((l) => ({ value: l, label: l }))} />
                </div>
              )}
              <Button variant="primary" size="lg" loading={saving} onClick={() => void save()}>
                In meine Bibliothek übernehmen
              </Button>
              <Button variant="ghost" onClick={() => setStep({ kind: 'idle' })}>
                Abbrechen
              </Button>
            </Card>
          </>
        )}

        <Card>
          <h3 className="font-semibold">Unterstützte Formate</h3>
          <ul className="mt-2 grid grid-cols-1 gap-1 text-sm">
            {FORMAT_INFOS.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2">
                <span>
                  {f.label} <span className="text-muted">({f.extensions.join(', ')})</span>
                  {f.note && <span className="block text-xs text-muted">{f.note}</span>}
                </span>
                <Badge tone={f.supported ? 'ok' : 'neutral'}>{f.supported ? 'getestet' : 'geplant'}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Einfache ASCII-Text-Tabs ohne Rhythmusangaben werden noch nicht importiert, weil ihnen die Notenlängen fehlen. Geplant ist ein Import mit manueller Festlegung der Dauern.
          </p>
        </Card>
      </div>
    </>
  );
}
