import { getRows, getCells, stripTags, textKey, parseNumber } from './liveRcHtml';
import { formatFastestLap, parseLapStats } from './liveRcLapStatsParser';
import { parseAllRacerLapsFromResultHtml, parseTimeSeconds } from './liveRcTop5Shared';

function rowMatchesDriver(rowText = '', driver = {}) {
  const key = textKey(rowText);
  return Boolean(
    (driver.nickname && key.includes(textKey(driver.nickname))) ||
    (driver.fullName && key.includes(textKey(driver.fullName))) ||
    (driver.displayName && key.includes(textKey(driver.displayName))) ||
    (driver.transponder && key.includes(textKey(driver.transponder)))
  );
}

function parsePosition(cells = []) {
  const firstNumber = cells.map(parseNumber).find((value) => Number.isFinite(value));
  return firstNumber || null;
}

function parseLapsTime(cells = [], rowText = '') {
  const joined = [rowText, ...cells].join(' ');
  const match = joined.match(/\b(\d+)\s*\/\s*(\d+:\d{2}\.\d{1,3})\b/);
  return match ? `${match[1]}/${match[2]}` : '';
}

function parseFastLap(cells = [], rowText = '') {
  const joined = [rowText, ...cells].join(' ');
  const time = joined.match(/\b\d+\.\d{3}\b/)?.[0] || '';
  const lap = joined.match(/\(L(\d+)\)/i)?.[1] || joined.match(/lap\s*(\d+)/i)?.[1] || '';
  return time ? `${time}${lap ? ` (L${lap})` : ''}` : '';
}

function getSeedingStats(html, driver, raceMeta, rowHtml) {
  const names = new Set([driver.displayName, driver.nickname, driver.fullName].filter(Boolean).map(textKey).filter(Boolean));
  const racer = parseAllRacerLapsFromResultHtml(html, raceMeta).find(({ driverName }) => names.has(textKey(driverName)));
  if (!racer) return rowHtml ? parseLapStats(rowHtml) : null;

  const timed = racer.laps.map((lap) => ({ ...lap, seconds: parseTimeSeconds(lap.lapTime) }))
    .filter((lap) => Number(lap.lapNumber) > 0 && lap.seconds > 0);
  if (!timed.length) return racer;
  const best = timed.reduce((fastest, lap) => lap.seconds < fastest.seconds ? lap : fastest);
  return {
    ...racer,
    fastestLap: racer.fastestLap || formatFastestLap(best.lapTime, best.lapNumber),
    avgLap: racer.avgLap || (timed.reduce((sum, lap) => sum + lap.seconds, 0) / timed.length).toFixed(3),
  };
}

export function parseQualifierResult(raceHtml = '', driver = {}, raceMeta = {}) {
  const seeding = raceMeta.resultType === 'seeding' || /\bseeding\b/i.test(raceMeta.roundLabel || '');
  const rows = getRows(raceHtml);
  const rowHtml = rows.find((row) => rowMatchesDriver(stripTags(row), driver));
  if (!rowHtml && !seeding) return null;

  // Seeding pages can provide lap data in the same racerLaps blocks used
  // for qualifier standings, even without a matching visible result row.
  const driverName = driver.displayName || driver.nickname || driver.fullName;
  const stats = seeding
    ? getSeedingStats(raceHtml, driver, raceMeta, rowHtml)
    : parseLapStats(raceHtml, driverName);
  if (!stats) return null;
  const rowText = stripTags(rowHtml || '');
  const cells = getCells(rowHtml || '');

  return {
    resultType: seeding ? 'seeding' : 'qualifier',
    roundLabel: raceMeta.roundLabel || (seeding ? 'Seeding' : 'Qualifier'),
    raceUrl: raceMeta.raceUrl,
    raceNumber: raceMeta.raceNumber || '',
    className: raceMeta.className || driver.className,
    position: stats.position ?? parsePosition(cells),
    driver: driverName,
    lapsTime: stats.lapsTime || parseLapsTime(cells, rowText),
    fastestLap: stats.fastestLap || (seeding ? '' : parseFastLap(cells, rowText)),
    avgLap: stats.avgLap,
    top5Avg: stats.top5Avg,
    top10Avg: stats.top10Avg,
    top15Avg: stats.top15Avg,
    top2Consecutive: stats.top2Consecutive,
    top3Consecutive: stats.top3Consecutive,
    consistency: stats.consistency,
    stdDeviation: stats.stdDeviation,
    stats,
  };
}
