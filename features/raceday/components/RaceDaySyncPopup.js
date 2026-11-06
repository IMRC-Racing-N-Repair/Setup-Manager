import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RaceDayPopup from './RaceDayPopup';
import { findRecentEvents } from '../lib/liverc/liveRcEventFinder';
import { getEventsUrl, normalizeLiveRcEventUrl, normalizeLiveRcSiteUrl } from '../lib/liverc/liveRcUrls';
import { saveTrackLiveRcUrl } from '../lib/raceDayStorage';
import { getTrackLiveRcUrl } from '../lib/raceDayModel';
import { getEventDateKey, getLocalDateKey } from '../lib/raceDayLiveStatus';
import { raceDayColors, raceDayStyles } from '../styles/raceDayStyles';

const EVENTS_PER_PAGE = 5;

function getEventKey(event = {}) {
  return event.eventUrl || event.url || event.href || event.id || `${event.title || 'event'}-${event.dateLabel || ''}`;
}

function getSelectedEvent(events = [], selectedEventUrl = '') {
  const normalizedSelected = normalizeLiveRcEventUrl(selectedEventUrl, '');
  return events.find((event) => normalizeLiveRcEventUrl(event.eventUrl, '') === normalizedSelected) || null;
}

function getRaceDayEventTitle(raceDay = {}) {
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

function getRaceDayEventDate(raceDay = {}) {
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

export default function RaceDaySyncPopup({
  visible,
  raceDay,
  track,
  onClose,
  onDismiss,
  onSyncSelected,
}) {
  const initialUrl = useMemo(() => raceDay?.siteUrl || getTrackLiveRcUrl(track || {}) || '', [raceDay, track]);
  const [siteUrl, setSiteUrl] = useState(initialUrl);
  const [events, setEvents] = useState([]);
  const [eventPage, setEventPage] = useState(0);
  const [selectedEventUrl, setSelectedEventUrl] = useState(raceDay?.eventUrl || '');
  const [selectedEventMeta, setSelectedEventMeta] = useState({
    title: getRaceDayEventTitle(raceDay),
    dateLabel: getRaceDayEventDate(raceDay),
  });
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [startingSync, setStartingSync] = useState(false);
  const [message, setMessage] = useState('');
  const searchRequestRef = useRef(0);

  const handleFindEvents = useCallback(async (sourceUrl, preferredEventUrl = '') => {
    const requestId = ++searchRequestRef.current;
    const normalized = normalizeLiveRcSiteUrl(sourceUrl);
    const eventsUrl = getEventsUrl(sourceUrl);
    if (!normalized) {
      setEvents([]);
      setLoadingEvents(false);
      setMessage('Enter the LiveRC site URL. Events will load automatically.');
      return;
    }

    setLoadingEvents(true);
    setMessage('');
    try {
      if (track?.id || track?.trackId) {
        await saveTrackLiveRcUrl(track.id || track.trackId, normalized);
      }
      const found = await findRecentEvents(normalized, { limit: 30 });
      if (requestId !== searchRequestRef.current) return;

      setSiteUrl(normalized);
      setEvents(found);

      const savedSelection = getSelectedEvent(found, preferredEventUrl);
      const todayKey = getLocalDateKey();
      const currentSelection = savedSelection && getEventDateKey(savedSelection.dateLabel) === todayKey
        ? savedSelection
        : found.find((event) => getEventDateKey(event.dateLabel) === todayKey) || found[0] || null;

      if (currentSelection) {
        handlePickEvent(currentSelection, normalized);
        const currentIndex = found.findIndex((event) => getEventKey(event) === getEventKey(currentSelection));
        setEventPage(Math.max(0, Math.floor(currentIndex / EVENTS_PER_PAGE)));
      } else {
        setEventPage(0);
      }

      setMessage(found.length ? '' : `No events were found at ${eventsUrl}`);
    } catch (error) {
      if (requestId !== searchRequestRef.current) return;
      setEvents([]);
      setEventPage(0);
      setMessage(error.message || 'Could not connect to LiveRC. Check the site URL.');
    } finally {
      if (requestId === searchRequestRef.current) setLoadingEvents(false);
    }
  }, [track]);

  useEffect(() => {
    if (!visible) return;
    setSiteUrl(initialUrl);
    setSelectedEventUrl(raceDay?.eventUrl || '');
    setSelectedEventMeta({
      title: getRaceDayEventTitle(raceDay),
      dateLabel: getRaceDayEventDate(raceDay),
    });
    setEvents([]);
    setEventPage(0);
    setMessage('');
    setStartingSync(false);
    handleFindEvents(initialUrl, raceDay?.eventUrl || '');
  }, [visible, initialUrl, raceDay?.eventUrl, raceDay?.eventTitle, raceDay?.eventDateLabel, handleFindEvents]);

  useEffect(() => {
    if (!visible) return undefined;
    const normalizedCurrent = normalizeLiveRcSiteUrl(siteUrl);
    const normalizedInitial = normalizeLiveRcSiteUrl(initialUrl);
    if (!normalizedCurrent || normalizedCurrent === normalizedInitial) return undefined;
    const timer = setTimeout(() => {
      handleFindEvents(siteUrl, selectedEventUrl);
    }, 650);
    return () => clearTimeout(timer);
  }, [visible, siteUrl, initialUrl, selectedEventUrl, handleFindEvents]);

  function handlePickEvent(event, sourceUrl = siteUrl) {
    const eventUrl = normalizeLiveRcEventUrl(event.eventUrl, sourceUrl);
    setSelectedEventUrl(eventUrl);
    setSelectedEventMeta({
      title: event.title || 'LiveRC Event',
      dateLabel: event.dateLabel || '',
    });
  }

  async function handleSyncSelectedEvent() {
    const normalizedSite = normalizeLiveRcSiteUrl(siteUrl);
    const normalizedEvent = normalizeLiveRcEventUrl(selectedEventUrl, normalizedSite);
    if (!normalizedEvent) {
      setMessage('Select a LiveRC event first.');
      return;
    }

    const selected = getSelectedEvent(events, normalizedEvent);
    const eventTitle = selected?.title || selectedEventMeta.title || getRaceDayEventTitle(raceDay) || '';
    const eventDateLabel = selected?.dateLabel || selectedEventMeta.dateLabel || getRaceDayEventDate(raceDay) || '';

    setStartingSync(true);
    setMessage('');
    onSyncSelected?.({
      eventUrl: normalizedEvent,
      siteUrl: normalizedSite,
      eventTitle,
      eventDateLabel,
    });
    setStartingSync(false);
  }

  const selectedEvent = getSelectedEvent(events, selectedEventUrl);
  const selectedTitle = selectedEvent?.title || selectedEventMeta.title || getRaceDayEventTitle(raceDay) || '';
  const selectedDate = selectedEvent?.dateLabel || selectedEventMeta.dateLabel || getRaceDayEventDate(raceDay) || '';
  const eventPageCount = Math.max(1, Math.ceil(events.length / EVENTS_PER_PAGE));
  const safeEventPage = Math.min(eventPage, eventPageCount - 1);
  const visibleEvents = events.slice(safeEventPage * EVENTS_PER_PAGE, (safeEventPage + 1) * EVENTS_PER_PAGE);

  return (
    <RaceDayPopup
      visible={visible}
      title="Choose LiveRC Event"
      subtitle="Recent events load automatically from this track."
      onClose={onClose}
      onDismiss={onDismiss}
      centered
      keyboardAware
      contentContainerStyle={raceDayStyles.syncPickerContent}
    >
      <View style={raceDayStyles.syncPickerStaticTop}>
        <View style={raceDayStyles.eventPickerHeadingRow}>
          <View>
            <Text style={raceDayStyles.statLabel}>TRACK LIVERC SITE</Text>
            <Text style={raceDayStyles.eventPickerSectionTitle}>Event source</Text>
          </View>
          <View style={[raceDayStyles.eventSearchStatus, loadingEvents && raceDayStyles.eventSearchStatusActive]}>
            {loadingEvents ? <ActivityIndicator size="small" color={raceDayColors.accent} /> : <View style={raceDayStyles.eventSearchStatusDot} />}
            <Text style={raceDayStyles.eventSearchStatusText} numberOfLines={1}>{loadingEvents ? 'SEARCHING' : 'READY'}</Text>
          </View>
        </View>
        <TextInput
          value={siteUrl}
          onChangeText={setSiteUrl}
          placeholder="shopimrc.liverc.com"
          placeholderTextColor={raceDayColors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          onSubmitEditing={() => handleFindEvents(siteUrl, selectedEventUrl)}
          style={raceDayStyles.eventPickerInput}
        />
        <Text style={raceDayStyles.eventPickerUrlHint} numberOfLines={1}>
          {loadingEvents ? 'Checking recent events…' : getEventsUrl(siteUrl) || 'Enter your track’s LiveRC address'}
        </Text>

        <View style={raceDayStyles.eventResultsHeader}>
          <View>
            <Text style={raceDayStyles.statLabel}>RECENT EVENTS</Text>
            <Text style={raceDayStyles.eventPickerSectionTitle}>Select RaceDay event</Text>
          </View>
          <Text style={raceDayStyles.eventCountText}>{loadingEvents ? 'LOADING' : `${events.length} FOUND`}</Text>
        </View>
      </View>

      <View style={raceDayStyles.eventPickerOnlyScrollContent}>
        {loadingEvents && !events.length ? (
          <View style={raceDayStyles.eventPickerEmptyBox}>
            <ActivityIndicator color={raceDayColors.accent} />
            <Text style={raceDayStyles.eventPickerEmptyTitle}>Loading LiveRC events</Text>
            <Text style={raceDayStyles.eventPickerEmptyText}>Checking the track’s recent event list…</Text>
          </View>
        ) : events.length ? visibleEvents.map((event, index) => {
          const eventUrl = normalizeLiveRcEventUrl(event.eventUrl, siteUrl);
          const selected = normalizeLiveRcEventUrl(selectedEventUrl, siteUrl) === eventUrl;
          return (
            <TouchableOpacity
              key={getEventKey(event)}
              style={[raceDayStyles.eventCard, selected && raceDayStyles.selectedEventCard]}
              onPress={() => handlePickEvent(event)}
              activeOpacity={0.86}
            >
              <View style={raceDayStyles.cardAccent} />
              <View style={raceDayStyles.eventCardNumber}><Text style={raceDayStyles.eventCardNumberText}>{String((safeEventPage * EVENTS_PER_PAGE) + index + 1).padStart(2, '0')}</Text></View>
              <View style={raceDayStyles.eventCardIdentity}>
                <Text style={raceDayStyles.eventTitle} numberOfLines={1}>{event.title}</Text>
                <Text style={raceDayStyles.eventDate} numberOfLines={1}>{event.dateLabel || 'Date not listed'}</Text>
              </View>
              <View style={[raceDayStyles.eventSelectMark, selected && raceDayStyles.eventSelectMarkActive]}>
                <Text style={[raceDayStyles.eventSelectMarkText, selected && raceDayStyles.eventSelectMarkTextActive]}>{selected ? '✓' : '›'}</Text>
              </View>
            </TouchableOpacity>
          );
        }) : (
          <View style={raceDayStyles.eventPickerEmptyBox}>
            <Text style={raceDayStyles.eventPickerEmptyTitle}>No events found</Text>
            <Text style={raceDayStyles.eventPickerEmptyText}>Check the LiveRC address above. The search will run again automatically.</Text>
          </View>
        )}
      </View>

      {events.length > EVENTS_PER_PAGE ? (
        <View style={raceDayStyles.eventPaginationRow}>
          <TouchableOpacity
            style={[raceDayStyles.eventPageButton, safeEventPage === 0 && raceDayStyles.eventPageButtonDisabled]}
            onPress={() => setEventPage((page) => Math.max(0, page - 1))}
            disabled={safeEventPage === 0}
            activeOpacity={0.82}
          >
            <Text style={raceDayStyles.eventPageButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={raceDayStyles.eventPageLabel}>Page {safeEventPage + 1} of {eventPageCount}</Text>
          <TouchableOpacity
            style={[raceDayStyles.eventPageButton, safeEventPage >= eventPageCount - 1 && raceDayStyles.eventPageButtonDisabled]}
            onPress={() => setEventPage((page) => Math.min(eventPageCount - 1, page + 1))}
            disabled={safeEventPage >= eventPageCount - 1}
            activeOpacity={0.82}
          >
            <Text style={raceDayStyles.eventPageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={raceDayStyles.syncPickerStaticBottom}>
        {selectedEventUrl ? (
          <View style={raceDayStyles.selectedEventSummaryCompact}>
            <View style={raceDayStyles.selectedEventSummaryIcon}><Text style={raceDayStyles.selectedEventSummaryIconText}>✓</Text></View>
            <View style={raceDayStyles.flex1}>
              <Text style={raceDayStyles.statLabel}>SELECTED RACEDAY EVENT</Text>
              <Text style={raceDayStyles.cardTitle} numberOfLines={1}>{selectedTitle || 'LiveRC Event Selected'}</Text>
              <Text style={raceDayStyles.cardSub} numberOfLines={1}>{selectedDate || 'Ready to sync selected event'}</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={raceDayStyles.primaryButton} onPress={handleSyncSelectedEvent} activeOpacity={0.82}>
          {startingSync ? <ActivityIndicator /> : <Text style={raceDayStyles.primaryButtonText}>Sync Selected RaceDay</Text>}
        </TouchableOpacity>

        {message ? <Text style={raceDayStyles.eventPickerMessage} numberOfLines={2}>{message}</Text> : null}
      </View>
    </RaceDayPopup>
  );
}

export { RaceDaySyncPopup };
