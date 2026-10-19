import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ToastProvider } from '@/components/ui';
import { AppShell } from './AppShell';
import { bootstrapApp, describeBootstrapError, type BootstrapState } from './bootstrap';
import { HomePage } from '@/features/home/HomePage';
import { PathPage } from '@/features/path/PathPage';
import { PiecesPage } from '@/features/pieces/PiecesPage';
import { PiecePage } from '@/features/pieces/PiecePage';
import { ToolsPage } from '@/features/tools/ToolsPage';
import { ChordsPlaceholderPage } from '@/features/tools/ChordsPlaceholderPage';
import { TunerPage } from '@/features/tuner/TunerPage';
import { MetronomePage } from '@/features/metronome/MetronomePage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { NotFoundPage } from './NotFoundPage';
import { Splash } from './Splash';

export default function App() {
  const [state, setState] = useState<BootstrapState>({ status: 'loading' });
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

  if (state.status === 'loading') return <Splash />;
  if (state.status === 'error') return <Splash error={state.message} />;

  return (
    <ToastProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="lernpfad" element={<PathPage />} />
          <Route path="stuecke" element={<PiecesPage />} />
          <Route path="stuecke/:pieceId" element={<PiecePage />} />
          <Route path="werkzeuge" element={<ToolsPage />} />
          <Route path="werkzeuge/stimmgeraet" element={<TunerPage />} />
          <Route path="werkzeuge/metronom" element={<MetronomePage />} />
          <Route path="werkzeuge/akkorde" element={<ChordsPlaceholderPage />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
