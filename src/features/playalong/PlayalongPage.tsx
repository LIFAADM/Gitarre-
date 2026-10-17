import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Flag, Pause, Play, Repeat, Trash, Upload } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { Badge, Button, Card, EmptyState, IconButton, PageHeader, Segmented, useToast } from '@/components/ui';
import { buildPlaybackPlan, type BeatRef } from '@/core/music/playback';
import { getDb, newId } from '@/core/storage/db';
import { SongRepository } from '@/core/storage/repositories';
import type { AudioSyncRecord, SongVersionRecord } from '@/core/storage/types';
import { TabView, type TabViewHandle } from '@/features/player/TabView';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { useSettings } from '@/hooks/useSettings';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/cn';
import { buildSyncMap, formatClock } from './syncMap';

/**
 * Mitspielmodus mit eigener Originalaufnahme (MP3/WAV/M4A): Audiodatei dem Song zuordnen,
 * Zeitmarken (Takt = Sekunde) setzen, Tabs laufen synchron mit, Abschnitte wiederholen,
 * Tempo der Aufnahme reduzieren. Keine automatische Synchronisation (bewusst manuell).
 */
export function PlayalongPage() {
  const { songId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [settings] = useSettings();
  const db = getDb();
  const song = useLiveQuery(() => db.songs.get(songId), [songId]);
  const versions = useLiveQuery<SongVersionRecord[]>(async () => db.songVersions.where('songId').equals(songId).toArray(), [songId]);
  const sync = useLiveQuery<AudioSyncRecord | undefined>(async () => (await db.audioSyncs.where('songId').equals(songId).toArray())[0], [songId]);
  const repo = useMemo(() => new SongRepository(), []);
  const sorted = useMemo(() => [...(versions ?? [])].sort((a, b) => a.order - b.order), [versions]);
  const [versionId, setVersionId] = useState<string | null>(null);
  const version = sorted.find((v) => v.id === (versionId ?? sync?.versionId)) ?? sorted[0] ?? null;
  const plan = useMemo(() => (version ? buildPlaybackPlan(version.score, 0) : null), [version]);
  const voice0 = useMemo(() => plan?.beats.filter((b) => b.voice === 0) ?? [], [plan]);
  const markers = useMemo(() => sync?.markers ?? [], [sync]);
  const syncMap = useMemo(() => (plan ? buildSyncMap(plan, markers) : null), [plan, markers]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [currentBeat, setCurrentBeat] = useState<BeatRef | null>(null);
  const [markerBar, setMarkerBar] = useState(0);
  const [loop, setLoop] = useState<{ startInstance: number; endInstance: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const tabRef = useRef<TabViewHandle | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  usePracticeSession('song', { refId: songId, title: song ? `${song.title} (Mitspielen)` : 'Mitspielen', active: playing });

  // Audiodatei als Objekt-URL laden
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (sync) {
      void repo.getImportFile(sync.fileId).then((file) => {
        if (!file || cancelled) return;
        url = URL.createObjectURL(file.blob);
        setAudioUrl(url);
      });
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [sync, repo]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    const anyAudio = audio as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean };
    anyAudio.preservesPitch = true;
    anyAudio.webkitPreservesPitch = true;
  }, [rate, audioUrl]);

  // Positions-Schleife: Audiozeit → Planzeit → aktueller Beat; Schleife erzwingen
  useEffect(() => {
    let raf = 0;
    let lastBeat: number | null = null;
    const tick = (): void => {
      const audio = audioRef.current;
      if (audio && plan && syncMap) {
        if (loop && !audio.paused) {
          const endSec = syncMap.planToAudio(plan.barInstances[loop.endInstance]?.endSec ?? plan.totalSec);
          const startSec = syncMap.planToAudio(plan.barInstances[loop.startInstance]?.startSec ?? 0);
          if (audio.currentTime >= endSec - 0.02 || audio.currentTime < startSec - 1) audio.currentTime = Math.max(0, startSec);
        }
        const t = audio.currentTime;
        const planSec = syncMap.audioToPlan(t);
        let lo = 0;
        let hi = voice0.length - 1;
        let beat: BeatRef | null = null;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const b = voice0[mid]!;
          if (b.sec <= planSec + 1e-6) {
            beat = b;
            lo = mid + 1;
          } else hi = mid - 1;
        }
        if (planSec < 0) beat = null;
        if ((beat?.index ?? null) !== lastBeat) {
          lastBeat = beat?.index ?? null;
          setCurrentBeat(beat);
        }
        if (beat) {
          const span = Math.max(1e-6, beat.endSec - beat.sec);
          tabRef.current?.setPlayhead(beat.index, (planSec - beat.sec) / span);
        } else tabRef.current?.setPlayhead(null, 0);
        setAudioTime((prev) => (Math.abs(prev - t) > 0.1 ? t : prev));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [plan, syncMap, voice0, loop]);

  const onFile = async (file: File): Promise<void> => {
    if (!song) return;
    setBusy(true);
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        const free = (est.quota ?? 0) - (est.usage ?? 0);
        if (est.quota && file.size > free * 0.9) throw new Error(`Nicht genug Speicherplatz: Die Datei hat ${formatBytes(file.size)}, frei sind etwa ${formatBytes(Math.max(0, free))}.`);
      }
      if (file.size > 80 * 1024 * 1024) toast.show('Große Audiodatei – das Laden kann auf dem iPhone etwas dauern.', 'warn', 5000);
      const old = sync;
      const stored = await repo.saveImportFile({ name: file.name, mimeType: file.type || 'audio/mpeg', size: file.size, format: 'audio', blob: file, songId: song.id });
      const now = Date.now();
      const record: AudioSyncRecord = {
        id: old?.id ?? newId('audio-'),
        songId: song.id,
        fileId: stored.id,
        fileName: file.name,
        sizeBytes: file.size,
        markers: old?.markers ?? [],
        playbackRate: 1,
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      };
      if (version) record.versionId = version.id;
      await db.audioSyncs.put(record);
      if (old) await db.importFiles.delete(old.fileId);
      toast.show('Audiodatei gespeichert. Setze jetzt eine Zeitmarke für Takt 1.', 'success', 5000);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : String(error), 'error', 7000);
    } finally {
      setBusy(false);
    }
  };

  const saveMarkers = useCallback(
    async (next: Array<{ instanceIndex: number; sec: number }>, extra: Partial<AudioSyncRecord> = {}) => {
      if (!sync) return;
      await db.audioSyncs.update(sync.id, { markers: next, updatedAt: Date.now(), ...extra });
    },
    [sync, db],
  );

  const addMarker = async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio || !plan) return;
    const sec = Math.round(audio.currentTime * 100) / 100;
    const next = [...markers.filter((m) => m.instanceIndex !== markerBar), { instanceIndex: markerBar, sec }].sort((a, b) => a.instanceIndex - b.instanceIndex);
    await saveMarkers(next);
    toast.show(`Marke gesetzt: Takt ${plan.barInstances[markerBar]!.barIndex + 1} = ${formatClock(sec)}`, 'success', 2500);
  };

  const removeMarker = async (instanceIndex: number): Promise<void> => {
    await saveMarkers(markers.filter((m) => m.instanceIndex !== instanceIndex));
  };

  const removeAudio = async (): Promise<void> => {
    if (!sync) return;
    audioRef.current?.pause();
    await db.importFiles.delete(sync.fileId);
    await db.audioSyncs.delete(sync.id);
    setAudioUrl(null);
    toast.show('Audiodatei entfernt.', 'info');
  };

  const togglePlay = async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch (error) {
        toast.show(`Wiedergabe nicht möglich: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    } else audio.pause();
  };

  const seekToInstance = (instanceIndex: number): void => {
    const audio = audioRef.current;
    if (!audio || !plan || !syncMap) return;
    audio.currentTime = Math.max(0, syncMap.planToAudio(plan.barInstances[instanceIndex]?.startSec ?? 0));
  };

  if (song === undefined || versions === undefined) return <PageHeader title="Mitspielen" back />;
  if (!song) return <EmptyState title="Song nicht gefunden" />;
  if (!version || !plan) {
    return (
      <>
        <PageHeader title="Mitspielen" subtitle={song.title} back={`/songs/${song.id}`} compact />
        <EmptyState title="Noch keine Noten" text="Importiere zuerst eine Tab-Datei für diesen Song. Danach kannst du eine Aufnahme zuordnen." action={<Button variant="primary" onClick={() => navigate(`/songs/import?songId=${song.id}`)}>Tab importieren</Button>} />
      </>
    );
  }

  const currentInstance = currentBeat?.instanceIndex ?? null;
  const safeMarkerBar = Math.min(markerBar, plan.barInstances.length - 1);

  return (
    <>
      <PageHeader title="Mitspielen" subtitle={`${song.title} · Originalaufnahme`} back={`/songs/${song.id}`} compact />
      <div className="flex flex-col gap-3 pt-1">
        <input
          ref={fileInput}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
        />
        {!sync ? (
          <Card tone="gold">
            <h2 className="text-base font-bold">Eigene Aufnahme zuordnen</h2>
            <p className="mt-1 text-sm text-text/90">
              Wähle eine Audiodatei (MP3, WAV, M4A), die du besitzt. Sie bleibt auf diesem Gerät. Danach setzt du Zeitmarken, damit die Tabs synchron mitlaufen. Eine automatische Synchronisation gibt es bewusst nicht, weil sie bei beliebigen Aufnahmen nicht verlässlich wäre.
            </p>
            <Button className="mt-3" variant="primary" icon={<Upload size={18} />} loading={busy} onClick={() => fileInput.current?.click()}>
              Audiodatei auswählen
            </Button>
          </Card>
        ) : (
          <>
            <audio ref={audioRef} src={audioUrl ?? undefined} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} />
            <Card padding="sm">
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="truncate">
                  {sync.fileName} · {formatBytes(sync.sizeBytes)}
                </span>
                <span className="tabular-nums">
                  {formatClock(audioTime)} / {formatClock(duration)}
                </span>
              </div>
              <input
                type="range"
                className="gc-range mt-1"
                min={0}
                max={Math.max(1, duration)}
                step={0.1}
                value={Math.min(audioTime, duration || 0)}
                onChange={(e) => {
                  if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
                }}
                aria-label="Position in der Aufnahme"
              />
              <div className="mt-1 flex items-center justify-between gap-2">
                <IconButton label="Takt zurück" size="lg" onClick={() => seekToInstance(Math.max(0, (currentInstance ?? 0) - 1))}>
                  <ChevronLeft size={26} />
                </IconButton>
                <button type="button" onClick={() => void togglePlay()} aria-label={playing ? 'Aufnahme pausieren' : 'Aufnahme abspielen'} className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-[#1b1507] shadow-lg transition active:scale-95 disabled:opacity-40" disabled={!audioUrl}>
                  {playing ? <Pause size={30} /> : <Play size={30} className="ml-1" />}
                </button>
                <IconButton label="Takt vor" size="lg" onClick={() => seekToInstance(Math.min(plan.barInstances.length - 1, (currentInstance ?? 0) + 1))}>
                  <ChevronRight size={26} />
                </IconButton>
              </div>
              <div className="mt-2">
                <Segmented size="sm" ariaLabel="Abspielgeschwindigkeit" value={rate} onChange={(v) => setRate(v)} options={[0.5, 0.75, 1].map((v) => ({ value: v, label: `${Math.round(v * 100)} %` }))} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>
                  Takt <span className="font-semibold text-text">{(currentInstance ?? 0) + 1}</span> / {plan.barInstances.length}
                </span>
                {syncMap && markers.length >= 2 && <Badge tone="info">Aufnahme ≈ {Math.round(syncMap.tempoFactor * version.score.tempo)} BPM</Badge>}
                {markers.length === 0 && <Badge tone="warn">Noch keine Zeitmarke</Badge>}
                {loop && (
                  <Badge tone="ok" icon={<Repeat size={12} />}>
                    Takt {plan.barInstances[loop.startInstance]!.barIndex + 1}–{plan.barInstances[loop.endInstance]!.barIndex + 1}
                  </Badge>
                )}
              </div>
            </Card>

            <div className="rounded-card border border-border/70 bg-surface px-1 py-3">
              <TabView
                ref={tabRef}
                plan={plan}
                tuning={version.score.tracks[0]!.tuning}
                currentBeatRef={currentBeat?.index ?? null}
                currentInstance={currentInstance}
                loop={loop}
                zoom={settings.tabZoom}
                showFingers={settings.showFingerNumbers}
                naming={settings.noteNaming}
                autoScroll={settings.autoScroll && playing}
                onBeatTap={(ref) => {
                  const b = plan.beats[ref];
                  if (b && audioRef.current && syncMap) audioRef.current.currentTime = Math.max(0, syncMap.planToAudio(b.sec));
                }}
              />
            </div>

            <Card>
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Flag size={18} className="text-gold" /> Zeitmarken
              </h2>
              <p className="mt-1 text-xs text-muted">Spiele die Aufnahme ab, pausiere genau am Anfang eines Takts und setze die Marke. Zwei Marken reichen meist (Anfang und Ende); mehr Marken gleichen Temposchwankungen aus.</p>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={() => setMarkerBar((b) => Math.max(0, b - 1))} aria-label="Takt zurück">
                  −
                </Button>
                <span className="min-w-28 text-center text-sm">
                  Takt <span className="font-bold">{plan.barInstances[safeMarkerBar]!.barIndex + 1}</span>
                </span>
                <Button size="sm" onClick={() => setMarkerBar((b) => Math.min(plan.barInstances.length - 1, b + 1))} aria-label="Takt vor">
                  +
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMarkerBar(currentInstance ?? 0)}>
                  aktueller Takt
                </Button>
              </div>
              <Button className="mt-2" variant="primary" icon={<Flag size={16} />} onClick={() => void addMarker()}>
                Marke setzen: Takt {plan.barInstances[safeMarkerBar]!.barIndex + 1} = {formatClock(audioTime)}
              </Button>
              {markers.length > 0 && (
                <ul className="mt-3 divide-y divide-border/60">
                  {markers.map((m) => (
                    <li key={m.instanceIndex} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => {
                          if (audioRef.current) audioRef.current.currentTime = m.sec;
                        }}
                      >
                        Takt {(plan.barInstances[m.instanceIndex]?.barIndex ?? m.instanceIndex) + 1} bei {formatClock(m.sec)}
                      </button>
                      <IconButton label="Marke löschen" size="sm" onClick={() => void removeMarker(m.instanceIndex)}>
                        <Trash size={16} />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Repeat size={18} className="text-gold" /> Abschnitt wiederholen
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant={loop ? 'success' : 'secondary'} onClick={() => setLoop(loop ? null : { startInstance: currentInstance ?? 0, endInstance: Math.min(plan.barInstances.length - 1, (currentInstance ?? 0) + 3) })}>
                  {loop ? 'Schleife aus' : 'Aktuellen Takt + 3 wiederholen'}
                </Button>
                {loop && (
                  <>
                    <Button size="sm" onClick={() => setLoop({ ...loop, startInstance: Math.max(0, loop.startInstance - 1) })}>
                      Anfang −
                    </Button>
                    <Button size="sm" onClick={() => setLoop({ ...loop, startInstance: Math.min(loop.endInstance, loop.startInstance + 1) })}>
                      Anfang +
                    </Button>
                    <Button size="sm" onClick={() => setLoop({ ...loop, endInstance: Math.max(loop.startInstance, loop.endInstance - 1) })}>
                      Ende −
                    </Button>
                    <Button size="sm" onClick={() => setLoop({ ...loop, endInstance: Math.min(plan.barInstances.length - 1, loop.endInstance + 1) })}>
                      Ende +
                    </Button>
                  </>
                )}
              </div>
            </Card>

            <Card padding="sm" className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {sorted.length > 1 &&
                  sorted.map((v) => (
                    <button key={v.id} type="button" onClick={() => setVersionId(v.id)} className={cn('rounded-xl border px-3 py-1.5 text-xs font-semibold', v.id === version.id ? 'border-gold bg-gold/15' : 'border-border bg-surface-2')}>
                      {v.label}
                    </button>
                  ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => fileInput.current?.click()} loading={busy}>
                  Andere Datei
                </Button>
                <Button size="sm" variant="danger" icon={<Trash size={14} />} onClick={() => void removeAudio()}>
                  Entfernen
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
