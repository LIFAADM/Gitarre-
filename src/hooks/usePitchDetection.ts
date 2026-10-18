import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext, unlockAudio } from '@/core/audio/audioContext';
import { MIC_MESSAGES, MicrophoneInput, describeMicError, isMicrophoneSupported } from '@/core/audio/mic';
import { PitchTracker, type TrackedPitch, type TunerSensitivity } from '@/core/audio/pitch/pitchTracker';
import { detectPitchYin, rms } from '@/core/audio/pitch/yin';

/**
 * Tonhöhenerkennung über das Mikrofon als React-Hook.
 *
 * Pipeline: MicrophoneInput (AnalyserNode) → alle ~40 ms Puffer lesen → YIN → PitchTracker (Gate,
 * Median, Stabilität). Die Analyse läuft komplett in Refs; der React-State wird höchstens alle 50 ms
 * aktualisiert, damit die Oberfläche nicht öfter als ~20-mal pro Sekunde neu rendert.
 *
 * `start()` muss aus einer Benutzerinteraktion heraus aufgerufen werden (iOS). Beim Verlassen der Seite
 * und beim Wechsel in den Hintergrund wird das Mikrofon automatisch freigegeben.
 */

export type PitchDetectionStatus = 'idle' | 'starting' | 'listening' | 'error';

export interface UsePitchDetectionOptions {
  /** Hauptschalter: `false` stoppt das Mikrofon und verhindert `start()`. */
  enabled: boolean;
  sensitivity: TunerSensitivity;
  a4Hz: number;
  /** Mindestdauer unveränderter Note, bis `pitch.stable` gilt (Standard 100 ms). */
  minStableMs?: number;
  /** Analyseintervall in ms (Standard 40). */
  intervalMs?: number;
}

export interface PitchDetection {
  /** Geglättete aktuelle Tonhöhe oder `null`, wenn nichts Verlässliches erkannt wird. */
  pitch: TrackedPitch | null;
  /** Eingangspegel (RMS, 0 … 1) – auch unterhalb des Gates, für die Pegelanzeige. */
  level: number;
  status: PitchDetectionStatus;
  /** Deutsche Fehlermeldung, wenn `status === 'error'`. */
  error: string | null;
  /** Ob der Browser überhaupt Mikrofonzugriff anbietet. */
  supported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  /** Setzt die Auswertung für `ms` Millisekunden aus (z. B. während ein Referenzton erklingt). */
  pause: (ms: number) => void;
}

const DEFAULT_INTERVAL_MS = 40;
const PUBLISH_INTERVAL_MS = 50;

interface Reading {
  pitch: TrackedPitch | null;
  level: number;
}

const EMPTY_READING: Reading = { pitch: null, level: 0 };

export function usePitchDetection(options: UsePitchDetectionOptions): PitchDetection {
  const { enabled, sensitivity, a4Hz, minStableMs, intervalMs = DEFAULT_INTERVAL_MS } = options;

  const [status, setStatus] = useState<PitchDetectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading>(EMPTY_READING);

  const micRef = useRef<MicrophoneInput | null>(null);
  const trackerRef = useRef<PitchTracker | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastPublishRef = useRef(0);
  const pausedUntilRef = useRef(0);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  // Aktuelle Optionen für die Callbacks (werden in Effekten nachgeführt, nicht während des Renderns).
  const enabledRef = useRef(enabled);
  const intervalRef = useRef(intervalMs);
  const trackerOptionsRef = useRef({ sensitivity, a4Hz, minStableMs });

  /** Ein Analyseschritt: Puffer lesen → YIN → Tracker → (gedrosselt) State. */
  const tick = useCallback((): void => {
    const mic = micRef.current;
    const tracker = trackerRef.current;
    if (!mic || !tracker || !mic.isRunning) return;
    const buffer = (bufferRef.current ??= new Float32Array(mic.bufferSize));
    if (!mic.read(buffer)) return;

    const now = performance.now();
    const level = rms(buffer);
    if (now < pausedUntilRef.current) tracker.push(null, now);
    else tracker.push(detectPitchYin(buffer, mic.sampleRate), now);

    if (now - lastPublishRef.current < PUBLISH_INTERVAL_MS) return;
    lastPublishRef.current = now;
    const pitch = tracker.current(now);
    setReading((prev) => (prev.pitch === null && pitch === null && Math.abs(prev.level - level) < 0.0005 ? prev : { pitch, level }));
  }, []);

  const stopInternal = useCallback((nextStatus: PitchDetectionStatus = 'idle', message: string | null = null): void => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    micRef.current?.stop();
    trackerRef.current?.reset();
    pausedUntilRef.current = 0;
    if (!mountedRef.current) return;
    setReading((prev) => (prev.pitch === null && prev.level === 0 ? prev : EMPTY_READING));
    setStatus(nextStatus);
    setError(message);
  }, []);

  const stop = useCallback((): void => stopInternal('idle', null), [stopInternal]);

  const start = useCallback(async (): Promise<void> => {
    if (!enabledRef.current || startingRef.current) return;
    const mic = (micRef.current ??= new MicrophoneInput());
    if (mic.isRunning) return;
    if (!isMicrophoneSupported()) {
      setStatus('error');
      setError(MIC_MESSAGES.unsupported);
      return;
    }

    startingRef.current = true;
    setError(null);
    setStatus('starting');
    try {
      await unlockAudio();
      const ctx = getAudioContext();
      mic.onEnded = () => stopInternal('error', MIC_MESSAGES.interrupted);
      await mic.start(ctx);
      if (!mountedRef.current || !enabledRef.current) {
        mic.stop();
        if (mountedRef.current) setStatus('idle');
        return;
      }
      if (!mic.isRunning) {
        // stop() wurde während der Berechtigungsabfrage aufgerufen.
        setStatus('idle');
        return;
      }
      const tracker = (trackerRef.current ??= new PitchTracker(trackerOptionsRef.current));
      tracker.setOptions(trackerOptionsRef.current);
      tracker.reset();
      bufferRef.current = new Float32Array(mic.bufferSize);
      lastPublishRef.current = 0;
      pausedUntilRef.current = 0;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(tick, intervalRef.current);
      setStatus('listening');
    } catch (err) {
      mic.stop();
      if (mountedRef.current) {
        setStatus('error');
        setError(describeMicError(err));
      }
    } finally {
      startingRef.current = false;
    }
  }, [stopInternal, tick]);

  const pause = useCallback((ms: number): void => {
    pausedUntilRef.current = performance.now() + Math.max(0, ms);
    trackerRef.current?.reset();
    if (mountedRef.current) setReading((prev) => (prev.pitch === null ? prev : { pitch: null, level: prev.level }));
  }, []);

  // Einstellungen im laufenden Betrieb übernehmen.
  useEffect(() => {
    trackerOptionsRef.current = { sensitivity, a4Hz, minStableMs };
    trackerRef.current?.setOptions({ sensitivity, a4Hz, minStableMs });
  }, [sensitivity, a4Hz, minStableMs]);

  useEffect(() => {
    intervalRef.current = intervalMs;
  }, [intervalMs]);

  // Hauptschalter
  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) stop();
  }, [enabled, stop]);

  // Im Hintergrund (App-Wechsel, Sperrbildschirm) das Mikrofon freigeben.
  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') stop();
    };
    const onPageHide = (): void => stop();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [stop]);

  // Beim Verlassen der Seite alles freigeben.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopInternal();
    };
  }, [stopInternal]);

  return {
    pitch: reading.pitch,
    level: reading.level,
    status,
    error,
    supported: isMicrophoneSupported(),
    start,
    stop,
    pause,
  };
}
