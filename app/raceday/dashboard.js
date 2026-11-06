import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RaceDayHeader from '../../features/raceday/components/RaceDayHeader';
import RaceDayVehicleCard from '../../features/raceday/components/RaceDayVehicleCard';
import RaceDayBottomActions from '../../features/raceday/components/RaceDayBottomActions';
import RaceDayPopup from '../../features/raceday/components/RaceDayPopup';
import RaceDayResultCard from '../../features/raceday/components/RaceDayResultCard';
import RaceDayTop5Popup from '../../features/raceday/components/RaceDayTop5Popup';
import RaceDayRaceResultsPopup from '../../features/raceday/components/RaceDayRaceResultsPopup';
import RaceDaySyncPopup from '../../features/raceday/components/RaceDaySyncPopup';
import RaceDayNotesPopup from '../../features/raceday/components/RaceDayNotesPopup';
import RaceDayRecentChangesPopup from '../../features/raceday/components/RaceDayRecentChangesPopup';
import RaceDayModeToggle from '../../features/raceday/components/RaceDayModeToggle';
import RaceDayPracticeCard from '../../features/raceday/components/RaceDayPracticeCard';
import RaceDayPracticeSessionsPopup from '../../features/raceday/components/RaceDayPracticeSessionsPopup';
import RaceDayPracticeDayPickerPopup from '../../features/raceday/components/RaceDayPracticeDayPickerPopup';
import RaceDayPracticeTrackCard from '../../features/raceday/components/RaceDayPracticeTrackCard';
import RaceDayLiveHeader from '../../features/raceday/components/RaceDayLiveHeader';
import { mergeSyncProgress } from '../../features/raceday/components/RaceDaySyncStatusPopup';
import RaceDayAutoSyncOverlay from '../../features/raceday/components/RaceDayAutoSyncOverlay';
import NewLookBottomNav from '../../src/navigation/NewLookBottomNav';
import useLiveRcLiveFeed from '../../features/raceday/hooks/useLiveRcLiveFeed';
import { hydrateActiveRaceDay, endRaceDay, saveRaceDayEvent } from '../../features/raceday/lib/raceDayStorage';
import { getRaceDayRuns, getLatestRunForVehicle, getRunsForVehicleFromList } from '../../features/raceday/lib/raceDayResultStorage';
import { getRaceDayLineups } from '../../features/raceday/lib/raceDayLineupStorage';
import {
  getRaceDaySelectedPracticeDay,
  getPracticeDayKey,
  getPracticeSummariesForVehiclesByDay,
  saveRaceDaySelectedPracticeDay,
  formatPracticeDayLabel,
} from '../../features/raceday/lib/raceDayPracticeDay';
import { getCompareFields, saveCompareFields, toggleCompareField } from '../../features/raceday/lib/raceDayCompare';
import { getTrackDisplayName, getTrackLiveRcUrl, getVehicleDisplayName, normalizeId } from '../../features/raceday/lib/raceDayModel';
import { syncLiveRcRaceDay } from '../../features/raceday/lib/liverc/liveRcSyncRunner';
import { syncLiveRcPracticeDay } from '../../features/raceday/lib/liverc/liveRcPracticeSyncRunner';
import { findEventByUrl } from '../../features/raceday/lib/liverc/liveRcEventFinder';
import { getRaceDayLiveStatus, isRaceDayEventCurrentDay } from '../../features/raceday/lib/raceDayLiveStatus';
import { raceDayColors, raceDayStyles } from '../../features/raceday/styles/raceDayStyles';

const LIVE_FEED_ENABLED_KEY = '@raceDayLiveFeedEnabled_v1';

function getStoredEventTitle(raceDay = {}) {
  return (
    raceDay?.eventTitle ||
    raceDay?.eventName ||
    raceDay?.selectedEventTitle ||
    raceDay?.liveRcEventTitle ||
    raceDay?.event?.title ||
    raceDay?.selectedEvent?.title ||
    ''
  );
}

function getStoredEventDateLabel(raceDay = {}) {
  return (
    raceDay?.eventDateLabel ||
    raceDay?.eventDate ||
    raceDay?.selectedEventDateLabel ||
    raceDay?.liveRcEventDateLabel ||
    raceDay?.event?.dateLabel ||
    raceDay?.selectedEvent?.dateLabel ||
    ''
  );
}

function getEventIdLabel(eventUrl = '') {
  const id = String(eventUrl || '').match(/[?&]id=(\d+)/i)?.[1];
  return id ? `LiveRC Event #${id}` : '';
}

export default function RaceDayDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTabletLandscape = width >= 700 && width > height;
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [track, setTrack] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [runs, setRuns] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [compareFields, setCompareFields] = useState([]);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [top5Open, setTop5Open] = useState(false);
  const [raceResultsOpen, setRaceResultsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [dashboardMode, setDashboardMode] = useState('race');
  const [practiceSummaries, setPracticeSummaries] = useState({});
  const [practiceSessionsOpen, setPracticeSessionsOpen] = useState(false);
  const [practiceDayPickerOpen, setPracticeDayPickerOpen] = useState(false);
  const [selectedPracticeDay, setSelectedPracticeDay] = useState(null);
  const [selectedPracticeDayLabel, setSelectedPracticeDayLabel] = useState('');
  const [practiceRefreshing, setPracticeRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [livePreferenceLoaded, setLivePreferenceLoaded] = useState(false);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [autoSyncProgress, setAutoSyncProgress] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedPracticeVehicle, setSelectedPracticeVehicle] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const pendingResultPopupRef = useRef('');
  const resultDismissTimerRef = useRef(null);
  const syncDismissResolverRef = useRef(null);
  const syncDismissTimerRef = useRef(null);
  const pendingPracticeDayRef = useRef(null);
  const practiceDismissTimerRef = useRef(null);
  const autoSyncRunningRef = useRef(false);
  const autoSyncCancelRef = useRef(null);

  useEffect(() => () => {
    if (resultDismissTimerRef.current) clearTimeout(resultDismissTimerRef.current);
    if (syncDismissTimerRef.current) clearTimeout(syncDismissTimerRef.current);
    if (practiceDismissTimerRef.current) clearTimeout(practiceDismissTimerRef.current);
    syncDismissResolverRef.current?.();
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(LIVE_FEED_ENABLED_KEY)
      .then((value) => {
        if (mounted) setLiveEnabled(value !== '0');
      })
      .finally(() => {
        if (mounted) setLivePreferenceLoaded(true);
      });
    return () => { mounted = false; };
  }, []);

  const trackName = getTrackDisplayName(track || {});
  const hasLiveRcEvent = Boolean(active?.eventUrl);
  const selectedEventTitleLabel = getStoredEventTitle(active) || getEventIdLabel(active?.eventUrl) || 'No event selected';
  // Older RaceDay sessions may have an event URL without a separately saved
  // track URL. The live feed only needs the LiveRC origin, so the event URL is
  // a valid fallback and keeps those existing sessions connected.
  const liveRcSiteUrl = active?.siteUrl || getTrackLiveRcUrl(track || {}) || active?.eventUrl || '';
  const liveRcState = useLiveRcLiveFeed(liveRcSiteUrl, Boolean(active?.trackId) && liveEnabled && livePreferenceLoaded);
  const liveStatus = getRaceDayLiveStatus(active || {}, liveRcState);
  const selectedEventDateLabel = getStoredEventDateLabel(active);
  const liveIsActive = Boolean(liveEnabled && liveStatus.liveActive);
  const eventStatusText = !hasLiveRcEvent
    ? 'No event selected'
    : liveIsActive
      ? 'Selected event is live now'
      : liveStatus.eventMismatch
        ? 'Selected event does not match the live track event'
        : liveStatus.currentDay
          ? 'Selected event · Waiting for live race activity'
          : 'Selected event · Not live today';
  const liveBadgeLabel = !liveEnabled
    ? 'LIVE OFF'
    : liveIsActive
      ? 'LIVE'
      : !hasLiveRcEvent
        ? 'NO EVENT'
        : liveStatus.eventMismatch
          ? 'MISMATCH'
          : liveStatus.currentDay
            ? 'WAITING'
            : 'NOT LIVE';

  const toggleLiveFeed = useCallback(() => {
    setLiveEnabled((current) => {
      const next = !current;
      AsyncStorage.setItem(LIVE_FEED_ENABLED_KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, []);

  const latestRunsByVehicle = useMemo(() => {
    const map = new Map();
    vehicles.forEach((vehicle) => {
      const id = normalizeId(vehicle.id || vehicle.vehicleId);
      map.set(id, getLatestRunForVehicle(runs, id));
    });
    return map;
  }, [vehicles, runs]);

  const runsByVehicle = useMemo(() => {
    const map = new Map();
    vehicles.forEach((vehicle) => {
      const id = normalizeId(vehicle.id || vehicle.vehicleId);
      map.set(id, getRunsForVehicleFromList(runs, id));
    });
    return map;
  }, [vehicles, runs]);

  const lineupsByVehicle = useMemo(() => new Map(
    lineups.map((lineup) => [normalizeId(lineup?.vehicleId), lineup])
  ), [lineups]);

  const load = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    const [{ active: raceDayRaw, track: nextTrack, vehicles: nextVehicles }, nextFields] = await Promise.all([
      hydrateActiveRaceDay(),
      getCompareFields(),
    ]);

    let raceDay = raceDayRaw;

    // Repair older active RaceDay sessions that only stored eventUrl/siteUrl before
    // the event title/date fields were added. This keeps the dashboard from showing
    // a blank event line after updating the RaceDay files.
    if (raceDay?.eventUrl && (!getStoredEventTitle(raceDay) || !getStoredEventDateLabel(raceDay))) {
      try {
        const foundEvent = await findEventByUrl(
          raceDay.siteUrl || getTrackLiveRcUrl(nextTrack || {}) || raceDay.eventUrl,
          raceDay.eventUrl,
        );
        if (foundEvent?.title || foundEvent?.dateLabel) {
          raceDay = await saveRaceDayEvent({
            eventUrl: raceDay.eventUrl,
            siteUrl: raceDay.siteUrl || getTrackLiveRcUrl(nextTrack || {}),
            eventTitle: foundEvent.title || getStoredEventTitle(raceDay),
            eventDateLabel: foundEvent.dateLabel || getStoredEventDateLabel(raceDay),
          });
        }
      } catch (error) {
        // Do not block RaceDay load if LiveRC cannot be reached.
        console.warn('[RaceDay] Could not repair stored LiveRC event title', error);
      }
    }

    setActive(raceDay);
    setTrack(nextTrack);
    setVehicles(nextVehicles);
    setCompareFields(nextFields);
    const raceDayId = raceDay?.id || raceDay?.raceDayId;
    let loadedRuns = [];
    if (raceDayId) {
      const storedPracticeDay = await getRaceDaySelectedPracticeDay(raceDayId);
      const [nextRuns, nextPracticeSummaries, nextLineups] = await Promise.all([
        getRaceDayRuns(raceDayId),
        storedPracticeDay ? getPracticeSummariesForVehiclesByDay(raceDayId, nextVehicles, storedPracticeDay) : Promise.resolve({}),
        getRaceDayLineups(raceDayId),
      ]);
      loadedRuns = nextRuns;
      setRuns(nextRuns);
      setLineups(nextLineups);
      setSelectedPracticeDay(storedPracticeDay);
      setSelectedPracticeDayLabel(storedPracticeDay ? formatPracticeDayLabel(storedPracticeDay) : '');
      setPracticeSummaries(nextPracticeSummaries);
    } else {
      setRuns([]);
      setLineups([]);
      setSelectedPracticeDay(null);
      setSelectedPracticeDayLabel('');
      setPracticeSummaries({});
    }
    if (showLoading) setLoading(false);
    return { raceDay, track: nextTrack, vehicles: nextVehicles, runs: loadedRuns };
  }, []);

  const cancelAutoSync = useCallback(() => {
    if (autoSyncCancelRef.current) autoSyncCancelRef.current.cancelled = true;
    setAutoSyncing(false);
  }, []);

  useFocusEffect(useCallback(() => {
    let cancelled = false;

    async function loadAndResync() {
      const snapshot = await load();
      const raceDay = snapshot?.raceDay;
      const nextTrack = snapshot?.track;
      const nextVehicles = snapshot?.vehicles || [];
      const savedRuns = snapshot?.runs || [];
      if (cancelled || !raceDay?.eventUrl || !isRaceDayEventCurrentDay(raceDay) || !nextVehicles.length || autoSyncRunningRef.current) return;

      const cancelToken = { cancelled: false };
      autoSyncCancelRef.current = cancelToken;
      autoSyncRunningRef.current = true;
      setAutoSyncProgress(nextVehicles.map((vehicle) => ({
        key: normalizeId(vehicle.id || vehicle.vehicleId) || getVehicleDisplayName(vehicle),
        vehicleId: vehicle.id || vehicle.vehicleId,
        vehicleName: getVehicleDisplayName(vehicle),
        phase: 'queued',
        status: 'pending',
      })));
      setAutoSyncing(true);
      try {
        await syncLiveRcRaceDay({
          raceDay,
          track: nextTrack,
          vehicles: nextVehicles,
          eventUrl: raceDay.eventUrl,
          siteUrl: raceDay.siteUrl || getTrackLiveRcUrl(nextTrack || {}),
          existingRuns: savedRuns,
          shouldCancel: () => cancelled || cancelToken.cancelled,
          onProgress: (update) => {
            if (!cancelled && !cancelToken.cancelled) setAutoSyncProgress((previous) => mergeSyncProgress(previous, update));
          },
        });
        if (!cancelled && !cancelToken.cancelled) await load({ showLoading: false });
        // Keep the completed checklist visible briefly so the final car and
        // lineup steps visibly reach Done instead of disappearing immediately.
        if (!cancelled && !cancelToken.cancelled) await new Promise((resolve) => setTimeout(resolve, 450));
      } catch (error) {
        if (error?.code !== 'RACEDAY_SYNC_CANCELLED') console.warn('[RaceDay] Automatic LiveRC refresh failed', error);
      } finally {
        if (autoSyncCancelRef.current === cancelToken) autoSyncCancelRef.current = null;
        autoSyncRunningRef.current = false;
        if (!cancelled && !cancelToken.cancelled) setAutoSyncing(false);
      }
    }

    loadAndResync();
    return () => {
      cancelled = true;
      if (autoSyncCancelRef.current) autoSyncCancelRef.current.cancelled = true;
      setAutoSyncing(false);
    };
  }, [load]));

  function openResults(vehicle, run) {
    const fallbackRun = latestRunsByVehicle.get(normalizeId(vehicle.id || vehicle.vehicleId));
    setSelectedVehicle(vehicle);
    setSelectedRun(run || fallbackRun);
    setResultsOpen(true);
  }

  function finishResultsDismissal() {
    const target = pendingResultPopupRef.current;
    if (!target) return;
    pendingResultPopupRef.current = '';
    if (resultDismissTimerRef.current) {
      clearTimeout(resultDismissTimerRef.current);
      resultDismissTimerRef.current = null;
    }
    if (target === 'top5') setTop5Open(true);
    if (target === 'raceResults') setRaceResultsOpen(true);
  }

  function openResultsChild(run, target) {
    setSelectedRun(run);
    pendingResultPopupRef.current = target;
    setResultsOpen(false);
    if (Platform.OS !== 'ios') {
      if (resultDismissTimerRef.current) clearTimeout(resultDismissTimerRef.current);
      resultDismissTimerRef.current = setTimeout(finishResultsDismissal, 260);
    }
  }

  function openTop5(run) {
    openResultsChild(run, 'top5');
  }

  function openRaceResults(run) {
    openResultsChild(run, 'raceResults');
  }

  function waitForSyncPopupDismissal() {
    if (!syncOpen) return Promise.resolve();
    setSyncOpen(false);
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (syncDismissTimerRef.current) clearTimeout(syncDismissTimerRef.current);
        syncDismissTimerRef.current = null;
        syncDismissResolverRef.current = null;
        resolve();
      };
      syncDismissResolverRef.current = finish;
      syncDismissTimerRef.current = setTimeout(finish, Platform.OS === 'ios' ? 900 : 260);
    });
  }

  async function handleToggleCompareField(key) {
    const next = toggleCompareField(compareFields, key);
    setCompareFields(next);
    await saveCompareFields(next);
  }

  function openPracticeSessions(vehicle) {
    setSelectedPracticeVehicle(vehicle);
    setPracticeSessionsOpen(true);
  }

  function handleDashboardModeChange(nextMode) {
    if (nextMode === 'practice') {
      if (selectedPracticeDay) {
        setDashboardMode('practice');
        return;
      }
      setPracticeDayPickerOpen(true);
      return;
    }
    setDashboardMode('race');
  }

  async function loadPracticeForDay(day, { sync = false } = {}) {
    const raceDayId = active?.id || active?.raceDayId;
    const dayKey = getPracticeDayKey(day);
    if (!raceDayId || !dayKey) return;

    setPracticeRefreshing(true);
    try {
      if (sync) {
        await syncLiveRcPracticeDay({
          raceDay: active,
          track,
          vehicles,
          practiceDay: day,
        });
      }
      const nextSummaries = await getPracticeSummariesForVehiclesByDay(raceDayId, vehicles, day);
      setPracticeSummaries(nextSummaries);
    } catch (error) {
      Alert.alert('Practice Refresh', error?.message || 'Practice refresh failed.');
      const nextSummaries = await getPracticeSummariesForVehiclesByDay(raceDayId, vehicles, day);
      setPracticeSummaries(nextSummaries);
    } finally {
      setPracticeRefreshing(false);
    }
  }

  async function refreshPracticeSummaries() {
    if (!selectedPracticeDay) {
      setPracticeDayPickerOpen(true);
      return;
    }
    await loadPracticeForDay(selectedPracticeDay, { sync: true });
  }

  async function handlePracticeDaySelected(day) {
    const raceDayId = active?.id || active?.raceDayId;
    const dayKey = getPracticeDayKey(day);
    if (!raceDayId || !dayKey) return;

    const savedDay = await saveRaceDaySelectedPracticeDay(raceDayId, day);
    pendingPracticeDayRef.current = savedDay;
    setPracticeDayPickerOpen(false);
    if (Platform.OS !== 'ios') {
      if (practiceDismissTimerRef.current) clearTimeout(practiceDismissTimerRef.current);
      practiceDismissTimerRef.current = setTimeout(finishPracticeDayDismissal, 260);
    }
  }

  async function finishPracticeDayDismissal() {
    const savedDay = pendingPracticeDayRef.current;
    if (!savedDay) return;
    pendingPracticeDayRef.current = null;
    if (practiceDismissTimerRef.current) {
      clearTimeout(practiceDismissTimerRef.current);
      practiceDismissTimerRef.current = null;
    }
    setSelectedPracticeDay(savedDay);
    setSelectedPracticeDayLabel(formatPracticeDayLabel(savedDay));
    setDashboardMode('practice');
    await loadPracticeForDay(savedDay, { sync: true });
  }

  function openSetup(vehicle) {
    const trackId = active?.trackId || track?.id || track?.trackId;
    const vehicleId = vehicle?.id || vehicle?.vehicleId;
    if (!trackId || !vehicleId) return;
    router.push(`/setups/editor/${trackId}/${vehicleId}?returnTo=raceday`);
  }

  function confirmEndRaceDay() {
    Alert.alert('End Race Day?', 'This clears the active RaceDay session keys and returns to Dashboard. Saved runs stay local.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Race Day',
        style: 'destructive',
        onPress: async () => {
          await endRaceDay();
          router.replace('/');
        },
      },
    ]);
  }

  async function runLiveRcSync({ eventUrl, siteUrl, eventTitle, eventDateLabel, saveEvent = false } = {}) {
    if (syncing || autoSyncRunningRef.current) return;

    const nextEventUrl = eventUrl || active?.eventUrl;
    const nextSiteUrl = siteUrl || active?.siteUrl || getTrackLiveRcUrl(track || {});
    if (!nextEventUrl) {
      setSyncOpen(true);
      return;
    }

    await waitForSyncPopupDismissal();
    const cancelToken = { cancelled: false };
    autoSyncCancelRef.current = cancelToken;
    autoSyncRunningRef.current = true;
    setSyncing(true);
    setAutoSyncProgress(vehicles.map((vehicle) => ({
      key: normalizeId(vehicle.id || vehicle.vehicleId) || getVehicleDisplayName(vehicle),
      vehicleId: vehicle.id || vehicle.vehicleId,
      vehicleName: getVehicleDisplayName(vehicle),
      phase: 'queued',
      status: 'pending',
    })));
    setAutoSyncing(true);

    try {
      let raceDayForSync = {
        ...active,
        eventUrl: nextEventUrl,
        siteUrl: nextSiteUrl,
        eventTitle: eventTitle || getStoredEventTitle(active),
        eventDateLabel: eventDateLabel || getStoredEventDateLabel(active),
      };

      if (saveEvent) {
        raceDayForSync = await saveRaceDayEvent({
          eventUrl: nextEventUrl,
          siteUrl: nextSiteUrl,
          eventTitle: raceDayForSync.eventTitle,
          eventDateLabel: raceDayForSync.eventDateLabel,
        });
        setActive(raceDayForSync);
      }

      const result = await syncLiveRcRaceDay({
        raceDay: raceDayForSync,
        track,
        vehicles,
        eventUrl: nextEventUrl,
        siteUrl: nextSiteUrl,
        existingRuns: runs,
        shouldCancel: () => cancelToken.cancelled,
        onProgress: (update) => {
          if (!cancelToken.cancelled) setAutoSyncProgress((previous) => mergeSyncProgress(previous, update));
        },
      });

      if (!cancelToken.cancelled) await load({ showLoading: false });
      if (!cancelToken.cancelled) await new Promise((resolve) => setTimeout(resolve, 450));
    } catch (error) {
      if (error?.code !== 'RACEDAY_SYNC_CANCELLED') {
        Alert.alert('RaceDay Refresh', error?.message || 'LiveRC refresh failed.');
      }
    } finally {
      if (autoSyncCancelRef.current === cancelToken) autoSyncCancelRef.current = null;
      autoSyncRunningRef.current = false;
      if (!cancelToken.cancelled) setAutoSyncing(false);
      setSyncing(false);
    }
  }

  function handleSyncPress() {
    if (!hasLiveRcEvent) {
      setSyncOpen(true);
      return;
    }
    runLiveRcSync();
  }

  function handleSyncSelectedEvent(eventPayload) {
    runLiveRcSync({ ...eventPayload, saveEvent: true });
  }

  const handleBack = useCallback(() => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  if (loading) {
    return (
      <View style={raceDayStyles.screen}>
        <View style={[raceDayStyles.container, isTabletLandscape && raceDayStyles.containerTabletLandscape, { paddingTop: insets.top }]}>
          <RaceDayHeader title="RaceDay" subtitle="Loading" onLeftPress={handleBack} leftLabel="‹ BACK" topOffset={false} />
          <View style={[raceDayStyles.empty, raceDayStyles.loadingShell]}>
            <ActivityIndicator color={raceDayColors.accent} />
            <Text style={raceDayStyles.loadingShellText}>Checking RaceDay, vehicles, and saved race information…</Text>
          </View>
        </View>
        <NewLookBottomNav active="raceday" router={router} />
      </View>
    );
  }

  if (!active?.trackId) {
    return (
      <View style={raceDayStyles.screen}>
        <View style={[raceDayStyles.container, isTabletLandscape && raceDayStyles.containerTabletLandscape, { paddingTop: insets.top }]}>
          <RaceDayHeader title="RaceDay" subtitle="No active session" onLeftPress={handleBack} leftLabel="‹ BACK" topOffset={false} />
          <View style={raceDayStyles.empty}>
            <Text style={raceDayStyles.emptyText}>No active Race Day was found. Start Race Day from the Dashboard.</Text>
          </View>
        </View>
        <RaceDayBottomActions docked tabletLandscape={isTabletLandscape} primaryLabel="Select Track" onPrimaryPress={() => router.replace('/raceday/select-track')} />
        <NewLookBottomNav active="raceday" router={router} />
      </View>
    );
  }

  return (
    <View style={raceDayStyles.screen}>
      <View style={[raceDayStyles.container, isTabletLandscape && raceDayStyles.containerTabletLandscape, { paddingTop: insets.top }]}>
        <RaceDayHeader
          title="RaceDay"
          subtitle={trackName}
          leftLabel="‹ BACK"
          onLeftPress={handleBack}
          rightLabel="END"
          rightTone="danger"
          onRightPress={confirmEndRaceDay}
          topOffset={false}
        />

        <ScrollView contentContainerStyle={[raceDayStyles.scrollContent, isTabletLandscape && raceDayStyles.scrollContentTabletLandscape]} showsVerticalScrollIndicator={false}>
          <RaceDayModeToggle mode={dashboardMode} onChange={handleDashboardModeChange} />

          {dashboardMode === 'practice' ? (
            <RaceDayPracticeTrackCard
              raceDay={active}
              trackName={trackName}
              vehicleCount={vehicles.length}
              practiceDayLabel={selectedPracticeDayLabel}
              onSelectPracticeDay={() => setPracticeDayPickerOpen(true)}
              onRefreshPractice={refreshPracticeSummaries}
              refreshing={practiceRefreshing}
              liveEnabled={liveEnabled}
              liveMatched={liveIsActive}
              onToggleLive={toggleLiveFeed}
            >
              {liveIsActive ? <RaceDayLiveHeader liveState={liveRcState} embedded /> : null}
            </RaceDayPracticeTrackCard>
          ) : (
            <View style={raceDayStyles.trackCard}>
              <View style={raceDayStyles.trackCardHeader}>
                <View style={raceDayStyles.flex1}>
                  <Text style={raceDayStyles.trackCardEyebrow}>Live RaceDay</Text>
                  <Text style={raceDayStyles.cardTitle}>{trackName}</Text>
                  <Text style={raceDayStyles.trackEventStatusText} numberOfLines={1}>{eventStatusText}</Text>
                </View>

                <TouchableOpacity
                  style={[raceDayStyles.trackLiveBadge, (!liveEnabled || !liveIsActive) && raceDayStyles.trackLiveBadgeInactive]}
                  onPress={toggleLiveFeed}
                  activeOpacity={0.76}
                >
                  <View style={[raceDayStyles.trackLiveDot, (!liveEnabled || !liveIsActive) && raceDayStyles.trackLiveDotInactive]} />
                  <Text style={[raceDayStyles.trackLiveBadgeText, (!liveEnabled || !liveIsActive) && raceDayStyles.trackLiveBadgeTextInactive]}>
                    {liveBadgeLabel}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={raceDayStyles.trackNavigationRow}>
                <TouchableOpacity style={raceDayStyles.trackNavigationButton} onPress={() => setSyncOpen(true)} activeOpacity={0.82}>
                  <View style={raceDayStyles.trackEventIdentity}>
                    <Text style={raceDayStyles.trackNavigationLabel}>{hasLiveRcEvent ? 'SELECTED EVENT' : 'RACEDAY EVENT'}</Text>
                    <Text style={raceDayStyles.trackNavigationText} numberOfLines={1}>
                      {hasLiveRcEvent ? selectedEventTitleLabel : 'Choose LiveRC Event'}
                    </Text>
                    <Text style={raceDayStyles.trackNavigationMeta} numberOfLines={1}>
                      {hasLiveRcEvent ? selectedEventDateLabel || 'Date not listed' : 'No event is currently selected'}
                    </Text>
                  </View>
                  <View style={raceDayStyles.trackEventChangeAction}>
                    <Text style={raceDayStyles.trackEventChangeText}>{hasLiveRcEvent ? 'CHANGE' : 'SELECT'}</Text>
                    <Text style={raceDayStyles.trackNavigationArrow}>›</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[raceDayStyles.trackSyncButton, syncing && { opacity: 0.55 }]}
                  onPress={handleSyncPress}
                  disabled={syncing}
                  activeOpacity={0.82}
                >
                  {syncing ? <ActivityIndicator size="small" /> : (
                    <>
                      <Text style={raceDayStyles.trackNavigationLabel}>LIVERC</Text>
                      <Text style={raceDayStyles.trackSyncText}>{hasLiveRcEvent ? 'RE-SYNC' : 'SYNC'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {liveIsActive ? <RaceDayLiveHeader liveState={liveRcState} embedded /> : null}
            </View>
          )}

          {vehicles.length ? (
            <View style={isTabletLandscape ? raceDayStyles.vehicleGridTabletLandscape : null}>
              {dashboardMode === 'race' ? vehicles.map((vehicle) => {
                const id = normalizeId(vehicle.id || vehicle.vehicleId);
                return (
                  <View key={id} style={isTabletLandscape ? raceDayStyles.vehicleGridCellTabletLandscape : null}>
                    <RaceDayVehicleCard
                      vehicle={vehicle}
                      latestRun={latestRunsByVehicle.get(id)}
                      runsForVehicle={runsByVehicle.get(id)}
                      lineup={lineupsByVehicle.get(id) || null}
                      compareFields={compareFields}
                      onOpenResults={(run) => openResults(vehicle, run)}
                      onOpenSetup={() => openSetup(vehicle)}
                    />
                  </View>
                );
              }) : vehicles.map((vehicle) => {
                const id = normalizeId(vehicle.id || vehicle.vehicleId);
                return (
                  <View key={id} style={isTabletLandscape ? raceDayStyles.vehicleGridCellTabletLandscape : null}>
                    <RaceDayPracticeCard
                      vehicle={vehicle}
                      summary={practiceSummaries[id]}
                      onOpenSessions={() => openPracticeSessions(vehicle)}
                      onOpenSetup={() => openSetup(vehicle)}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={raceDayStyles.empty}>
              <Text style={raceDayStyles.emptyText}>No vehicles selected yet. Add vehicles to continue Race Day.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <RaceDayBottomActions
        docked
        tabletLandscape={isTabletLandscape}
        secondaryLabel="Notes"
        onSecondaryPress={() => setNotesOpen(true)}
        tertiaryLabel="Changes"
        onTertiaryPress={() => setChangesOpen(true)}
        primaryLabel="Add Vehicles"
        onPrimaryPress={() => router.push('/raceday/select-vehicles?add=1')}
      />

      <RaceDayPopup
        visible={resultsOpen}
        title="Race Results"
        subtitle={selectedVehicle ? `${getVehicleDisplayName(selectedVehicle)} • tap stats to choose dashboard blocks` : 'Tap stats to choose dashboard blocks'}
        onClose={() => setResultsOpen(false)}
        onDismiss={finishResultsDismissal}
      >
        <RaceDayResultCard
          run={selectedRun}
          compareFields={compareFields}
          onToggleCompareField={handleToggleCompareField}
          onOpenTop5={openTop5}
          onOpenRaceResults={openRaceResults}
        />
      </RaceDayPopup>

      <RaceDayTop5Popup visible={top5Open} run={selectedRun} onClose={() => setTop5Open(false)} />
      <RaceDayRaceResultsPopup visible={raceResultsOpen} run={selectedRun} onClose={() => setRaceResultsOpen(false)} />

      <RaceDayNotesPopup
        visible={notesOpen}
        raceDay={active}
        track={track}
        onClose={() => setNotesOpen(false)}
      />

      <RaceDayRecentChangesPopup
        visible={changesOpen}
        raceDay={active}
        vehicles={vehicles}
        onClose={() => setChangesOpen(false)}
      />

      <RaceDayPracticeSessionsPopup
        visible={practiceSessionsOpen}
        raceDay={active}
        vehicle={selectedPracticeVehicle}
        practiceDayKey={getPracticeDayKey(selectedPracticeDay)}
        practiceDayLabel={selectedPracticeDayLabel}
        onClose={() => setPracticeSessionsOpen(false)}
      />

      <RaceDayPracticeDayPickerPopup
        visible={practiceDayPickerOpen}
        raceDay={active}
        track={track}
        vehicles={vehicles}
        selectedDayKey={selectedPracticeDay}
        onSelectDay={handlePracticeDaySelected}
        onClose={() => setPracticeDayPickerOpen(false)}
        onDismiss={finishPracticeDayDismissal}
      />

      <RaceDaySyncPopup
        visible={syncOpen}
        raceDay={active}
        track={track}
        onClose={() => setSyncOpen(false)}
        onDismiss={() => syncDismissResolverRef.current?.()}
        onSyncSelected={handleSyncSelectedEvent}
      />

      <RaceDayAutoSyncOverlay visible={autoSyncing} progress={autoSyncProgress} onCancel={cancelAutoSync} />
      <NewLookBottomNav active="raceday" router={router} />
    </View>
  );
}
