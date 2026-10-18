import { useEffect, useState, type ReactNode } from 'react';
import { House, Lock, Star, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cancelSpeech } from '@/core/speech/speech';
import { updateSettings } from '@/core/storage/settings';
import { sayNow } from '@/hooks/useSpeech';
import { ParentGate } from './ParentGate';
import { useKidsProgress } from './kidsProgress';

export interface KidsShellProps {
  title: string;
  emoji?: string;
  /** Wird beim Öffnen gesprochen und über den Lautsprecher-Knopf wiederholt. */
  instruction: string;
  /** Startseite des Kinder-Modus: zeigt statt „Haus“ das Eltern-Schloss. */
  home?: boolean;
  children: ReactNode;
}

/** Rahmen aller Kinderseiten: riesige Tasten, wenig Text, gesprochene Anleitung, Sterne, Elternsperre. */
export function KidsShell({ title, emoji, instruction, home = false, children }: KidsShellProps) {
  const navigate = useNavigate();
  const progress = useKidsProgress();
  const [gate, setGate] = useState(false);

  useEffect(() => {
    void sayNow('kids', instruction);
    return () => cancelSpeech();
  }, [instruction]);

  return (
    <div className="kids -mx-4 flex min-h-dvh flex-col bg-[#1a1830] px-4 pb-6 text-text">
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-2 bg-[#1a1830]/90 px-3 py-2 safe-top backdrop-blur">
        {home ? (
          <button type="button" onClick={() => setGate(true)} aria-label="Für Eltern" className="flex h-12 w-12 items-center justify-center rounded-2xl text-muted active:scale-95">
            <Lock size={20} />
          </button>
        ) : (
          <button type="button" onClick={() => navigate('/kinder')} aria-label="Zurück zur Kinder-Startseite" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-text active:scale-95">
            <House size={28} />
          </button>
        )}
        <h1 className="flex-1 truncate text-center text-xl font-bold">
          {emoji && <span className="mr-2 text-2xl">{emoji}</span>}
          {title}
        </h1>
        <button type="button" onClick={() => void sayNow('kids', instruction)} aria-label="Anleitung vorlesen" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-gold active:scale-95">
          <Volume2 size={28} />
        </button>
        <span className="flex h-14 min-w-14 items-center justify-center gap-1 rounded-2xl bg-gold/15 px-2 text-lg font-bold text-gold" aria-label={`${progress.stars} Sterne`} data-testid="kids-stars">
          <Star size={20} fill="currentColor" /> {progress.stars}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-4 pt-3">{children}</div>
      <ParentGate
        open={gate}
        onClose={() => setGate(false)}
        onSuccess={() => {
          setGate(false);
          void updateSettings({ kidsMode: false });
          navigate('/');
        }}
      />
    </div>
  );
}

/** Große, einheitliche Spielkachel. */
export function KidsTile({ emoji, label, color, onClick, testId }: { emoji: string; label: string; color: string; onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[2rem] border-4 border-white/10 text-center shadow-xl transition active:scale-95"
      style={{ background: `linear-gradient(160deg, ${color} 0%, ${color}aa 100%)` }}
    >
      <span className="text-6xl drop-shadow" aria-hidden>
        {emoji}
      </span>
      <span className="text-xl font-extrabold text-white drop-shadow">{label}</span>
    </button>
  );
}

/** Große Aktionsschaltfläche. */
export function KidsButton({ emoji, label, onClick, color = '#d9a94e', disabled, className, testId }: { emoji?: string; label: string; onClick: () => void; color?: string; disabled?: boolean; className?: string; testId?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testId} className={`flex h-20 items-center justify-center gap-2 rounded-[1.75rem] px-4 text-xl font-extrabold text-[#1b1507] shadow-xl transition active:scale-95 disabled:opacity-40 ${className ?? ''}`} style={{ backgroundColor: color }}>
      {emoji && (
        <span className="text-3xl" aria-hidden>
          {emoji}
        </span>
      )}
      {label}
    </button>
  );
}

/** Sterne-Anzeige für Ergebnisse. */
export function StarRow({ stars, size = 44 }: { stars: number; size?: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`${stars} von 3 Sternen`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} size={size} className={i <= stars ? 'text-gold' : 'text-white/15'} fill={i <= stars ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}
