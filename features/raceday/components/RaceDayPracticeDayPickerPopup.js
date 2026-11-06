import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RaceDayPopup from './RaceDayPopup';
import { getPracticeDayOptions, getTodayPracticeDayKey } from '../lib/raceDayPracticeDay';
import { getTrackLiveRcUrl } from '../lib/raceDayModel';
import { saveTrackLiveRcUrl } from '../lib/raceDayStorage';
import { findPracticeDays } from '../lib/liverc/liveRcPracticeDayFinder';
import { getPracticeMonthCalendarUrl, getPracticeUrl, normalizeLiveRcPracticeSiteUrl } from '../lib/liverc/liveRcPracticeUrls';
import { raceDayColors, raceDayStyles } from '../styles/raceDayStyles';

const PRACTICE_DATES_PER_PAGE = 5;
const EMPTY_VEHICLES = Object.freeze([]);

function getPracticeKey(day) {
  if (!day) return '';
  if (typeof day === 'string') return day;
  return day.key || day.dateKey || day.practiceUrl || day.dateLabel || day.label || day.id || '';
}

function normalizeSelectedDayInput(day) {
  if (!day) return null;
  if (typeof day === 'string') return { key: day, label: day, dateLabel: day, source: 'saved' };
  return day;
}

function getSelectedPracticeDay(days = [], selectedDayKey = '') {
  const selectedInput = normalizeSelectedDayInput(selectedDayKey);
  const key = getPracticeKey(selectedInput || selectedDayKey);
  if (!key) return null;
  return days.find((day) => getPracticeKey(day) === key) || selectedInput || null;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getLastSixPracticeMonths(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
    const label = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return { key, label };
  });
}

function PracticeDayRow({ day, number, selected, onPress }) {
  const hasPractice = (day.sessionCount || 0) > 0;
  const detail = day.source === 'local' ? 'Local Practice' : 'LiveRC Practice';
  const runText = hasPractice ? ` • ${day.sessionCount} run${day.sessionCount === 1 ? '' : 's'}` : '';

  return (
    <TouchableOpacity style={[raceDayStyles.eventCard, selected && raceDayStyles.selectedEventCard]} onPress={() => onPress?.(day)} activeOpacity={0.86}>
      <View style={raceDayStyles.cardAccent} />
      <View style={raceDayStyles.eventCardNumber}>
        <Text style={raceDayStyles.eventCardNumberText}>{String(number).padStart(2, '0')}</Text>
      </View>
      <View style={raceDayStyles.eventCardIdentity}>
        <Text style={raceDayStyles.eventTitle} numberOfLines={1}>{day.label || day.dateLabel || 'Practice Date'}</Text>
        <Text style={raceDayStyles.eventDate} numberOfLines={1}>{detail}{runText}</Text>
      </View>
      <View style={[raceDayStyles.eventSelectMark, selected && raceDayStyles.eventSelectMarkActive]}>
        <Text style={[raceDayStyles.eventSelectMarkText, selected && raceDayStyles.eventSelectMarkTextActive]}>{selected ? '✓' : '›'}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RaceDayPracticeDayPickerPopup({ visible, raceDay, track, vehicles = EMPTY_VEHICLES, selectedDayKey, onSelectDay, onClose, onDismiss }) {
  const initialUrl = useMemo(() => {
    const sourceUrl = raceDay?.practiceSiteUrl || raceDay?.siteUrl || getTrackLiveRcUrl(track || {}) || '';
    return getPracticeUrl(sourceUrl) || sourceUrl;
  }, [raceDay, track]);
  const selectedInput = useMemo(() => normalizeSelectedDayInput(selectedDayKey), [selectedDayKey]);
  const monthOptions = useMemo(() => getLastSixPracticeMonths(), []);
  const initialMonthKey = selectedInput?.key && /^20\d{2}-\d{2}-\d{2}$/.test(selectedInput.key)
    ? selectedInput.key.slice(0, 7)
    : monthOptions[0]?.key || '';

  const [siteUrl, setSiteUrl] = useState(initialUrl);
  const [days, setDays] = useState(selectedInput ? [selectedInput] : []);
  const [selectedKey, setSelectedKey] = useState(getPracticeKey(selectedInput || selectedDayKey) || '');
  const [selectedMonthKey, setSelectedMonthKey] = useState(initialMonthKey);
  const [practicePage, setPracticePage] = useState(0);
  const [monthOpen, setMonthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [message, setMessage] = useState('');
  const searchRequestRef = useRef(0);
  const lastSearchKeyRef = useRef('');
  const raceDayId = raceDay?.id || raceDay?.raceDayId;

  const loadLocalFallback = useCallback(async () => {
    if (!raceDayId) return [];
    try {
      const localDays = await getPracticeDayOptions(raceDayId, vehicles, raceDay);
      return (localDays || []).map((day) => ({ ...day, source: day.source || 'local' }));
    } catch (error) {
      console.warn('[RaceDayPracticeDayPickerPopup] Failed to load local practice days', error);
      const today = getTodayPracticeDayKey();
      return [{ key: today, label: today, isToday: true, sessionCount: 0, totalLaps: 0, source: 'local' }];
    }
  }, [raceDayId, vehicles, raceDay]);

  const loadPracticeDays = useCallback(async (sourceUrl, monthKey, preferredKey = '') => {
    const normalized = normalizeLiveRcPracticeSiteUrl(sourceUrl);
    const searchKey = `${normalized}|${monthKey}`;
    const requestId = ++searchRequestRef.current;
    lastSearchKeyRef.current = searchKey;

    if (!normalized) {
      setDays([]);
      setLoading(false);
      setMessage('Enter a LiveRC site ending in liverc.com. Practice dates will load automatically.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      if (track?.id || track?.trackId) await saveTrackLiveRcUrl(track.id || track.trackId, normalized);
      const found = await findPracticeDays(normalized, { limit: 30, monthKey });
      const local = await loadLocalFallback();
      if (requestId !== searchRequestRef.current) return;

      const merged = [...found, ...local.filter((localDay) => !found.some((day) => getPracticeKey(day) === getPracticeKey(localDay)))]
        .filter((day) => Boolean(day && getPracticeKey(day)));
      setSiteUrl(getPracticeUrl(normalized) || normalized);
      setDays(merged);

      const nextSelection = getSelectedPracticeDay(merged, preferredKey) || merged[0] || null;
      setSelectedKey(getPracticeKey(nextSelection));
      const currentIndex = nextSelection ? merged.findIndex((day) => getPracticeKey(day) === getPracticeKey(nextSelection)) : -1;
      setPracticePage(currentIndex >= 0 ? Math.floor(currentIndex / PRACTICE_DATES_PER_PAGE) : 0);
      setMessage(found.length ? '' : 'No LiveRC practice dates were found for this month. Local practice dates are shown if available.');
    } catch (error) {
      if (requestId !== searchRequestRef.current) return;
      const local = await loadLocalFallback();
      const usableLocal = (local || []).filter((day) => Boolean(day && getPracticeKey(day)));
      setDays(usableLocal);
      setSelectedKey(getPracticeKey(getSelectedPracticeDay(usableLocal, preferredKey) || usableLocal[0]));
      setPracticePage(0);
      setMessage(error?.message || 'Could not connect to LiveRC practice. Local practice dates are shown if available.');
    } finally {
      if (requestId === searchRequestRef.current) setLoading(false);
    }
  }, [track, loadLocalFallback]);

  useEffect(() => {
    if (!visible) return;
    const preferredKey = getPracticeKey(selectedInput || selectedDayKey) || '';
    setSiteUrl(initialUrl);
    setSelectedKey(preferredKey);
    setDays(selectedInput ? [selectedInput] : []);
    setSelectedMonthKey(initialMonthKey);
    setPracticePage(0);
    setMonthOpen(false);
    setMessage('');
    setSelecting(false);
    lastSearchKeyRef.current = '';
    loadPracticeDays(initialUrl, initialMonthKey, preferredKey);
  }, [visible, initialUrl, initialMonthKey, selectedDayKey, selectedInput, loadPracticeDays]);

  useEffect(() => {
    if (!visible) return undefined;
    const normalized = normalizeLiveRcPracticeSiteUrl(siteUrl);
    const searchKey = `${normalized}|${selectedMonthKey}`;
    if (!normalized || searchKey === lastSearchKeyRef.current) return undefined;
    const timer = setTimeout(() => loadPracticeDays(siteUrl, selectedMonthKey, selectedKey || selectedDayKey), 650);
    return () => clearTimeout(timer);
  }, [visible, siteUrl, selectedMonthKey, selectedKey, selectedDayKey, loadPracticeDays]);

  async function handleSelectPracticeDay() {
    const selected = getSelectedPracticeDay(days, selectedKey);
    const selectedMonth = monthOptions.find((month) => month.key === selectedMonthKey) || monthOptions[0];
    if (!selected) {
      setMessage('Select a practice date first.');
      return;
    }
    setSelecting(true);
    try {
      onSelectDay?.({ ...selected, key: getPracticeKey(selected), siteUrl: normalizeLiveRcPracticeSiteUrl(siteUrl), monthKey: selectedMonth?.key || selectedMonthKey });
    } finally {
      setSelecting(false);
    }
  }

  const selected = getSelectedPracticeDay(days, selectedKey);
  const selectedMonth = monthOptions.find((month) => month.key === selectedMonthKey) || monthOptions[0];
  const practicePageCount = Math.max(1, Math.ceil(days.length / PRACTICE_DATES_PER_PAGE));
  const safePracticePage = Math.min(practicePage, practicePageCount - 1);
  const visibleDays = days.slice(safePracticePage * PRACTICE_DATES_PER_PAGE, (safePracticePage + 1) * PRACTICE_DATES_PER_PAGE);

  return (
    <RaceDayPopup visible={visible} title="Choose Practice Date" subtitle="Practice dates load automatically from this track." onClose={onClose} onDismiss={onDismiss} centered keyboardAware contentContainerStyle={raceDayStyles.syncPickerContent}>
      <View style={raceDayStyles.syncPickerStaticTop}>
        <View style={raceDayStyles.eventPickerHeadingRow}>
          <View>
            <Text style={raceDayStyles.statLabel}>TRACK LIVERC SITE</Text>
            <Text style={raceDayStyles.eventPickerSectionTitle}>Practice source</Text>
          </View>
          <View style={[raceDayStyles.eventSearchStatus, loading && raceDayStyles.eventSearchStatusActive]}>
            {loading ? <ActivityIndicator size="small" color={raceDayColors.accent} /> : <View style={raceDayStyles.eventSearchStatusDot} />}
            <Text style={raceDayStyles.eventSearchStatusText} numberOfLines={1}>{loading ? 'SEARCHING' : 'READY'}</Text>
          </View>
        </View>

        <TextInput value={siteUrl} onChangeText={setSiteUrl} placeholder="shopimrc.liverc.com" placeholderTextColor={raceDayColors.faint} autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="done" onSubmitEditing={() => loadPracticeDays(siteUrl, selectedMonthKey, selectedKey || selectedDayKey)} style={raceDayStyles.eventPickerInput} />
        <Text style={raceDayStyles.eventPickerUrlHint} numberOfLines={1}>
          {loading ? 'Checking practice dates…' : getPracticeMonthCalendarUrl(siteUrl, selectedMonthKey) || 'Enter your track’s LiveRC address'}
        </Text>

        <View style={styles.monthWrap}>
          <Text style={raceDayStyles.statLabel}>PRACTICE MONTH</Text>
          <TouchableOpacity style={styles.monthButton} onPress={() => setMonthOpen((open) => !open)} activeOpacity={0.84}>
            <Text style={styles.monthButtonText} numberOfLines={1}>{selectedMonth?.label || 'Select Month'}</Text>
            <Text style={styles.monthChevron}>{monthOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {monthOpen ? (
            <View style={styles.monthMenu}>
              {monthOptions.map((month) => (
                <TouchableOpacity key={month.key} style={[styles.monthOption, selectedMonthKey === month.key && styles.monthOptionSelected]} onPress={() => {
                  setSelectedMonthKey(month.key);
                  setMonthOpen(false);
                  setDays([]);
                  setSelectedKey('');
                  setPracticePage(0);
                  setMessage('');
                }} activeOpacity={0.82}>
                  <Text style={[styles.monthOptionText, selectedMonthKey === month.key && styles.monthOptionTextSelected]}>{month.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        <View style={raceDayStyles.eventResultsHeader}>
          <View>
            <Text style={raceDayStyles.statLabel}>PRACTICE DATES</Text>
            <Text style={raceDayStyles.eventPickerSectionTitle}>Select practice date</Text>
          </View>
          <Text style={raceDayStyles.eventCountText}>{loading ? 'LOADING' : `${days.length} FOUND`}</Text>
        </View>
      </View>

      <View style={raceDayStyles.eventPickerOnlyScrollContent}>
        {loading && !days.length ? (
          <View style={raceDayStyles.eventPickerEmptyBox}>
            <ActivityIndicator color={raceDayColors.accent} />
            <Text style={raceDayStyles.eventPickerEmptyTitle}>Loading practice dates</Text>
            <Text style={raceDayStyles.eventPickerEmptyText}>Checking this track’s LiveRC practice calendar…</Text>
          </View>
        ) : days.length ? visibleDays.map((day, index) => (
          <PracticeDayRow key={getPracticeKey(day)} day={day} number={(safePracticePage * PRACTICE_DATES_PER_PAGE) + index + 1} selected={selectedKey === getPracticeKey(day)} onPress={(nextDay) => setSelectedKey(getPracticeKey(nextDay))} />
        )) : (
          <View style={raceDayStyles.eventPickerEmptyBox}>
            <Text style={raceDayStyles.eventPickerEmptyTitle}>No practice dates found</Text>
            <Text style={raceDayStyles.eventPickerEmptyText}>Check the LiveRC address or choose another month. The search runs automatically.</Text>
          </View>
        )}
      </View>

      {days.length > PRACTICE_DATES_PER_PAGE ? (
        <View style={raceDayStyles.eventPaginationRow}>
          <TouchableOpacity style={[raceDayStyles.eventPageButton, safePracticePage === 0 && raceDayStyles.eventPageButtonDisabled]} onPress={() => setPracticePage((page) => Math.max(0, page - 1))} disabled={safePracticePage === 0} activeOpacity={0.82}>
            <Text style={raceDayStyles.eventPageButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={raceDayStyles.eventPageLabel}>Page {safePracticePage + 1} of {practicePageCount}</Text>
          <TouchableOpacity style={[raceDayStyles.eventPageButton, safePracticePage >= practicePageCount - 1 && raceDayStyles.eventPageButtonDisabled]} onPress={() => setPracticePage((page) => Math.min(practicePageCount - 1, page + 1))} disabled={safePracticePage >= practicePageCount - 1} activeOpacity={0.82}>
            <Text style={raceDayStyles.eventPageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={raceDayStyles.syncPickerStaticBottom}>
        {selected ? (
          <View style={raceDayStyles.selectedEventSummaryCompact}>
            <View style={raceDayStyles.selectedEventSummaryIcon}><Text style={raceDayStyles.selectedEventSummaryIconText}>✓</Text></View>
            <View style={raceDayStyles.flex1}>
              <Text style={raceDayStyles.statLabel}>SELECTED PRACTICE DATE</Text>
              <Text style={raceDayStyles.cardTitle} numberOfLines={1}>{selected.label || selected.dateLabel || 'Practice Date Selected'}</Text>
              <Text style={raceDayStyles.cardSub} numberOfLines={1}>{selected.source === 'local' ? 'Local practice data' : 'LiveRC practice selected'}</Text>
            </View>
          </View>
        ) : null}
        <TouchableOpacity style={raceDayStyles.primaryButton} onPress={handleSelectPracticeDay} activeOpacity={0.82}>
          {selecting ? <ActivityIndicator /> : <Text style={raceDayStyles.primaryButtonText}>Select Practice Date</Text>}
        </TouchableOpacity>
        {message ? <Text style={raceDayStyles.eventPickerMessage} numberOfLines={2}>{message}</Text> : null}
      </View>
    </RaceDayPopup>
  );
}

export { RaceDayPracticeDayPickerPopup };

const styles = StyleSheet.create({
  monthWrap: { marginTop: 10 },
  monthButton: { minHeight: 38, marginTop: 6, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderColor: raceDayColors.border, backgroundColor: raceDayColors.cardAlt },
  monthButtonText: { flex: 1, color: raceDayColors.text, fontSize: 12, fontWeight: '900' },
  monthChevron: { color: raceDayColors.accent, fontSize: 10, fontWeight: '900' },
  monthMenu: { marginTop: 5, borderWidth: 1, borderColor: raceDayColors.border, backgroundColor: raceDayColors.card },
  monthOption: { minHeight: 34, paddingHorizontal: 11, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: raceDayColors.border },
  monthOptionSelected: { backgroundColor: raceDayColors.accentSofter, borderLeftWidth: 3, borderLeftColor: raceDayColors.accent },
  monthOptionText: { color: raceDayColors.muted, fontSize: 11, fontWeight: '800' },
  monthOptionTextSelected: { color: raceDayColors.text },
});
