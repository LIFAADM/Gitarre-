import { Gauge, Grid3x3, Timer, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import { IconButton, PageHeader, PressableCard } from '@/components/ui';

const TOOLS = [
  { href: '/werkzeuge/stimmgeraet', title: 'Stimmgerät', text: 'Mit dem iPhone-Mikrofon stimmen', icon: Gauge },
  { href: '/werkzeuge/metronom', title: 'Metronom', text: '40–220 BPM, Taktarten, Akzent', icon: Timer },
  { href: '/werkzeuge/akkorde', title: 'Akkordbibliothek', text: 'Griffbilder, kommt in Phase 5', icon: Grid3x3 },
];

export function ToolsPage() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="Werkzeuge"
        actions={
          <IconButton label="Profil" onClick={() => navigate('/profil')}>
            <UserRound size={22} />
          </IconButton>
        }
      />
      <div className="grid grid-cols-2 gap-2">
        {TOOLS.map(({ href, title, text, icon: Icon }) => (
          <PressableCard key={href} onClick={() => navigate(href)} className="min-h-28">
            <Icon size={26} className="text-gold" />
            <span className="mt-3 block font-semibold">{title}</span>
            <span className="block text-xs text-muted">{text}</span>
          </PressableCard>
        ))}
      </div>
    </>
  );
}
