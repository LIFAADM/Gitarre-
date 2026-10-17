import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastTone = 'info' | 'success' | 'error' | 'warn';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => undefined });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (message: string, tone: ToastTone = 'info', durationMs = 3500) => {
      const id = ++counter.current;
      setItems((list) => [...list.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ show }), [show]);
  const icons = { info: <Info size={18} />, success: <CircleCheck size={18} />, error: <TriangleAlert size={18} />, warn: <TriangleAlert size={18} /> };
  const tones = {
    info: 'border-border bg-surface-2 text-text',
    success: 'border-ok/40 bg-ok-soft text-text',
    error: 'border-bad/40 bg-bad-soft text-text',
    warn: 'border-warn/40 bg-warn-soft text-text',
  };
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 safe-top pt-3" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl animate-fade-in', tones[t.tone])}>
            <span className={cn(t.tone === 'success' ? 'text-ok' : t.tone === 'error' ? 'text-bad' : t.tone === 'warn' ? 'text-warn' : 'text-gold')}>{icons[t.tone]}</span>
            <span className="flex-1 text-sm font-medium">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Hinweis schließen" className="text-muted hover:text-text">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
