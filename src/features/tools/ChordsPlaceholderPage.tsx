import { PageHeader } from '@/components/ui';
import { EmptyState } from '@/components/ui';

export function ChordsPlaceholderPage() {
  return (
    <>
      <PageHeader title="Akkordbibliothek" back="/werkzeuge" />
      <EmptyState title="Kommt in Phase 5" text="Griffbilder für Em, Am, E, D, C, G, A7, E7 und weitere, zusammen mit der Akkorderkennung." />
    </>
  );
}
