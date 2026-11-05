// app/tracks/edit.js
// Compatibility route. The preferred Track edit flow is now the Vehicle-style bottom sheet in app/tracks/index.js.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import TrackEditSheet from '../../features/tracks/components/TrackEditSheet';
import {
  deleteTrack,
  getTrackById,
  upsertTrack,
} from '../../features/tracks/storage/trackStorage';
import { openTrackSubmissionEmail } from '../../features/tracks/utils/trackSubmitEmail';
import { trackStyles as styles, TRACK_BLUE } from '../../features/tracks/styles/trackStyles';

const NEW_TRACK = {
  trackName: '',
  trackType: '',
  surface: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  liveRcUrl: '',
  direction: '',
  tractionLevel: '',
  runLine: '',
  trackDimensions: '',
  notes: '',
};

export default function TrackEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const trackId = params?.trackId ? String(params.trackId) : null;

  const [track, setTrack] = useState(trackId ? null : NEW_TRACK);
  const [loading, setLoading] = useState(Boolean(trackId));
  const [saving, setSaving] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(true);
  const pendingActionRef = useRef(null);
  const dismissTimerRef = useRef(null);

  const isNew = !trackId;

  useEffect(() => () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  function finishSheetDismissal() {
    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (action.type === 'tracks') router.replace('/tracks');
    if (action.type === 'setups') {
      router.push({
        pathname: '/setups',
        params: { trackId: action.track.id, trackName: action.track.trackName || '', mode: 'track' },
      });
    }
    if (action.type === 'submit') handleSubmitTrack(action.track);
  }

  function closeThen(action) {
    pendingActionRef.current = action;
    setSheetVisible(false);
    if (Platform.OS !== 'ios') {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(finishSheetDismissal, 260);
    }
  }

  const loadTrack = useCallback(async () => {
    if (!trackId) {
      setTrack(NEW_TRACK);
      setLoading(false);
      return;
    }

    setLoading(true);
    const savedTrack = await getTrackById(trackId);

    if (!savedTrack) {
      setLoading(false);
      Alert.alert('Track Not Found', 'This track could not be found in local storage.', [
        { text: 'OK', onPress: () => router.replace('/tracks') },
      ]);
      return;
    }

    setTrack(savedTrack);
    setLoading(false);
  }, [router, trackId]);

  useFocusEffect(
    useCallback(() => {
      loadTrack();
    }, [loadTrack])
  );

  async function handleSave(nextTrack) {
    try {
      setSaving(true);

      await upsertTrack({
        ...track,
        ...nextTrack,
        id: trackId || nextTrack.id,
      });

      setSaving(false);
      closeThen({ type: 'tracks' });
    } catch (error) {
      setSaving(false);

      if (error.validationErrors) {
        Alert.alert('Missing Required Info', 'Track Name and Track Type are required.');
        return;
      }

      Alert.alert('Save Failed', 'The track could not be saved. Please try again.');
    }
  }

  async function handleDelete() {
    if (!trackId) return;

    try {
      await deleteTrack(trackId);
      closeThen({ type: 'tracks' });
    } catch (error) {
      Alert.alert('Delete Failed', 'The track could not be deleted. Please try again.');
    }
  }

  function handleViewSetups() {
    if (!track) return;

    closeThen({ type: 'setups', track });
  }

  async function handleSubmitTrack(currentTrack) {
    try {
      await openTrackSubmissionEmail(currentTrack);
    } catch (error) {
      Alert.alert(
        'Email Not Opened',
        error.userMessage || 'The track submission email could not be opened.'
      );
    }
  }

  if (loading || !track) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={TRACK_BLUE} />
          <Text style={styles.loadingText}>Loading track...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TrackEditSheet
        visible={sheetVisible}
        initialTrack={track}
        isNew={isNew}
        saving={saving}
        onCancel={() => closeThen({ type: 'tracks' })}
        onSave={handleSave}
        onDelete={handleDelete}
        onViewSetups={handleViewSetups}
        onSubmitTrack={(currentTrack) => closeThen({ type: 'submit', track: currentTrack })}
        onDismiss={finishSheetDismissal}
      />
    </View>
  );
}
