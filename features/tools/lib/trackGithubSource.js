// features/tools/lib/trackGithubSource.js
// Loads the IMRC GitHub Tracks folder for Track Near Me.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const IMRC_GITHUB_TRACKS_API_URL =
  'https://api.github.com/repos/shopimrc/IMRCSetupManger/contents/Tracks?ref=main';

const GITHUB_TRACK_CACHE_KEY = '@toolsGithubTracksCache_v1';
const MAX_GITHUB_FILES = 500;
const FETCH_TIMEOUT_MS = 10000;
const FILE_BATCH_SIZE = 6;

function arrayFromPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.tracks)) return payload.tracks;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (typeof payload === 'object') return [payload];
  return [];
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function isTrackJsonFile(item) {
  const name = String(item?.name || item?.path || '').toLowerCase();
  return item?.type === 'file' && name.endsWith('.json') && item.download_url;
}

async function readCache() {
  try {
    const raw = await AsyncStorage.getItem(GITHUB_TRACK_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

async function writeCache(tracks) {
  try {
    await AsyncStorage.setItem(GITHUB_TRACK_CACHE_KEY, JSON.stringify(tracks));
  } catch (error) {
    // Cache failure should never break the tool.
  }
}

function withGithubMeta(track, item = {}) {
  return {
    ...track,
    source: track.source || 'github',
    githubPath: track.githubPath || item.path || item.name || '',
    githubFile: track.githubFile || item.name || '',
  };
}

async function fetchJson(url, options = {}) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), FETCH_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(url, {
      ...options,
      signal: controller?.signal,
      headers: {
        Accept: 'application/vnd.github+json, application/json, text/plain',
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`GitHub request failed ${response.status}`);
  }

  const text = await response.text();
  return safeJsonParse(text);
}

async function fetchTrackFile(item) {
  const payload = await fetchJson(item.download_url, {
    headers: { Accept: 'application/json, text/plain' },
  });
  return arrayFromPayload(payload).map((track) => withGithubMeta(track, item));
}

export async function loadTracksFromGithub(onProgress) {
  try {
    onProgress?.('Reading GitHub Tracks folder...');
    const listing = await fetchJson(IMRC_GITHUB_TRACKS_API_URL);

    // Supports either the GitHub contents API response or a raw JSON array.
    if (!Array.isArray(listing) || !listing.some((item) => item?.download_url || item?.type)) {
      const directTracks = arrayFromPayload(listing).map((track) => withGithubMeta(track, { name: 'tracks.json' }));
      if (directTracks.length) await writeCache(directTracks);
      return directTracks;
    }

    const files = listing.filter(isTrackJsonFile).slice(0, MAX_GITHUB_FILES);
    const tracks = [];

    for (let start = 0; start < files.length; start += FILE_BATCH_SIZE) {
      const batch = files.slice(start, start + FILE_BATCH_SIZE);
      onProgress?.(`Loading GitHub tracks ${Math.min(start + batch.length, files.length)}/${files.length}`);
      const results = await Promise.all(batch.map(async (item) => {
        try {
          return await fetchTrackFile(item);
        } catch (error) {
          return [];
        }
      }));
      results.forEach((parsed) => tracks.push(...parsed));
    }

    if (tracks.length) {
      await writeCache(tracks);
      return tracks;
    }

    const cached = await readCache();
    return Array.isArray(cached) ? cached : [];
  } catch (error) {
    const cached = await readCache();
    if (Array.isArray(cached) && cached.length) {
      onProgress?.(`GitHub unavailable. Using ${cached.length} cached GitHub tracks.`);
      return cached;
    }

    onProgress?.(`GitHub unavailable: ${error?.message || 'unknown error'}`);
    return [];
  }
}
