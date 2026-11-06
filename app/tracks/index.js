// app/tracks/index.js

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TrackEditSheet from '../../features/tracks/components/TrackEditSheet';
import TrackImportSheet from '../../features/tracks/components/TrackImportSheet';
import {
  deleteTrack,
  getTracks,
  upsertTrack,
} from '../../features/tracks/storage/trackStorage';
import { openTrackSubmissionEmail } from '../../features/tracks/utils/trackSubmitEmail';
import { trackStyles as styles, TRACK_BLUE } from '../../features/tracks/styles/trackStyles';
import NewLookBottomNav from '../../src/navigation/NewLookBottomNav';
import AppScreenHeader from '../../src/layout/AppScreenHeader';
import { AppColors } from '../../src/theme/colors';

function clean(value) {
  return String(value ?? '').trim();
}

function trackName(track) {
  return clean(track?.trackName || track?.name) || 'Unnamed track';
}

function trackMeta(track) {
  return [track?.surface, track?.trackType || track?.type, track?.direction].filter(Boolean).join(' · ') || 'Track details';
}

function trackLocation(track) {
  return [track?.city, track?.state].filter(Boolean).join(', ') || clean(track?.address) || 'Location not set';
}

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

export default function TracksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [saving, setSaving] = useState(false);
  const pendingEditActionRef = useRef(null);
  const pendingImportActionRef = useRef(null);
  const editDismissTimerRef = useRef(null);
  const importDismissTimerRef = useRef(null);
  const handledRouteActionRef = useRef('');

  const isLandscape = width > height;
  const isNew = !editingTrack?.id;

  useEffect(() => () => {
    if (editDismissTimerRef.current) clearTimeout(editDismissTimerRef.current);
    if (importDismissTimerRef.current) clearTimeout(importDismissTimerRef.current);
  }, []);

  const loadTracks = useCallback(async () => {
    setLoading(true);
    const savedTracks = await getTracks();
    setTracks(savedTracks);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTracks();
    }, [loadTracks])
  );

  useEffect(() => {
    const editTrackId = clean(params?.editTrackId);
    const wantsAdd = String(params?.addTrack || '') === '1';
    const actionKey = editTrackId ? `edit:${editTrackId}` : wantsAdd ? 'add' : '';
    if (!actionKey || handledRouteActionRef.current === actionKey || loading) return;

    if (editTrackId) {
      const track = tracks.find((item) => clean(item?.id) === editTrackId);
      if (!track) return;
      handledRouteActionRef.current = actionKey;
      openTrack(track);
      return;
    }

    handledRouteActionRef.current = actionKey;
    addTrack();
  }, [loading, params?.addTrack, params?.editTrackId, tracks]);

  function openTrack(track) {
    pendingEditActionRef.current = null;
    setEditingTrack(track);
    setSheetVisible(true);
  }

  function addTrack() {
    pendingEditActionRef.current = null;
    setEditingTrack({ ...NEW_TRACK });
    setSheetVisible(true);
  }

  function closeSheet() {
    pendingEditActionRef.current = null;
    setSheetVisible(false);
    setEditingTrack(null);
    setSaving(false);
  }

  async function saveTrack(nextTrack) {
    try {
      setSaving(true);
      const savedTrack = await upsertTrack({
        ...editingTrack,
        ...nextTrack,
        id: editingTrack?.id || nextTrack.id,
      });

      await loadTracks();
      setSaving(false);
      setEditingTrack(savedTrack);
      setSheetVisible(false);
    } catch (error) {
      setSaving(false);

      if (error.validationErrors) {
        Alert.alert('Missing Required Info', 'Track Name and Track Type are required.');
        return;
      }

      Alert.alert('Save Failed', 'The track could not be saved. Please try again.');
    }
  }

  async function removeTrack() {
    if (!editingTrack?.id) return;

    try {
      await deleteTrack(editingTrack.id);
      await loadTracks();
      closeSheet();
    } catch (error) {
      Alert.alert('Delete Failed', 'The track could not be deleted. Please try again.');
    }
  }

  function viewSetups() {
    if (!editingTrack?.id) return;

    pendingEditActionRef.current = {
      type: 'viewSetups',
      trackId: editingTrack.id,
      trackName: editingTrack.trackName || '',
    };
    setSheetVisible(false);
    setEditingTrack(null);

    // Modal.onDismiss is reliable on iOS. Android needs a short fallback so
    // navigation never competes with the native modal dismissal animation.
    if (Platform.OS !== 'ios') {
      if (editDismissTimerRef.current) clearTimeout(editDismissTimerRef.current);
      editDismissTimerRef.current = setTimeout(handleEditSheetDismiss, 260);
    }
  }

  function handleEditSheetDismiss() {
    const pendingAction = pendingEditActionRef.current;
    if (!pendingAction) return;

    pendingEditActionRef.current = null;
    if (editDismissTimerRef.current) {
      clearTimeout(editDismissTimerRef.current);
      editDismissTimerRef.current = null;
    }

    if (pendingAction.type === 'viewSetups') {
      router.push({
        pathname: '/setups',
        params: {
          trackId: pendingAction.trackId,
          trackName: pendingAction.trackName,
          mode: 'track',
        },
      });
      return;
    }

    if (pendingAction.type === 'submitTrack') {
      submitTrack(pendingAction.track);
    }
  }

  async function submitTrack(track) {
    try {
      await openTrackSubmissionEmail(track);
    } catch (error) {
      Alert.alert(
        'Email Not Opened',
        error.userMessage || 'The track submission email could not be opened.'
      );
    }
  }

  function queueTrackSubmission(track) {
    pendingEditActionRef.current = { type: 'submitTrack', track };
    setSheetVisible(false);
    setEditingTrack(null);

    if (Platform.OS !== 'ios') {
      if (editDismissTimerRef.current) clearTimeout(editDismissTimerRef.current);
      editDismissTimerRef.current = setTimeout(handleEditSheetDismiss, 260);
    }
  }

  function openImportSheet() {
    pendingImportActionRef.current = null;
    setImportVisible(true);
  }

  function closeImportSheet() {
    pendingImportActionRef.current = null;
    setImportVisible(false);
  }

  function handleImportedTrack(savedTrack) {
    pendingImportActionRef.current = { type: 'openTrack', track: savedTrack };
    setImportVisible(false);

    if (Platform.OS !== 'ios') {
      if (importDismissTimerRef.current) clearTimeout(importDismissTimerRef.current);
      importDismissTimerRef.current = setTimeout(handleImportSheetDismiss, 260);
    }
  }

  function openSubmitTrackScreen() {
    // The header button is not inside a modal and can navigate immediately.
    if (!importVisible) {
      router.push('/tracks/submit');
      return;
    }

    pendingImportActionRef.current = { type: 'submitTrack' };
    setImportVisible(false);

    if (Platform.OS !== 'ios') {
      if (importDismissTimerRef.current) clearTimeout(importDismissTimerRef.current);
      importDismissTimerRef.current = setTimeout(handleImportSheetDismiss, 260);
    }
  }

  async function handleImportSheetDismiss() {
    const pendingAction = pendingImportActionRef.current;
    if (!pendingAction) return;

    pendingImportActionRef.current = null;
    if (importDismissTimerRef.current) {
      clearTimeout(importDismissTimerRef.current);
      importDismissTimerRef.current = null;
    }

    if (pendingAction.type === 'submitTrack') {
      router.push('/tracks/submit');
      return;
    }

    if (pendingAction.type === 'openTrack' && pendingAction.track) {
      await loadTracks();
      setEditingTrack(pendingAction.track);
      setSheetVisible(true);
    }
  }

  function goBack() {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/garage');
  }

  return (
    <View style={styles.screen}>
      <View style={[
        styles.screenContent,
        isLandscape && styles.screenContentLandscape,
        {
          paddingTop: Math.max(insets.top + 6, 10),
          paddingBottom: Math.max(insets.bottom + 8, 16),
          paddingLeft: Math.max(insets.left + (isLandscape ? 12 : 8), isLandscape ? 18 : 14),
          paddingRight: Math.max(insets.right + (isLandscape ? 12 : 8), isLandscape ? 18 : 14),
        },
      ]}>
        <View style={styles.vehicleLikeHeader}>
          <AppScreenHeader
            title="Tracks"
            kicker="IMRC GARAGE"
            onBack={goBack}
            rightLabel="+ ADD"
            onRightPress={addTrack}
          />

          <View style={modernTrackStyles.introRow}>
            <Text style={styles.pageSubtitle}>Saved tracks are used for Setups and Race Day.</Text>
            <Text style={modernTrackStyles.savedCount}>{tracks.length} SAVED</Text>
          </View>

          <View style={modernTrackStyles.utilityRow}>
            <Pressable
              onPress={openImportSheet}
              style={({ pressed }) => [
                modernTrackStyles.utilityButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={modernTrackStyles.utilityText}>IMPORT</Text>
            </Pressable>

            <Pressable
              onPress={openSubmitTrackScreen}
              style={({ pressed }) => [
                modernTrackStyles.utilityButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={modernTrackStyles.utilityText}>SUBMIT TRACK</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={TRACK_BLUE} />
            <Text style={styles.loadingText}>Loading tracks...</Text>
          </View>
        ) : tracks.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyPlusCircle}>
              <Text style={styles.emptyPlusText}>+</Text>
            </View>

            <Text style={styles.emptyStateTitle}>No saved tracks yet</Text>

            <Text style={styles.emptyStateText}>
              Add your first track so Setups and Race Day can use the correct track, surface, location, and LiveRC info.
            </Text>

            <Pressable
              onPress={addTrack}
              style={({ pressed }) => [
                styles.emptyAddButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.emptyAddButtonText}>Add Track</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={tracks}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => (
              <Pressable
                style={({ pressed }) => [modernTrackStyles.trackRow, pressed && modernTrackStyles.pressed]}
                onPress={() => openTrack(item)}
              >
                <Text style={modernTrackStyles.trackNumber}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={modernTrackStyles.trackIdentity}>
                  <Text style={modernTrackStyles.trackName} numberOfLines={1}>{trackName(item)}</Text>
                  <Text style={modernTrackStyles.trackMeta} numberOfLines={1}>{trackMeta(item)}</Text>
                  <Text style={modernTrackStyles.trackLocation} numberOfLines={1}>{trackLocation(item)}</Text>
                </View>
                <Text style={modernTrackStyles.chevron}>›</Text>
              </Pressable>
            )}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            numColumns={1}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <NewLookBottomNav active="garage" router={router} />

      <TrackEditSheet
        visible={sheetVisible}
        initialTrack={editingTrack || NEW_TRACK}
        isNew={isNew}
        saving={saving}
        onCancel={closeSheet}
        onSave={saveTrack}
        onDelete={removeTrack}
        onViewSetups={viewSetups}
        onSubmitTrack={queueTrackSubmission}
        onDismiss={handleEditSheetDismiss}
      />

      <TrackImportSheet
        visible={importVisible}
        onCancel={closeImportSheet}
        onImported={handleImportedTrack}
        onSubmitTrack={openSubmitTrackScreen}
        onDismiss={handleImportSheetDismiss}
      />
    </View>
  );
}

const modernTrackStyles = StyleSheet.create({
  introRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  savedCount: { color: AppColors.mutedText, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  utilityRow: {
    minHeight: 38,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderStrong,
  },
  utilityButton: { minHeight: 28, justifyContent: 'center', paddingHorizontal: 9, borderWidth: 1, borderColor: AppColors.borderStrong },
  utilityText: { color: AppColors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 0.45 },
  trackRow: {
    width: '100%',
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  trackNumber: { width: 24, color: AppColors.subtleText, fontSize: 9, fontWeight: '800' },
  trackIdentity: { flex: 1, minWidth: 0 },
  trackName: { color: AppColors.textStrong, fontSize: 14, fontWeight: '900' },
  trackMeta: { marginTop: 2, color: AppColors.mutedText, fontSize: 9 },
  trackLocation: { marginTop: 2, color: AppColors.subtleText, fontSize: 8, fontWeight: '700' },
  chevron: { color: AppColors.primary, fontSize: 21 },
  pressed: { opacity: 0.72 },
});
