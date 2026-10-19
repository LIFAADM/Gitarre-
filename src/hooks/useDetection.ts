import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext, unlockAudio } from '@/core/audio/audioContext';
import { MIC_MESSAGES, describeMicError, isAudioWorkletSupported, isMicrophoneSupported } from '@/core/audio/mic';
import { MicAnalyser, type AudioChunk } from '@/core/audio/micWorklet';
import { PitchTracker, RMS_GATE, type TrackedPitch, type TunerSensitivity } from '@/core/audio/pitch/pitchTracker';
import type { AnalysisFrame } from '@/core/detection/engine';
import { isSpeechBlockingMic } from '@/core/speech/speech';
import { getCalibration } from '@/core/storage/calibration';
import { useCalibration } from './useCalibration';

/**
 * Tonerkennung über die Worklet-Kette als React-Hook.
 *
 * Pipeline: MicAnalyser (AudioWorklet, 10-ms-Frames) → PitchTracker (Gate, Median, Stabilität) → React-State.
 * Die Frames kommen ~100-mal pro Sekunde; der React-State wird höchstens alle 50 ms aktualisiert.
 * Für Logik, die jedes Frame braucht (Kalibrierung, Labor, Spielansicht), gibt es `onFrame`.
 *
 * `start()` muss aus einer Benutzerinteraktion heraus aufgerufen werden (iOS). Beim Verlassen der Seite
 * und beim Wechsel in den Hintergrund wird das Mikrofon automatisch freigegeben.
 */

export type DetectionStatus = 'idle' | 'starting' | 'listening' | 'error';

export interface UseDetectionOptions {
  /** Hauptschalter: `false` stoppt das Mikrofon und verhindert `start()`. */
  enabled: boolean;
  sensitivity: TunerSensitivity;
  a4Hz: number;
  /** Mindestdauer unveränderter Note, bis `pitch.stable` gilt (Standard 100 ms). */
  minStableMs?: number;
  /** Zieltöne (Hz) für die erwartungsgeführte Prüfung. */
  targets?: readonly number[];
  /** Wird für jedes Frame aufgerufen (nicht gedrosselt). */
  onFrame?: (frame: AnalysisFrame) => void;
  /** Rohaudio während einer Aufnahme (siehe `setRecording`). */
  onAudio?: (chunk: AudioChunk) => void;
}

export interface OnsetInfo {
  time: number;
  strength: number;
  count: number;
}

export interface Detection {
  /** Geglättete aktuelle Tonhöhe oder `null`, wenn nichts Verlässliches erkannt wird. */
  pitch: TrackedPitch | null;
  /** Eingangspegel (RMS, 0 … 1) – Maximum seit der letzten Aktualisierung, auch unterhalb des Gates. */
  level: number;
  /** Letztes Analyse-Frame (gedrosselt). */
  frame: AnalysisFrame | null;
  /** Letzter erkannter Anschlag mit fortlaufender Zählung. */
  onset: OnsetInfo | null;
  status: DetectionStatus;
  /** Deutsche Fehlermeldung, wenn `status === 'error'`. */
  error: string | null;
  /** Ob der Browser Mikrofon und AudioWorklet anbietet. */
  supported: boolean;
  sampleRate: number;
  /** Aktueller Mindestpegel (RMS) des Trackers. */
  gate: number;
  start: () => Promise<void>;
  stop: () => void;
  /** Setzt die Auswertung für `ms` Millisekunden aus (z. B. während ein Referenzton erklingt). */
  pause: (ms: number) => void;
  /** Rohaudio-Übertragung ein-/ausschalten (Aufnahme im Labor). */
  setRecording: (enabled: boolean) => void;
  /** AudioContext der laufenden Kette (für Klicks auf derselben Uhr). */
  audioContext: () => AudioContext | null;
}

const PUBLISH_INTERVAL_MS = 50;

interface Reading {
  pitch: TrackedPitch | null;
  level: number;
  frame: AnalysisFrame | null;
  onset: OnsetInfo | null;
}

const EMPTY_READING: Reading = { pitch: null, level: 0, frame: null, onset: null };

/** Mindestpegel aus Empfindlichkeit und Kalibrierung (das Strengere gewinnt nicht – die Kalibrierung senkt das Gate nie unter das Rauschen). */
export function effectiveGate(sensitivity: TunerSensitivity, calibratedGate: number | null): number {
  const base = RMS_GATE[sensitivity];
  if (calibratedGate === null) return base;
  // Empfindlichkeit skaliert das kalibrierte Gate: „hoch“ halbiert, „niedrig“ verdoppelt.
  const factor = sensitivity === 'hoch' ? 0.5 : sensitivity === 'niedrig' ? 2 : 1;
  return Math.max(calibratedGate * factor, 0.001);
}

export function useDetection(options: UseDetectionOptions): Detection {
  const { enabled, sensitivity, a4Hz, minStableMs, targets, onFrame, onAudio } = options;

  const [status, setStatus] = useState<DetectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading>(EMPTY_READING);
  const [sampleRate, setSampleRate] = useState(0);
  const calibration = useCalibration();
  const gate = effectiveGate(sensitivity, calibration?.gateRms ?? null);

  const analyserRef = useRef<MicAnalyser | null>(null);
  const trackerRef = useRef<PitchTracker | null>(null);
  const lastPublishRef = useRef(0);
  const levelMaxRef = useRef(0);
  const onsetRef = useRef<OnsetInfo | null>(null);
  const pausedUntilRef = useRef(0);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const onFrameRef = useRef(onFrame);
  const onAudioRef = useRef(onAudio);
  const gateRef = useRef(gate);
  const trackerOptionsRef = useRef({ sensitivity, a4Hz, minStableMs });

  const handleFrame = useCallback((frame: AnalysisFrame): void => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    const nowMs = performance.now();
    const paused = nowMs < pausedUntilRef.current || isSpeechBlockingMic(nowMs);
    if (frame.rms > levelMaxRef.current) levelMaxRef.current = frame.rms;
    if (paused) tracker.push(null, nowMs);
    else {
      const pitch = frame.pitch;
      tracker.push(pitch && frame.rms >= gateRef.current ? { frequency: pitch.hz, probability: pitch.probability, rms: frame.rms } : { frequency: 0, probability: 0, rms: frame.rms }, nowMs);
      if (frame.onset) onsetRef.current = { time: frame.onsetTime, strength: frame.onsetStrength, count: (onsetRef.current?.count ?? 0) + 1 };
    }
    onFrameRef.current?.(frame);

    if (nowMs - lastPublishRef.current < PUBLISH_INTERVAL_MS) return;
    lastPublishRef.current = nowMs;
    const level = levelMaxRef.current;
    levelMaxRef.current = 0;
    const pitch = tracker.current(nowMs);
    const onset = onsetRef.current;
    setReading((prev) => (prev.pitch === null && pitch === null && prev.onset === onset && Math.abs(prev.level - level) < 0.0005 && prev.frame?.targets.length === 0 && frame.targets.length === 0 ? prev : { pitch, level, frame, onset }));
  }, []);

  const stopInternal = useCallback((nextStatus: DetectionStatus = 'idle', message: string | null = null): void => {
    analyserRef.current?.stop();
    trackerRef.current?.reset();
    pausedUntilRef.current = 0;
    onsetRef.current = null;
    if (!mountedRef.current) return;
    setReading((prev) => (prev.pitch === null && prev.level === 0 && prev.frame === null ? prev : EMPTY_READING));
    setStatus(nextStatus);
    setError(message);
  }, []);

  const stop = useCallback((): void => stopInternal('idle', null), [stopInternal]);

  const start = useCallback(async (): Promise<void> => {
    if (!enabledRef.current || startingRef.current) return;
    const analyser = (analyserRef.current ??= new MicAnalyser());
    if (analyser.isRunning) return;
    if (!isMicrophoneSupported()) {
      setStatus('error');
      setError(MIC_MESSAGES.unsupported);
      return;
    }
    if (!isAudioWorkletSupported()) {
      setStatus('error');
      setError(MIC_MESSAGES.unsupportedWorklet);
      return;
    }

    startingRef.current = true;
    setError(null);
    setStatus('starting');
    try {
      await unlockAudio();
      const ctx = getAudioContext();
      const tracker = (trackerRef.current ??= new PitchTracker(trackerOptionsRef.current));
      tracker.setOptions(trackerOptionsRef.current);
      tracker.reset();
      analyser.onEnded = () => stopInternal('error', MIC_MESSAGES.interrupted);
      analyser.onFrame = handleFrame;
      analyser.onAudio = (chunk) => onAudioRef.current?.(chunk);
      analyser.setNoiseFloor(getCalibration()?.noiseFloorRms ?? 0);
      await analyser.start(ctx);
      if (!mountedRef.current || !enabledRef.current) {
        analyser.stop();
        if (mountedRef.current) setStatus('idle');
        return;
      }
      if (!analyser.isRunning) {
        // stop() wurde während der Berechtigungsabfrage aufgerufen.
        setStatus('idle');
        return;
      }
      lastPublishRef.current = 0;
      levelMaxRef.current = 0;
      pausedUntilRef.current = 0;
      onsetRef.current = null;
      setSampleRate(analyser.sampleRate);
      setStatus('listening');
    } catch (err) {
      analyser.stop();
      if (mountedRef.current) {
        setStatus('error');
        setError(describeMicError(err));
      }
    } finally {
      startingRef.current = false;
    }
  }, [handleFrame, stopInternal]);

  const pause = useCallback((ms: number): void => {
    pausedUntilRef.current = performance.now() + Math.max(0, ms);
    trackerRef.current?.reset();
    if (mountedRef.current) setReading((prev) => (prev.pitch === null ? prev : { ...prev, pitch: null }));
  }, []);

  const setRecording = useCallback((on: boolean): void => {
    analyserRef.current?.setRecording(on);
  }, []);

  const audioContext = useCallback((): AudioContext | null => analyserRef.current?.context ?? null, []);

  // Einstellungen im laufenden Betrieb übernehmen.
  useEffect(() => {
    trackerOptionsRef.current = { sensitivity, a4Hz, minStableMs };
    trackerRef.current?.setOptions({ sensitivity, a4Hz, minStableMs });
  }, [sensitivity, a4Hz, minStableMs]);

  useEffect(() => {
    gateRef.current = gate;
    analyserRef.current?.setNoiseFloor(calibration?.noiseFloorRms ?? 0);
  }, [gate, calibration]);

  useEffect(() => {
    onFrameRef.current = onFrame;
    onAudioRef.current = onAudio;
  }, [onFrame, onAudio]);

  // Zieltöne an das Worklet weitergeben.
  const targetsKey = targets ? targets.map((t) => t.toFixed(3)).join(',') : '';
  useEffect(() => {
    const analyser = (analyserRef.current ??= new MicAnalyser());
    analyser.setTargets(targetsKey ? targetsKey.split(',').map(Number) : []);
  }, [targetsKey]);

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
    frame: reading.frame,
    onset: reading.onset,
    status,
    error,
    supported: isMicrophoneSupported() && isAudioWorkletSupported(),
    sampleRate,
    gate,
    start,
    stop,
    pause,
    setRecording,
    audioContext,
  };
}
