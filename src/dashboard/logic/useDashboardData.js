// src/dashboard/logic/useDashboardData.js
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storageKeys';
import { safeParse } from './formatters';

export function useDashboardData() {
  const [counts, setCounts] = useState({ vehicles: 0, tracks: 0, setups: 0 });

  const loadCounts = useCallback(async () => {
    const [vehiclesRaw, tracksRaw, setupsRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.vehicles),
      AsyncStorage.getItem(STORAGE_KEYS.tracks),
      AsyncStorage.getItem(STORAGE_KEYS.setups),
    ]);
    const vehicles = safeParse(vehiclesRaw, []);
    const tracks = safeParse(tracksRaw, []);
    const setups = safeParse(setupsRaw, []);
    setCounts({
      vehicles: Array.isArray(vehicles) ? vehicles.length : 0,
      tracks: Array.isArray(tracks) ? tracks.length : 0,
      setups: Array.isArray(setups) ? setups.length : 0,
    });
  }, []);

  return { counts, loadCounts };
}
