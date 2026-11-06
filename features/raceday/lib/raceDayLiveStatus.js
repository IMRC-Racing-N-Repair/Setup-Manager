function clean(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizeLiveRcEventName(value = '') {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getRaceDayEventTitle(raceDay = {}) {
  return clean(
    raceDay?.eventTitle ||
    raceDay?.eventName ||
    raceDay?.selectedEventTitle ||
    raceDay?.liveRcEventTitle ||
    raceDay?.event?.title ||
    raceDay?.selectedEvent?.title,
  );
}

export function getRaceDayEventDateLabel(raceDay = {}) {
  return clean(
    raceDay?.eventDateLabel ||
    raceDay?.eventDate ||
    raceDay?.selectedEventDateLabel ||
    raceDay?.liveRcEventDateLabel ||
    raceDay?.event?.dateLabel ||
    raceDay?.selectedEvent?.dateLabel,
  );
}

export function getLiveRcEventId(value = '') {
  return clean(value).match(/[?&]id=(\d+)/i)?.[1] || '';
}

export function getEventDateKey(value = '') {
  const text = clean(value);
  const numeric = text.match(/\b(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})\b/);
  let year;
  let month;
  let day;

  if (numeric) {
    if (numeric[1].length === 4) {
      year = Number(numeric[1]);
      month = Number(numeric[2]);
      day = Number(numeric[3]);
    } else {
      month = Number(numeric[1]);
      day = Number(numeric[2]);
      year = Number(numeric[3]);
      if (year < 100) year += 2000;
    }
  } else {
    const named = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}\b/i);
    if (!named) return '';
    const parsed = new Date(named[0].replace(/^(Sept)\b/i, 'Sep'));
    if (Number.isNaN(parsed.getTime())) return '';
    year = parsed.getFullYear();
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  }

  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return '';

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isRaceDayEventCurrentDay(raceDay = {}, now = new Date()) {
  const eventDateKey = getEventDateKey(getRaceDayEventDateLabel(raceDay));
  return Boolean(eventDateKey && eventDateKey === getLocalDateKey(now));
}

export function liveEventIdentityIsKnown(liveState = {}) {
  return Boolean(clean(liveState?.eventId) || normalizeLiveRcEventName(liveState?.eventName));
}

export function liveEventMatchesRaceDay(raceDay = {}, liveState = {}) {
  const selectedId = getLiveRcEventId(raceDay?.eventUrl);
  const liveId = clean(liveState?.eventId);
  if (selectedId && liveId) return selectedId === liveId;

  const selectedName = normalizeLiveRcEventName(getRaceDayEventTitle(raceDay));
  const liveName = normalizeLiveRcEventName(liveState?.eventName);
  return Boolean(selectedName && liveName && selectedName === liveName);
}

export function isLiveRaceActive(liveState = {}) {
  const status = clean(liveState?.raceStatus).toLowerCase();
  const completed = /\b(complete|completed|finished|ended|final)\b/.test(status);
  return Boolean(liveState?.active && !completed);
}

export function getRaceDayLiveStatus(raceDay = {}, liveState = {}, now = new Date()) {
  const hasSelectedEvent = Boolean(raceDay?.eventUrl);
  const currentDay = hasSelectedEvent && isRaceDayEventCurrentDay(raceDay, now);
  const identityKnown = liveEventIdentityIsKnown(liveState);
  const eventMatches = currentDay && identityKnown && liveEventMatchesRaceDay(raceDay, liveState);
  const eventMismatch = currentDay && identityKnown && !eventMatches;
  const liveActive = eventMatches && isLiveRaceActive(liveState);

  return {
    hasSelectedEvent,
    currentDay,
    identityKnown,
    eventMatches,
    eventMismatch,
    liveActive,
  };
}

