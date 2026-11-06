// features/tracks/storage/trackStorage.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeLiveRcOrigin } from '../../../src/utils/liveRcUrl';

export const TRACKS_STORAGE_KEY = '@tracks';

const nowIso = () => new Date().toISOString();

function clean(value) {
  return String(value || '').trim();
}

function cleanUpper(value) {
  return clean(value).toUpperCase();
}

function parseCityState(cityState = '') {
  const value = clean(cityState);

  if (!value) {
    return { city: '', state: '' };
  }

  const parts = value.split(',').map(part => clean(part));

  if (parts.length >= 2) {
    return {
      city: parts[0],
      state: cleanUpper(parts[1]),
    };
  }

  return {
    city: value,
    state: '',
  };
}

export function generateTrackId() {
  return `track_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function buildTrackLocation(track = {}) {
  const address = clean(track.address || track.streetAddress);
  const city = clean(track.city);
  const state = cleanUpper(track.state);
  const zipCode = clean(track.zipCode || track.zip || track.postalCode);

  const cityState = [city, state].filter(Boolean).join(', ');
  const cityStateZip = [cityState, zipCode].filter(Boolean).join(' ');
  const splitLocation = [address, cityStateZip].filter(Boolean).join(' • ');

  return splitLocation || clean(track.location);
}

export function normalizeTrack(track = {}) {
  const createdAt = track.createdAt || nowIso();
  const parsedCityState = parseCityState(track.cityState);

  const city = clean(track.city) || parsedCityState.city;
  const state = cleanUpper(track.state) || parsedCityState.state;

  const normalized = {
    id: track.id || generateTrackId(),

    schemaVersion: Number(track.schemaVersion || track.imrcTrackExportVersion || 1),

    trackName: clean(track.trackName || track.name),
    trackType: clean(track.trackType || track.type),

    address: clean(track.address || track.streetAddress || track.street || track.locationAddress),
    city,
    state,
    cityState: clean(track.cityState) || [city, state].filter(Boolean).join(', '),
    zipCode: clean(track.zipCode || track.zip || track.postalCode),

    liveRcUrl: normalizeLiveRcOrigin(
      track.liveRcUrl ||
        track.livercUrl ||
        track.liveRCUrl ||
        track.liveRc ||
        track.liverc
    ),
    phone: clean(track.phone),

    direction: clean(track.direction),
    surface: clean(track.surface),
    tractionLevel: clean(track.tractionLevel),
    runLine: clean(track.runLine),
    trackDimensions: clean(track.trackDimensions),

    location: clean(track.location),
    notes: clean(track.notes),

    createdAt,
    updatedAt: track.updatedAt || createdAt,
  };

  return {
    ...normalized,
    locationDisplay: buildTrackLocation(normalized),
  };
}

export function validateTrack(track = {}) {
  const errors = {};

  if (!clean(track.trackName)) {
    errors.trackName = 'Track Name is required.';
  }

  if (!clean(track.trackType)) {
    errors.trackType = 'Track Type is required.';
  }

  const liveRcUrl = clean(track.liveRcUrl || track.livercUrl || track.liveRCUrl || track.liveRc || track.liverc);
  if (liveRcUrl && !normalizeLiveRcOrigin(liveRcUrl)) {
    errors.liveRcUrl = 'Enter a LiveRC address ending in liverc.com.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export async function getTracks() {
  try {
    const raw = await AsyncStorage.getItem(TRACKS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeTrack)
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  } catch (error) {
    console.warn('Failed to load tracks:', error);
    return [];
  }
}

export async function saveTracks(tracks = []) {
  const normalized = Array.isArray(tracks) ? tracks.map(normalizeTrack) : [];
  await AsyncStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function getTrackById(trackId) {
  if (!trackId) return null;
  const tracks = await getTracks();
  return tracks.find(track => String(track.id) === String(trackId)) || null;
}

export async function upsertTrack(track = {}) {
  const { isValid, errors } = validateTrack(track);

  if (!isValid) {
    const error = new Error('Track validation failed.');
    error.validationErrors = errors;
    throw error;
  }

  const tracks = await getTracks();
  const incomingId = track.id || generateTrackId();
  const existingIndex = tracks.findIndex(item => String(item.id) === String(incomingId));

  const existing = existingIndex >= 0 ? tracks[existingIndex] : {};
  const normalized = normalizeTrack({
    ...existing,
    ...track,
    id: incomingId,
    createdAt: existing.createdAt || track.createdAt || nowIso(),
    updatedAt: nowIso(),
  });

  let nextTracks;

  if (existingIndex >= 0) {
    nextTracks = [...tracks];
    nextTracks[existingIndex] = normalized;
  } else {
    nextTracks = [normalized, ...tracks];
  }

  await saveTracks(nextTracks);
  return normalized;
}

export async function importTrack(track = {}) {
  const normalized = normalizeTrack({
    ...track,
    id: track.id || generateTrackId(),
    createdAt: track.createdAt || nowIso(),
    updatedAt: nowIso(),
  });

  return upsertTrack(normalized);
}

export async function deleteTrack(trackId) {
  if (!trackId) return false;

  const tracks = await getTracks();
  const nextTracks = tracks.filter(track => String(track.id) !== String(trackId));

  await saveTracks(nextTracks);
  return nextTracks.length !== tracks.length;
}
