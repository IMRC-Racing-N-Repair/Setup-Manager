import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { getEntityId } from '../../features/setups/lib/setupModel';
import { getVehicles } from '../../features/setups/lib/setupStorage';
import { GaragePickerScreen, GarageVehicleChoice } from '../../src/garage/GaragePicker';

export default function SetupSelectVehicleScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    setLoading(true);
    getVehicles().then((items) => {
      if (mounted) {
        setVehicles(Array.isArray(items) ? items : []);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []));

  const goBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) router.back();
    else router.replace('/garage');
  };

  return (
    <GaragePickerScreen
      title="Select Vehicle"
      subtitle="Choose the vehicle this setup belongs to."
      countLabel={loading ? 'Loading…' : `${vehicles.length} SAVED`}
      onBack={goBack}
      loading={loading}
      emptyMessage={!loading && !vehicles.length ? 'No vehicles are saved yet. Add a vehicle from Garage, then return to Setups.' : ''}
    >
      {vehicles.map((vehicle) => {
        const vehicleId = getEntityId(vehicle);
        return (
          <GarageVehicleChoice
            key={vehicleId}
            vehicle={vehicle}
            onPress={() => router.push(`/setups/select-track?vehicleId=${encodeURIComponent(vehicleId)}`)}
          />
        );
      })}
    </GaragePickerScreen>
  );
}
