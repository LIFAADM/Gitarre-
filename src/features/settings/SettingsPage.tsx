import { useEffect, useRef, useState } from 'react';
import { Download, Info, Lightbulb, Mic, Share, Trash, Upload, Volume2 } from 'lucide-react';
import { Button, Card, PageHeader, Segmented, Sheet, Slider, Toggle, useToast } from '@/components/ui';
import { createBackup, deleteAllData, parseBackup, resetProgress, restoreBackup } from '@/core/storage/backup';
import { listGermanVoices, subscribeVoices, type SpeechVoiceInfo } from '@/core/speech/speech';
import { DEFAULT_SETTINGS } from '@/core/storage/settings';
import { downloadTextFile } from '@/features/songs/songUtils';
import { useSettings } from '@/hooks/useSettings';
import { useSpeech } from '@/hooks/useSpeech';
import { KIDS_STRINGS } from '@/features/kids/kidsData';
import { useNavigate } from 'react-router';
import { formatBytes } from '@/lib/format';

const LICENSES = [
  { name: 'alphaTab (Import Guitar Pro/MusicXML)', license: 'MPL-2.0' },
  { name: 'Bravura Musikschrift', license: 'SIL Open Font License 1.1' },
  { name: 'React, React Router, Vite, Tailwind CSS, Workbox', license: 'MIT' },
  { name: 'Dexie.js, dexie-react-hooks', license: 'Apache-2.0' },
  { name: 'Lucide Icons', license: 'ISC' },
  { name: 'Gitarrenklang, Metronom, Arrangements, Lektionen', license: 'Eigene Erzeugung (GuitarCoach)' },
];

export function SettingsPage() {
  const [settings, update] = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [micState, setMicState] = useState<string>('wird beim ersten Start abgefragt');
  const [confirm, setConfirm] = useState<'progress' | 'all' | null>(null);
  const [licensesOpen, setLicensesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const speech = useSpeech();
  const [voices, setVoices] = useState<SpeechVoiceInfo[]>(() => listGermanVoices());

  // Stimmen werden in manchen Browsern erst nachgeladen.
  useEffect(() => subscribeVoices(() => setVoices(listGermanVoices())), []);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then((e) => setStorage({ usage: e.usage ?? 0, quota: e.quota ?? 0 }));
    }
    const perms = navigator.permissions as Permissions | undefined;
    if (perms?.query) {
      perms
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          const map: Record<string, string> = { granted: 'erlaubt', denied: 'verweigert', prompt: 'wird beim ersten Start abgefragt' };
          setMicState(map[status.state] ?? status.state);
          status.onchange = () => setMicState(map[status.state] ?? status.state);
        })
        .catch(() => undefined);
    }
  }, []);

  const exportBackup = async (): Promise<void> => {
    setBusy(true);
    try {
      const backup = await createBackup();
      downloadTextFile(`guitarcoach-sicherung-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup));
      toast.show('Sicherung erstellt. Die Datei liegt in deinen Downloads bzw. in „Dateien“.', 'success', 5000);
    } catch (error) {
      toast.show(`Sicherung fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      const parsed = parseBackup(await file.text());
      const result = await restoreBackup(parsed);
      toast.show(`Sicherung eingespielt: ${result.sessions} Sitzungen, ${result.songs} Songs.`, 'success', 5000);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : String(error), 'error', 6000);
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 text-[15px] outline-none focus:border-gold';

  return (
    <>
      <PageHeader title="Einstellungen" back="/" />
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="text-base font-bold">Profil</h2>
          <label className="mt-2 block">
            <span className="mb-1 block text-sm text-muted">Dein Name (für die Begrüßung)</span>
            <input className={inputClass} value={settings.userName} onChange={(e) => void update({ userName: e.target.value })} placeholder="z. B. Jörn" />
          </label>
          <div className="mt-3">
            <Slider label="Tägliches Übungsziel" value={settings.dailyGoalMinutes} min={5} max={90} step={5} onChange={(v) => void update({ dailyGoalMinutes: v })} format={(v) => `${v} Min.`} />
            <Slider label="Wochenziel (Übungstage)" value={settings.weeklyGoalDays} min={1} max={7} step={1} onChange={(v) => void update({ weeklyGoalDays: v })} format={(v) => `${v} Tage`} />
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-bold">Gitarre & Darstellung</h2>
          <div className="mt-2">
            <span className="mb-1 block text-sm text-muted">Notennamen</span>
            <Segmented
              value={settings.noteNaming}
              onChange={(v) => void update({ noteNaming: v })}
              options={[
                { value: 'de', label: 'Deutsch (H)' },
                { value: 'intl', label: 'International (B)' },
              ]}
            />
          </div>
          <Toggle checked={settings.leftHanded} onChange={(v) => void update({ leftHanded: v })} label="Linkshänder" description="Griffbrett spiegeln (Sattel rechts)." />
          <div className="mt-1">
            <span className="mb-1 block text-sm text-muted">Griffbrett-Ansicht</span>
            <Segmented
              value={settings.fretboardOrientation}
              onChange={(v) => void update({ fretboardOrientation: v })}
              options={[
                { value: 'tab', label: 'Wie Tabulatur (hohe E oben)' },
                { value: 'player-view', label: 'Blick auf die Gitarre' },
              ]}
            />
          </div>
          <Toggle checked={settings.showFingerNumbers} onChange={(v) => void update({ showFingerNumbers: v })} label="Fingersatz anzeigen" description="Ziffern 1–4 über der Tabulatur und im Griffbrett." />
          <Toggle checked={settings.autoScroll} onChange={(v) => void update({ autoScroll: v })} label="Automatisch scrollen" />
          <Toggle checked={settings.countIn} onChange={(v) => void update({ countIn: v })} label="Einzähler vor dem Start" description="Ein Takt Metronom, wenn das Metronom eingeschaltet ist." />
          <Slider label="Tab-Größe" value={Math.round(settings.tabZoom * 100)} min={70} max={180} step={10} onChange={(v) => void update({ tabZoom: v / 100 })} format={(v) => `${v} %`} />
        </Card>

        <Card>
          <h2 className="text-base font-bold">Stimmgerät & Mikrofon</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <Mic size={16} /> Mikrofonzugriff: {micState}. Audio wird nur auf dem Gerät analysiert, nie übertragen.
          </p>
          <div className="mt-2">
            <Slider label="Kammerton A4" value={settings.a4Hz} min={432} max={446} step={1} onChange={(v) => void update({ a4Hz: v })} format={(v) => `${v} Hz`} />
            <Slider label="Toleranz „richtig gestimmt“" value={settings.tunerToleranceCents} min={1} max={15} step={1} onChange={(v) => void update({ tunerToleranceCents: v })} format={(v) => `± ${v} Cent`} />
            <span className="mb-1 block text-sm text-muted">Empfindlichkeit</span>
            <Segmented
              value={settings.tunerSensitivity}
              onChange={(v) => void update({ tunerSensitivity: v })}
              options={[
                { value: 'niedrig', label: 'Niedrig' },
                { value: 'normal', label: 'Normal' },
                { value: 'hoch', label: 'Hoch' },
              ]}
            />
            <p className="mt-1 text-xs text-muted">„Hoch“ reagiert auch auf leise Töne, aber auch eher auf Störgeräusche.</p>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-bold">Spiel mit – Lernkontrolle</h2>
          <Slider label="Toleranz für „richtig“" value={settings.listenToleranceCents} min={10} max={60} step={5} onChange={(v) => void update({ listenToleranceCents: v })} format={(v) => `± ${v} Cent`} />
          <Slider label="Mindestdauer eines stabilen Tons" value={settings.listenMinStableMs} min={60} max={400} step={20} onChange={(v) => void update({ listenMinStableMs: v })} format={(v) => `${v} ms`} />
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <span aria-hidden>🧒</span> Kinder-Modus (ab 4 Jahren)
          </h2>
          <p className="mt-1 text-sm text-muted">
            Eigene Oberfläche ohne Lesen: riesige Tasten, Saiten als Farben, gesprochene Anleitungen. Vier Spiele: Saiten entdecken, „Welche Saite?“ (Hören und Nachspielen, mit Mikrofon oder Antippen), Kinderlieder in der ersten Lage (Vorspielen, Mitspielen) und Klatschen im Takt. Zurück zur normalen App nur über eine Rechenaufgabe für Erwachsene.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Saitenfarben">
            {KIDS_STRINGS.map((s) => (
              <span key={s.number} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: s.color }}>
                {s.number} · {s.noteName} · {s.colorName}
              </span>
            ))}
          </div>
          <Button
            className="mt-3"
            variant="primary"
            onClick={() => {
              void update({ kidsMode: true });
              navigate('/kinder');
            }}
          >
            Kinder-Modus starten
          </Button>
          <p className="mt-2 text-xs text-muted">Tipp: Für kleine Hände eignet sich eine 1/4- oder 1/2-Gitarre; die Stimmung ist dieselbe, die Spiele funktionieren unverändert.</p>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Lightbulb size={18} className="text-gold" /> Coach-Tipps
          </h2>
          <Toggle checked={settings.coachTips} onChange={(v) => void update({ coachTips: v })} label="Tipps anzeigen" description="Situationsbezogene Hinweise aus deinen Messwerten: im Stimmgerät (Überdrehen, zurückrutschende Saite), im Spiel-mit-Modus (ein Bund daneben, Nachbarsaite, Fingerdruck), nach Durchläufen im Player und ein Tipp des Tages auf der Startseite." />
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Volume2 size={18} className="text-gold" /> Sprachbegleitung
          </h2>
          {!speech.supported ? (
            <p className="mt-1 text-sm text-muted">Dieser Browser bietet keine Sprachausgabe an.</p>
          ) : (
            <>
              <Toggle checked={settings.speechEnabled} onChange={(v) => void update({ speechEnabled: v })} label="Sprachausgabe" description="Deutsche Systemstimme, offline – nichts verlässt das Gerät. Während die App spricht, pausiert die Mikrofon-Auswertung kurz." />
              <Slider label="Sprechtempo" value={Math.round(settings.speechRate * 100)} min={70} max={130} step={5} onChange={(v) => void update({ speechRate: v / 100 })} format={(v) => `${v} %`} disabled={!settings.speechEnabled} />
              <label className="mt-3 block">
                <span className="mb-1 block text-sm text-muted">Stimme</span>
                <select className={inputClass} value={settings.speechVoiceURI} onChange={(e) => void update({ speechVoiceURI: e.target.value })} disabled={!settings.speechEnabled}>
                  <option value="">Automatisch (beste deutsche Stimme)</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                      {v.lang !== 'de-DE' ? ` (${v.lang})` : ''}
                      {v.localService ? '' : ' – benötigt Internet'}
                    </option>
                  ))}
                </select>
              </label>
              {voices.length === 0 && <p className="mt-1 text-xs text-muted">Keine deutsche Stimme gefunden. Auf dem iPhone: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch, dort eine Stimme laden.</p>}
              <Button className="mt-3" size="sm" variant="outline" icon={<Volume2 size={16} />} disabled={!settings.speechEnabled} onClick={() => void speech.say(null, 'Hallo! Ich bin deine Sprachbegleitung. Eins, zwei, drei, vier.')}>
                Probe hören
              </Button>
              <div className="mt-2 border-t border-border pt-1">
                <Toggle checked={settings.speechLessons} onChange={(v) => void update({ speechLessons: v })} disabled={!settings.speechEnabled} label="Lektionen vorlesen" description="Knopf „Lektion vorlesen“ in jeder Lektion." />
                <Toggle checked={settings.speechTuner} onChange={(v) => void update({ speechTuner: v })} disabled={!settings.speechEnabled} label="Stimmgerät ansagen" description="„E-Saite, zu tief“ – „E stimmt“." />
                <Toggle checked={settings.speechListen} onChange={(v) => void update({ speechListen: v })} disabled={!settings.speechEnabled} label="Spiel mit ansagen" description="Nächster Ton mit Saite und Bund, Rückmeldung und Ergebnis." />
                <Toggle checked={settings.speechCountIn} onChange={(v) => void update({ speechCountIn: v })} disabled={!settings.speechEnabled} label="Einzähler mitsprechen" description="„Eins, zwei, drei, vier“ zu den Klicks vor dem Start (Metronom und Einzähler an)." />
                <Toggle checked={settings.speechPlayer} onChange={(v) => void update({ speechPlayer: v })} disabled={!settings.speechEnabled} label="Abschnitte im Player ansagen" description="Sagt Abschnittsnamen wie „Refrain“ an, wenn der Song welche enthält." />
                <Toggle checked={settings.speechTips} onChange={(v) => void update({ speechTips: v })} disabled={!settings.speechEnabled || !settings.coachTips} label="Coach-Tipps vorlesen" description="Tipps werden gesprochen, sobald sie erscheinen." />
                <Toggle checked={settings.speechKids} onChange={(v) => void update({ speechKids: v })} disabled={!settings.speechEnabled} label="Kinder-Modus: Anleitungen sprechen" description="Jede Kinderseite erklärt sich beim Öffnen selbst." />
              </div>
            </>
          )}
          <div className="mt-2 border-t border-border pt-1">
            <Toggle checked={settings.headsetControls} onChange={(v) => void update({ headsetControls: v })} label="Kopfhörer-Steuerung (experimentell)" description="Play und Pause über die Kopfhörer-Taste und den Sperrbildschirm. Dafür läuft während der Wiedergabe eine stumme Tonspur mit." />
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-bold">Lautstärke</h2>
          <Slider label="Gitarrenklang" value={Math.round(settings.synthVolume * 100)} min={0} max={120} step={5} onChange={(v) => void update({ synthVolume: v / 100 })} format={(v) => `${v} %`} />
          <Slider label="Metronom" value={Math.round(settings.metronomeVolume * 100)} min={0} max={100} step={5} onChange={(v) => void update({ metronomeVolume: v / 100 })} format={(v) => `${v} %`} />
        </Card>

        <Card>
          <h2 className="text-base font-bold">Daten & Sicherung</h2>
          <p className="mt-1 text-sm text-muted">
            Alles liegt nur auf diesem Gerät (IndexedDB){storage ? ` – belegt ${formatBytes(storage.usage)} von ca. ${formatBytes(storage.quota)}` : ''}. Sichere deine Lerndaten regelmäßig, z. B. vor einem Gerätewechsel.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button icon={<Download size={18} />} onClick={() => void exportBackup()} loading={busy}>
              Sicherung exportieren (JSON)
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importBackup(f);
                e.target.value = '';
              }}
            />
            <Button icon={<Upload size={18} />} onClick={() => fileRef.current?.click()} loading={busy}>
              Sicherung wiederherstellen
            </Button>
            <Button variant="danger" icon={<Trash size={18} />} onClick={() => setConfirm('progress')}>
              Lernfortschritt zurücksetzen
            </Button>
            <Button variant="danger" icon={<Trash size={18} />} onClick={() => setConfirm('all')}>
              Alle Daten löschen
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">Importierte Rohdateien (Guitar Pro etc.) sind nicht Teil der Sicherung – die daraus erzeugten Noten schon.</p>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Share size={18} className="text-gold" /> Als App auf dem iPhone
          </h2>
          <ol className="mt-2 flex flex-col gap-1 text-sm text-text/90">
            <li>1. GuitarCoach in Safari öffnen (über HTTPS).</li>
            <li>2. Auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen.</li>
            <li>3. Vom Home-Bildschirm starten – die App läuft dann im Vollbild und offline.</li>
          </ol>
          <p className="mt-2 text-xs text-muted">Hinweis: Im privaten Modus speichert Safari nichts dauerhaft. Bei längerer Nichtnutzung kann iOS Website-Daten löschen – deshalb regelmäßig sichern.</p>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Info size={18} className="text-gold" /> Über GuitarCoach
          </h2>
          <p className="mt-1 text-sm text-muted">Version {__APP_VERSION__} · Kein Konto, keine Werbung, kein Tracking, keine Cloud. Alle Statistiken basieren auf deinen echten Übungssitzungen.</p>
          <Button className="mt-2" variant="ghost" onClick={() => setLicensesOpen(true)}>
            Lizenzen anzeigen
          </Button>
          <Button className="mt-1" variant="ghost" onClick={() => void update({ ...DEFAULT_SETTINGS, userName: settings.userName })}>
            Einstellungen auf Standard zurücksetzen
          </Button>
        </Card>
      </div>

      <Sheet open={licensesOpen} onClose={() => setLicensesOpen(false)} title="Lizenzen">
        <ul className="flex flex-col gap-2 text-sm">
          {LICENSES.map((l) => (
            <li key={l.name} className="flex items-start justify-between gap-3">
              <span>{l.name}</span>
              <span className="shrink-0 text-muted">{l.license}</span>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'all' ? 'Alle Daten löschen?' : 'Fortschritt zurücksetzen?'}>
        <p className="text-sm text-muted">
          {confirm === 'all' ? 'Songs, Importe, Fortschritt und Einstellungen werden unwiderruflich gelöscht. Die App startet danach neu.' : 'Übungssitzungen, Lektions- und Songfortschritt, Erfolge und abgehakte Ziele werden gelöscht. Songs und Importe bleiben erhalten.'}
        </p>
        <div className="mt-4 flex gap-2">
          <Button full onClick={() => setConfirm(null)}>
            Abbrechen
          </Button>
          <Button
            full
            variant="danger"
            onClick={async () => {
              if (confirm === 'all') {
                await deleteAllData();
                window.location.href = import.meta.env.BASE_URL;
              } else {
                await resetProgress();
                toast.show('Lernfortschritt zurückgesetzt.', 'info');
              }
              setConfirm(null);
            }}
          >
            Löschen
          </Button>
        </div>
      </Sheet>
    </>
  );
}
