import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Sheet({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface border border-border shadow-2xl animate-fade-in safe-bottom', className)}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface/95 backdrop-blur px-5 pt-4 pb-3 border-b border-border/60">
          <div className="mx-auto absolute left-1/2 -translate-x-1/2 top-2 h-1.5 w-10 rounded-full bg-border sm:hidden" />
          <h2 className="text-lg font-bold mt-1">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="h-9 w-9 rounded-full bg-surface-2 inline-flex items-center justify-center text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
