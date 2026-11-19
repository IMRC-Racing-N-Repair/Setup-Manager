import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import useViewport from '../../src/layout/useViewport';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { DESKTOP_WEB_MIN_WIDTH, DESKTOP_WORKSPACE_MAX_WIDTH } from '../../src/layout/desktopWorkspace';
import CornerWeightChart from '../../src/components/CornerWeightChart';
import AppScreenHeader from '../../src/layout/AppScreenHeader';
import { getLastViewedSetup, getSetupHistory, getSetups, getTracks, getVehicles } from '../../features/setups/lib/setupStorage';
import { getEntityId, getTrackDisplayName, getVehicleDisplayName } from '../../features/setups/lib/setupModel';
import { importSetupsExportJson, shareSetupsExportJson } from '../../features/setups/lib/setupFileTransfer';
import { AppColors as colors } from '../../src/theme/colors';

function setupTime(setup) {
  return new Date(setup?.savedAt || setup?.updatedAt || setup?.createdAt || 0).getTime() || 0;
}

function formatDate(setup) {
  const time = setupTime(setup);
  return time ? new Date(time).toLocaleString() : 'Date unavailable';
}

function Action({ children, onPress, primary = false, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary && styles.buttonPrimary, (pressed || disabled) && styles.dim]}
    >
      <Text style={[styles.buttonText, primary && styles.buttonPrimaryText]}>{children}</Text>
    </Pressable>
  );
}

function Choice({ name, detail, count, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ hovered, pressed }) => [styles.choice, hovered && styles.choiceHovered, selected && styles.choiceSelected, pressed && styles.dim]}
    >
      <View style={styles.identity}>
        <Text style={styles.name}>{name}</Text>
        {!!detail && <Text style={styles.muted}>{detail}</Text>}
      </View>
      {count !== undefined && <Text style={styles.count}>{count}</Text>}
    </Pressable>
  );
}

const setupFields = [
  ['Spur', 'gearing', 'spur'],
  ['Pinion', 'gearing', 'pinion'],
  ['Tire diameter', 'gearing', 'tireDiameter'],
  ['Rollout', 'gearing', 'rollout'],
  ['Fast lap', 'results', 'fastLap'],
  ['Average lap', 'results', 'avgLap'],
  ['Cross weight', 'cornerWeights', 'crossWeight'],
];

function setupValue(setup, section, field) {
  return String(setup?.[section]?.[field] ?? '').trim();
}

function SetupPreview({ row, onOpen }) {
  const [history, setHistory] = useState([]);
  const [compare, setCompare] = useState(false);
  const { trackId, vehicleId, setup } = row;

  useEffect(() => {
    let current = true;
    getSetupHistory(vehicleId, trackId).then((versions) => {
      if (current) setHistory(versions);
    }).catch(() => {
      if (current) setHistory([]);
    });
    return () => { current = false; };
  }, [vehicleId, trackId, setup.id, setup.savedAt]);

  const earlier = history.find((version) => version.id !== setup.id && setupTime(version) < setupTime(setup));
  const previous = compare ? earlier : null;
  const fields = setupFields.map(([label, section, field]) => ({
    label,
    current: setupValue(setup, section, field),
    previous: setupValue(previous, section, field),
  })).filter((field) => field.current || field.previous);

  return (
    <View style={styles.preview}>
      <Text style={styles.sectionTitle}>{getTrackDisplayName(row.track)}</Text>
      <Text style={styles.muted}>Saved {formatDate(setup)}</Text>
      <Action primary onPress={() => onOpen(row)}>Open setup</Action>
      {earlier && <Action onPress={() => setCompare((value) => !value)}>{compare ? 'Hide comparison' : 'Compare previous save'}</Action>}
      {previous && <Text style={styles.muted}>Previous save · {formatDate(previous)}</Text>}
      {!!fields.length && (
        <View>
          {previous && (
            <View style={styles.field}>
              <Text style={[styles.muted, styles.identity]}>Setting</Text>
              <Text style={[styles.muted, styles.fieldValue]}>Current</Text>
              <Text style={[styles.muted, styles.fieldValue]}>Previous</Text>
            </View>
          )}
          {fields.map((field) => (
            <View key={field.label} style={styles.field}>
              <Text style={[styles.muted, styles.identity]}>{field.label}</Text>
              <Text style={[styles.name, styles.fieldValue]}>{field.current || '—'}</Text>
              {previous && <Text style={[styles.muted, styles.fieldValue]}>{field.previous || '—'}</Text>}
            </View>
          ))}
        </View>
      )}
      <CornerWeightChart weights={setup.cornerWeights} />
    </View>
  );
}

export default function SetupsWebScreen() {
  const router = useRouter();
  const { width } = useViewport();
  const desktop = width >= DESKTOP_WEB_MIN_WIDTH;
  const params = useLocalSearchParams();
  const vehicleId = String(params.vehicleId || '');
  const selectedTrackId = String(params.setupTrackId || '');
  const trackFilter = params.mode === 'track' ? String(params.trackId || '') : '';

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);

  const load = useCallback(async () => {
    const [setups, vehicles, tracks, lastViewed] = await Promise.all([
      getSetups(), getVehicles(), getTracks(), getLastViewedSetup(),
    ]);
    return { setups, vehicles, tracks, lastViewed };
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    load().then((result) => {
      if (active) {
        setData(result);
        setLoadError(false);
      }
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [load]));

  const setupsByVehicle = useMemo(() => {
    const index = new Map();
    for (const setup of data?.setups || []) {
      if (!setup?.vehicleId || !setup?.trackId) continue;
      const key = String(setup.vehicleId);
      const id = String(setup.trackId);
      if (trackFilter && id !== trackFilter) continue;
      if (!index.has(key)) index.set(key, new Map());
      const vehicleSetups = index.get(key);
      if (!vehicleSetups.has(id) || setupTime(setup) > setupTime(vehicleSetups.get(id))) {
        vehicleSetups.set(id, setup);
      }
    }
    return index;
  }, [data, trackFilter]);

  const vehicles = (data?.vehicles || []).filter((vehicle) => !trackFilter || setupsByVehicle.has(String(getEntityId(vehicle))));
  const vehicle = vehicles.find((item) => String(getEntityId(item)) === vehicleId);
  const filterTrack = data?.tracks.find((track) => String(getEntityId(track)) === trackFilter);
  const vehicleSetups = vehicle ? setupsByVehicle.get(vehicleId) : null;
  const trackRows = (data?.tracks || []).map((track) => {
    const trackId = String(getEntityId(track));
    return { track, trackId, vehicleId, setup: vehicleSetups?.get(trackId) };
  }).filter((row) => row.setup).sort((a, b) => setupTime(b.setup) - setupTime(a.setup));
  const preview = trackRows.find((row) => row.trackId === selectedTrackId) || trackRows[0];
  const lastViewed = data?.lastViewed;

  async function transferBackup(importing) {
    if (transferBusy) return;
    setTransferBusy(true);
    try {
      if (importing) {
        const result = await importSetupsExportJson();
        if (!result?.canceled) {
          setData(await load());
          const count = result.mergedSetupCount || 0;
          window.alert(`Imported and merged ${count} setup group${count === 1 ? '' : 's'}.`);
        }
      } else {
        const result = await shareSetupsExportJson();
        window.alert(`Downloaded ${result.setupCount || 0} current setups and ${result.historyCount || 0} history groups.`);
      }
    } catch (error) {
      window.alert(error?.message || 'The setup backup could not be transferred.');
    } finally {
      setTransferBusy(false);
    }
  }

  function addSetup() {
    if (vehicle) {
      router.push({ pathname: '/setups/select-track', params: { vehicleId, returnTo: 'setups' } });
    } else {
      router.push('/setups/select-vehicle');
    }
  }

  function openSetup(row) {
    router.push({
      pathname: '/setups/editor/[trackId]/[vehicleId]',
      params: { trackId: row.trackId, vehicleId: row.vehicleId, returnTo: 'setups', returnVehicleId: row.vehicleId },
    });
  }

  function goBack() {
    if (vehicle && !desktop) router.setParams({ vehicleId: '', setupTrackId: '' });
    else router.replace(trackFilter ? '/tracks' : '/garage');
  }

  return (
    <View style={[styles.screen, desktop && styles.screenWide]}>
      <AppScreenHeader title="Setups" kicker="IMRC GARAGE" onBack={goBack} rightLabel="+ Add" onRightPress={addSetup} />
      <View style={styles.toolbar}>
        <View style={styles.identity}>
          <Text style={styles.sectionTitle}>{trackFilter ? (filterTrack ? getTrackDisplayName(filterTrack) : 'Track setups') : 'Saved setups'}</Text>
          <Text style={styles.muted}>{trackFilter ? `${vehicles.length} vehicles with setups` : `${data?.setups.length || 0} saved`}</Text>
        </View>
        <View style={styles.actions}>
          {trackFilter && <Action onPress={() => router.replace('/setups')}>All setups</Action>}
          <Action disabled={transferBusy} onPress={() => transferBackup(true)}>Import backup</Action>
          <Action disabled={transferBusy || !data?.setups.length} onPress={() => transferBackup(false)}>Export all</Action>
        </View>
      </View>

      {loadError ? <Text style={styles.empty}>Saved setups could not be loaded.</Text> : !data ? (
        <ActivityIndicator style={styles.empty} color={colors.primary} accessibilityLabel="Loading setups" />
      ) : (
        <View style={[styles.workspace, desktop && styles.workspaceWide]}>
          {(desktop || !vehicle) && (
            <View style={[styles.panel, desktop && styles.panelWide, desktop && styles.vehiclePanel]}>
              <Text style={styles.panelTitle}>Vehicles</Text>
              <FlatList
                data={vehicles}
                keyExtractor={(item) => String(getEntityId(item))}
                renderItem={({ item }) => {
                  const id = String(getEntityId(item));
                  return <Choice name={getVehicleDisplayName(item)} detail={item.chassisStyle || item.model}
                    count={setupsByVehicle.get(id)?.size || 0} selected={id === vehicleId}
                    onPress={() => router.setParams({ vehicleId: id, setupTrackId: '' })} />;
                }}
                ListEmptyComponent={<Text style={styles.empty}>{trackFilter ? 'No setups saved for this track.' : 'Add a vehicle before creating a setup.'}</Text>}
              />
            </View>
          )}

          {(desktop || vehicle) && (
            <View style={[styles.panel, desktop && styles.panelWide]}>
              <Text style={styles.panelTitle}>{vehicle ? getVehicleDisplayName(vehicle) : 'Track setups'}</Text>
              {vehicle ? (
                <FlatList
                  data={trackRows}
                  keyExtractor={(item) => item.trackId}
                  renderItem={({ item }) => (
                    <Choice name={getTrackDisplayName(item.track)}
                      detail={[item.track.surface, item.track.trackType || item.track.type].filter(Boolean).join(' · ')}
                      selected={desktop && item.trackId === preview?.trackId}
                      onPress={() => desktop ? router.setParams({ setupTrackId: item.trackId }) : openSetup(item)} />
                  )}
                  ListEmptyComponent={<Text style={styles.empty}>No setups saved for this vehicle. Choose Add to create one.</Text>}
                />
              ) : <Text style={styles.empty}>Choose a vehicle to browse its track setups.</Text>}
            </View>
          )}

          {desktop && (
            <View style={[styles.panel, styles.panelWide, styles.detailsPanel]}>
              <Text style={styles.panelTitle}>Setup details</Text>
              <ScrollView>
                {preview
                  ? <SetupPreview key={`${preview.vehicleId}/${preview.trackId}`} row={preview} onOpen={openSetup} />
                  : <Text style={styles.empty}>Select a saved setup to see its details.</Text>}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {lastViewed?.vehicleId && lastViewed?.trackId && (desktop || !vehicle) && (
        <View style={styles.lastOpened}>
          <View style={styles.identity}>
            <Text style={styles.name}>Last opened setup</Text>
            <Text style={styles.muted}>{[lastViewed.vehicleName, lastViewed.trackName].filter(Boolean).join(' · ')}</Text>
          </View>
          <Action onPress={() => openSetup(lastViewed)}>Reopen</Action>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14, gap: 12 },
  screenWide: { width: '100%', maxWidth: DESKTOP_WORKSPACE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 16, paddingBottom: 20, gap: 16 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  workspace: { flex: 1, minHeight: 0, gap: 12 },
  workspaceWide: { flexDirection: 'row', gap: 16 },
  panel: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
  panelWide: { borderWidth: 0, borderRadius: 10 },
  vehiclePanel: { flex: 0.85 },
  detailsPanel: { flex: 1.45 },
  panelTitle: { paddingVertical: 12, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: colors.border, color: colors.text, fontSize: 16, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  muted: { color: colors.mutedText, fontSize: 13 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 58, paddingHorizontal: 10, paddingVertical: 9, marginHorizontal: 6, marginTop: 5, borderRadius: 7, borderWidth: 1, borderColor: 'transparent' },
  choiceHovered: { backgroundColor: colors.cardSoft },
  choiceSelected: { backgroundColor: colors.primarySoft, borderColor: '#426A99' },
  count: { color: '#A8CBFC', fontSize: 12 },
  preview: { padding: 13, gap: 10 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldValue: { flex: 1, minWidth: 0, textAlign: 'right', fontVariant: ['tabular-nums'] },
  empty: { padding: 14, color: colors.mutedText, fontSize: 14 },
  lastOpened: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, backgroundColor: colors.card },
  button: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 38, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, borderRadius: 7, paddingHorizontal: 10 },
  buttonPrimary: { backgroundColor: '#2366C5', borderColor: '#4A8DEA' },
  buttonText: { color: '#B6D5FF', fontSize: 13, fontWeight: '700' },
  buttonPrimaryText: { color: colors.textStrong },
  dim: { opacity: 0.55 },
});
