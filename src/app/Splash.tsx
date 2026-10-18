import { Guitar } from 'lucide-react';

export function Splash({ error }: { error?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center safe-top safe-bottom">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gold/15 text-gold">
        <Guitar size={40} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">GuitarCoach</h1>
      {error ? (
        <p className="max-w-md text-sm text-bad">{error}</p>
      ) : (
        <p className="text-sm text-muted animate-pulse-soft">Lade deine Gitarrenschule …</p>
      )}
    </div>
  );
}
