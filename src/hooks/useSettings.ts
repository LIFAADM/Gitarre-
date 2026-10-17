import { useSyncExternalStore } from 'react';
import { getSettings, subscribeSettings, updateSettings, type AppSettings } from '@/core/storage/settings';

export function useSettings(): [AppSettings, (patch: Partial<AppSettings>) => Promise<AppSettings>] {
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getSettings);
  return [settings, updateSettings];
}
