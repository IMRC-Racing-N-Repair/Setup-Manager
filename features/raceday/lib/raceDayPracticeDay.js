import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPracticeSummariesForVehicles } from './raceDayPracticeStorage';
import { formatPracticeDateLabel as formatLiveRcPracticeDateLabel, getPracticeDateKeyFromText } from './liverc/liveRcPracticeDayFinder';

const SELECTED_DAY_PREFIX = '@raceDayPracticeSelectedDay_';

function keySafe(value) {
  return String(value || 'active').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function selectedDayKey(raceDayId) {
  return `${SELECTED_DAY_PREFIX}${keySafe(raceDayId)}`;
}

export function getTodayPracticeDayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getPracticeDayKey(day = '') {
  if (typeof day === 'string') return getPracticeDateKeyFromText(day) || day;
  return day?.key || day?.dateKey || getPracticeDateKeyFromText(day?.dateLabel || day?.label || day?.practiceUrl || '') || '';
}

export function formatPracticeDayLabel(day = '') {
  if (typeof day === 'object' && day) return day.label || day.dateLabel || formatLiveRcPracticeDateLabel(day.key || day.dateKey || '');
  return formatLiveRcPracticeDateLabel(day);
}

export function normalizePracticeDay(day = {}, fallback = {}) {
  const source = typeof day === 'string' ? { key: day } : { ...(day || {}) };
  const key = getPracticeDayKey(source) || getTodayPracticeDayKey();
  const label = source.label || source.dateLabel || formatLiveRcPracticeDateLabel(key);
  return {
    ...source,
    ...fallback,
    key,
    dateKey: source.dateKey || key,
    label,
    dateLabel: source.dateLabel || label,
  };
}

export async function saveRaceDaySelectedPracticeDay(raceDayId, day) {
  const id = keySafe(raceDayId);
  if (!id) return null;
  const next = normalizePracticeDay(day);
  await AsyncStorage.setItem(selectedDayKey(id), JSON.stringify(next));
  return next;
}

export async function getRaceDaySelectedPracticeDay(raceDayId) {
  const id = keySafe(raceDayId);
  if (!id) return null;
  const raw = await AsyncStorage.getItem(selectedDayKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizePracticeDay(parsed);
  } catch (error) {
    return normalizePracticeDay(raw);
  }
}

export async function getPracticeSummariesForVehiclesByDay(raceDayId, vehicles = [], day = '') {
  const dayKey = getPracticeDayKey(day);
  return getPracticeSummariesForVehicles(raceDayId, vehicles, dayKey);
}

export async function getPracticeDayOptions(raceDayId, vehicles = [], raceDay = {}) {
  const selected = await getRaceDaySelectedPracticeDay(raceDayId);
  const today = normalizePracticeDay({ key: getTodayPracticeDayKey(), source: 'local' });
  const options = [];
  if (selected) options.push({ ...selected, source: selected.source || 'local' });
  if (!selected || selected.key !== today.key) options.push(today);
  return options;
}
