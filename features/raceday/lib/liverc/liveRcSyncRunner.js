import { fetchEntryListHtml } from './liveRcEntryList';
import { findDriverClassCandidatesInEntryList, findDriverInEntryList } from './liveRcDriverFinder';
import { scanRaceLinks } from './liveRcRaceScanner';
import { parseQualifierResult } from './liveRcQualifierParser';
import { parseMainResult } from './liveRcMainParser';
import { createLiveRcDebug } from './liveRcDebug';
import { normalizeLiveRcEventUrl, normalizeLiveRcSiteUrl } from './liveRcUrls';
import { getVehicleTransponder, getVehicleDisplayName, normalizeId } from '../raceDayModel';
import { addRaceDayRuns } from '../raceDayResultStorage';
import { findRaceLineupsForVehicles } from './liveRcRaceLineupsParser';
import { mergeRaceDayLineups } from '../raceDayLineupStorage';
import { getRaceDayEventVehicleLink } from '../raceDayEventVehicleLinkStorage';

function getVehicleNames(vehicle = {}) {
  return {
    fullName: vehicle.driverName || vehicle.fullName || vehicle.ownerName || '',
    nickname: vehicle.driverNickname || vehicle.nickname || vehicle.driver || '',
    className: vehicle.className
      || vehicle.raceClass
      || vehicle.vehicleClass
      || vehicle.selectedClass
      || '',
  };
}

function flattenRun(result, extras = {}) {
  return {
    ...extras,
    ...result,
    fastestLap: result.fastestLap || result.stats?.fastestLap || '',
    avgLap: result.avgLap || result.stats?.avgLap || '',
    top5Avg: result.top5Avg || result.stats?.top5Avg || '',
    top10Avg: result.top10Avg || result.stats?.top10Avg || '',
    top15Avg: result.top15Avg || result.stats?.top15Avg || '',
    consistency: result.consistency || result.stats?.consistency || '',
    stdDeviation: result.stdDeviation || result.stats?.stdDeviation || '',
    lapsTime: result.lapsTime || result.stats?.lapsTime || '',
  };
}

function emitProgress(onProgress, payload = {}) {
  if (typeof onProgress !== 'function') return;
  onProgress({
    updatedAt: new Date().toISOString(),
    ...payload,
  });
}

function makeVehicleProgressBase({ raceDay, track, vehicle, vehicleName, transponder }) {
  return {
    vehicleId: vehicle?.id || vehicle?.vehicleId,
    vehicleName,
    transponder,
    trackId: raceDay?.trackId || track?.id || track?.trackId,
  };
}

function throwIfCancelled(shouldCancel) {
  if (typeof shouldCancel !== 'function' || !shouldCancel()) return;
  const error = new Error('RaceDay refresh cancelled.');
  error.code = 'RACEDAY_SYNC_CANCELLED';
  throw error;
}

function sameSavedRace(saved = {}, candidate = {}) {
  const savedUrl = normalizeId(saved?.raceUrl);
  const candidateUrl = normalizeId(candidate?.raceUrl);
  if (savedUrl && candidateUrl && savedUrl === candidateUrl) return true;

  const savedRound = normalizeId(saved?.roundLabel);
  const candidateRound = normalizeId(candidate?.roundLabel);
  const savedRace = normalizeId(saved?.raceNumber || saved?.raceNo || saved?.race);
  const candidateRace = normalizeId(candidate?.raceNumber || candidate?.raceNo || candidate?.race);
  const savedType = normalizeId(saved?.resultType);
  const candidateType = normalizeId(candidate?.resultType);
  return !!(savedRound && candidateRound && savedRound === candidateRound
    && savedRace && candidateRace && savedRace === candidateRace
    && (!savedType || !candidateType || savedType === candidateType));
}

function isCompleteSavedResult(run = {}) {
  return Boolean(
    String(run?.lapsTime || run?.stats?.lapsTime || '').trim()
    || (String(run?.laps || run?.lapCount || '').trim() && String(run?.totalTime || run?.time || '').trim())
  );
}

export async function syncLiveRcForVehicle({
  raceDay,
  track,
  vehicle,
  eventUrl,
  siteUrl,
  save = true,
  onProgress,
  existingRuns = [],
  shouldCancel,
} = {}) {
  throwIfCancelled(shouldCancel);
  const debug = createLiveRcDebug();
  const normalizedSiteUrl = normalizeLiveRcSiteUrl(siteUrl || raceDay?.siteUrl || track?.liveRcUrl || track?.livercUrl || '');
  const normalizedEventUrl = normalizeLiveRcEventUrl(eventUrl || raceDay?.eventUrl || '', normalizedSiteUrl);
  const transponder = getVehicleTransponder(vehicle);
  const vehicleName = getVehicleDisplayName(vehicle);
  const names = getVehicleNames(vehicle);
  const progressBase = makeVehicleProgressBase({ raceDay, track, vehicle, vehicleName, transponder });
  const vehicleId = vehicle.id || vehicle.vehicleId;

  debug.add('sync:start', {
    vehicleName,
    transponder,
    eventUrl: normalizedEventUrl,
    siteUrl: normalizedSiteUrl,
  });

  emitProgress(onProgress, {
    ...progressBase,
    phase: 'start',
    status: 'starting',
    message: `Starting LiveRC sync for ${vehicleName}.`,
  });

  if (!normalizedEventUrl) throw new Error('LiveRC event URL is required.');
  emitProgress(onProgress, {
    ...progressBase,
    phase: transponder ? 'transponder' : 'driver',
    status: 'working',
    message: transponder
      ? `Searching the event Entry List for TX ${transponder}.`
      : `Searching the event Entry List for ${names.fullName || names.nickname || vehicleName}.`,
  });

  const { html: entryHtml, entryListUrl } = await fetchEntryListHtml(normalizedEventUrl, { debug });
  throwIfCancelled(shouldCancel);

  emitProgress(onProgress, {
    ...progressBase,
    phase: transponder ? 'transponder' : 'driver',
    status: 'working',
    entryListUrl,
    message: transponder
      ? `Entry List loaded. Searching for TX ${transponder}.`
      : 'Entry List loaded. Searching for the driver.',
  });

  const savedEventLink = await getRaceDayEventVehicleLink(raceDay, normalizedEventUrl, vehicleId);
  const hasSavedClassLink = Boolean(String(savedEventLink?.className || '').trim());
  const linkedNames = savedEventLink
    ? { ...names, className: savedEventLink.className, fullName: savedEventLink.fullName || names.fullName, nickname: savedEventLink.nickname || savedEventLink.driverName || names.nickname }
    : names;
  let driver = findDriverInEntryList(entryHtml, { transponder, ...linkedNames }, { debug });
  const classCandidates = driver?.matchedBy === 'transponder'
    ? []
    : findDriverClassCandidatesInEntryList(entryHtml, linkedNames);
  if (!driver && !hasSavedClassLink && classCandidates.length) driver = classCandidates[0];
  if (!driver) {
    emitProgress(onProgress, {
      ...progressBase,
      phase: 'driver',
      status: 'needs-driver-name',
      entryListUrl,
      transponderFound: false,
      requestedDriverName: savedEventLink?.driverName || names.fullName || names.nickname || '',
      message: transponder
        ? `TX ${transponder} and the saved driver name were not found. Enter the LiveRC driver name to search again.`
        : `Vehicle was not found. Enter the driver name exactly as it appears on LiveRC.`,
    });
    return {
      ok: false,
      needsDriverName: true,
      vehicleId,
      vehicleName,
      requestedDriverName: savedEventLink?.driverName || names.fullName || names.nickname || '',
      message: `Enter a LiveRC driver name for ${vehicleName}.`,
      debug: debug.all(),
    };
  }


  const transponderMatched = driver.matchedBy === 'transponder';
  if (!transponderMatched && !hasSavedClassLink) {
    if (classCandidates.length) {
      const classOptions = classCandidates.map((candidate) => ({
        className: candidate.className,
        driverName: candidate.displayName || candidate.nickname || candidate.fullName,
        fullName: candidate.fullName,
        nickname: candidate.nickname,
        transponder: candidate.transponder,
      }));
      emitProgress(onProgress, {
        ...progressBase,
        phase: 'class',
        status: 'needs-selection',
        driverFound: true,
        transponderFound: false,
        driverName: driver.displayName || driver.nickname || driver.fullName,
        fullName: driver.fullName,
        nickname: driver.nickname,
        classOptions,
        message: transponder
          ? `${driver.displayName || driver.fullName} was found, but TX ${transponder} did not match. Choose the class for this vehicle.`
          : `${driver.displayName || driver.fullName} was found without a TX match. Choose the class for this vehicle.`,
      });
      return {
        ok: false,
        needsClassSelection: true,
        vehicleId,
        vehicleName,
        driver,
        classOptions,
        message: 'Choose a LiveRC class to link for this event.',
        debug: debug.all(),
      };
    }
  }

  emitProgress(onProgress, {
    ...progressBase,
    phase: 'driver',
    status: 'matched',
    transponderFound: transponderMatched,
    driverFound: true,
    entryListUrl,
    driverName: driver.displayName || driver.nickname || driver.fullName,
    fullName: driver.fullName,
    nickname: driver.nickname,
    message: driver.matchedBy === 'transponder'
      ? `Found TX ${transponder}. Driver: ${driver.displayName || driver.fullName}.`
      : `TX ${transponder || 'not set'} did not match; found ${driver.displayName || driver.fullName} in ${driver.className || names.className}.`,
  });

  emitProgress(onProgress, {
    ...progressBase,
    phase: 'class',
    status: 'working',
    entryListUrl,
    transponderFound: transponderMatched,
    driverFound: true,
    driverName: driver.displayName || driver.nickname || driver.fullName,
    fullName: driver.fullName,
    nickname: driver.nickname,
    message: `Searching for ${driver.displayName || driver.fullName}'s class.`,
  });

  const className = driver.className;
  if (!className) {
    emitProgress(onProgress, {
      ...progressBase,
      phase: 'class',
      status: 'failed',
      entryListUrl,
      driverName: driver.displayName || driver.nickname || driver.fullName,
      fullName: driver.fullName,
      nickname: driver.nickname,
      message: `Driver was found, but the class could not be detected from the same Entry List table.`,
    });
    return {
      ok: false,
      vehicleId: vehicle.id || vehicle.vehicleId,
      vehicleName,
      message: `Class could not be detected for ${vehicleName}.`,
      driver,
      debug: debug.all(),
    };
  }

  emitProgress(onProgress, {
    ...progressBase,
    phase: 'class',
    status: 'matched',
    transponderFound: transponderMatched,
    driverFound: true,
    classFound: true,
    entryListUrl,
    driverName: driver.displayName || driver.nickname || driver.fullName,
    fullName: driver.fullName,
    nickname: driver.nickname,
    className,
    message: `Found class: ${className}.`,
  });

  emitProgress(onProgress, {
    ...progressBase,
    phase: 'raceScanner',
    status: 'working',
    entryListUrl,
    driverName: driver.displayName || driver.nickname || driver.fullName,
    fullName: driver.fullName,
    nickname: driver.nickname,
    className,
    transponderFound: transponderMatched,
    driverFound: true,
    classFound: true,
    message: `Searching completed rounds for ${className}.`,
  });

  const savedRuns = (Array.isArray(existingRuns) ? existingRuns : []).filter((run) => (
    normalizeId(run?.vehicleId) === normalizeId(vehicle?.id || vehicle?.vehicleId)
    && isCompleteSavedResult(run)
  ));
  const raceLinks = await scanRaceLinks(normalizedEventUrl, className, {
    debug,
    shouldCancel,
    skipRace: (candidate) => savedRuns.some((saved) => sameSavedRace(saved, candidate)),
  });
  const skippedSavedCount = Number(raceLinks?.skippedSavedCount || 0);
  const totalCandidateCount = Number(raceLinks?.totalCandidateCount || raceLinks.length);

  emitProgress(onProgress, {
    ...progressBase,
    phase: 'raceScanner',
    status: 'working',
    entryListUrl,
    driverName: driver.displayName || driver.nickname || driver.fullName,
    fullName: driver.fullName,
    nickname: driver.nickname,
    className,
    transponderFound: transponderMatched,
    driverFound: true,
    classFound: true,
    racesComplete: 0,
    raceCandidates: totalCandidateCount,
    roundsChecked: 0,
    roundsToCheck: raceLinks.length,
    runsFound: 0,
    skippedSavedCount,
    message: skippedSavedCount
      ? `${skippedSavedCount} saved result${skippedSavedCount === 1 ? '' : 's'} retained. Checking ${raceLinks.length} new race${raceLinks.length === 1 ? '' : 's'}.`
      : `Found ${raceLinks.length} ${className} race candidate${raceLinks.length === 1 ? '' : 's'} under Race Results. Checking the driver in each race.`,
  });

  const runs = [];

  for (let raceIndex = 0; raceIndex < raceLinks.length; raceIndex += 1) {
    const race = raceLinks[raceIndex];
    throwIfCancelled(shouldCancel);
    emitProgress(onProgress, {
      ...progressBase,
      phase: 'raceParser',
      status: 'working',
      entryListUrl,
      driverName: driver.displayName || driver.nickname || driver.fullName,
      fullName: driver.fullName,
      nickname: driver.nickname,
      className,
      transponderFound: transponderMatched,
      driverFound: true,
      classFound: true,
      roundsChecked: raceIndex,
      roundsToCheck: raceLinks.length,
      racesComplete: runs.length,
      raceCandidates: totalCandidateCount,
      runsFound: runs.length,
      skippedSavedCount,
      roundLabel: race.roundLabel,
      raceNumber: race.raceNumber,
      message: `Searching ${race.roundLabel || 'round'}${race.raceNumber ? ` · Race ${race.raceNumber}` : ''} for ${driver.displayName || driver.fullName}.`,
    });
    const parserMeta = {
      raceUrl: race.raceUrl,
      raceNumber: race.raceNumber,
      roundLabel: race.roundLabel,
      className,
      transponderFound: transponderMatched,
      driverFound: true,
      classFound: true,
      resultType: race.resultType,
    };
    const parsed = race.resultType === 'main' || race.resultType === 'final'
      ? parseMainResult(race.html, driver, parserMeta)
      : parseQualifierResult(race.html, driver, parserMeta);

    if (parsed) {
      runs.push(flattenRun(parsed, {
        vehicleId: vehicle.id || vehicle.vehicleId,
        vehicleName,
        trackId: raceDay?.trackId || track?.id || track?.trackId,
        raceDayId: raceDay?.raceDayId || raceDay?.id,
        eventUrl: normalizedEventUrl,
        siteUrl: normalizedSiteUrl,
        entryListUrl,
        syncedAt: new Date().toISOString(),
        raceNumber: race.raceNumber,
        driver,
      }));
    }

    emitProgress(onProgress, {
      ...progressBase,
      phase: 'raceParser',
      status: 'working',
      entryListUrl,
      driverName: driver.displayName || driver.nickname || driver.fullName,
      fullName: driver.fullName,
      nickname: driver.nickname,
      className,
      transponderFound: transponderMatched,
      driverFound: true,
      classFound: true,
      roundsChecked: raceIndex + 1,
      roundsToCheck: raceLinks.length,
      racesComplete: runs.length,
      raceCandidates: totalCandidateCount,
      runsFound: runs.length,
      skippedSavedCount,
      roundLabel: race.roundLabel,
      raceNumber: race.raceNumber,
      message: `${race.roundLabel || 'Round'}${race.raceNumber ? ` · Race ${race.raceNumber}` : ''} checked. Found ${runs.length} result${runs.length === 1 ? '' : 's'} so far.`,
    });
  }

  debug.add('sync:completeVehicle', {
    vehicleName,
    className,
    matchedRaces: runs.length,
    roundLabels: runs.map((run) => run.roundLabel),
  });

  emitProgress(onProgress, {
    ...progressBase,
    phase: 'complete',
    status: 'complete',
    entryListUrl,
    driverName: driver.displayName || driver.nickname || driver.fullName,
    fullName: driver.fullName,
    nickname: driver.nickname,
    className,
    transponderFound: transponderMatched,
    driverFound: true,
    classFound: true,
    roundsChecked: raceLinks.length,
    roundsToCheck: raceLinks.length,
    racesComplete: runs.length,
    raceCandidates: totalCandidateCount,
    runsFound: runs.length,
    skippedSavedCount,
    message: runs.length
      ? `Added ${runs.length} new race result${runs.length === 1 ? '' : 's'}; retained ${skippedSavedCount} saved.`
      : skippedSavedCount
        ? `No new results. Retained ${skippedSavedCount} saved race result${skippedSavedCount === 1 ? '' : 's'}.`
        : `Driver and class matched, but no race results were found yet.`,
  });

  if (save && raceDay?.id) {
    await addRaceDayRuns(raceDay.id, runs);
  }

  return {
    ok: true,
    vehicleId: vehicle.id || vehicle.vehicleId,
    vehicleName,
    driver,
    className,
    runs,
    debug: debug.all(),
  };
}

export async function syncLiveRcRaceDay({ raceDay, track, vehicles = [], eventUrl, siteUrl, onProgress, existingRuns = [], shouldCancel } = {}) {
  const results = [];
  for (const vehicle of vehicles) {
    throwIfCancelled(shouldCancel);
    try {
      results.push(await syncLiveRcForVehicle({ raceDay, track, vehicle, eventUrl, siteUrl, save: false, onProgress, existingRuns, shouldCancel }));
    } catch (error) {
      if (error?.code === 'RACEDAY_SYNC_CANCELLED') throw error;
      const vehicleName = getVehicleDisplayName(vehicle);
      emitProgress(onProgress, {
        vehicleId: vehicle.id || vehicle.vehicleId,
        vehicleName,
        transponder: getVehicleTransponder(vehicle),
        phase: 'error',
        status: 'error',
        message: error.message || `LiveRC sync failed for ${vehicleName}.`,
      });
      results.push({
        ok: false,
        vehicleId: vehicle.id || vehicle.vehicleId,
        vehicleName,
        message: error.message,
        debug: [],
      });
    }
  }

  const allRuns = results.flatMap((result) => result.runs || []);
  if (raceDay?.id && allRuns.length) {
    await addRaceDayRuns(raceDay.id, allRuns);
  }

  // Race Lineup badge add-in. This is intentionally separate from normal
  // result parsing: it reads LiveRC Race Lineups & Entry List only, then saves
  // the current race number per vehicle under @raceDayLineups_<raceDayId>.
  if (raceDay?.id) {
    throwIfCancelled(shouldCancel);
    const normalizedSiteUrl = normalizeLiveRcSiteUrl(siteUrl || raceDay?.siteUrl || track?.liveRcUrl || track?.livercUrl || '');
    const normalizedEventUrl = normalizeLiveRcEventUrl(eventUrl || raceDay?.eventUrl || '', normalizedSiteUrl);
    const entryMatches = results
      .filter((result) => result?.ok && result?.driver)
      .map((result) => ({
        ...(result.driver || {}),
        vehicleId: result.vehicleId,
        id: result.vehicleId,
        className: result.className || result.driver?.className || '',
      }));

    // Do not gate lineup scanning on the normal result/entry-list pass. LiveRC
    // posts heat sheets before the first race has run, so the lineup parser
    // must be allowed to match directly from the vehicle TX/name/class data.
    if (normalizedEventUrl && vehicles.length) {
      throwIfCancelled(shouldCancel);
      emitProgress(onProgress, {
        key: 'race-lineups',
        vehicleName: 'Race lineups',
        phase: 'lineups',
        status: 'working',
        message: 'Checking the current Race Lineups & Entry List.',
      });
      try {
        const lineups = await findRaceLineupsForVehicles({
          eventUrl: normalizedEventUrl,
          siteUrl: normalizedSiteUrl,
          vehicles,
          entryMatches,
        });
        throwIfCancelled(shouldCancel);
        await mergeRaceDayLineups(raceDay.id, lineups);
        emitProgress(onProgress, {
          key: 'race-lineups',
          vehicleName: 'Race lineups',
          phase: 'complete',
          status: 'complete',
          lineupsFound: lineups.length,
          message: `Race lineup check complete. Found ${lineups.length} current lineup${lineups.length === 1 ? '' : 's'}.`,
        });
      } catch (error) {
        if (error?.code === 'RACEDAY_SYNC_CANCELLED') throw error;
        console.warn('[RaceDayLineups] Failed to update lineup badges', error);
        emitProgress(onProgress, {
          key: 'race-lineups',
          vehicleName: 'Race lineups',
          phase: 'lineups',
          status: 'error',
          message: error?.message || 'Race lineup check failed.',
        });
      }
    }
  }

  return {
    ok: results.some((result) => result.ok),
    results,
    runs: allRuns,
    needsClassSelection: results.filter((result) => result?.needsClassSelection),
    needsDriverName: results.filter((result) => result?.needsDriverName),
    needsUserInput: results.filter((result) => result?.needsClassSelection || result?.needsDriverName),
  };
}
