// src/dashboard/logic/useDashboardData.js
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storageKeys';
import { safeParse } from './formatters';
import { LAST_VIEWED_VEHICLE_KEY } from '../../../features/vehicles/logic/vehicleStorage';

export function useDashboardData() {
  const [counts, setCounts] = useState({ vehicles: 0, tracks: 0, setups: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [setups, setSetups] = useState([]);
  const [lastViewedVehicle, setLastViewedVehicle] = useState(null);

  const loadCounts = useCallback(async () => {
    const [vehiclesRaw, tracksRaw, setupsRaw, lastViewedVehicleId] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.vehicles),
      AsyncStorage.getItem(STORAGE_KEYS.tracks),
      AsyncStorage.getItem(STORAGE_KEYS.setups),
      AsyncStorage.getItem(LAST_VIEWED_VEHICLE_KEY),
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
    const viewedId = String(lastViewedVehicleId || '').trim();
    setLastViewedVehicle(
      vehicleList.find((vehicle) => String(vehicle?.id || vehicle?.vehicleId || '') === viewedId)
      || vehicleList[0]
      || null
    );
    setCounts({
      vehicles: vehicleList.length,
      tracks: trackList.length,
      setups: setupList.length,
    });
  }, []);

  return { counts, vehicles, tracks, setups, lastViewedVehicle, loadCounts };
}
