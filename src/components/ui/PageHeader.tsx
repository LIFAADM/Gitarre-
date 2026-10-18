import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/cn';

export function PageHeader({ title, subtitle, back, actions, className, compact }: { title: ReactNode; subtitle?: ReactNode; back?: boolean | string; actions?: ReactNode; className?: string; compact?: boolean }) {
  const navigate = useNavigate();
  return (
    <header className={cn('sticky top-0 z-20 -mx-4 px-4 safe-top bg-bg/85 backdrop-blur-md', className)}>
      <div className={cn('flex items-center gap-2', compact ? 'py-2' : 'py-3')}>
        {back && (
          <button
            type="button"
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
            aria-label="Zurück"
            className="-ml-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gold hover:bg-surface-2"
          >
            <ChevronLeft size={26} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className={cn('truncate font-bold tracking-tight', compact ? 'text-lg' : 'text-2xl')}>{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    </header>
  );
}
