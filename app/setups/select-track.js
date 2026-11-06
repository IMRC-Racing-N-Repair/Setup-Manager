import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { getEntityId, getVehicleDisplayName } from '../../features/setups/lib/setupModel';
import { getTracks, getVehicles } from '../../features/setups/lib/setupStorage';
import { GaragePickerScreen, GarageTrackChoice } from '../../src/garage/GaragePicker';

export default function SetupSelectTrackScreen() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams();
  const [tracks, setTracks] = useState([]);
  const [vehicleName, setVehicleName] = useState('Selected vehicle');
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getTracks(), getVehicles()]).then(([trackItems, vehicleItems]) => {
      if (!mounted) return;
      setTracks(Array.isArray(trackItems) ? trackItems : []);
      const vehicle = vehicleItems.find((item) => getEntityId(item) === String(vehicleId));
      setVehicleName(getVehicleDisplayName(vehicle));
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [vehicleId]));

  const goBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) router.back();
    else router.replace('/garage');
  };

  return (
    <GaragePickerScreen
      title="Select Track"
      subtitle={`${vehicleName} · choose the track for this setup.`}
      countLabel={loading ? 'Loading…' : `${tracks.length} SAVED`}
      onBack={goBack}
      loading={loading}
      emptyMessage={!loading && !tracks.length ? 'No tracks are saved yet. Add a track from Garage, then return to Setups.' : ''}
    >
      {tracks.map((track) => {
        const trackId = getEntityId(track);
        return (
          <GarageTrackChoice
            key={trackId}
            track={track}
            actionLabel="SETUP"
            onPress={() => router.push(`/setups/editor/${encodeURIComponent(trackId)}/${encodeURIComponent(String(vehicleId))}`)}
          />
        );
      })}
    </GaragePickerScreen>
  );
}
