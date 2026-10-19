import { Lock, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Badge, Card, IconButton, PageHeader } from '@/components/ui';

/** Level-Gerüst des Lernpfads. Inhalte, Knoten und Freischaltung kommen ab Phase 4. */
export const LEVELS: { number: number; title: string; text: string }[] = [
  { number: 1, title: 'Anfang', text: 'Sitzhaltung, Stimmen, leere Saiten mit p (Bass) und i-m (Diskant), Tirando.' },
  { number: 2, title: 'Erste Töne', text: 'Töne der I. Lage auf E-, H- und G-Saite, erste Melodien.' },
  { number: 3, title: 'Bass und Melodie', text: 'Basstöne, Melodie mit leerem Bass, Apoyando.' },
  { number: 4, title: 'Erste Akkorde', text: 'Em, Am, E, D, C, G, A7, E7 und Arpeggio p-i-m-a.' },
  { number: 5, title: 'Ligados und Etüden', text: 'Hammer-on, Pull-off, leichte Etüden von Carulli, Sor und Aguado.' },
  { number: 6, title: 'Barré und Lagen', text: 'Barré, Lagenspiel bis zur V. Lage: Giuliani, Carcassi, Tárrega.' },
  { number: 7, title: 'Stücke', text: 'Anspruchsvollere Stücke, Tremolo-Vorübungen.' },
];

export function PathPage() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="Lernpfad"
        actions={
          <IconButton label="Profil" onClick={() => navigate('/profil')}>
            <UserRound size={22} />
          </IconButton>
        }
      />
      <p className="mb-3 text-sm text-muted">Sieben Levels, jedes mit Lektionen aus kurzer Erklärung, Übungen in der Spielansicht und einem kleinen Stück. Die Inhalte folgen in Phase 4.</p>
      <ol className="flex flex-col gap-2" aria-label="Levels">
        {LEVELS.map((l) => (
          <li key={l.number}>
            <Card padding="sm" className="flex items-center gap-3 opacity-80">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-3 text-lg font-bold text-muted">{l.number}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.title}</p>
                <p className="text-xs text-muted">{l.text}</p>
              </div>
              <Badge tone="neutral" icon={<Lock size={12} />}>
                bald
              </Badge>
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
