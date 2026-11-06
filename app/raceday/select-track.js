import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { getTracks, startRaceDayWithTrack } from '../../features/raceday/lib/raceDayStorage';
import { GaragePickerScreen, GarageTrackChoice } from '../../src/garage/GaragePicker';

export default function RaceDaySelectTrackScreen() {
  const router = useRouter();
  const [tracks, setTracks] = useState([]);
  const [selectingTrackId, setSelectingTrackId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const nextTracks = await getTracks();
    setTracks(Array.isArray(nextTracks) ? nextTracks : []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) router.back();
    else router.replace('/');
  };

  async function handleSelectTrack(trackId) {
    if (!trackId || selectingTrackId) return;
    setSelectingTrackId(String(trackId));
    try {
      await startRaceDayWithTrack(trackId);
      router.push('/raceday/select-vehicles');
    } finally {
      setSelectingTrackId('');
    }
  }

  return (
    <GaragePickerScreen
      title="Select Track"
      subtitle="Choose the track for this RaceDay."
      countLabel={loading ? 'Loading…' : `${tracks.length} SAVED`}
      onBack={goBack}
      loading={loading}
      emptyMessage={!loading && !tracks.length ? 'No tracks are saved yet. Add a track from Garage before starting RaceDay.' : ''}
    >
      {tracks.map((track) => {
        const id = track?.id || track?.trackId;
        const selecting = String(id) === selectingTrackId;
        return (
          <GarageTrackChoice
            key={String(id)}
            track={track}
            actionLabel={selecting ? 'OPENING' : 'SELECT'}
            selected={selecting}
            disabled={Boolean(selectingTrackId)}
            onPress={() => handleSelectTrack(id)}
          />
        );
      })}
    </GaragePickerScreen>
  );
}
