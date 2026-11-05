// src/dashboard/logic/useDashboardData.js
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storageKeys';
import { safeParse } from './formatters';

export function useDashboardData() {
  const [counts, setCounts] = useState({ vehicles: 0, tracks: 0, setups: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [setups, setSetups] = useState([]);

  const loadCounts = useCallback(async () => {
    const [vehiclesRaw, tracksRaw, setupsRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.vehicles),
      AsyncStorage.getItem(STORAGE_KEYS.tracks),
      AsyncStorage.getItem(STORAGE_KEYS.setups),
    ]);
    const vehicles = safeParse(vehiclesRaw, []);
    const tracks = safeParse(tracksRaw, []);
    const setups = safeParse(setupsRaw, []);
    const vehicleList = Array.isArray(vehicles) ? vehicles : [];
    const trackList = Array.isArray(tracks) ? tracks : [];
    const setupList = Array.isArray(setups) ? setups : [];
    setVehicles(vehicleList);
    setTracks(trackList);
    setSetups(setupList);
    setCounts({
      vehicles: vehicleList.length,
      tracks: trackList.length,
      setups: setupList.length,
    });
  }, []);

  return { counts, vehicles, tracks, setups, loadCounts };
}
