import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeId } from './raceDayModel';

const KEY_PREFIX = '@raceDayEventVehicleLinks_v1_';

function storageKey(raceDayOrId) {
  const id = typeof raceDayOrId === 'object'
    ? raceDayOrId?.id || raceDayOrId?.raceDayId
    : raceDayOrId;
  return `${KEY_PREFIX}${normalizeId(id)}`;
}

function eventKey(eventUrl = '') {
  return String(eventUrl || '').trim().toLowerCase();
}

async function readLinks(raceDayOrId) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(raceDayOrId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[RaceDayEventVehicleLinks] Failed to read links', error);
    return [];
  }
}

export async function getRaceDayEventVehicleLink(raceDayOrId, eventUrl, vehicleId) {
  const wantedEvent = eventKey(eventUrl);
  const wantedVehicle = normalizeId(vehicleId);
  if (!wantedEvent || !wantedVehicle) return null;
  const links = await readLinks(raceDayOrId);
  return links.find((link) => eventKey(link.eventUrl) === wantedEvent && normalizeId(link.vehicleId) === wantedVehicle) || null;
}

export async function saveRaceDayEventVehicleLink(raceDayOrId, eventUrl, vehicleId, selection = {}) {
  const wantedEvent = eventKey(eventUrl);
  const wantedVehicle = normalizeId(vehicleId);
  if (!wantedEvent || !wantedVehicle || !selection?.className) return null;

  const links = await readLinks(raceDayOrId);
  const nextLink = {
    eventUrl: String(eventUrl || '').trim(),
    vehicleId: String(vehicleId || '').trim(),
    className: String(selection.className || '').trim(),
    driverName: String(selection.driverName || selection.displayName || '').trim(),
    fullName: String(selection.fullName || '').trim(),
    nickname: String(selection.nickname || '').trim(),
    transponder: String(selection.transponder || '').trim(),
    linkedAt: new Date().toISOString(),
  };
  const filtered = links.filter((link) => !(eventKey(link.eventUrl) === wantedEvent && normalizeId(link.vehicleId) === wantedVehicle));
  await AsyncStorage.setItem(storageKey(raceDayOrId), JSON.stringify([...filtered, nextLink]));
  return nextLink;
}

export async function saveRaceDayEventVehicleDriverName(raceDayOrId, eventUrl, vehicleId, driverName = '') {
  const wantedEvent = eventKey(eventUrl);
  const wantedVehicle = normalizeId(vehicleId);
  const cleanName = String(driverName || '').replace(/\s+/g, ' ').trim();
  if (!wantedEvent || !wantedVehicle || !cleanName) return null;

  const links = await readLinks(raceDayOrId);
  const existing = links.find((link) => eventKey(link.eventUrl) === wantedEvent && normalizeId(link.vehicleId) === wantedVehicle) || {};
  const nextLink = {
    ...existing,
    eventUrl: String(eventUrl || '').trim(),
    vehicleId: String(vehicleId || '').trim(),
    className: '',
    driverName: cleanName,
    fullName: cleanName,
    nickname: cleanName,
    linkedAt: new Date().toISOString(),
  };
  const filtered = links.filter((link) => !(eventKey(link.eventUrl) === wantedEvent && normalizeId(link.vehicleId) === wantedVehicle));
  await AsyncStorage.setItem(storageKey(raceDayOrId), JSON.stringify([...filtered, nextLink]));
  return nextLink;
}

export async function clearRaceDayEventVehicleLinks(raceDayOrId) {
  await AsyncStorage.removeItem(storageKey(raceDayOrId));
}
