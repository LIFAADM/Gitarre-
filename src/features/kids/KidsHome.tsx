import { useNavigate } from 'react-router';
import { KidsButton, KidsShell, KidsTile } from './KidsShell';
import { nextKidsLesson } from './kidsCurriculum';
import { useKidsProgress } from './kidsProgress';

/** Startseite des Kinder-Modus: zuerst die Schule, darunter die Spiele – keine Texte zum Lesen nötig. */
export function KidsHome() {
  const navigate = useNavigate();
  const progress = useKidsProgress();
  const next = nextKidsLesson(progress.lessonsDone);
  return (
    <KidsShell title="Gitarrenspiele" emoji="🎸" instruction={next ? `Hallo! Tippe auf die große Taste, dann lernen wir weiter: ${next.title}. Oder such dir unten ein Spiel aus.` : 'Hallo! Du hast alle Lektionen geschafft. Such dir ein Spiel aus.'} home>
      <KidsButton emoji="🎓" label={next ? `Lernen: ${next.title}` : 'Gitarrenschule'} onClick={() => navigate(next ? `/kinder/lernen/${next.id}` : '/kinder/lernen')} className="h-24" testId="kids-tile-lernen" />
      <button type="button" onClick={() => navigate('/kinder/lernen')} className="-mt-2 text-center text-sm font-bold text-muted underline-offset-2">
        Alle Lektionen ({progress.lessonsDone.length} geschafft)
      </button>
      <div className="grid grid-cols-2 gap-4 pt-1">
        <KidsTile emoji="🌈" label="Saiten" color="#e5484d" onClick={() => navigate('/kinder/saiten')} testId="kids-tile-saiten" />
        <KidsTile emoji="👂" label="Welche Saite?" color="#3b8be8" onClick={() => navigate('/kinder/hoeren')} testId="kids-tile-hoeren" />
        <KidsTile emoji="🎵" label="Lieder" color="#3fbf7f" onClick={() => navigate('/kinder/lieder')} testId="kids-tile-lieder" />
        <KidsTile emoji="👏" label="Klatschen" color="#f08c2e" onClick={() => navigate('/kinder/klatschen')} testId="kids-tile-klatschen" />
      </div>
      <p className="mt-auto text-center text-xs text-muted">Für Eltern: Schloss oben links.</p>
    </KidsShell>
  );
}
