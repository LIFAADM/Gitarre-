import { BookOpen, Gauge, Guitar, PencilLine, Settings, Timer, Trophy, Upload } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PageHeader, PressableCard } from '@/components/ui';

const TOOLS = [
  { href: '/werkzeuge/stimmgeraet', title: 'Stimmgerät', text: 'Mit dem iPhone-Mikrofon stimmen', icon: Gauge },
  { href: '/werkzeuge/griffbrett', title: 'Griffbrett', text: 'Töne finden, hören und üben', icon: Guitar },
  { href: '/werkzeuge/metronom', title: 'Metronom', text: '40–220 BPM, Taktarten, Akzent', icon: Timer },
  { href: '/lernen/tabs-lesen', title: 'Tabs verstehen', text: 'Interaktive Einführung', icon: BookOpen },
  { href: '/werkzeuge/editor', title: 'Tab-Editor', text: 'Eigene Melodien erstellen', icon: PencilLine },
  { href: '/songs/import', title: 'Import', text: 'Guitar Pro, MusicXML, MIDI, JSON', icon: Upload },
  { href: '/fortschritt', title: 'Mein Fortschritt', text: 'Statistiken, Ziele, Erfolge', icon: Trophy },
  { href: '/einstellungen', title: 'Einstellungen', text: 'Stimmung, Toleranzen, Datensicherung', icon: Settings },
];

export function ToolsPage() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Werkzeuge" />
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
