import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ToastProvider } from '@/components/ui';
import { primeSpeech } from '@/core/speech/speech';
import { AppShell } from './AppShell';
import { bootstrapApp, describeBootstrapError, type BootstrapState } from './bootstrap';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LessonsPage } from '@/features/lessons/LessonsPage';
import { LessonPage } from '@/features/lessons/LessonPage';
import { SongsPage } from '@/features/songs/SongsPage';
import { SongPage } from '@/features/songs/SongPage';
import { ImportPage } from '@/features/songs/ImportPage';
import { AddSongPage } from '@/features/songs/AddSongPage';
import { PracticePage } from '@/features/practice/PracticePage';
import { ExercisePage } from '@/features/practice/ExercisePage';
import { ListenPage } from '@/features/listen/ListenPage';
import { PlayalongPage } from '@/features/playalong/PlayalongPage';
import { ToolsPage } from '@/features/tools/ToolsPage';
import { TunerPage } from '@/features/tuner/TunerPage';
import { FretboardPage } from '@/features/fretboard/FretboardPage';
import { MetronomePage } from '@/features/metronome/MetronomePage';
import { TabReadingPage } from '@/features/lessons/TabReadingPage';
import { EditorPage } from '@/features/editor/EditorPage';
import { ProgressPage } from '@/features/progress/ProgressPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { KidsHome } from '@/features/kids/KidsHome';
import { KidsStringsPage } from '@/features/kids/KidsStringsPage';
import { KidsListenGame } from '@/features/kids/KidsListenGame';
import { KidsSongsPage } from '@/features/kids/KidsSongsPage';
import { KidsSongPlay } from '@/features/kids/KidsSongPlay';
import { KidsRhythmGame } from '@/features/kids/KidsRhythmGame';
import { useSettings } from '@/hooks/useSettings';
import { NotFoundPage } from './NotFoundPage';
import { Splash } from './Splash';

export default function App() {
  const [state, setState] = useState<BootstrapState>({ status: 'loading' });
  const [settings] = useSettings();
  useRegisterSW({ immediate: true });

  useEffect(() => {
    let cancelled = false;
    bootstrapApp()
      .then(() => {
        if (!cancelled) setState({ status: 'ready' });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setState({ status: 'error', message: describeBootstrapError(error) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // iOS lässt Sprachausgabe erst nach einer Berührung zu – einmalig mit der ersten Geste freischalten.
  useEffect(() => {
    const prime = (): void => primeSpeech();
    const events = ['touchend', 'click', 'keydown'] as const;
    for (const e of events) window.addEventListener(e, prime, { once: true, passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, prime);
    };
  }, []);

  if (state.status === 'loading') return <Splash />;
  if (state.status === 'error') return <Splash error={state.message} />;

  return (
    <ToastProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={settings.kidsMode ? <Navigate to="/kinder" replace /> : <DashboardPage />} />
          <Route path="kinder" element={<KidsHome />} />
          <Route path="kinder/saiten" element={<KidsStringsPage />} />
          <Route path="kinder/hoeren" element={<KidsListenGame />} />
          <Route path="kinder/lieder" element={<KidsSongsPage />} />
          <Route path="kinder/lieder/:songId" element={<KidsSongPlay />} />
          <Route path="kinder/klatschen" element={<KidsRhythmGame />} />
          <Route path="lernen" element={<LessonsPage />} />
          <Route path="lernen/tabs-lesen" element={<TabReadingPage />} />
          <Route path="lernen/:lessonId" element={<LessonPage />} />
          <Route path="songs" element={<SongsPage />} />
          <Route path="songs/import" element={<ImportPage />} />
          <Route path="songs/neu" element={<AddSongPage />} />
          <Route path="songs/:songId" element={<SongPage />} />
          <Route path="songs/:songId/spiel-mit" element={<ListenPage />} />
          <Route path="songs/:songId/mitspielen" element={<PlayalongPage />} />
          <Route path="ueben" element={<PracticePage />} />
          <Route path="ueben/uebung/:exerciseId" element={<ExercisePage />} />
          <Route path="ueben/uebung/:exerciseId/spiel-mit" element={<ListenPage />} />
          <Route path="werkzeuge" element={<ToolsPage />} />
          <Route path="werkzeuge/stimmgeraet" element={<TunerPage />} />
          <Route path="werkzeuge/griffbrett" element={<FretboardPage />} />
          <Route path="werkzeuge/metronom" element={<MetronomePage />} />
          <Route path="werkzeuge/editor" element={<EditorPage />} />
          <Route path="werkzeuge/editor/:versionId" element={<EditorPage />} />
          <Route path="fortschritt" element={<ProgressPage />} />
          <Route path="einstellungen" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
