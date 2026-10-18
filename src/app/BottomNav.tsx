import { GraduationCap, House, ListMusic, Target, Wrench } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

const ITEMS = [
  { to: '/', label: 'Start', icon: House, end: true },
  { to: '/lernen', label: 'Lernen', icon: GraduationCap },
  { to: '/songs', label: 'Songs', icon: ListMusic },
  { to: '/ueben', label: 'Üben', icon: Target },
  { to: '/werkzeuge', label: 'Werkzeuge', icon: Wrench },
] as const;

export function BottomNav() {
  return (
    <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-surface/92 backdrop-blur-xl safe-bottom">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around px-1">
        {ITEMS.map(({ to, label, icon: Icon, ...rest }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={'end' in rest ? rest.end : false}
              className={({ isActive }) =>
                cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition', isActive ? 'text-gold' : 'text-muted hover:text-text')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('flex h-8 w-14 items-center justify-center rounded-2xl transition', isActive && 'bg-gold/15')}>
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
