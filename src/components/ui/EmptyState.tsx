import type { ReactNode } from 'react';

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border px-6 py-10 text-center">
      {icon && <div className="text-gold/80">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}
