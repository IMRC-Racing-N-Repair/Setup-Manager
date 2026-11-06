import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import StableSafeAreaView from '../../src/layout/StableSafeAreaView';
import AppScreenHeader from '../../src/layout/AppScreenHeader';
import SelectorCard from '../../features/setups/components/SelectorCard';
import {
  ensureTrackForImportedSetup,
  ensureVehicleForImportedSetup,
  getLastViewedSetup,
  getSetups,
  getTracks,
  getVehicles,
  saveSetupCopyToTarget,
} from '../../features/setups/lib/setupStorage';
import {
  getEntityId,
  getTrackDisplayName,
  getVehicleDisplayName,
  makeSetupKey,
} from '../../features/setups/lib/setupModel';
import { setupColors, setupStyles } from '../../features/setups/styles/setupStyles';
import { useSafeAreaLayout } from '../../src/layout/safeAreaLayout';
import NewLookBottomNav from '../../src/navigation/NewLookBottomNav';
import { AppColors } from '../../src/theme/colors';
import {
  consumePendingIncomingImrcImport,
  importPreparedSetupBundle,
  importPreparedSetupToTarget,
  pickSetupImportForReview,
  prepareSetupImportFromUri,
} from '../../features/setups/lib/setupFileTransfer';

function formatDate(value) {
  if (!value) return 'Not saved yet';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

const CREATE_NEW_VEHICLE_TARGET = '__create_new_vehicle_from_imrc__';
const CREATE_NEW_TRACK_TARGET = '__create_new_track_from_imrc__';

function setupImportVehicleName(preparedImport) {
  const setup = preparedImport?.setup || {};
  return preparedImport?.sourceVehicleName
    || setup.vehicleName
    || setup.carName
    || setup.vehicle
    || setup.name
    || 'Imported Vehicle';
}

function setupImportTrackName(preparedImport) {
  const setup = preparedImport?.setup || {};
  return preparedImport?.sourceTrackName
    || setup.trackName
    || setup.track
    || setup.trackTitle
    || 'Imported Track';
}

function setupImportVehicleMeta(preparedImport) {
  const setup = preparedImport?.setup || {};
  return preparedImport?.sourceChassisStyle
    || setup.vehicleChassisStyle
    || setup.chassisStyle
    || setup.chassisProfile?.label
    || 'Chassis Style';
}

function setupImportTrackMeta(preparedImport) {
  const setup = preparedImport?.setup || {};
  return preparedImport?.sourceTrackType
    || setup.trackType
    || setup.trackStyle
    || setup.trackCategory
    || setup.surface
    || 'Track Type';
}

function cleanTrackTypeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map(cleanTrackTypeValue).filter(Boolean).join(' / ');
  if (typeof value === 'object') {
    return cleanTrackTypeValue(value.label || value.name || value.title || value.value);
  }
  return '';
}

function getTrackTypeDisplay(track) {
  if (!track) return 'Track Type';

  const candidates = [
    track.trackType,
    track.type,
    track.style,
    track.trackStyle,
    track.raceType,
    track.layout,
    track.category,
    track.trackCategory,
  ];

  const found = candidates.map(cleanTrackTypeValue).find(Boolean);
  return found || 'Track Type';
}

function setupTimeValue(setup) {
  const raw = setup?.savedAt || setup?.updatedAt || setup?.createdAt || setup?.id || '';
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getLatestSetupForVehicleTrack(setups, vehicleId, trackId) {
  const wantedKey = makeSetupKey(vehicleId, trackId);
  return setups
    .filter((setup) => makeSetupKey(setup.vehicleId, setup.trackId) === wantedKey)
    .sort((a, b) => setupTimeValue(b) - setupTimeValue(a))[0] || null;
}

function getSetupForVehicleTrack(setups, vehicleId, trackId) {
  return getLatestSetupForVehicleTrack(setups, vehicleId, trackId);
}

function normalizeCompare(value) {
  return String(value || '').trim().toLowerCase();
}

function findBestByIdOrName(items, wantedId, wantedName, displayGetter) {
  const id = String(wantedId || '');
  const name = normalizeCompare(wantedName);

  if (id) {
    const byId = items.find((item) => String(getEntityId(item)) === id);
    if (byId) return byId;
  }

  if (name) {
    return items.find((item) => normalizeCompare(displayGetter(item)) === name)
      || items.find((item) => normalizeCompare(displayGetter(item)).includes(name) || name.includes(normalizeCompare(displayGetter(item))));
  }

  return null;
}

function buildLastOpenedSetup({ lastViewedSetup, setups, tracks, vehicles }) {
  if (!lastViewedSetup?.vehicleId || !lastViewedSetup?.trackId) return null;

  const vehicleId = String(lastViewedSetup.vehicleId);
  const trackId = String(lastViewedSetup.trackId);
  const setup = getSetupForVehicleTrack(setups, vehicleId, trackId);
  const vehicle = vehicles.find((item) => getEntityId(item) === vehicleId);
  const track = tracks.find((item) => getEntityId(item) === trackId);

  return {
    vehicleId,
    trackId,
    setup,
    vehicleName: lastViewedSetup.vehicleName || setup?.vehicleName || getVehicleDisplayName(vehicle) || 'Last Vehicle',
    trackName: lastViewedSetup.trackName || setup?.trackName || getTrackDisplayName(track) || 'Last Track',
    savedAt: setup?.savedAt || setup?.updatedAt || lastViewedSetup.savedAt || lastViewedSetup.updatedAt,
  };
}

function ImportTargetPopup({
  visible,
  pendingImport,
  vehicles,
  tracks,
  selectedVehicleId,
  selectedTrackId,
  importStep,
  busy,
  onSelectVehicle,
  onSelectTrack,
  onSetImportStep,
  onCancel,
  onConfirm,
  onDismiss,
}) {
  const { modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({ modalSize: 'small' });
  const selectedVehicle = vehicles.find((item) => String(getEntityId(item)) === String(selectedVehicleId));
  const selectedTrack = tracks.find((item) => String(getEntityId(item)) === String(selectedTrackId));
  const sourceVehicleName = setupImportVehicleName(pendingImport);
  const sourceTrackName = setupImportTrackName(pendingImport);
  const sourceVehicleMeta = setupImportVehicleMeta(pendingImport);
  const sourceTrackMeta = setupImportTrackMeta(pendingImport);
  const creatingVehicle = selectedVehicleId === CREATE_NEW_VEHICLE_TARGET;
  const creatingTrack = selectedTrackId === CREATE_NEW_TRACK_TARGET;
  const canImport = Boolean((selectedVehicle || creatingVehicle) && (selectedTrack || creatingTrack));
  const step = importStep === 'vehicle' ? 'vehicle' : 'track';
  const optionItems = step === 'track' ? tracks : vehicles;

  const stepTitle = step === 'track' ? 'Choose Track' : 'Choose Car';
  const stepMessage = step === 'track'
    ? 'First choose which track this setup belongs to. This helps avoid duplicate track records.'
    : 'Now choose the car this setup belongs to, or create the car from the file.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} onDismiss={onDismiss} presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent>
      <View style={[setupStyles.confirmBackdrop, modalBackdropStyle]}>
        <View style={[setupStyles.confirmCard, setupStyles.importReviewCard, modalCardStyle]}>
          <View style={setupStyles.confirmAccent} />
          <Text style={setupStyles.confirmEyebrow}>IMPORT .IMRC</Text>
          <Text style={setupStyles.confirmTitle}>{stepTitle}</Text>
          <Text style={setupStyles.confirmMessage}>{stepMessage}</Text>

          <View style={setupStyles.importSourceBoxCompact}>
            <Text style={setupStyles.importSourceLabel}>File says</Text>
            <View style={setupStyles.importSourcePairRow}>
              <View style={setupStyles.importSourcePair}>
                <Text style={setupStyles.importSourceSmallLabel}>Track</Text>
                <Text style={setupStyles.importSourceTitle}>{sourceTrackName}</Text>
                <Text style={setupStyles.importSourceMeta}>{sourceTrackMeta}</Text>
              </View>
              <View style={setupStyles.importSourcePair}>
                <Text style={setupStyles.importSourceSmallLabel}>Car</Text>
                <Text style={setupStyles.importSourceTitle}>{sourceVehicleName}</Text>
                <Text style={setupStyles.importSourceMeta}>{sourceVehicleMeta}</Text>
              </View>
            </View>
          </View>

          <View style={setupStyles.importWizardProgressRow}>
            <View style={[setupStyles.importWizardStepPill, setupStyles.importWizardStepPillActive]}>
              <Text style={setupStyles.importWizardStepText}>1 Track</Text>
            </View>
            <View style={[setupStyles.importWizardStepLine, step === 'vehicle' && setupStyles.importWizardStepLineActive]} />
            <View style={[setupStyles.importWizardStepPill, step === 'vehicle' && setupStyles.importWizardStepPillActive]}>
              <Text style={setupStyles.importWizardStepText}>2 Car</Text>
            </View>
          </View>

          {step === 'vehicle' ? (
            <View style={setupStyles.importSelectedTargetBox}>
              <Text style={setupStyles.importSourceSmallLabel}>Selected Track</Text>
              <Text style={setupStyles.importTargetValue}>{creatingTrack ? `+ New: ${sourceTrackName}` : selectedTrack ? getTrackDisplayName(selectedTrack) : 'No track selected'}</Text>
              <Pressable onPress={() => onSetImportStep('track')} style={({ pressed }) => [setupStyles.importChangeSmallButton, pressed && setupStyles.cardPressed]}>
                <Text style={setupStyles.importChangeSmallText}>Change Track</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={setupStyles.importSectionLabel}>{step === 'track' ? 'Select track to import into' : 'Select car to import into'}</Text>
          <ScrollView style={setupStyles.importOptionScrollLarge} contentContainerStyle={setupStyles.importOptionScrollContent}>
            <Pressable
              key={`${step}_create_new`}
              onPress={() => step === 'track' ? onSelectTrack(CREATE_NEW_TRACK_TARGET) : onSelectVehicle(CREATE_NEW_VEHICLE_TARGET)}
              style={({ pressed }) => [
                setupStyles.importOptionRow,
                (step === 'track' ? creatingTrack : creatingVehicle) && setupStyles.importOptionRowSelected,
                pressed && setupStyles.cardPressed,
              ]}
            >
              <View style={setupStyles.importOptionAccent} />
              <View style={setupStyles.headerTextWrap}>
                <Text style={setupStyles.importOptionTitle}>+ Create new {step === 'track' ? 'track' : 'car'} from file</Text>
                <Text style={setupStyles.importOptionMeta}>{step === 'track' ? `${sourceTrackName} • ${sourceTrackMeta}` : `${sourceVehicleName} • ${sourceVehicleMeta}`}</Text>
              </View>
              <Text style={setupStyles.importOptionCheck}>{(step === 'track' ? creatingTrack : creatingVehicle) ? 'Selected' : 'Choose'}</Text>
            </Pressable>

            {optionItems.map((item) => {
              const id = String(getEntityId(item));
              const selected = step === 'track' ? id === String(selectedTrackId) : id === String(selectedVehicleId);
              const title = step === 'track' ? getTrackDisplayName(item) : getVehicleDisplayName(item);
              const subtitle = step === 'track'
                ? getTrackTypeDisplay(item)
                : (item.chassisStyle || item.chassis || item.vehicleStyle || item.model || 'Car');

              return (
                <Pressable
                  key={`${step}_${id}`}
                  onPress={() => step === 'track' ? onSelectTrack(id) : onSelectVehicle(id)}
                  style={({ pressed }) => [
                    setupStyles.importOptionRow,
                    selected && setupStyles.importOptionRowSelected,
                    pressed && setupStyles.cardPressed,
                  ]}
                >
                  <View style={setupStyles.importOptionAccent} />
                  <View style={setupStyles.headerTextWrap}>
                    <Text style={setupStyles.importOptionTitle}>{title}</Text>
                    <Text style={setupStyles.importOptionMeta}>{subtitle}</Text>
                  </View>
                  <Text style={setupStyles.importOptionCheck}>{selected ? 'Selected' : 'Use Existing'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={setupStyles.confirmActionStack}>
            {step === 'track' ? (
              <Pressable
                disabled={busy || !(selectedTrack || creatingTrack)}
                onPress={() => onSetImportStep('vehicle')}
                style={({ pressed }) => [setupStyles.confirmPrimaryButton, (busy || !(selectedTrack || creatingTrack)) && setupStyles.buttonDisabled, pressed && setupStyles.cardPressed]}
              >
                <Text style={setupStyles.confirmPrimaryText}>Next: Choose Car</Text>
              </Pressable>
            ) : (
              <Pressable
                disabled={busy || !canImport}
                onPress={onConfirm}
                style={({ pressed }) => [setupStyles.confirmPrimaryButton, (busy || !canImport) && setupStyles.buttonDisabled, pressed && setupStyles.cardPressed]}
              >
                <Text style={setupStyles.confirmPrimaryText}>{busy ? 'Importing...' : 'Import Setup'}</Text>
              </Pressable>
            )}
            <Pressable onPress={onCancel} style={({ pressed }) => [setupStyles.confirmSecondaryButton, pressed && setupStyles.cardPressed]}>
              <Text style={setupStyles.confirmSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CopySetupPopup({
  visible,
  copySource,
  tracks,
  selectedTrackId,
  busy,
  onSelectTrack,
  onCancel,
  onConfirm,
  onDismiss,
}) {
  const { modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({ modalSize: 'small' });
  const sourceTrackId = String(copySource?.trackId || copySource?.setup?.trackId || '');
  const targetTracks = tracks.filter((track) => String(getEntityId(track)) !== sourceTrackId);
  const selectedTrack = tracks.find((item) => String(getEntityId(item)) === String(selectedTrackId));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} onDismiss={onDismiss} presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent>
      <View style={[setupStyles.confirmBackdrop, modalBackdropStyle]}>
        <View style={[setupStyles.confirmCard, setupStyles.importReviewCard, modalCardStyle]}>
          <View style={setupStyles.confirmAccent} />
          <Text style={setupStyles.confirmEyebrow}>COPY SETUP</Text>
          <Text style={setupStyles.confirmTitle}>Copy to Track</Text>
          <Text style={setupStyles.confirmMessage}>
            Copy this car setup to another track. The original setup will stay where it is.
          </Text>

          <View style={setupStyles.importSourceBox}>
            <Text style={setupStyles.importSourceLabel}>Setup to copy</Text>
            <Text style={setupStyles.importSourceTitle}>{copySource?.setup?.vehicleName || copySource?.vehicleName || 'Car setup'}</Text>
            <Text style={setupStyles.importSourceMeta}>{copySource?.setup?.trackName || 'Current track'}</Text>
          </View>

          <ScrollView style={setupStyles.importOptionScroll} contentContainerStyle={setupStyles.importOptionScrollContent}>
            {targetTracks.map((track) => {
              const id = String(getEntityId(track));
              const selected = id === String(selectedTrackId);
              return (
                <Pressable
                  key={`copy_track_${id}`}
                  onPress={() => onSelectTrack(id)}
                  style={({ pressed }) => [
                    setupStyles.importOptionRow,
                    selected && setupStyles.importOptionRowSelected,
                    pressed && setupStyles.cardPressed,
                  ]}
                >
                  <View style={setupStyles.importOptionAccent} />
                  <View style={setupStyles.headerTextWrap}>
                    <Text style={setupStyles.importOptionTitle}>{getTrackDisplayName(track)}</Text>
                    <Text style={setupStyles.importOptionMeta}>{getTrackTypeDisplay(track)}</Text>
                  </View>
                  <Text style={setupStyles.importOptionCheck}>{selected ? 'Selected' : 'Choose'}</Text>
                </Pressable>
              );
            })}
            {!targetTracks.length ? (
              <Text style={setupStyles.emptyText}>Add another track before copying this setup.</Text>
            ) : null}
          </ScrollView>

          <View style={setupStyles.confirmActionStack}>
            <Pressable
              disabled={busy || !selectedTrack || !targetTracks.length}
              onPress={onConfirm}
              style={({ pressed }) => [setupStyles.confirmPrimaryButton, (busy || !selectedTrack || !targetTracks.length) && setupStyles.buttonDisabled, pressed && setupStyles.cardPressed]}
            >
              <Text style={setupStyles.confirmPrimaryText}>{busy ? 'Copying...' : 'Copy Setup'}</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={({ pressed }) => [setupStyles.confirmSecondaryButton, pressed && setupStyles.cardPressed]}>
              <Text style={setupStyles.confirmSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SetupsIndexScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const isTabletLandscape = width >= 700 && width > height;
  const handledIncomingUrisRef = useRef(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [setups, setSetups] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [lastViewedSetup, setLastViewedSetupState] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [transferBusy, setTransferBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [importVehicleId, setImportVehicleId] = useState('');
  const [importTrackId, setImportTrackId] = useState('');
  const [importStep, setImportStep] = useState('track');
  const [copySource, setCopySource] = useState(null);
  const [copyTargetTrackId, setCopyTargetTrackId] = useState('');
  const pendingModalFeedbackRef = useRef(null);
  const modalDismissTimerRef = useRef(null);

  const finishModalDismissal = useCallback(() => {
    const feedback = pendingModalFeedbackRef.current;
    if (!feedback) return;
    pendingModalFeedbackRef.current = null;
    if (modalDismissTimerRef.current) {
      clearTimeout(modalDismissTimerRef.current);
      modalDismissTimerRef.current = null;
    }
    Alert.alert(feedback.title, feedback.message);
  }, []);

  const queueModalFeedback = useCallback((feedback) => {
    pendingModalFeedbackRef.current = feedback;
    if (Platform.OS !== 'ios') {
      if (modalDismissTimerRef.current) clearTimeout(modalDismissTimerRef.current);
      modalDismissTimerRef.current = setTimeout(finishModalDismissal, 260);
    }
  }, [finishModalDismissal]);

  useEffect(() => () => {
    if (modalDismissTimerRef.current) clearTimeout(modalDismissTimerRef.current);
  }, []);

  const load = useCallback(async () => {
    const [savedSetups, savedVehicles, savedTracks, lastViewed] = await Promise.all([
      getSetups(),
      getVehicles(),
      getTracks(),
      getLastViewedSetup(),
    ]);

    setSetups(savedSetups);
    setVehicles(savedVehicles);
    setTracks(savedTracks);
    setLastViewedSetupState(lastViewed);
    setLoading(false);

    return {
      setups: savedSetups,
      vehicles: savedVehicles,
      tracks: savedTracks,
      lastViewedSetup: lastViewed,
    };
  }, []);

  const openImportReview = useCallback(async (preparedImport, availableVehicles = vehicles, availableTracks = tracks) => {
    if (!preparedImport || preparedImport.canceled) return;

    if (!preparedImport.isSingleSetup || !preparedImport.setup) {
      Alert.alert(
        'Import Setup Backup?',
        `This file looks like a full setup backup with ${preparedImport.setupCount || 'multiple'} saved setup records. Import all records?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import All',
            onPress: async () => {
              setTransferBusy(true);
              try {
                const result = await importPreparedSetupBundle(preparedImport);
                await load();
                Alert.alert('Setups Imported', `Merged ${result.mergedSetupCount || 0} car/track setup${result.mergedSetupCount === 1 ? '' : 's'}.`);
              } catch (error) {
                console.warn('Bulk setup import failed', error);
                Alert.alert('Import Failed', error?.message || 'The selected file could not be imported.');
              } finally {
                setTransferBusy(false);
              }
            },
          },
        ]
      );
      return;
    }

    if (!availableVehicles.length || !availableTracks.length) {
      Alert.alert('Import Needs Car & Track', 'Add at least one car and one track before importing a setup.');
      return;
    }

    const defaultVehicle = findBestByIdOrName(
      availableVehicles,
      preparedImport.suggestedVehicleId || preparedImport.setup.vehicleId,
      preparedImport.suggestedVehicleName || preparedImport.setup.vehicleName,
      getVehicleDisplayName
    );

    const defaultTrack = findBestByIdOrName(
      availableTracks,
      preparedImport.suggestedTrackId || preparedImport.setup.trackId,
      preparedImport.suggestedTrackName || preparedImport.setup.trackName,
      getTrackDisplayName
    );

    setPendingImport(preparedImport);
    setImportVehicleId(defaultVehicle ? String(getEntityId(defaultVehicle)) : CREATE_NEW_VEHICLE_TARGET);
    setImportTrackId(defaultTrack ? String(getEntityId(defaultTrack)) : CREATE_NEW_TRACK_TARGET);
    setImportStep('track');
  }, [load, tracks, vehicles]);

  const handlePendingIncomingImport = useCallback(async (loadedData) => {
    const queued = await consumePendingIncomingImrcImport();
    if (!queued) return;

    const queuedKey = queued.uri || queued.preparedImport?.uri || queued.preparedImport?.fileName || queued.queuedAt || 'incoming-imrc';
    if (handledIncomingUrisRef.current.has(queuedKey)) return;
    handledIncomingUrisRef.current.add(queuedKey);

    try {
      if (queued.preparedImport) {
        await openImportReview(queued.preparedImport, loadedData?.vehicles || vehicles, loadedData?.tracks || tracks);
        return;
      }

      if (queued.unreadable) {
        // Old builds may have left an unreadable Android open-with attempt in
        // storage. Consume it silently so Setups does not keep showing the
        // import warning when the user is not importing.
        return;
      }

      if (!queued.uri) return;

      const prepared = await prepareSetupImportFromUri(queued.uri, 'opened-setup.imrc');
      await openImportReview(prepared, loadedData?.vehicles || vehicles, loadedData?.tracks || tracks);
    } catch (error) {
      console.warn('Incoming IMRC import failed', error);
      const message = String(error?.message || '');
      // When Android opens the app without passing a readable file URI, show this
      // only once because the queue is consumed before this error is displayed.
      if (!message.includes('Android did not pass a readable') && !message.includes('file provider blocks direct open-with access')) {
        Alert.alert('Import Failed', error?.message || 'The .imrc file could not be imported.');
      }
    }
  }, [openImportReview, tracks, vehicles]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const loadedData = await load();
        if (active) {
          await handlePendingIncomingImport(loadedData);
        }
      })();
      return () => {
        active = false;
      };
    }, [handlePendingIncomingImport, load])
  );


  useEffect(() => {
    if (!params?.imrcImport) return;
    let active = true;
    (async () => {
      const loadedData = await load();
      if (active) {
        await handlePendingIncomingImport(loadedData);
      }
    })();
    return () => {
      active = false;
    };
  }, [handlePendingIncomingImport, load, params?.imrcImport]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleImportSetups = useCallback(async () => {
    if (transferBusy) return;
    setTransferBusy(true);
    try {
      const prepared = await pickSetupImportForReview();
      if (!prepared?.canceled) {
        await openImportReview(prepared);
      }
    } catch (error) {
      console.warn('Setups import failed', error);
      Alert.alert('Import Failed', error?.message || 'The selected file could not be imported.');
    } finally {
      setTransferBusy(false);
    }
  }, [openImportReview, transferBusy]);

  const confirmImportSetup = useCallback(async () => {
    if (!pendingImport || transferBusy) return;

    setTransferBusy(true);
    try {
      const vehicle = importVehicleId === CREATE_NEW_VEHICLE_TARGET
        ? await ensureVehicleForImportedSetup(pendingImport.setup)
        : vehicles.find((item) => String(getEntityId(item)) === String(importVehicleId));

      const track = importTrackId === CREATE_NEW_TRACK_TARGET
        ? await ensureTrackForImportedSetup(pendingImport.setup)
        : tracks.find((item) => String(getEntityId(item)) === String(importTrackId));

      if (!vehicle || !track) {
        Alert.alert('Choose Car & Track', 'Select both a car and a track before importing this setup.');
        return;
      }

      const result = await importPreparedSetupToTarget(pendingImport, { vehicle, track });
      await load();
      setSelectedVehicleId(String(getEntityId(vehicle)));
      setSelectedTrackId(String(getEntityId(track)));
      queueModalFeedback({
        title: 'Setup Imported',
        message: `Imported ${result.fileName || '.imrc setup'} to ${getVehicleDisplayName(vehicle)} at ${getTrackDisplayName(track)}.`,
      });
      setPendingImport(null);
      setImportStep('track');
    } catch (error) {
      console.warn('Setup import failed', error);
      Alert.alert('Import Failed', error?.message || 'The setup could not be imported.');
    } finally {
      setTransferBusy(false);
    }
  }, [importTrackId, importVehicleId, load, pendingImport, queueModalFeedback, tracks, transferBusy, vehicles]);

  const selectedTrack = useMemo(
    () => tracks.find((track) => getEntityId(track) === String(selectedTrackId)) || null,
    [selectedTrackId, tracks]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => String(getEntityId(vehicle)) === String(selectedVehicleId)) || null,
    [selectedVehicleId, vehicles]
  );

  useEffect(() => {
    const requestedVehicleId = String(params?.vehicleId || '').trim();
    if (!requestedVehicleId || !vehicles.some((vehicle) => String(getEntityId(vehicle)) === requestedVehicleId)) return;
    setSelectedVehicleId(requestedVehicleId);
  }, [params?.vehicleId, vehicles]);

  const vehicleSetupRows = useMemo(() => vehicles.map((vehicle) => {
    const vehicleId = String(getEntityId(vehicle));
    const vehicleSetups = setups.filter((setup) => String(setup?.vehicleId) === vehicleId);
    const trackIds = new Set(vehicleSetups.map((setup) => String(setup?.trackId || '')).filter(Boolean));
    return { vehicle, vehicleId, setupCount: trackIds.size };
  }), [setups, vehicles]);

  const selectedVehicleTrackRows = useMemo(() => {
    if (!selectedVehicle) return [];
    const vehicleId = String(getEntityId(selectedVehicle));
    return tracks.map((track) => {
      const trackId = String(getEntityId(track));
      const setup = getLatestSetupForVehicleTrack(setups, vehicleId, trackId);
      return { track, trackId, vehicleId, setup };
    }).filter((row) => Boolean(row.setup)).sort((a, b) => setupTimeValue(b.setup) - setupTimeValue(a.setup));
  }, [selectedVehicle, setups, tracks]);

  const lastOpened = useMemo(
    () => buildLastOpenedSetup({ lastViewedSetup, setups, tracks, vehicles }),
    [lastViewedSetup, setups, tracks, vehicles]
  );

  const tracksWithStats = useMemo(() => {
    return tracks.map((track) => {
      const trackId = getEntityId(track);
      const trackSetups = setups.filter((setup) => String(setup.trackId) === String(trackId));
      const vehicleIds = new Set(trackSetups.map((setup) => String(setup.vehicleId || '')));
      const latestSaved = trackSetups
        .map((setup) => setup.savedAt || setup.updatedAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      return {
        track,
        trackId,
        setupCount: trackSetups.length,
        vehicleCount: vehicleIds.size,
        latestSaved,
      };
    });
  }, [setups, tracks]);

  const carRows = useMemo(() => {
    if (!selectedTrack) return [];
    const trackId = getEntityId(selectedTrack);
    const vehiclesById = new Map(vehicles.map((vehicle) => [String(getEntityId(vehicle)), vehicle]));
    const latestSetupByVehicle = new Map();

    setups.forEach((setup) => {
      if (String(setup.trackId) !== String(trackId) || !setup.vehicleId) return;

      const vehicleId = String(setup.vehicleId);
      const current = latestSetupByVehicle.get(vehicleId);
      if (!current || setupTimeValue(setup) > setupTimeValue(current)) {
        latestSetupByVehicle.set(vehicleId, setup);
      }
    });

    return Array.from(latestSetupByVehicle.entries())
      .map(([vehicleId, setup]) => ({
        vehicle: vehiclesById.get(vehicleId) || null,
        vehicleId,
        trackId,
        setup,
      }))
      .sort((a, b) => getVehicleDisplayName(a.vehicle || a.setup).localeCompare(getVehicleDisplayName(b.vehicle || b.setup)));
  }, [selectedTrack, setups, vehicles]);

  const openCopyPrompt = useCallback((row) => {
    const firstTargetTrack = tracks.find((track) => String(getEntityId(track)) !== String(row.trackId));
    setCopySource(row);
    setCopyTargetTrackId(firstTargetTrack ? String(getEntityId(firstTargetTrack)) : '');
  }, [tracks]);

  const confirmCopySetup = useCallback(async () => {
    if (!copySource || transferBusy) return;
    const targetTrack = tracks.find((track) => String(getEntityId(track)) === String(copyTargetTrackId));
    if (!targetTrack) {
      Alert.alert('Choose Track', 'Select the track you want to copy this setup to.');
      return;
    }

    setTransferBusy(true);
    try {
      await saveSetupCopyToTarget(copySource.setup, {
        vehicle: copySource.vehicle,
        vehicleId: copySource.vehicleId,
        track: targetTrack,
        trackId: copyTargetTrackId,
        source: 'track-copy',
      });
      await load();
      setSelectedTrackId(String(getEntityId(targetTrack)));
      queueModalFeedback({
        title: 'Setup Copied',
        message: `Copied ${getVehicleDisplayName(copySource.vehicle || copySource.setup)} to ${getTrackDisplayName(targetTrack)}.`,
      });
      setCopySource(null);
    } catch (error) {
      console.warn('Setup copy failed', error);
      Alert.alert('Copy Failed', error?.message || 'The setup could not be copied.');
    } finally {
      setTransferBusy(false);
    }
  }, [copySource, copyTargetTrackId, load, queueModalFeedback, tracks, transferBusy]);

  const canCreate = vehicles.length > 0 && tracks.length > 0;
  const savedLabel = loading
    ? 'Loading setups…'
    : `${setups.length} saved setup${setups.length === 1 ? '' : 's'}`;

  const handleSafeBack = useCallback(() => {
    if (selectedVehicleId) {
      setSelectedVehicleId(null);
      return;
    }
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router, selectedVehicleId]);

  return (
    <StableSafeAreaView edges={['top', 'bottom']} style={setupStyles.safe}>
      <View style={[setupBrowserStyles.headerWrap, isTabletLandscape && setupBrowserStyles.fullWidthTabletLandscape]}>
        <AppScreenHeader
          title="Setups"
          kicker="IMRC GARAGE"
          onBack={handleSafeBack}
          rightLabel="+ ADD"
          onRightPress={() => selectedVehicleId
            ? router.push(`/setups/select-track?vehicleId=${encodeURIComponent(selectedVehicleId)}`)
            : router.push('/setups/select-vehicle')}
        />

        <View style={setupBrowserStyles.introRow}>
          <Text style={setupBrowserStyles.introText} numberOfLines={2}>
            {selectedVehicle ? `Saved track setups for ${getVehicleDisplayName(selectedVehicle)}.` : 'Choose a vehicle to view its saved track setups.'}
          </Text>
          <Pressable
            disabled={transferBusy}
            onPress={handleImportSetups}
            style={({ pressed }) => [setupBrowserStyles.importButton, transferBusy && setupStyles.buttonDisabled, pressed && setupBrowserStyles.pressed]}
          >
            <Text style={setupBrowserStyles.importText}>IMPORT</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={setupStyles.scroll}
        contentContainerStyle={[setupBrowserStyles.scrollContent, isTabletLandscape && setupBrowserStyles.fullWidthTabletLandscape]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={setupColors.purple} />}
      >
        {loading ? (
          <View style={setupBrowserStyles.loadingCard}>
            <ActivityIndicator color={AppColors.primary} />
            <Text style={setupBrowserStyles.emptyCopy}>Loading setups…</Text>
          </View>
        ) : (
          <>
        {!canCreate ? (
          <View style={setupBrowserStyles.emptyPanel}>
            <Text style={setupBrowserStyles.emptyTitle}>Vehicles and tracks required</Text>
            <Text style={setupBrowserStyles.emptyCopy}>Add at least one vehicle and one track before creating setup sheets.</Text>
          </View>
        ) : !selectedVehicle ? (
          <>
            <View style={setupBrowserStyles.sectionHeading}>
              <View><Text style={setupBrowserStyles.kicker}>SETUP VEHICLES</Text><Text style={setupBrowserStyles.sectionTitle}>Select vehicle</Text></View>
              <Text style={setupBrowserStyles.sectionCount}>{setups.length} SAVED SETUPS</Text>
            </View>
            <View style={setupBrowserStyles.vehicleList}>
              {vehicleSetupRows.map(({ vehicle, vehicleId, setupCount }, index) => (
                <Pressable key={vehicleId} style={({ pressed }) => [setupBrowserStyles.vehicleRow, pressed && setupBrowserStyles.pressed]} onPress={() => setSelectedVehicleId(vehicleId)}>
                  <Text style={setupBrowserStyles.vehicleNumber}>{String(index + 1).padStart(2, '0')}</Text>
                  <View style={setupBrowserStyles.vehicleIdentity}>
                    <Text style={setupBrowserStyles.vehicleName} numberOfLines={1}>{getVehicleDisplayName(vehicle)}</Text>
                    <Text style={setupBrowserStyles.vehicleMeta} numberOfLines={1}>{vehicle?.chassisStyle || vehicle?.vehicleStyle || 'Vehicle details'}</Text>
                  </View>
                  <View style={setupBrowserStyles.setupBadge}><Text style={setupBrowserStyles.setupBadgeValue}>{setupCount}</Text><Text style={setupBrowserStyles.setupBadgeLabel}>SETUPS</Text></View>
                  <Text style={setupBrowserStyles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={setupBrowserStyles.selectedSummary}>
              <View style={setupBrowserStyles.selectedSummaryText}>
                <Text style={setupBrowserStyles.kicker}>SELECTED VEHICLE</Text>
                <Text style={setupBrowserStyles.selectedVehicleName} numberOfLines={1}>{getVehicleDisplayName(selectedVehicle)}</Text>
                <Text style={setupBrowserStyles.selectedVehicleMeta} numberOfLines={1}>{selectedVehicle?.chassisStyle || selectedVehicle?.vehicleStyle || 'Vehicle details'}</Text>
              </View>
              <View style={setupBrowserStyles.setupCountBox}><Text style={setupBrowserStyles.setupCountValue}>{selectedVehicleTrackRows.length}</Text><Text style={setupBrowserStyles.setupCountLabel}>SETUPS</Text></View>
            </View>

            <View style={setupBrowserStyles.sectionHeading}>
              <View><Text style={setupBrowserStyles.kicker}>SAVED TRACKS</Text><Text style={setupBrowserStyles.sectionTitle}>Tracks & setups</Text></View>
              <Pressable style={setupBrowserStyles.addSetupButton} onPress={() => router.push(`/setups/select-track?vehicleId=${encodeURIComponent(selectedVehicleId)}`)}>
                <Text style={setupBrowserStyles.addSetupText}>+ ADD SETUP</Text>
              </Pressable>
            </View>

            {!selectedVehicleTrackRows.length ? (
              <View style={setupBrowserStyles.emptyPanel}>
                <Text style={setupBrowserStyles.emptyTitle}>No setups for this vehicle</Text>
                <Text style={setupBrowserStyles.emptyCopy}>Use Add Setup to choose a track and create this car’s first setup.</Text>
              </View>
            ) : (
              <View style={setupBrowserStyles.trackList}>
                {selectedVehicleTrackRows.map((row) => (
                  <View key={`${row.trackId}_${row.vehicleId}`} style={setupBrowserStyles.trackRow}>
                    <Pressable style={({ pressed }) => [setupBrowserStyles.trackIdentity, pressed && setupBrowserStyles.pressed]} onPress={() => router.push(`/setups/editor/${row.trackId}/${row.vehicleId}`)}>
                      <Text style={setupBrowserStyles.trackName} numberOfLines={1}>{getTrackDisplayName(row.track)}</Text>
                      <Text style={setupBrowserStyles.trackMeta} numberOfLines={1}>{getTrackTypeDisplay(row.track)}</Text>
                      <Text style={setupBrowserStyles.trackStatus}>Saved {formatDate(row.setup?.savedAt || row.setup?.updatedAt)}</Text>
                    </Pressable>
                    <Pressable style={setupBrowserStyles.copyButton} onPress={() => openCopyPrompt(row)}><Text style={setupBrowserStyles.copyText}>COPY</Text></Pressable>
                    <Pressable style={setupBrowserStyles.openButton} onPress={() => router.push(`/setups/editor/${row.trackId}/${row.vehicleId}`)}><Text style={setupBrowserStyles.openText}>OPEN</Text></Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
          </>
        )}
      </ScrollView>

      <NewLookBottomNav active="garage" router={router} />

      <ImportTargetPopup
        visible={Boolean(pendingImport)}
        pendingImport={pendingImport}
        vehicles={vehicles}
        tracks={tracks}
        selectedVehicleId={importVehicleId}
        selectedTrackId={importTrackId}
        importStep={importStep}
        busy={transferBusy}
        onSelectVehicle={(id) => {
          setImportVehicleId(id);
        }}
        onSelectTrack={(id) => {
          setImportTrackId(id);
        }}
        onSetImportStep={setImportStep}
        onCancel={() => {
          if (transferBusy) return;
          setPendingImport(null);
          setImportStep('track');
        }}
        onConfirm={confirmImportSetup}
        onDismiss={finishModalDismissal}
      />

      <CopySetupPopup
        visible={Boolean(copySource)}
        copySource={copySource}
        tracks={tracks}
        selectedTrackId={copyTargetTrackId}
        busy={transferBusy}
        onSelectTrack={setCopyTargetTrackId}
        onCancel={() => {
          if (transferBusy) return;
          setCopySource(null);
        }}
        onConfirm={confirmCopySetup}
        onDismiss={finishModalDismissal}
      />
    </StableSafeAreaView>
  );
}

const setupBrowserStyles = StyleSheet.create({
  headerWrap: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 15 },
  fullWidthTabletLandscape: { maxWidth: '100%', paddingHorizontal: 22 },
  introRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  introText: { flex: 1, color: AppColors.mutedText, fontSize: 10, lineHeight: 15 },
  importButton: { minHeight: 28, justifyContent: 'center', paddingHorizontal: 9, borderWidth: 1, borderColor: AppColors.borderStrong },
  importText: { color: AppColors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 0.45 },
  scrollContent: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 15, paddingBottom: 92 },
  loadingCard: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
  sectionHeading: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  kicker: { color: AppColors.primary, fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 1.1 },
  sectionTitle: { marginTop: 2, color: AppColors.textStrong, fontSize: 18, fontWeight: '900' },
  sectionCount: { color: AppColors.mutedText, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  vehicleList: { borderTopWidth: 1, borderTopColor: AppColors.borderStrong },
  vehicleRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  vehicleNumber: { width: 24, color: AppColors.subtleText, fontSize: 9, fontWeight: '800' },
  vehicleIdentity: { flex: 1, minWidth: 0 },
  vehicleName: { color: AppColors.textStrong, fontSize: 14, fontWeight: '900' },
  vehicleMeta: { marginTop: 2, color: AppColors.mutedText, fontSize: 9 },
  setupBadge: { width: 54, height: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(47,140,255,0.70)', backgroundColor: 'rgba(47,140,255,0.12)' },
  setupBadgeValue: { color: AppColors.textStrong, fontSize: 10, lineHeight: 11, fontWeight: '900' },
  setupBadgeLabel: { color: AppColors.primary, fontSize: 5, lineHeight: 6, fontWeight: '900', letterSpacing: 0.4 },
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
  trackList: { borderTopWidth: 1, borderTopColor: AppColors.borderStrong },
  trackRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: AppColors.primary, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  trackIdentity: { flex: 1, minWidth: 0 },
  trackName: { color: AppColors.textStrong, fontSize: 14, fontWeight: '900' },
  trackMeta: { marginTop: 2, color: AppColors.mutedText, fontSize: 9 },
  trackStatus: { marginTop: 4, color: AppColors.primary, fontSize: 8, fontWeight: '800' },
  copyButton: { minWidth: 44, minHeight: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: AppColors.borderStrong },
  copyText: { color: AppColors.mutedText, fontSize: 7, fontWeight: '900' },
  openButton: { minWidth: 52, minHeight: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: AppColors.primary, backgroundColor: AppColors.primarySoft },
  openText: { color: AppColors.primary, fontSize: 7, fontWeight: '900' },
  emptyPanel: { marginTop: 18, padding: 14, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.card },
  emptyTitle: { color: AppColors.textStrong, fontSize: 15, fontWeight: '900' },
  emptyCopy: { marginTop: 4, color: AppColors.mutedText, fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.72 },
});
