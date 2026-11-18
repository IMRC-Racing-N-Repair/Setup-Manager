// src/dashboard/logic/useDashboardData.js
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storageKeys';
import { safeParse } from './formatters';
import { LAST_VIEWED_VEHICLE_KEY } from '../../../features/vehicles/logic/vehicleStorage';
import { LAST_VIEWED_SETUP_KEY } from '../../../features/setups/lib/setupStorage';

const LAST_OPENED_TOOL_KEY = '@lastOpenedTool_v1';

export function useDashboardData() {
  const [counts, setCounts] = useState({ vehicles: 0, tracks: 0, setups: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [setups, setSetups] = useState([]);
  const [lastViewedVehicle, setLastViewedVehicle] = useState(null);
  const [lastOpened, setLastOpened] = useState(null);

  const loadCounts = useCallback(async () => {
    const [vehiclesRaw, tracksRaw, setupsRaw, lastViewedVehicleId, lastViewedSetupRaw, lastOpenedToolRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.vehicles),
      AsyncStorage.getItem(STORAGE_KEYS.tracks),
      AsyncStorage.getItem(STORAGE_KEYS.setups),
      AsyncStorage.getItem(LAST_VIEWED_VEHICLE_KEY),
      AsyncStorage.getItem(LAST_VIEWED_SETUP_KEY),
      AsyncStorage.getItem(LAST_OPENED_TOOL_KEY),
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
    const lastViewedSetup = safeParse(lastViewedSetupRaw, null);
    const lastOpenedTool = safeParse(lastOpenedToolRaw, null);
    const setupOpenedAt = Date.parse(lastViewedSetup?.openedAt || lastViewedSetup?.savedAt || lastViewedSetup?.updatedAt || '') || 0;
    const toolOpenedAt = Date.parse(lastOpenedTool?.openedAt || '') || 0;

    if (lastOpenedTool?.route && toolOpenedAt >= setupOpenedAt) {
      setLastOpened({
        type: 'tool',
        title: lastOpenedTool.title || 'Tool',
        meta: lastOpenedTool.description || 'Open tool again',
        route: lastOpenedTool.route,
        openedAt: lastOpenedTool.openedAt,
      });
    } else if (lastViewedSetup?.vehicleId && lastViewedSetup?.trackId) {
      const setupVehicle = vehicleList.find((vehicle) => String(vehicle?.id || vehicle?.vehicleId || '') === String(lastViewedSetup.vehicleId));
      const setupTrack = trackList.find((track) => String(track?.id || track?.trackId || '') === String(lastViewedSetup.trackId));
      setLastOpened({
        type: 'setup',
        title: lastViewedSetup.vehicleName || setupVehicle?.name || setupVehicle?.vehicleName || 'Vehicle setup',
        meta: lastViewedSetup.trackName || setupTrack?.name || setupTrack?.trackName || 'Saved setup',
        route: `/setups/editor/${encodeURIComponent(lastViewedSetup.trackId)}/${encodeURIComponent(lastViewedSetup.vehicleId)}?returnTo=home`,
        openedAt: lastViewedSetup.openedAt || lastViewedSetup.savedAt,
      });
    } else {
      setLastOpened(null);
    }

    setCounts({
      vehicles: vehicleList.length,
      tracks: trackList.length,
      setups: setupList.length,
    });
  }, []);

  return { counts, vehicles, tracks, setups, lastViewedVehicle, lastOpened, loadCounts };
}
