import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Download, Eraser, FolderOpen, Pause, Play, Plus, Save, Square, Trash } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Badge, Button, Card, IconButton, PageHeader, Segmented, Sheet, useToast } from '@/components/ui';
import { unlockAudio } from '@/core/audio/audioContext';
import { createSongFile } from '@/core/import/gcjson';
import type { DurationBase } from '@/core/music/durations';
import { noteNameWithOctave } from '@/core/music/notes';
import { buildPlaybackPlan } from '@/core/music/playback';
import { getDb } from '@/core/storage/db';
import { SongRepository } from '@/core/storage/repositories';
import type { SongVersionRecord } from '@/core/storage/types';
import { Fretboard, type FretboardTap } from '@/features/fretboard/Fretboard';
import { TabView, type TabViewHandle } from '@/features/player/TabView';
import { downloadTextFile, slugify } from '@/features/songs/songUtils';
import { useEngine, usePlayerSnapshot } from '@/hooks/useEngine';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';
import { DURATION_OPTIONS, docToScore, emptyDoc, scoreToDoc, type EditorDoc } from './editorModel';

export function EditorPage() {
  const { versionId } = useParams();
  const [params] = useSearchParams();
  const songIdParam = params.get('songId');
  const existing = useLiveQuery<SongVersionRecord | undefined>(async () => (versionId ? getDb().songVersions.get(versionId) : undefined), [versionId]);
  if (versionId && existing === undefined) return <PageHeader title="Tab-Editor" back="/werkzeuge" compact />;
  return (
    <EditorWorkspace
      key={existing?.id ?? `new-${songIdParam ?? ''}`}
      initialDoc={existing ? scoreToDoc(existing.score) : emptyDoc()}
      initialSongId={existing?.songId ?? songIdParam}
      initialVersionId={existing?.id ?? null}
    />
  );
}

function EditorWorkspace({ initialDoc, initialSongId, initialVersionId }: { initialDoc: EditorDoc; initialSongId: string | null; initialVersionId: string | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const engine = useEngine();
  const snapshot = usePlayerSnapshot();
  const [settings] = useSettings();
  const [doc, setDoc] = useState<EditorDoc>(initialDoc);
  const [cursor, setCursor] = useState<number>(initialVersionId ? Number.MAX_SAFE_INTEGER : 0);
  const [durationBase, setDurationBase] = useState<DurationBase>(4);
  const [dotted, setDotted] = useState(false);
  const [chordMode, setChordMode] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(initialVersionId);
  const [currentSongId, setCurrentSongId] = useState<string | null>(initialSongId);
  const tabRef = useRef<TabViewHandle | null>(null);
  usePracticeSession('editor', { title: 'Tab-Editor' });

  const ownVersions = useLiveQuery(() => getDb().songVersions.where('kind').equals('user').toArray(), []);
  const songsById = useLiveQuery(async () => new Map((await getDb().songs.toArray()).map((s) => [s.id, s])), []);

  const score = useMemo(() => docToScore(doc), [doc]);
  const plan = useMemo(() => buildPlaybackPlan(score), [score]);
  const realBeats = useMemo(() => plan.beats.filter((b) => b.voice === 0), [plan]);
  const cursorIndex = Math.min(cursor, doc.beats.length);
  /** Beat-Referenz des Cursors (für die Hervorhebung): Doc-Beat → Plan-Beat über die Reihenfolge nicht-aufgefüllter Beats. */
  const cursorBeatRef = useMemo(() => {
    // Doc-Beats sind in der Reihenfolge der Plan-Beats enthalten, Auffüllpausen stehen am Taktende.
    let docIdx = 0;
    for (const b of realBeats) {
      const isFill = b.isRest && !doc.beats[docIdx];
      if (isFill) continue;
      if (docIdx === cursorIndex - 1) return b.index;
      docIdx++;
      if (docIdx >= doc.beats.length) break;
    }
    return null;
  }, [realBeats, doc.beats, cursorIndex]);

  const duration = { base: durationBase, ...(dotted ? { dots: 1 as const } : {}) };

  const insertBeat = (notes: Array<{ string: number; fret: number }>): void => {
    setDoc((d) => {
      const beats = [...d.beats];
      beats.splice(cursorIndex, 0, { duration, notes });
      return { ...d, beats };
    });
    setCursor(cursorIndex + 1);
  };

  const onTap = (pos: FretboardTap): void => {
    void unlockAudio().then(() => engine.synth.noteOn(pos.midi, engine.ctx.currentTime, { string: pos.string, velocity: 0.9 }));
    if (chordMode && cursorIndex > 0 && doc.beats[cursorIndex - 1] && !doc.beats[cursorIndex - 1]!.notes.some((n) => n.string === pos.string) && doc.beats[cursorIndex - 1]!.notes.length > 0) {
      setDoc((d) => {
        const beats = [...d.beats];
        const b = beats[cursorIndex - 1]!;
        beats[cursorIndex - 1] = { ...b, notes: [...b.notes, { string: pos.string, fret: pos.fret }] };
        return { ...d, beats };
      });
      return;
    }
    insertBeat([{ string: pos.string, fret: pos.fret }]);
  };

  const deleteLast = (): void => {
    if (cursorIndex === 0) return;
    setDoc((d) => ({ ...d, beats: d.beats.filter((_, i) => i !== cursorIndex - 1) }));
    setCursor(cursorIndex - 1);
  };

  const move = (dir: -1 | 1): void => {
    const i = cursorIndex - 1;
    const j = i + dir;
    if (i < 0 || j < 0 || j >= doc.beats.length) return;
    setDoc((d) => {
      const beats = [...d.beats];
      const tmp = beats[i]!;
      beats[i] = beats[j]!;
      beats[j] = tmp;
      return { ...d, beats };
    });
    setCursor(j + 1);
  };

  const playAll = async (): Promise<void> => {
    await unlockAudio();
    engine.player.load(plan);
    engine.player.play();
  };
  const stop = (): void => engine.player.stop();
  useEffect(() => () => engine.player.load(null), [engine.player]);

  const playBeat = (beatRef: number): void => {
    void unlockAudio().then(() => {
      engine.player.load(plan);
      engine.player.playBeat(beatRef);
      // Cursor hinter den angetippten Beat setzen
      let docIdx = 0;
      for (const b of realBeats) {
        if (b.index === beatRef) {
          setCursor(docIdx + 1);
          break;
        }
        if (!(b.isRest && !doc.beats[docIdx])) docIdx++;
      }
    });
  };

  const save = async (): Promise<void> => {
    const repo = new SongRepository();
    let songId = currentSongId;
    if (!songId) {
      const song = await repo.create({ title: doc.title.trim() || 'Meine Melodie', artist: 'Ich', genre: 'Eigene', difficulty: 1, rightsStatus: 'user-created', originalTempo: doc.tempo });
      songId = song.id;
      setCurrentSongId(songId);
    } else {
      await repo.update(songId, { title: doc.title.trim() || 'Meine Melodie', originalTempo: doc.tempo });
    }
    const scoreToSave = docToScore(doc);
    if (currentVersionId) {
      await repo.updateVersionScore(currentVersionId, scoreToSave);
    } else {
      const v = await repo.addVersion({ songId, label: 'Eigene', kind: 'user', score: scoreToSave, description: 'Im Tab-Editor erstellt.' });
      setCurrentVersionId(v.id);
    }
    setSaveOpen(false);
    toast.show('Melodie gespeichert – du findest sie unter „Meine Songs“.', 'success');
  };

  const exportDoc = (): void => {
    const now = Date.now();
    const file = createSongFile(
      { id: currentSongId ?? 'neu', title: doc.title, artist: 'Ich', genre: 'Eigene', difficulty: 1, rightsStatus: 'user-created', isBuiltin: false, isFavorite: false, createdAt: now, updatedAt: now, originalTempo: doc.tempo },
      [{ id: currentVersionId ?? 'v', songId: currentSongId ?? 'neu', label: 'Eigene', kind: 'user', order: 0, score, createdAt: now, trackCount: 1, barCount: score.masterBars.length, noteCount: doc.beats.filter((b) => b.notes.length).length, maxFret: 0 }],
    );
    downloadTextFile(`${slugify(doc.title) || 'melodie'}.gcjson`, JSON.stringify(file, null, 2));
  };

  const isPlaying = snapshot.status === 'playing' || snapshot.status === 'counting';
  const lastBeat = cursorIndex > 0 ? doc.beats[cursorIndex - 1] : undefined;
  const inputClass = 'h-11 w-full rounded-2xl border border-border bg-surface-2 px-3 text-[15px] outline-none focus:border-gold';

  return (
    <>
      <PageHeader
        title="Tab-Editor"
        subtitle={`${doc.title} · ♩ = ${doc.tempo} · ${doc.timeSignature[0]}/${doc.timeSignature[1]} · ${doc.beats.length} Einträge`}
        back="/werkzeuge"
        compact
        actions={
          <>
            <IconButton label="Melodie öffnen" onClick={() => setOpenSheet(true)}>
              <FolderOpen size={22} />
            </IconButton>
            <IconButton label="Speichern" variant="primary" onClick={() => setSaveOpen(true)}>
              <Save size={20} />
            </IconButton>
          </>
        }
      />
      <div className="flex flex-col gap-3 pt-1">
        <div className="rounded-card border border-border/70 bg-surface px-1 py-3">
          <TabView ref={tabRef} plan={plan} tuning={score.tracks[0]!.tuning} currentBeatRef={cursorBeatRef} currentInstance={null} loop={null} zoom={settings.tabZoom} showFingers={settings.showFingerNumbers} naming={settings.noteNaming} autoScroll={false} onBeatTap={playBeat} />
          {doc.beats.length === 0 && <p className="px-3 pt-2 text-center text-sm text-muted">Tippe unten auf das Griffbrett, um Töne einzugeben. Jeder Tipp fügt einen Ton mit der gewählten Länge ein.</p>}
        </div>

        <Card padding="sm">
          <div className="flex items-center gap-2">
            <Segmented size="sm" value={durationBase} onChange={setDurationBase} options={DURATION_OPTIONS.map((o) => ({ value: o.base, label: o.label }))} ariaLabel="Notenlänge" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant={dotted ? 'primary' : 'secondary'} onClick={() => setDotted((v) => !v)}>
              Punktiert
            </Button>
            <Button size="sm" variant={chordMode ? 'primary' : 'secondary'} onClick={() => setChordMode((v) => !v)}>
              Akkord (Töne stapeln)
            </Button>
            <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => insertBeat([])}>
              Pause einfügen
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" icon={<ChevronLeft size={14} />} onClick={() => setCursor(Math.max(0, cursorIndex - 1))} aria-label="Cursor zurück">
              Cursor
            </Button>
            <Button size="sm" variant="secondary" iconRight={<ChevronRight size={14} />} onClick={() => setCursor(Math.min(doc.beats.length, cursorIndex + 1))} aria-label="Cursor vor">
              Cursor
            </Button>
            <Button size="sm" variant="secondary" onClick={() => move(-1)} disabled={cursorIndex <= 1}>
              ← Verschieben
            </Button>
            <Button size="sm" variant="secondary" onClick={() => move(1)} disabled={cursorIndex === 0 || cursorIndex >= doc.beats.length}>
              Verschieben →
            </Button>
            <Button size="sm" variant="danger" icon={<Eraser size={14} />} onClick={deleteLast} disabled={cursorIndex === 0}>
              Löschen
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Position: {cursorIndex} / {doc.beats.length}
            {lastBeat && lastBeat.notes.length > 0 && ` · zuletzt: ${lastBeat.notes.map((n) => noteNameWithOctave(score.tracks[0]!.bars.length ? n.fret + (score.tracks[0]!.tuning[n.string - 1] ?? 0) : 0, settings.noteNaming)).join('+')}`}
            {lastBeat && lastBeat.notes.length === 0 && ' · zuletzt: Pause'}
          </p>
        </Card>

        <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
          <Fretboard frets={12} compact leftHanded={settings.leftHanded} orientation={settings.fretboardOrientation} naming={settings.noteNaming} showNoteNames onTap={onTap} highlights={lastBeat?.notes.map((n) => ({ string: n.string, fret: n.fret, tone: 'gold' as const })) ?? []} />
        </div>

        <Card padding="sm" className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="primary" icon={isPlaying ? <Pause size={18} /> : <Play size={18} />} onClick={() => (isPlaying ? engine.player.pause() : void playAll())} disabled={doc.beats.length === 0}>
              {isPlaying ? 'Pause' : 'Abspielen'}
            </Button>
            <IconButton label="Stopp" variant="secondary" onClick={stop}>
              <Square size={18} />
            </IconButton>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Download size={16} />} onClick={exportDoc} disabled={doc.beats.length === 0}>
              Export
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash size={16} />}
              onClick={() => {
                setDoc(emptyDoc());
                setCursor(0);
                setCurrentVersionId(null);
                setCurrentSongId(null);
                navigate('/werkzeuge/editor', { replace: true });
              }}
            >
              Neu
            </Button>
          </div>
        </Card>
      </div>

      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title="Melodie speichern">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Titel</span>
          <input className={inputClass} value={doc.title} onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))} />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Tempo (BPM)</span>
            <input className={inputClass} inputMode="numeric" value={doc.tempo} onChange={(e) => setDoc((d) => ({ ...d, tempo: Math.min(240, Math.max(30, Number(e.target.value) || 90)) }))} />
          </label>
          <div>
            <span className="mb-1 block text-sm text-muted">Taktart</span>
            <Segmented
              size="sm"
              value={`${doc.timeSignature[0]}/${doc.timeSignature[1]}`}
              onChange={(v) => {
                const [n, d] = v.split('/').map(Number) as [number, number];
                setDoc((x) => ({ ...x, timeSignature: [n, d] }));
              }}
              options={['2/4', '3/4', '4/4', '6/8'].map((v) => ({ value: v, label: v }))}
            />
          </div>
        </div>
        <Button className="mt-4" full variant="primary" icon={<Save size={18} />} onClick={() => void save()} disabled={doc.beats.length === 0}>
          {currentVersionId ? 'Änderungen speichern' : 'Als neuen Song speichern'}
        </Button>
      </Sheet>

      <Sheet open={openSheet} onClose={() => setOpenSheet(false)} title="Eigene Melodie öffnen">
        {ownVersions && ownVersions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {ownVersions.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenSheet(false);
                    navigate(`/werkzeuge/editor/${v.id}`);
                  }}
                  className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left', v.id === currentVersionId ? 'border-gold bg-gold/10' : 'border-border bg-surface-2')}
                >
                  <span>
                    <span className="block font-semibold">{songsById?.get(v.songId)?.title ?? v.score.title}</span>
                    <span className="block text-xs text-muted">
                      {v.noteCount} Töne · {v.barCount} Takte
                    </span>
                  </span>
                  {v.id === currentVersionId && <Badge tone="gold">geöffnet</Badge>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Noch keine eigenen Melodien gespeichert.</p>
        )}
      </Sheet>
    </>
  );
}
