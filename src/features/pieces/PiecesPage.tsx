import { ChevronRight, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Badge, IconButton, PageHeader, PressableCard } from '@/components/ui';
import { listPieces } from './pieces';

const DIFFICULTY = ['', 'sehr leicht', 'leicht', 'mittel', 'schwer', 'sehr schwer'] as const;

export function PiecesPage() {
  const navigate = useNavigate();
  const pieces = listPieces();
  return (
    <>
      <PageHeader
        title="Stücke"
        subtitle={`${pieces.length} gemeinfreie Arrangements`}
        actions={
          <IconButton label="Profil" onClick={() => navigate('/profil')}>
            <UserRound size={22} />
          </IconButton>
        }
      />
      <ul className="flex flex-col gap-2">
        {pieces.map((p) => (
          <li key={p.id}>
            <PressableCard padding="sm" onClick={() => navigate(`/stuecke/${p.id}`)} data-testid={`piece-${p.id}`}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.title}</p>
                  <p className="truncate text-xs text-muted">
                    {p.artist} · {p.genre} · {DIFFICULTY[p.difficulty]}
                  </p>
                </div>
                <Badge tone="neutral">{p.versions.length} Stufen</Badge>
                <ChevronRight size={18} className="text-muted" />
              </div>
            </PressableCard>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">Alle Stücke sind gemeinfrei und eigens für die Konzertgitarre arrangiert. Die Spielansicht mit Mikrofon-Bewertung folgt in Phase 3.</p>
    </>
  );
}
