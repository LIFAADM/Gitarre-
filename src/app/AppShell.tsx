import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';
import { unlockAudio } from '@/core/audio/audioContext';

/** Rahmen der App: Inhalt + untere Navigation, Audio-Freischaltung bei erster Interaktion. */
export function AppShell() {
  const location = useLocation();

  useEffect(() => {
    const unlock = (): void => {
      void unlockAudio();
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('touchend', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('touchend', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col safe-x">
      <main className="flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
