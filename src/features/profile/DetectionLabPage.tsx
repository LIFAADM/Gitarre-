import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronUp, Circle, Download, FlaskConical, Mic, MicOff, Play, Share2, Square, Trash2 } from 'lucide-react';
import { Badge, Button, Card, PageHeader, Stat, useToast } from '@/components/ui';
import { unlockAudio } from '@/core/audio/audioContext';
import type { AudioChunk } from '@/core/audio/micWorklet';
import { PRESENCE_THRESHOLD } from '@/core/detection/presence';
import { toDb } from '@/core/detection/calibration';
import { midiToFrequency, noteNameWithOctave } from '@/core/music/notes';
import { deviceKey } from '@/core/storage/calibration';
import { clipFileStem, clipSidecar, deleteClip, listClips, saveClip } from '@/core/storage/clips';
import type { ClipRecord } from '@/core/storage/types';
import { useCalibration } from '@/hooks/useCalibration';
import { useDetection } from '@/hooks/useDetection';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/cn';
import { CLIP_PRESETS, presetTargetMidis, type ClipPreset } from './labPresets';

/**
 * Erkennungs-Labor (versteckt unter Profil): Live-Werte der Worklet-Kette, beschriftete Aufnahmen
 * für den Benchmark, Export als WAV + JSON und die Anleitung „vom iPhone ins Repo“.
 */

const MAX_CLIP_SEC = 30;
const REPO_UPLOAD_URL = 'https://github.com/LIFAADM/Gitarre-/upload/main/test-audio/real';

function formatDb(rms: number): string {
  return `${Math.round(toDb(rms))} dB`;
}

function formatDuration(sec: number): string {
  return `${sec.toFixed(1).replace('.', ',')} s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function DetectionLabPage() {
  const [settings] = useSettings();
  const calibration = useCalibration();
  const toast = useToast();
  const [presetId, setPresetId] = useState<string>(CLIP_PRESETS[0]!.id);
  const preset = useMemo<ClipPreset>(() => CLIP_PRESETS.find((p) => p.id === presetId) ?? CLIP_PRESETS[0]!, [presetId]);
  const [notes, setNotes] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordedSec, setRecordedSec] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const recordedSamplesRef = useRef(0);
  const recordingRef = useRef(false);
  const playingSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const targetMidis = useMemo(() => presetTargetMidis(preset), [preset]);
  const targets = useMemo(() => targetMidis.map((m) => midiToFrequency(m, settings.a4Hz)), [targetMidis, settings.a4Hz]);

  const onAudio = useCallback((chunk: AudioChunk): void => {
    if (!recordingRef.current) return;
    chunksRef.current.push(chunk.samples);
    recordedSamplesRef.current += chunk.samples.length;
  }, []);

  const detection = useDetection({ enabled: true, sensitivity: settings.tunerSensitivity, a4Hz: settings.a4Hz, targets, onAudio });
  const { pitch, level, frame, onset, status, error, supported, start, stop, sampleRate, gate, setRecording: setWorkletRecording } = detection;
  const listening = status === 'listening';

  const clips = useLiveQuery(() => listClips(), [], [] as ClipRecord[]);

  const finishRecording = useCallback(async (): Promise<void> => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setWorkletRecording(false);
    setRecording(false);
    const total = recordedSamplesRef.current;
    const sr = sampleRate || 48000;
    if (total < sr * 0.3) {
      toast.show('Aufnahme zu kurz (unter 0,3 s) – verworfen.', 'warn');
      return;
    }
    const samples = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunksRef.current) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }
    chunksRef.current = [];
    try {
      await saveClip({
        label: preset.label,
        kind: preset.kind,
        expected: preset.expected,
        notes: notes.trim(),
        sampleRate: sr,
        samples,
        device: deviceKey(sr),
        appVersion: __APP_VERSION__,
        calibration: calibration ? { noiseFloorDb: calibration.noiseFloorDb, gateRms: calibration.gateRms, latencyMs: calibration.latencyMs } : null,
      });
      toast.show(`Aufnahme „${preset.label}“ gespeichert (${formatDuration(total / sr)}).`, 'success');
    } catch (err) {
      toast.show(`Aufnahme konnte nicht gespeichert werden: ${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  }, [setWorkletRecording, sampleRate, preset, notes, toast, calibration]);

  // Aufnahmedauer anzeigen und bei 30 s automatisch stoppen.
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      const sec = sampleRate > 0 ? recordedSamplesRef.current / sampleRate : 0;
      setRecordedSec(sec);
      if (sec >= MAX_CLIP_SEC) void finishRecording();
    }, 200);
    return () => window.clearInterval(timer);
  }, [recording, sampleRate, finishRecording]);

  // Beim Stopp des Mikrofons eine laufende Aufnahme beenden.
  useEffect(() => {
    if (!listening && recordingRef.current) void finishRecording();
  }, [listening, finishRecording]);

  const beginRecording = (): void => {
    chunksRef.current = [];
    recordedSamplesRef.current = 0;
    recordingRef.current = true;
    setRecordedSec(0);
    setRecording(true);
    setWorkletRecording(true);
  };

  const exportClip = async (clip: ClipRecord): Promise<void> => {
    const stem = clipFileStem(clip);
    const sidecar = clipSidecar(clip);
    const json = new Blob([JSON.stringify(sidecar, null, 2)], { type: 'application/json' });
    const files = [new File([clip.wav], `${stem}.wav`, { type: 'audio/wav' }), new File([json], `${stem}.json`, { type: 'application/json' })];
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (typeof nav.share === 'function' && nav.canShare?.({ files })) {
      try {
        await nav.share({ files, title: clip.label });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    downloadBlob(files[0]!, `${stem}.wav`);
    window.setTimeout(() => downloadBlob(files[1]!, `${stem}.json`), 300);
  };

  const playClip = async (clip: ClipRecord): Promise<void> => {
    if (playingSourceRef.current) {
      playingSourceRef.current.stop();
      playingSourceRef.current = null;
      setPlayingId(null);
      if (playingId === clip.id) return;
    }
    try {
      const ctx = await unlockAudio();
      const buffer = await ctx.decodeAudioData(await clip.wav.arrayBuffer());
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (playingSourceRef.current === source) {
          playingSourceRef.current = null;
          setPlayingId(null);
        }
      };
      playingSourceRef.current = source;
      setPlayingId(clip.id);
      source.start();
    } catch {
      toast.show('Die Aufnahme konnte nicht abgespielt werden.', 'error');
    }
  };

  useEffect(
    () => () => {
      playingSourceRef.current?.stop();
    },
    [],
  );

  const removeClip = async (clip: ClipRecord): Promise<void> => {
    if (!window.confirm(`Aufnahme „${clip.label}“ vom ${formatDate(clip.createdAt)} löschen?`)) return;
    await deleteClip(clip.id);
  };

  const pitchName = pitch ? noteNameWithOctave(pitch.midi, settings.noteNaming) : '–';
  const reliability = frame?.pitch ? Math.round(frame.pitch.probability * 100) : 0;
  const levelDb = toDb(Math.max(level, 1e-5));

  return (
    <div className="flex flex-col gap-4 pb-4">
      <PageHeader title="Erkennungs-Labor" subtitle="Live-Werte, Aufnahmen, Export" back="/profil" />

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <FlaskConical size={18} className="text-gold" /> Live
          </h2>
          <Badge tone={listening ? 'ok' : 'neutral'} icon={listening ? <Mic size={12} /> : <MicOff size={12} />}>
            {listening ? `${sampleRate} Hz · 10 ms` : status === 'starting' ? 'startet …' : 'aus'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Pegel" value={listening ? `${Math.round(levelDb)} dB` : '–'} hint={`Mindestpegel ${formatDb(gate)}`} />
          <Stat label="Tonhöhe" value={<span data-testid="lab-pitch">{listening ? pitchName : '–'}</span>} hint={pitch ? `${pitch.frequency.toFixed(1).replace('.', ',')} Hz · ${pitch.cents >= 0 ? '+' : '−'}${Math.abs(Math.round(pitch.cents))} Cent` : 'keine'} tone={pitch?.stable ? 'ok' : 'default'} />
          <Stat label="Zuverlässigkeit" value={listening && frame?.pitch ? `${reliability} %` : '–'} hint="YIN-Gegenprobe" />
          <Stat
            label="Anschläge"
            value={
              <span className="flex items-center gap-2" data-testid="lab-onsets">
                {onset?.count ?? 0}
                <Circle size={12} className={cn('transition-opacity', onset && frame && frame.time - onset.time < 0.25 ? 'fill-gold text-gold' : 'opacity-20')} aria-hidden />
              </span>
            }
            hint={onset ? `Stärke ${onset.strength.toFixed(1).replace('.', ',')}` : 'Spectral Flux'}
          />
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3" role="meter" aria-label="Eingangspegel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, Math.max(0, (levelDb + 60) / 0.6)))}>
          <div className={cn('h-full rounded-full transition-[width] duration-75', level >= gate ? 'bg-ok' : 'bg-muted/70')} style={{ width: `${listening ? Math.min(100, Math.max(0, (levelDb + 60) / 0.6)) : 0}%` }} />
        </div>
        <Button size="lg" full variant={listening ? 'secondary' : 'primary'} icon={listening ? <MicOff size={20} /> : <Mic size={20} />} loading={status === 'starting'} disabled={!supported} onClick={listening ? stop : () => void start()} data-testid="lab-mic">
          {listening ? 'Mikrofon stoppen' : 'Mikrofon starten'}
        </Button>
        {status === 'error' && error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
        {!calibration && <p className="text-xs text-warn">Noch nicht kalibriert – das Mindestpegel-Gate nutzt Standardwerte.</p>}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-bold">Aufnahme beschriften</h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Was wird gespielt?</span>
          <select value={presetId} onChange={(e) => setPresetId(e.target.value)} className="h-11 rounded-2xl border border-border bg-surface-2 px-3 text-text" data-testid="lab-preset">
            {CLIP_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm leading-relaxed text-muted">{preset.instruction}</p>
        {targetMidis.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Zieltonprüfung „Ist der Ton da?“</p>
            <div className="flex flex-col gap-1" data-testid="lab-targets">
              {targetMidis.map((midi, i) => {
                const result = frame?.targets[i];
                const score = listening && result ? result.score : 0;
                const present = score >= PRESENCE_THRESHOLD;
                return (
                  <div key={midi} className="flex items-center gap-2 text-sm tabular-nums">
                    <span className={cn('w-10 font-semibold', present ? 'text-ok' : 'text-muted')}>{noteNameWithOctave(midi, settings.noteNaming)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div className={cn('h-full rounded-full transition-[width] duration-75', present ? 'bg-ok' : 'bg-gold/60')} style={{ width: `${Math.round(score * 100)}%` }} />
                    </div>
                    <span className="w-14 text-right text-xs text-muted">{result && result.octave !== 'keine' ? (result.octave === 'tiefer' ? 'Okt. ↓' : 'Okt. ↑') : `${Math.round(score * 100)} %`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Notiz (optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="z. B. Stück, Takte, Abstand zum Mikrofon" className="h-11 rounded-2xl border border-border bg-surface-2 px-3 text-text placeholder:text-muted/70" />
        </label>
        <Button
          size="xl"
          full
          variant={recording ? 'danger' : 'primary'}
          icon={recording ? <Square size={20} /> : <Circle size={20} className="fill-current" />}
          disabled={!listening}
          onClick={recording ? () => void finishRecording() : beginRecording}
          data-testid="lab-record"
        >
          {recording ? `Aufnahme beenden (${formatDuration(recordedSec)})` : 'Aufnahme starten'}
        </Button>
        {!listening && <p className="text-xs text-muted">Zum Aufnehmen zuerst das Mikrofon starten. Höchstens {MAX_CLIP_SEC} s je Aufnahme.</p>}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Aufnahmen</h2>
          <span className="text-sm text-muted">{clips.length}</span>
        </div>
        {clips.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Aufnahmen. Für Phase 2 helfen: jede Leersaite dreimal, die Akkorde, der wiederholte Ton und zehn Sekunden Stille.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60" data-testid="lab-clips">
            {clips.map((clip) => (
              <li key={clip.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{clip.label}</p>
                  <p className="text-xs text-muted tabular-nums">
                    {formatDate(clip.createdAt)} · {formatDuration(clip.durationSec)}
                    {clip.notes ? ` · ${clip.notes}` : ''}
                  </p>
                </div>
                <Button size="sm" variant="ghost" aria-label={playingId === clip.id ? 'Wiedergabe stoppen' : `${clip.label} abspielen`} onClick={() => void playClip(clip)}>
                  {playingId === clip.id ? <Square size={16} /> : <Play size={16} />}
                </Button>
                <Button size="sm" variant="outline" aria-label={`${clip.label} exportieren`} onClick={() => void exportClip(clip)}>
                  {typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 size={16} /> : <Download size={16} />}
                </Button>
                <Button size="sm" variant="ghost" aria-label={`${clip.label} löschen`} onClick={() => void removeClip(clip)}>
                  <Trash2 size={16} className="text-bad" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padding="none">
        <button type="button" onClick={() => setGuideOpen((v) => !v)} aria-expanded={guideOpen} className="flex w-full items-center gap-3 p-4 text-left">
          <span className="flex-1 font-semibold">Vom iPhone ins Repository</span>
          <span className="text-muted">{guideOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
        </button>
        {guideOpen && (
          <div className="border-t border-border/70 px-4 pb-4 pt-3 text-sm leading-relaxed">
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              <li>
                Bei einer Aufnahme auf <Share2 size={14} className="inline" aria-hidden /> tippen und <strong>„In Dateien sichern“</strong> wählen (z. B. Ordner „GuitarCoach“). Es entstehen zwei Dateien mit gleichem Namen: <code>.wav</code> und <code>.json</code>.
              </li>
              <li>
                In Safari{' '}
                <a href={REPO_UPLOAD_URL} target="_blank" rel="noreferrer" className="font-semibold text-gold underline-offset-2 hover:underline">
                  github.com → Gitarre- → test-audio/real → Upload
                </a>{' '}
                öffnen (bei GitHub anmelden).
              </li>
              <li>„choose your files“ → „Dateien durchsuchen“ → beide Dateien auswählen. Mehrere Aufnahmen gehen in einem Rutsch.</li>
              <li>
                Unten „Commit changes“: Nachricht z. B. <em>Testaufnahmen iPhone: Leersaiten, Akkorde</em>, dann <strong>Commit directly to main</strong>. Fertig – Phase 2 nutzt die Dateien für den Benchmark.
              </li>
            </ol>
            <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-xs text-muted">
              Alternativ am Mac: Dateien per AirDrop übertragen und in <code>test-audio/real/</code> ablegen. Dateinamen nicht ändern – WAV und JSON gehören paarweise zusammen.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
