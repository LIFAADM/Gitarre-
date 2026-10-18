import { useNavigate } from 'react-router';
import { KidsShell, KidsTile } from './KidsShell';

/** Startseite des Kinder-Modus: vier große Bilder, keine Texte zum Lesen nötig. */
export function KidsHome() {
  const navigate = useNavigate();
  return (
    <KidsShell title="Gitarrenspiele" emoji="🎸" instruction="Hallo! Was möchtest du spielen? Tippe auf ein Bild." home>
      <div className="grid grid-cols-2 gap-4 pt-2">
        <KidsTile emoji="🌈" label="Saiten" color="#e5484d" onClick={() => navigate('/kinder/saiten')} testId="kids-tile-saiten" />
        <KidsTile emoji="👂" label="Welche Saite?" color="#3b8be8" onClick={() => navigate('/kinder/hoeren')} testId="kids-tile-hoeren" />
        <KidsTile emoji="🎵" label="Lieder" color="#3fbf7f" onClick={() => navigate('/kinder/lieder')} testId="kids-tile-lieder" />
        <KidsTile emoji="👏" label="Klatschen" color="#f08c2e" onClick={() => navigate('/kinder/klatschen')} testId="kids-tile-klatschen" />
      </div>
      <p className="mt-auto text-center text-xs text-muted">Für Eltern: Schloss oben links.</p>
    </KidsShell>
  );
}
