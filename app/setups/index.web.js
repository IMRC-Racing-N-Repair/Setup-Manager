import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import AppScreenHeader from '../../src/layout/AppScreenHeader';
import {
  getLastViewedSetup,
  getSetups,
  getTracks,
  getVehicles,
} from '../../features/setups/lib/setupStorage';
import {
  getEntityId,
  getTrackDisplayName,
  getVehicleDisplayName,
} from '../../features/setups/lib/setupModel';
import {
  importSetupsExportJson,
  shareSetupsExportJson,
} from '../../features/setups/lib/setupFileTransfer';
import { AppColors } from '../../src/theme/colors';

function setupTime(setup) {
  const time = new Date(setup?.savedAt || setup?.updatedAt || setup?.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function latestForVehicleTrack(setups, vehicleId, trackId) {
  return setups
    .filter((setup) => String(setup?.vehicleId) === String(vehicleId) && String(setup?.trackId) === String(trackId))
    .sort((a, b) => setupTime(b) - setupTime(a))[0] || null;
}

function formatDate(value) {
  if (!value) return 'Not saved yet';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function SetupsWebScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transferBusy, setTransferBusy] = useState(false);
  const [setups, setSetups] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [lastViewed, setLastViewed] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const load = useCallback(async () => {
    const [savedSetups, savedVehicles, savedTracks, savedLastViewed] = await Promise.all([
      getSetups(),
      getVehicles(),
      getTracks(),
      getLastViewedSetup(),
    ]);
    setSetups(savedSetups);
    setVehicles(savedVehicles);
    setTracks(savedTracks);
    setLastViewed(savedLastViewed);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await load();
    })();
    return () => {
      active = false;
    };
  }, [load]));

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => String(getEntityId(vehicle)) === String(selectedVehicleId)) || null,
    [selectedVehicleId, vehicles]
  );

  const vehicleRows = useMemo(() => vehicles.map((vehicle) => {
    const vehicleId = String(getEntityId(vehicle));
    const vehicleSetups = setups.filter((setup) => String(setup?.vehicleId) === vehicleId);
    const trackCount = new Set(vehicleSetups.map((setup) => String(setup?.trackId || '')).filter(Boolean)).size;
    return { vehicle, vehicleId, setupCount: trackCount };
  }), [setups, vehicles]);

  const selectedTrackRows = useMemo(() => {
    if (!selectedVehicle) return [];
    const vehicleId = String(getEntityId(selectedVehicle));
    return tracks
      .map((track) => {
        const trackId = String(getEntityId(track));
        return {
          track,
          trackId,
          vehicleId,
          setup: latestForVehicleTrack(setups, vehicleId, trackId),
        };
      })
      .filter((row) => Boolean(row.setup))
      .sort((a, b) => setupTime(b.setup) - setupTime(a.setup));
  }, [selectedVehicle, setups, tracks]);

  async function importBackup() {
    if (transferBusy) return;
    setTransferBusy(true);
    try {
      const result = await importSetupsExportJson();
      if (!result?.canceled) {
        await load();
        window.alert(`Imported and merged ${result.mergedSetupCount || 0} setup group${result.mergedSetupCount === 1 ? '' : 's'}.`);
      }
    } catch (error) {
      window.alert(error?.message || 'The setup backup could not be imported.');
    } finally {
      setTransferBusy(false);
    }
  }

  async function exportBackup() {
    if (transferBusy) return;
    setTransferBusy(true);
    try {
      const result = await shareSetupsExportJson();
      window.alert(`Downloaded ${result.setupCount || 0} current setup${result.setupCount === 1 ? '' : 's'} and ${result.historyCount || 0} history group${result.historyCount === 1 ? '' : 's'}.`);
    } catch (error) {
      window.alert(error?.message || 'The setup backup could not be exported.');
    } finally {
      setTransferBusy(false);
    }
  }

  function addSetup() {
    if (selectedVehicleId) {
      router.push(`/setups/select-track?vehicleId=${encodeURIComponent(selectedVehicleId)}&returnTo=setups`);
    } else {
      router.push('/setups/select-vehicle');
    }
  }

  function openSetup(row) {
    router.push(`/setups/editor/${encodeURIComponent(row.trackId)}/${encodeURIComponent(row.vehicleId)}?returnTo=setups&returnVehicleId=${encodeURIComponent(row.vehicleId)}`);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <AppScreenHeader
          title="Setups"
          kicker="IMRC GARAGE"
          onBack={() => selectedVehicleId ? setSelectedVehicleId('') : router.replace('/garage')}
          rightLabel="+ ADD"
          onRightPress={addSetup}
        />

        <View style={styles.intro}>
          <View>
            <Text style={styles.introTitle}>
              {selectedVehicle ? `Saved setups for ${getVehicleDisplayName(selectedVehicle)}` : 'Choose a vehicle to view its saved setups.'}
            </Text>
            <Text style={styles.introMeta}>
              {setups.length} saved setup{setups.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.actions}>
            <Pressable disabled={transferBusy} style={styles.smallButton} onPress={importBackup}>
              <Text style={styles.smallButtonText}>IMPORT BACKUP</Text>
            </Pressable>
            <Pressable disabled={transferBusy || !setups.length} style={styles.smallButton} onPress={exportBackup}>
              <Text style={styles.smallButtonText}>EXPORT ALL</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={AppColors.primary} />
            <Text style={styles.muted}>Loading setups…</Text>
          </View>
        ) : selectedVehicle ? (
          <View style={styles.selectedView}>
            <View style={styles.selectedSummary}>
              <View style={styles.summaryCopy}>
                <Text style={styles.kicker}>SELECTED VEHICLE</Text>
                <Text style={styles.selectedName}>{getVehicleDisplayName(selectedVehicle)}</Text>
                <Text style={styles.muted}>{selectedVehicle.chassisStyle || selectedVehicle.model || 'Vehicle details'}</Text>
              </View>
              <View style={styles.countBox}>
                <Text style={styles.countValue}>{selectedTrackRows.length}</Text>
                <Text style={styles.countLabel}>TRACK SETUPS</Text>
              </View>
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Tracks & Setups</Text>
              <Pressable style={styles.addTrackButton} onPress={addSetup}><Text style={styles.addTrackText}>+ ADD SETUP</Text></Pressable>
            </View>

            <FlatList
              data={selectedTrackRows}
              keyExtractor={(item) => `${item.vehicleId}_${item.trackId}`}
              contentContainerStyle={styles.list}
              renderItem={({ item, index }) => (
                <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => openSetup(item)}>
                  <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
                  <View style={styles.identity}>
                    <Text style={styles.name}>{getTrackDisplayName(item.track)}</Text>
                    <Text style={styles.meta}>{[item.track?.surface, item.track?.trackType || item.track?.type].filter(Boolean).join(' · ') || 'Track details'}</Text>
                    <Text style={styles.saved}>Saved {formatDate(item.setup?.savedAt || item.setup?.updatedAt)}</Text>
                  </View>
                  <Text style={styles.open}>OPEN</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No setups saved for this vehicle</Text>
                  <Text style={styles.muted}>Choose Add Setup to create the first one.</Text>
                </View>
              }
            />
          </View>
        ) : (
          <View style={styles.vehicleView}>
            {lastViewed?.vehicleId && lastViewed?.trackId ? (
              <Pressable
                style={styles.lastOpened}
                onPress={() => openSetup({
                  vehicleId: String(lastViewed.vehicleId),
                  trackId: String(lastViewed.trackId),
                })}
              >
                <View style={styles.summaryCopy}>
                  <Text style={styles.kicker}>LAST OPENED</Text>
                  <Text style={styles.lastTitle}>{lastViewed.vehicleName || 'Vehicle setup'}</Text>
                  <Text style={styles.muted}>{lastViewed.trackName || 'Saved track'}</Text>
                </View>
                <Text style={styles.open}>OPEN</Text>
              </Pressable>
            ) : null}

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Vehicles</Text>
              <Text style={styles.sectionCount}>{vehicles.length} SAVED</Text>
            </View>

            <FlatList
              data={vehicleRows}
              keyExtractor={(item) => item.vehicleId}
              contentContainerStyle={styles.list}
              renderItem={({ item, index }) => (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  onPress={() => setSelectedVehicleId(item.vehicleId)}
                >
                  <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
                  <View style={styles.identity}>
                    <Text style={styles.name}>{getVehicleDisplayName(item.vehicle)}</Text>
                    <Text style={styles.meta}>{item.vehicle.chassisStyle || item.vehicle.model || 'Vehicle details'}</Text>
                  </View>
                  <View style={styles.setupBadge}>
                    <Text style={styles.setupBadgeValue}>{item.setupCount}</Text>
                    <Text style={styles.setupBadgeLabel}>SETUPS</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No vehicles saved</Text>
                  <Text style={styles.muted}>Add a vehicle before creating a setup.</Text>
                </View>
              }
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { flex: 1, width: '100%', paddingHorizontal: 22, paddingTop: 16 },
  intro: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  introTitle: { color: AppColors.mutedText, fontSize: 12 },
  introMeta: { marginTop: 4, color: AppColors.subtleText, fontSize: 9, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  smallButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: AppColors.borderStrong, backgroundColor: AppColors.surface },
  smallButtonText: { color: AppColors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 0.4 },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: AppColors.mutedText, fontSize: 10 },
  selectedView: { flex: 1 },
  vehicleView: { flex: 1 },
  selectedSummary: { minHeight: 76, flexDirection: 'row', marginTop: 14, borderLeftWidth: 3, borderLeftColor: AppColors.primary, backgroundColor: AppColors.card },
  summaryCopy: { flex: 1, justifyContent: 'center', paddingHorizontal: 14 },
  kicker: { color: AppColors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  selectedName: { marginTop: 3, color: AppColors.textStrong, fontSize: 18, fontWeight: '900' },
  countBox: { minWidth: 100, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: AppColors.border },
  countValue: { color: AppColors.primary, fontSize: 23, fontWeight: '900' },
  countLabel: { color: AppColors.mutedText, fontSize: 7, fontWeight: '900' },
  sectionHeading: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: AppColors.borderStrong },
  sectionTitle: { color: AppColors.textStrong, fontSize: 18, fontWeight: '900' },
  sectionCount: { color: AppColors.mutedText, fontSize: 9, fontWeight: '900' },
  addTrackButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: AppColors.primary },
  addTrackText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  list: { paddingBottom: 30 },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  number: { width: 28, color: AppColors.subtleText, fontSize: 9, fontWeight: '800' },
  identity: { flex: 1, minWidth: 0 },
  name: { color: AppColors.textStrong, fontSize: 15, fontWeight: '900' },
  meta: { marginTop: 3, color: AppColors.mutedText, fontSize: 9 },
  saved: { marginTop: 4, color: AppColors.primary, fontSize: 8, fontWeight: '800' },
  setupBadge: { width: 64, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: AppColors.primary, backgroundColor: AppColors.primarySoft },
  setupBadgeValue: { color: AppColors.textStrong, fontSize: 12, fontWeight: '900' },
  setupBadgeLabel: { color: AppColors.primary, fontSize: 6, fontWeight: '900' },
  open: { minWidth: 54, color: AppColors.primary, fontSize: 8, fontWeight: '900', textAlign: 'center' },
  chevron: { color: AppColors.primary, fontSize: 23 },
  lastOpened: { minHeight: 72, flexDirection: 'row', alignItems: 'center', marginTop: 14, borderWidth: 1, borderColor: AppColors.borderStrong, backgroundColor: AppColors.card },
  lastTitle: { marginTop: 3, color: AppColors.textStrong, fontSize: 16, fontWeight: '900' },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { color: AppColors.textStrong, fontSize: 18, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
