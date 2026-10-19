import { useState } from 'react';
import { FlaskConical, Info, Mic, Trophy } from 'lucide-react';
import { Button, Card, PageHeader, Segmented, Sheet, Slider, Toggle } from '@/components/ui';
import { DEFAULT_SETTINGS } from '@/core/storage/settings';
import { useSettings } from '@/hooks/useSettings';

const LICENSES = [
  { name: 'alphaTab (Noten und Tab)', license: 'MPL-2.0' },
  { name: 'Bravura Musikschrift', license: 'SIL Open Font License 1.1' },
  { name: 'React, React Router, Vite, Tailwind CSS, Workbox', license: 'MIT' },
  { name: 'Dexie.js, dexie-react-hooks', license: 'Apache-2.0' },
  { name: 'Lucide Icons', license: 'ISC' },
  { name: 'Gitarrenklang, Metronom, Arrangements', license: 'Eigene Erzeugung (GuitarCoach)' },
];

/** Profil: Fortschritt (Phase 6), Einstellungen, Erkennungs-Labor (Phase 1), Über. */
export function ProfilePage() {
  const [settings, update] = useSettings();
  const [licensesOpen, setLicensesOpen] = useState(false);

  return (
    <>
      <PageHeader title="Profil" back="/" />
      <div className="flex flex-col gap-4">
        <Card padding="sm" className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold">
            <Trophy size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Fortschritt</p>
            <p className="text-xs text-muted">Sterne, Erfahrungspunkte, Serie und Statistik kommen in Phase 6.</p>
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
          <Slider label="Tab-Größe" value={Math.round(settings.tabZoom * 100)} min={70} max={180} step={10} onChange={(v) => void update({ tabZoom: v / 100 })} format={(v) => `${v} %`} />
        </Card>

        <Card>
          <h2 className="text-base font-bold">Stimmgerät & Mikrofon</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <Mic size={16} /> Audio wird nur auf dem Gerät analysiert, nie übertragen.
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
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-bold">Wiedergabe</h2>
          <Toggle checked={settings.countIn} onChange={(v) => void update({ countIn: v })} label="Einzähler vor dem Start" description="Ein Takt Metronom, wenn das Metronom eingeschaltet ist." />
          <Toggle checked={settings.spokenCountIn} onChange={(v) => void update({ spokenCountIn: v })} label="Einzähler mitsprechen" description="„Eins, zwei, drei, vier“ mit der Systemstimme. Standard: aus." />
          <Slider label="Gitarrenklang" value={Math.round(settings.synthVolume * 100)} min={0} max={120} step={5} onChange={(v) => void update({ synthVolume: v / 100 })} format={(v) => `${v} %`} />
          <Slider label="Metronom" value={Math.round(settings.metronomeVolume * 100)} min={0} max={100} step={5} onChange={(v) => void update({ metronomeVolume: v / 100 })} format={(v) => `${v} %`} />
        </Card>

        <Card padding="sm" className="flex items-center gap-3 opacity-70">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-3 text-muted">
            <FlaskConical size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Erkennungs-Labor</p>
            <p className="text-xs text-muted">Live-Analyse, Aufnahmen beschriften und exportieren. Kommt in Phase 1.</p>
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Info size={18} className="text-gold" /> Über GuitarCoach
          </h2>
          <p className="mt-1 text-sm text-muted">Version {__APP_VERSION__} · Kein Konto, keine Werbung, kein Tracking, keine Cloud. Alles bleibt auf diesem Gerät.</p>
          <Button className="mt-2" variant="ghost" onClick={() => setLicensesOpen(true)}>
            Lizenzen anzeigen
          </Button>
          <Button className="mt-1" variant="ghost" onClick={() => void update({ ...DEFAULT_SETTINGS })}>
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
    </>
  );
}
