import { appendRaceDayPracticeSessions } from '../raceDayPracticeStorage';
import { normalizeId } from '../raceDayModel';
import { fetchLiveRcText } from './liveRcClient';
import { getPracticeDayUrl, normalizeLiveRcPracticeSiteUrl } from './liveRcPracticeUrls';
import { getVehicleTransponder, parsePracticeSessionDetail, parsePracticeSessionsFromHtml } from './liveRcPracticeSessionParser';

const DETAIL_BATCH_SIZE = 4;

async function fetchHtml(url = '') {
  console.log('[IMRC RaceDay Practice] fetch practice sessions URL', { url });
  return fetchLiveRcText(url);
}

export async function syncLiveRcPracticeDay({
  raceDay,
  track,
  vehicles = [],
  practiceDay,
  siteUrl,
  onProgress,
} = {}) {
  const raceDayId = raceDay?.id || raceDay?.raceDayId;
  if (!raceDayId) throw new Error('No active RaceDay was found for Practice refresh.');
  if (!practiceDay?.key && !practiceDay?.practiceUrl) throw new Error('Select a practice date first.');

  const normalizedSite = normalizeLiveRcPracticeSiteUrl(
    siteUrl || practiceDay?.siteUrl || raceDay?.practiceSiteUrl || raceDay?.siteUrl || track?.liveRcUrl || track?.livercUrl || track?.liveRCUrl || '',
  );
  const practiceUrl = getPracticeDayUrl(practiceDay, normalizedSite);
  console.log('[IMRC RaceDay Practice] selected practice URL', {
    practiceUrl,
    normalizedSite,
    practiceDayKey: practiceDay?.key || practiceDay?.dateKey || '',
    storedPracticeUrl: practiceDay?.practiceUrl || practiceDay?.url || practiceDay?.href || '',
  });
  if (!practiceUrl) throw new Error('No LiveRC practice URL was found.');

  onProgress?.({ type: 'practice-start', message: `Checking Practice ${practiceDay?.label || practiceDay?.key || ''}` });
  const html = await fetchHtml(practiceUrl);
  const detailRequests = new Map();

  async function loadDetails(session) {
    if (!session.detailUrl) return { ...session, detailStatus: 'unavailable' };
    try {
      if (!detailRequests.has(session.detailUrl)) {
        detailRequests.set(session.detailUrl, fetchLiveRcText(session.detailUrl));
      }
      const detail = parsePracticeSessionDetail(await detailRequests.get(session.detailUrl), session);
      if (detail) {
        return {
          ...session,
          ...detail,
          detailStatus: detail.laps.length >= Math.max(1, session.lapCount) ? 'complete' : 'partial',
        };
      }
    } catch (error) {
      console.warn('[IMRC RaceDay Practice] Could not load practice laps', error.message);
    }
    return { ...session, detailStatus: 'unavailable' };
  }

  const summary = {
    practiceUrl,
    practiceDayKey: practiceDay?.key || practiceDay?.dateKey || '',
    vehicleCount: vehicles.length,
    savedCount: 0,
    vehicles: [],
  };

  for (const vehicle of vehicles || []) {
    const vehicleId = normalizeId(vehicle?.id || vehicle?.vehicleId);
    const tx = getVehicleTransponder(vehicle);
    if (!vehicleId || !tx) {
      summary.vehicles.push({ vehicleId, tx, savedCount: 0, skipped: true, reason: 'missing-transponder' });
      onProgress?.({ vehicleId, tx, status: 'skipped', message: 'Missing TX/transponder' });
      continue;
    }

    const sessions = parsePracticeSessionsFromHtml(html, {
      raceDayId,
      vehicleId,
      vehicle,
      practiceDay,
      siteUrl: normalizedSite,
    });

    const detailedSessions = [];
    for (let index = 0; index < sessions.length; index += DETAIL_BATCH_SIZE) {
      const batch = sessions.slice(index, index + DETAIL_BATCH_SIZE);
      detailedSessions.push(...await Promise.all(batch.map(loadDetails)));
    }
    const saved = await appendRaceDayPracticeSessions(raceDayId, vehicleId, detailedSessions);
    summary.savedCount += saved.length;
    summary.vehicles.push({ vehicleId, tx, savedCount: saved.length });
    onProgress?.({ vehicleId, tx, status: 'complete', savedCount: saved.length, message: `${saved.length} practice session${saved.length === 1 ? '' : 's'} found` });
  }

  return summary;
}
