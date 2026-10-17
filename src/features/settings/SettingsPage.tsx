import { useEffect, useRef, useState } from 'react';
import { Download, Info, Mic, Share, Trash, Upload } from 'lucide-react';
import { Button, Card, PageHeader, Segmented, Sheet, Slider, Toggle, useToast } from '@/components/ui';
import { createBackup, deleteAllData, parseBackup, resetProgress, restoreBackup } from '@/core/storage/backup';
import { DEFAULT_SETTINGS } from '@/core/storage/settings';
import { downloadTextFile } from '@/features/songs/songUtils';
import { useSettings } from '@/hooks/useSettings';
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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [micState, setMicState] = useState<string>('wird beim ersten Start abgefragt');
  const [confirm, setConfirm] = useState<'progress' | 'all' | null>(null);
  const [licensesOpen, setLicensesOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
                window.location.href = '/';
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
