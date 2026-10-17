/**
 * Mikrofonzugriff für das Stimmgerät und den „Spiel mit“-Modus.
 *
 * getUserMedia → MediaStreamAudioSourceNode → AnalyserNode. Die Zeitbereichsdaten werden per
 * `read()` abgefragt (Polling, kein AudioWorklet – auf iOS Safari am zuverlässigsten).
 * Der Analyser wird bewusst NICHT mit dem Ausgang verbunden (keine Rückkopplung).
 */

/** Puffergröße des Analysers (Samples). 4096 ≈ 85 ms bei 48 kHz – genug für die tiefe E-Saite. */
export const MIC_FFT_SIZE = 4096;

export const MIC_MESSAGES = {
  denied: 'Der Mikrofonzugriff wurde verweigert. Bitte erlaube GuitarCoach den Zugriff in den Safari-/iOS-Einstellungen.',
  notFound: 'Es wurde kein Mikrofon gefunden.',
  busy: 'Das Mikrofon wird gerade von einer anderen App verwendet.',
  insecure: 'Der Mikrofonzugriff funktioniert nur über HTTPS oder localhost.',
  unsupported: 'Dieser Browser unterstützt keinen Mikrofonzugriff.',
  interrupted: 'Die Mikrofonaufnahme wurde unterbrochen (z. B. durch einen Anruf). Bitte starte das Mikrofon erneut.',
  generic: 'Das Mikrofon konnte nicht gestartet werden. Bitte versuche es erneut.',
} as const;

/** Ob dieser Browser getUserMedia anbietet. */
export function isMicrophoneSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
}

function isSecure(): boolean {
  return typeof window === 'undefined' || window.isSecureContext !== false;
}

function namedError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

function errorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (typeof error === 'object' && error !== null && 'name' in error) return String((error as { name: unknown }).name);
  return '';
}

/** Übersetzt Fehler von getUserMedia in verständliche deutsche Hinweise. */
export function describeMicError(error: unknown): string {
  switch (errorName(error)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'PermissionDismissedError':
      return MIC_MESSAGES.denied;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return MIC_MESSAGES.notFound;
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return MIC_MESSAGES.busy;
    case 'SecurityError':
      return isSecure() ? MIC_MESSAGES.denied : MIC_MESSAGES.insecure;
    case 'NotSupportedError':
      return MIC_MESSAGES.unsupported;
    default:
      break;
  }
  if (!isSecure()) return MIC_MESSAGES.insecure;
  if (!isMicrophoneSupported()) return MIC_MESSAGES.unsupported;
  if (error instanceof Error && error.message) return `${MIC_MESSAGES.generic} (${error.message})`;
  return MIC_MESSAGES.generic;
}

export class MicrophoneInput {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  /** Wird bei jedem stop() erhöht, damit ein noch laufendes start() seinen Stream wieder freigibt. */
  private generation = 0;
  private starting = false;

  /** Wird aufgerufen, wenn das System die Aufnahme beendet (z. B. Anruf, andere App). */
  onEnded: (() => void) | null = null;

  get isRunning(): boolean {
    return this.analyser !== null;
  }

  /** Abtastrate des AudioContext (0, wenn nicht aktiv). Die Browser rechnen das Mikrofon darauf um. */
  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 0;
  }

  /** Länge des Puffers, den `read()` befüllt. */
  get bufferSize(): number {
    return this.analyser?.fftSize ?? MIC_FFT_SIZE;
  }

  /**
   * Fordert das Mikrofon an und baut die Analysekette auf.
   * Vorher `unlockAudio()` aus einem Klick-Handler aufrufen (iOS).
   */
  async start(ctx: AudioContext): Promise<void> {
    if (this.isRunning || this.starting) return;
    if (!isSecure()) throw namedError('SecurityError', MIC_MESSAGES.insecure);
    if (!isMicrophoneSupported()) throw namedError('NotSupportedError', MIC_MESSAGES.unsupported);

    this.starting = true;
    const generation = this.generation;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      if (generation !== this.generation) {
        // Während der Berechtigungsabfrage wurde stop() gerufen – Stream sofort wieder freigeben.
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = MIC_FFT_SIZE;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      this.ctx = ctx;
      this.stream = stream;
      this.source = source;
      this.analyser = analyser;
      for (const track of stream.getAudioTracks()) track.addEventListener('ended', this.handleTrackEnded);
    } finally {
      this.starting = false;
    }
  }

  /** Füllt `target` mit den jüngsten Zeitbereichsdaten (−1 … 1). Liefert false, wenn nicht aktiv. */
  read(target: Float32Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getFloatTimeDomainData(target);
    return true;
  }

  /** Beendet die Aufnahme vollständig (danach verschwindet auch die Mikrofon-Anzeige von iOS). */
  stop(): void {
    this.generation++;
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.removeEventListener('ended', this.handleTrackEnded);
        track.stop();
      }
    }
    try {
      this.source?.disconnect();
    } catch {
      // bereits getrennt
    }
    try {
      this.analyser?.disconnect();
    } catch {
      // bereits getrennt
    }
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.ctx = null;
  }

  private readonly handleTrackEnded = (): void => {
    if (!this.isRunning) return;
    this.stop();
    this.onEnded?.();
  };
}
