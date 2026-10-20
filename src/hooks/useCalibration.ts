import { useSyncExternalStore } from 'react';
import type { CalibrationProfile } from '@/core/detection/calibration';
import { getCalibration, subscribeCalibration } from '@/core/storage/calibration';

/** Aktuelle Kalibrierung dieses Geräts (null = noch nicht kalibriert). */
export function useCalibration(): CalibrationProfile | null {
  return useSyncExternalStore(subscribeCalibration, getCalibration, getCalibration);
}
