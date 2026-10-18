import { useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { Sheet } from '@/components/ui';
import { parentQuestion, type ParentQuestion } from './kidsData';
import { cn } from '@/lib/cn';

/** Elternsperre: eine Rechenaufgabe, die Vorschulkinder nicht lösen. */
export function ParentGate({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [question, setQuestion] = useState<ParentQuestion>(() => parentQuestion());
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);

  const press = (digit: string): void => {
    setWrong(false);
    setInput((v) => (v.length >= 2 ? v : v + digit));
  };
  const confirm = (): void => {
    if (Number(input) === question.answer) {
      setInput('');
      onSuccess();
      return;
    }
    setWrong(true);
    setInput('');
    setQuestion(parentQuestion());
  };

  return (
    <Sheet open={open} onClose={onClose} title="Für Erwachsene">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Lock size={16} /> Zum Verlassen des Kinder-Modus bitte rechnen:
      </p>
      <p className="mt-3 text-center text-2xl font-bold" data-testid="parent-question">
        {question.text}
      </p>
      <p className={cn('mt-2 h-10 text-center text-3xl font-bold tabular-nums', wrong ? 'text-bad' : 'text-gold')} aria-live="polite">
        {input || (wrong ? 'Leider falsch' : ' ')}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className="h-14 rounded-2xl bg-surface-2 text-xl font-bold active:scale-95">
            {d}
          </button>
        ))}
        <button type="button" onClick={() => setInput((v) => v.slice(0, -1))} aria-label="Löschen" className="flex h-14 items-center justify-center rounded-2xl bg-surface-2 active:scale-95">
          <Delete size={22} />
        </button>
        <button type="button" onClick={() => press('0')} className="h-14 rounded-2xl bg-surface-2 text-xl font-bold active:scale-95">
          0
        </button>
        <button type="button" onClick={confirm} disabled={!input} className="h-14 rounded-2xl bg-gold text-xl font-bold text-[#1b1507] active:scale-95 disabled:opacity-40">
          OK
        </button>
      </div>
    </Sheet>
  );
}
