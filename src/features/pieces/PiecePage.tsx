import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, EmptyState, PageHeader, Segmented } from '@/components/ui';
import { SongPlayer } from '@/features/player/SongPlayer';
import { getPiece, pieceScore } from './pieces';

/** Vorläufiges Vorhören eines Stücks (Tab, Noten, Wiedergabe, Tempo). Wird in Phase 3 durch die Spielansicht ersetzt. */
export function PiecePage() {
  const { pieceId = '' } = useParams();
  const navigate = useNavigate();
  const piece = getPiece(pieceId);
  const [versionId, setVersionId] = useState<string | null>(null);
  const version = piece ? (piece.versions.find((v) => v.id === versionId) ?? piece.versions[0]) : undefined;
  const score = useMemo(() => (piece && version ? pieceScore(piece, version) : null), [piece, version]);

  if (!piece || !version || !score) {
    return (
      <>
        <PageHeader title="Stück" back="/stuecke" />
        <EmptyState title="Dieses Stück gibt es nicht." action={<Button onClick={() => navigate('/stuecke')}>Zu den Stücken</Button>} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={piece.title} subtitle={piece.artist} back="/stuecke" compact />
      <div className="flex flex-col gap-3 pt-1">
        <Segmented ariaLabel="Stufe" size="sm" value={version.id} onChange={setVersionId} options={piece.versions.map((v) => ({ value: v.id, label: v.label }))} />
        <p className="text-xs text-muted">{version.description}</p>
        <SongPlayer key={version.id} score={score} title={piece.title} />
      </div>
    </>
  );
}
