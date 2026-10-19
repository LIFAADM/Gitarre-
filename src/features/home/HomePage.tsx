import { ArrowRight, Gauge, ListMusic, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button, Card, IconButton } from '@/components/ui';

/**
 * Start: zeigt groß den nächsten Schritt mit genau einer Hauptaktion.
 * Bis der Lernpfad steht (Phase 4), ist der nächste Schritt immer: Gitarre stimmen.
 */
export function HomePage() {
  const navigate = useNavigate();
  return (
    <>
      <header className="sticky top-0 z-20 -mx-4 px-4 safe-top bg-bg/85 backdrop-blur-md">
        <div className="flex items-center gap-2 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">GuitarCoach</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">Nächster Schritt</h1>
          </div>
          <IconButton label="Profil" onClick={() => navigate('/profil')}>
            <UserRound size={22} />
          </IconButton>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <Card tone="gold" className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold">Heute</p>
          <h2 className="text-2xl font-bold leading-tight">Gitarre stimmen</h2>
          <p className="text-sm text-text/90">Nylonsaiten verstimmen sich schnell, besonders wenn sie neu sind. Stimme vor jeder Übungseinheit, dann klingt alles sofort richtig.</p>
          <Button variant="primary" size="xl" icon={<Gauge size={22} />} iconRight={<ArrowRight size={20} />} onClick={() => navigate('/werkzeuge/stimmgeraet')} data-testid="home-main-action">
            Stimmgerät starten
          </Button>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold">
            <ListMusic size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Stücke vorhören</p>
            <p className="text-xs text-muted">Gemeinfreie Arrangements mit Tab und Noten. Die Spielansicht mit Bewertung folgt in Phase 3.</p>
          </div>
          <Button size="sm" onClick={() => navigate('/stuecke')}>
            Öffnen
          </Button>
        </Card>

        <p className="text-xs text-muted">Der Lernpfad mit Levels und Sternen kommt in Phase 4. Bis dahin: Stimmen, Stücke anhören, Metronom.</p>
      </div>
    </>
  );
}
