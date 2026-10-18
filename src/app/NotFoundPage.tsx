import { Link } from 'react-router';
import { PageHeader } from '@/components/ui';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Seite nicht gefunden" back="/" />
      <p className="text-muted">Diese Seite gibt es nicht. <Link to="/" className="text-gold underline">Zur Startseite</Link></p>
    </>
  );
}
