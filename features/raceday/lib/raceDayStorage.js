import AsyncStorage from '@react-native-async-storage/async-storage';
import * as cloudSync from '../../../app/services/cloudSync';
import { archiveRaceDaySession } from './raceDayNotesStorage';
import {
  RACE_DAY_KEYS,
  RACE_DAY_CLEAR_KEYS,
  createRaceDay,
  mergeRaceDay,
  normalizeId,
  normalizeIdList,
  getTrackLiveRcUrl,
} from './raceDayModel';

const VEHICLES_KEY = '@vehicles';
const TRACKS_KEY = '@tracks';
const SETUPS_KEY = '@setups';

async function getJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[RaceDayStorage] Failed to read ${key}`, error);
    return fallback;
  }
}

async function setJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function markRaceDayCloudDirty(reason = 'raceday-state') {
  const markCloudDirty =
    cloudSync?.markCloudDirty ||
    cloudSync?.default?.markCloudDirty ||
    (typeof cloudSync?.default === 'function' ? cloudSync.default : null);

  if (typeof markCloudDirty !== 'function') {
    console.warn('[RaceDayStorage] cloudSync markCloudDirty was not found. RaceDay state changed locally only.');
    return;
  }

  try {
    await markCloudDirty({
      reason,
      keys: [
        RACE_DAY_KEYS.ACTIVE,
        RACE_DAY_KEYS.ACTIVE_FLAG,
        RACE_DAY_KEYS.STARTED,
        RACE_DAY_KEYS.READY,
        RACE_DAY_KEYS.ENDED,
      ],
    });
  } catch (firstError) {
    try {
      await markCloudDirty();
    } catch (secondError) {
      console.warn('[RaceDayStorage] Failed to mark cloud dirty', secondError || firstError);
    }
  }
}

function isTruthyStorageFlag(value) {
  return value === '1' || value === 'true' || value === true;
}

export function isUsableActiveRaceDay(raceDay) {
  return Boolean(
    raceDay &&
    typeof raceDay === 'object' &&
    normalizeId(raceDay.trackId) &&
    (normalizeId(raceDay.id) || normalizeId(raceDay.raceDayId) || raceDay.startedAt)
  );
}

export async function getRaceDayEndedFlag() {
  return isTruthyStorageFlag(await AsyncStorage.getItem(RACE_DAY_KEYS.ENDED));
}

export async function clearActiveRaceDayState({ markDirty = false } = {}) {
  await AsyncStorage.multiRemove(RACE_DAY_CLEAR_KEYS);
  if (markDirty) {
    await markRaceDayCloudDirty('raceday-active-cleared');
  }
}

export async function repairStaleRaceDayState() {
  const [active, endedRaw, activeFlagRaw, startedRaw, readyRaw] = await Promise.all([
    getActiveRaceDay(),
    AsyncStorage.getItem(RACE_DAY_KEYS.ENDED),
    AsyncStorage.getItem(RACE_DAY_KEYS.ACTIVE_FLAG),
    AsyncStorage.getItem(RACE_DAY_KEYS.STARTED),
    AsyncStorage.getItem(RACE_DAY_KEYS.READY),
  ]);

  const ended = isTruthyStorageFlag(endedRaw);
  const hasAnyActiveKey = Boolean(active || activeFlagRaw || startedRaw || readyRaw);

  if (ended && hasAnyActiveKey) {
    await clearActiveRaceDayState({ markDirty: true });
    return { repaired: true, reason: 'ended-flag-with-active-keys' };
  }

  if (!ended && hasAnyActiveKey && !isUsableActiveRaceDay(active)) {
    await clearActiveRaceDayState({ markDirty: true });
    return { repaired: true, reason: 'invalid-active-raceday' };
  }

  return { repaired: false, reason: '' };
}

export async function getRaceDayHomeState() {
  await repairStaleRaceDayState();

  const [active, endedRaw] = await Promise.all([
    getActiveRaceDay(),
    AsyncStorage.getItem(RACE_DAY_KEYS.ENDED),
  ]);

  const ended = isTruthyStorageFlag(endedRaw);
  const isActive = !ended && isUsableActiveRaceDay(active);

  return {
    active: isActive ? active : null,
    raceDay: isActive ? active : null,
    activeRaceDay: isActive ? active : null,
    isActive,
    hasActiveRaceDay: isActive,
    continueRaceDay: isActive,
    raceDayStarted: isActive,
    raceDayReady: isActive,
    ended,
    route: isActive ? '/raceday/dashboard' : '/raceday/select-track',
    raceDayRoute: isActive ? '/raceday/dashboard' : '/raceday/select-track',
    label: isActive ? 'Cont. Race Day' : 'Start Race Day',
    buttonLabel: isActive ? 'Cont. Race Day' : 'Start Race Day',
    raceDayButtonLabel: isActive ? 'Cont. Race Day' : 'Start Race Day',
  };
}

export async function getTracks() {
  const tracks = await getJson(TRACKS_KEY, []);
  return Array.isArray(tracks) ? tracks : [];
}

export async function saveTracks(tracks) {
  await setJson(TRACKS_KEY, Array.isArray(tracks) ? tracks : []);
}

export async function getVehicles() {
  const vehicles = await getJson(VEHICLES_KEY, []);
  return Array.isArray(vehicles) ? vehicles : [];
}

export async function getSetups() {
  const setups = await getJson(SETUPS_KEY, []);
  return Array.isArray(setups) ? setups : [];
}

export async function getTrackById(trackId) {
  const id = normalizeId(trackId);
  const tracks = await getTracks();
  return tracks.find((track) => normalizeId(track.id) === id || normalizeId(track.trackId) === id) || null;
}

export async function getVehiclesByIds(vehicleIds = []) {
  const ids = new Set(normalizeIdList(vehicleIds));
  const vehicles = await getVehicles();
  return vehicles.filter((vehicle) => ids.has(normalizeId(vehicle.id || vehicle.vehicleId)));
}

export async function saveTrackLiveRcUrl(trackId, liveRcUrl) {
  const id = normalizeId(trackId);
  const tracks = await getTracks();
  const nextTracks = tracks.map((track) => {
    const thisId = normalizeId(track.id || track.trackId);
    if (thisId !== id) return track;
    return {
      ...track,
      liveRcUrl,
      updatedAt: new Date().toISOString(),
      dirty: true,
    };
  });
  await saveTracks(nextTracks);
  return nextTracks.find((track) => normalizeId(track.id || track.trackId) === id) || null;
}

export async function getActiveRaceDay() {
  return getJson(RACE_DAY_KEYS.ACTIVE, null);
}

export async function setActiveRaceDay(raceDay) {
  const next = {
    ...(raceDay || {}),
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(next);
  await AsyncStorage.multiSet([
    [RACE_DAY_KEYS.ACTIVE, serialized],
    [RACE_DAY_KEYS.ACTIVE_FLAG, serialized],
  ]);
  await AsyncStorage.multiRemove([RACE_DAY_KEYS.ENDED]);
  await AsyncStorage.setItem(RACE_DAY_KEYS.STARTED, '1');
  if (next.trackId && normalizeIdList(next.vehicleIds).length > 0) {
    await AsyncStorage.setItem(RACE_DAY_KEYS.READY, '1');
  } else {
    await AsyncStorage.removeItem(RACE_DAY_KEYS.READY);
  }
  await markRaceDayCloudDirty('raceday-active-updated');
  return next;
}

export async function startRaceDayWithTrack(trackId) {
  const active = createRaceDay({ trackId });
  await setActiveRaceDay(active);
  await AsyncStorage.removeItem(RACE_DAY_KEYS.READY);
  await AsyncStorage.setItem('@raceDay_trackId', normalizeId(trackId));
  return active;
}

export async function setRaceDayVehicles(vehicleIds = []) {
  const active = (await getActiveRaceDay()) || {};
  const next = mergeRaceDay(active, { vehicleIds: normalizeIdList(vehicleIds) });
  await setActiveRaceDay(next);
  await AsyncStorage.setItem('@raceDay_vehicleIds', JSON.stringify(next.vehicleIds));
  return next;
}

export async function addRaceDayVehicles(vehicleIds = []) {
  const active = (await getActiveRaceDay()) || {};
  const merged = normalizeIdList([...(active.vehicleIds || []), ...vehicleIds]);
  return setRaceDayVehicles(merged);
}

export async function saveRaceDayEvent({ eventUrl, siteUrl, eventTitle, eventDateLabel }) {
  const active = (await getActiveRaceDay()) || {};
  const nextEventUrl = eventUrl || active.eventUrl || null;
  const title = eventTitle || active.eventTitle || active.eventName || active.selectedEventTitle || active.liveRcEventTitle || active.event?.title || active.selectedEvent?.title || null;
  const dateLabel = eventDateLabel || active.eventDateLabel || active.eventDate || active.selectedEventDateLabel || active.liveRcEventDateLabel || active.event?.dateLabel || active.selectedEvent?.dateLabel || null;
  const next = mergeRaceDay(active, {
    eventUrl: nextEventUrl,
    // An event URL carries the same LiveRC host and is enough to locate /live/.
    // Persist it as the fallback so future dashboard loads always show status.
    siteUrl: siteUrl || active.siteUrl || nextEventUrl,
    eventTitle: title,
    eventName: title,
    selectedEventTitle: title,
    liveRcEventTitle: title,
    eventDateLabel: dateLabel,
    eventDate: dateLabel,
    selectedEventDateLabel: dateLabel,
    liveRcEventDateLabel: dateLabel,
  });
  await setActiveRaceDay(next);
  return next;
}

export async function endRaceDay() {
  const active = await getActiveRaceDay();
  if (active?.id || active?.raceDayId) {
    try {
      await archiveRaceDaySession(active);
    } catch (error) {
      console.warn('[RaceDayStorage] Failed to archive RaceDay session before ending', error);
    }
  }

  await AsyncStorage.multiRemove(RACE_DAY_CLEAR_KEYS);
  await AsyncStorage.setItem(RACE_DAY_KEYS.ENDED, '1');
  await markRaceDayCloudDirty('raceday-ended');
}

export async function hydrateActiveRaceDay() {
  const ended = await getRaceDayEndedFlag();
  const active = await getActiveRaceDay();

  if (ended && active) {
    await clearActiveRaceDayState({ markDirty: true });
    return { active: null, track: null, vehicles: [] };
  }

  if (!isUsableActiveRaceDay(active)) {
    if (active) await clearActiveRaceDayState({ markDirty: true });
    return { active: null, track: null, vehicles: [] };
  }

  const [track, vehicles] = await Promise.all([
    getTrackById(active.trackId),
    getVehiclesByIds(active.vehicleIds || []),
  ]);
  return { active, track, vehicles };
}

export async function getActiveLiveRcUrl() {
  const { active, track } = await hydrateActiveRaceDay();
  return {
    active,
    track,
    liveRcUrl: active?.siteUrl || getTrackLiveRcUrl(track || ''),
  };
}
