import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import RaceDayBottomActions from '../../features/raceday/components/RaceDayBottomActions';
import { getActiveRaceDay, getVehicles, setRaceDayVehicles } from '../../features/raceday/lib/raceDayStorage';
import { normalizeIdList } from '../../features/raceday/lib/raceDayModel';
import { GaragePickerScreen, GarageVehicleChoice } from '../../src/garage/GaragePicker';

export default function RaceDaySelectVehiclesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const adding = params?.add === '1';
  const [active, setActive] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const load = useCallback(async () => {
    setLoading(true);
    const [raceDay, nextVehicles] = await Promise.all([getActiveRaceDay(), getVehicles()]);
    setActive(raceDay);
    setVehicles(Array.isArray(nextVehicles) ? nextVehicles : []);
    setSelectedIds(normalizeIdList(raceDay?.vehicleIds || []));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function toggleVehicle(vehicleId) {
    const id = String(vehicleId);
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function handleContinue() {
    await setRaceDayVehicles(selectedIds);
    router.replace('/raceday/dashboard');
  }

  const goBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) router.back();
    else router.replace('/raceday/select-track');
  };

  const emptyMessage = !loading && !active?.trackId
    ? 'No active RaceDay was found. Go back and select a track.'
    : !loading && !vehicles.length
      ? 'No vehicles are saved yet. Add a vehicle from Garage before continuing RaceDay.'
      : '';

  return (
    <GaragePickerScreen
      title="Select Vehicles"
      subtitle={adding ? 'Add or remove RaceDay vehicles.' : 'Choose every vehicle you are racing today.'}
      countLabel={loading ? 'Loading…' : `${selectedIds.length} SELECTED`}
      onBack={goBack}
      loading={loading}
      emptyMessage={emptyMessage}
      footer={(
        <RaceDayBottomActions
          secondaryLabel="Back"
          onSecondaryPress={goBack}
          primaryLabel={adding ? 'Save Vehicles' : 'Start RaceDay'}
          onPrimaryPress={handleContinue}
          primaryDisabled={!active?.trackId || selectedIds.length === 0}
        />
      )}
    >
      {vehicles.map((vehicle) => {
        const id = vehicle?.id || vehicle?.vehicleId;
        return (
          <GarageVehicleChoice
            key={String(id)}
            vehicle={vehicle}
            selected={selectedSet.has(String(id))}
            multiSelect
            onPress={() => toggleVehicle(id)}
          />
        );
      })}
    </GaragePickerScreen>
  );
}
