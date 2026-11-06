import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  getLastViewedVehicleId,
  getVehicles,
  markVehicleViewed,
} from '../vehicles/logic/vehicleStorage';
import { getTracks } from '../tracks/storage/trackStorage';
import { getSetups } from '../setups/lib/setupStorage';
import { getEntityId, getTrackDisplayName } from '../setups/lib/setupModel';
import StableSafeAreaView from '../../src/layout/StableSafeAreaView';
import NewLookBottomNav from '../../src/navigation/NewLookBottomNav';
import { AppColors } from '../../src/theme/colors';

function clean(value) {
  return String(value ?? '').trim();
}

function vehicleMeta(vehicle) {
  return [vehicle?.chassisStyle, vehicle?.transponder ? `TX ${vehicle.transponder}` : '']
    .filter(Boolean)
    .join(' · ') || 'Vehicle details';
}

function trackMeta(track) {
  return [track?.surface, track?.type || track?.trackType, track?.direction]
    .filter(Boolean)
    .join(' · ') || 'Track details';
}

function setupTime(setup) {
  return Number(Date.parse(setup?.savedAt || setup?.updatedAt || setup?.createdAt || '')) || 0;
}

function savedLabel(setup) {
  const time = setupTime(setup);
  if (!time) return 'Setup saved';
  try {
    return `Saved ${new Date(time).toLocaleDateString()}`;
  } catch {
    return 'Setup saved';
  }
}

export default function GarageScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [setups, setSetups] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [showVehicleTracks, setShowVehicleTracks] = useState(false);

  const loadGarage = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicleRows, trackRows, setupRows, lastViewedId] = await Promise.all([
        getVehicles(),
        getTracks(),
        getSetups(),
        getLastViewedVehicleId(),
      ]);
      const nextVehicles = Array.isArray(vehicleRows) ? vehicleRows : [];
      const nextTracks = Array.isArray(trackRows) ? trackRows : [];
      const nextSetups = Array.isArray(setupRows) ? setupRows : [];
      setVehicles(nextVehicles);
      setTracks(nextTracks);
      setSetups(nextSetups);
      setSelectedVehicleId((current) => {
        const currentExists = nextVehicles.some((vehicle) => clean(vehicle?.id || vehicle?.vehicleId) === clean(current));
        if (currentExists) return current;
        const viewedExists = nextVehicles.some((vehicle) => clean(vehicle?.id || vehicle?.vehicleId) === clean(lastViewedId));
        return viewedExists ? clean(lastViewedId) : clean(nextVehicles[0]?.id || nextVehicles[0]?.vehicleId);
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadGarage(); }, [loadGarage]));

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => clean(vehicle?.id || vehicle?.vehicleId) === clean(selectedVehicleId)) || null,
    [selectedVehicleId, vehicles],
  );

  const trackRows = useMemo(() => {
    const vehicleId = clean(selectedVehicleId);
    return tracks.map((track) => {
      const trackId = clean(getEntityId(track));
      const setup = setups
        .filter((item) => clean(item?.vehicleId) === vehicleId && clean(item?.trackId) === trackId)
        .sort((a, b) => setupTime(b) - setupTime(a))[0] || null;
      return { track, trackId, setup };
    }).filter((row) => Boolean(row.setup)).sort((a, b) => {
      if (a.setup && !b.setup) return -1;
      if (!a.setup && b.setup) return 1;
      if (a.setup && b.setup) return setupTime(b.setup) - setupTime(a.setup);
      return getTrackDisplayName(a.track).localeCompare(getTrackDisplayName(b.track));
    });
  }, [selectedVehicleId, setups, tracks]);

  const selectedSetupCount = trackRows.filter((row) => row.setup).length;

  const selectVehicle = useCallback((vehicle) => {
    const id = clean(vehicle?.id || vehicle?.vehicleId);
    if (!id) return;
    setSelectedVehicleId(id);
    setShowVehicleTracks(true);
    markVehicleViewed(id).catch(() => {});
  }, []);

  const openVehicleTrack = useCallback((trackId) => {
    if (!selectedVehicleId || !trackId) return;
    router.push(`/setups/editor/${encodeURIComponent(trackId)}/${encodeURIComponent(selectedVehicleId)}`);
  }, [router, selectedVehicleId]);

  const addSetup = useCallback(() => {
    if (!selectedVehicleId) return;
    router.push(`/setups/select-track?vehicleId=${encodeURIComponent(selectedVehicleId)}`);
  }, [router, selectedVehicleId]);

  const goBack = useCallback(() => {
    if (showVehicleTracks) {
      setShowVehicleTracks(false);
      return;
    }
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router, showVehicleTracks]);

  return (
    <StableSafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={goBack}><Text style={styles.backText}>‹ BACK</Text></Pressable>
            <View style={styles.headerText}>
              <Text style={styles.kicker}>IMRC GARAGE</Text>
              <Text style={styles.title}>Garage</Text>
            </View>
            <Pressable style={styles.addVehicleButton} onPress={() => router.push('/vehicles')}><Text style={styles.addVehicleText}>+ VEHICLE</Text></Pressable>
          </View>

          <Text style={styles.intro}>
            {showVehicleTracks
              ? `Tracks and setups for ${selectedVehicle?.name || 'the selected vehicle'}.`
              : 'Choose a vehicle to view its tracks and setups.'}
          </Text>

          {loading ? (
            <ActivityIndicator color={AppColors.primary} style={styles.loading} />
          ) : !vehicles.length ? (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyTitle}>No vehicles yet</Text>
              <Text style={styles.emptyCopy}>Add your first car before creating track setups.</Text>
              <Pressable style={styles.primaryButton} onPress={() => router.push('/vehicles')}><Text style={styles.primaryButtonText}>ADD VEHICLE</Text></Pressable>
            </View>
          ) : !showVehicleTracks ? (
            <>
              <View style={styles.sectionHeading}>
                <View><Text style={styles.kicker}>GARAGE VEHICLES</Text><Text style={styles.sectionTitle}>Select vehicle</Text></View>
                <Text style={styles.sectionCount}>{vehicles.length} SAVED</Text>
              </View>

              <View style={styles.vehicleList}>
                {vehicles.map((vehicle) => {
                  const id = clean(vehicle?.id || vehicle?.vehicleId);
                  return (
                    <Pressable key={id} style={({ pressed }) => [styles.vehicleRow, pressed && styles.pressed]} onPress={() => selectVehicle(vehicle)}>
                      <Text style={styles.vehicleNumber}>{String(vehicles.indexOf(vehicle) + 1).padStart(2, '0')}</Text>
                      <View style={styles.vehicleIdentity}>
                        <Text style={styles.vehicleName} numberOfLines={1}>{vehicle?.name || 'Unnamed vehicle'}</Text>
                        <Text style={styles.vehicleMeta} numberOfLines={1}>{vehicleMeta(vehicle)}</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <View style={styles.selectedSummary}>
                <View style={styles.selectedSummaryText}>
                  <Text style={styles.kicker}>SELECTED VEHICLE</Text>
                  <Text style={styles.selectedVehicleName} numberOfLines={1}>{selectedVehicle?.name || 'Vehicle'}</Text>
                  <Text style={styles.selectedVehicleMeta} numberOfLines={1}>{vehicleMeta(selectedVehicle)}</Text>
                </View>
                <View style={styles.setupCountBox}><Text style={styles.setupCountValue}>{selectedSetupCount}</Text><Text style={styles.setupCountLabel}>SETUPS</Text></View>
              </View>

              <View style={styles.sectionHeading}>
                <View><Text style={styles.kicker}>SELECT TRACK</Text><Text style={styles.sectionTitle}>Tracks & setups</Text></View>
                <Pressable style={[styles.addSetupButton, !tracks.length && styles.disabledButton]} onPress={tracks.length ? addSetup : () => router.push('/tracks')}>
                  <Text style={styles.addSetupText}>{tracks.length ? '+ ADD SETUP' : '+ ADD TRACK'}</Text>
                </Pressable>
              </View>

              <View style={styles.trackList}>
                {trackRows.map(({ track, trackId, setup }) => (
                  <Pressable key={trackId} style={({ pressed }) => [styles.trackRow, setup && styles.trackRowWithSetup, pressed && styles.pressed]} onPress={() => openVehicleTrack(trackId)}>
                    <View style={styles.trackIdentity}>
                      <Text style={styles.trackName} numberOfLines={1}>{getTrackDisplayName(track)}</Text>
                      <Text style={styles.trackMeta} numberOfLines={1}>{trackMeta(track)}</Text>
                      <Text style={[styles.trackStatus, setup && styles.trackStatusSaved]}>{setup ? savedLabel(setup) : 'No setup for this car'}</Text>
                    </View>
                    <View style={[styles.trackAction, setup && styles.trackActionSaved]}>
                      <Text style={[styles.trackActionText, setup && styles.trackActionTextSaved]}>{setup ? 'OPEN' : '+ SETUP'}</Text>
                    </View>
                  </Pressable>
                ))}
                {!trackRows.length ? (
                  <View style={styles.emptyTracks}>
                    <Text style={styles.emptyTitle}>No setups for this vehicle</Text>
                    <Text style={styles.emptyCopy}>Use Add Setup to choose a track and create this car’s first setup.</Text>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
        <NewLookBottomNav active="garage" router={router} />
      </View>
    </StableSafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  root: { flex: 1, backgroundColor: AppColors.background },
  content: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 15, paddingBottom: 92 },
  header: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: AppColors.borderStrong },
  backButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 9, borderWidth: 1, borderColor: AppColors.border },
  backText: { color: AppColors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  headerText: { flex: 1 },
  kicker: { color: AppColors.primary, fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { marginTop: 1, color: AppColors.textStrong, fontSize: 27, lineHeight: 29, fontWeight: '900', letterSpacing: -0.55 },
  addVehicleButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 9, borderWidth: 1, borderColor: AppColors.borderStrong, backgroundColor: AppColors.surface },
  addVehicleText: { color: AppColors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  intro: { paddingVertical: 9, color: AppColors.mutedText, fontSize: 10, lineHeight: 15, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  loading: { marginTop: 30 },
  sectionHeading: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  sectionTitle: { marginTop: 2, color: AppColors.textStrong, fontSize: 18, fontWeight: '900' },
  sectionCount: { color: AppColors.mutedText, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  vehicleList: { borderTopWidth: 1, borderTopColor: AppColors.borderStrong },
  vehicleRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  vehicleNumber: { width: 24, color: AppColors.subtleText, fontSize: 9, fontWeight: '800' },
  vehicleIdentity: { flex: 1, minWidth: 0 },
  vehicleName: { color: AppColors.textStrong, fontSize: 14, fontWeight: '900' },
  vehicleMeta: { marginTop: 2, color: AppColors.mutedText, fontSize: 9 },
  chevron: { color: AppColors.primary, fontSize: 21 },
  selectedSummary: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingLeft: 11, borderLeftWidth: 2, borderLeftColor: AppColors.primary, backgroundColor: AppColors.card },
  selectedSummaryText: { flex: 1, minWidth: 0 },
  selectedVehicleName: { marginTop: 2, color: AppColors.textStrong, fontSize: 17, fontWeight: '900' },
  selectedVehicleMeta: { marginTop: 2, color: AppColors.mutedText, fontSize: 9 },
  setupCountBox: { minWidth: 62, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: AppColors.border },
  setupCountValue: { color: AppColors.primary, fontSize: 21, fontWeight: '900' },
  setupCountLabel: { marginTop: 1, color: AppColors.mutedText, fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  addSetupButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: AppColors.primary },
  addSetupText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  disabledButton: { backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.borderStrong },
  trackList: { borderTopWidth: 1, borderTopColor: AppColors.borderStrong },
  trackRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 10, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  trackRowWithSetup: { borderLeftWidth: 2, borderLeftColor: AppColors.primary, paddingLeft: 8 },
  trackIdentity: { flex: 1, minWidth: 0 },
  trackName: { color: AppColors.textStrong, fontSize: 14, fontWeight: '900' },
  trackMeta: { marginTop: 2, color: AppColors.mutedText, fontSize: 9 },
  trackStatus: { marginTop: 4, color: AppColors.subtleText, fontSize: 8, fontWeight: '800' },
  trackStatusSaved: { color: AppColors.primary },
  trackAction: { minWidth: 58, minHeight: 31, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, borderWidth: 1, borderColor: AppColors.borderStrong, backgroundColor: AppColors.surface },
  trackActionSaved: { borderColor: AppColors.primary, backgroundColor: AppColors.primarySoft },
  trackActionText: { color: AppColors.text, fontSize: 8, fontWeight: '900', letterSpacing: 0.35 },
  trackActionTextSaved: { color: AppColors.primary },
  emptyPanel: { marginTop: 18, padding: 14, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.card },
  emptyTracks: { paddingVertical: 18 },
  emptyTitle: { color: AppColors.textStrong, fontSize: 15, fontWeight: '900' },
  emptyCopy: { marginTop: 4, color: AppColors.mutedText, fontSize: 10, lineHeight: 15 },
  primaryButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: AppColors.primary },
  primaryButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
