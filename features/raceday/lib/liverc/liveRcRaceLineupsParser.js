import { fetchLiveRcText } from './liveRcClient';
import { resolveLiveRcUrl } from './liveRcUrls';
import { decodeHtml, getAnchors, getCells, getRows, getTables, stripTags, textKey } from './liveRcHtml';
import { pickPreferredLineup } from '../raceDayLineupPriority';

const DEBUG_PREFIX = '[IMRC RaceDay Lineups]';

function clean(value = '') {
  return decodeHtml(String(value || ''))
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDriver(value = '') {
  return clean(value)
    .toUpperCase()
    .replace(/^[#\d]+\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeClass(value = '') {
  return clean(value)
    .replace(/\bentries\s*:?\s*\d+\b/gi, '')
    .replace(/\bRace\s*#?\s*\d+\b/gi, '')
    .replace(/\bQualifier\s+Round\s+\d+\b/gi, '')
    .replace(/\bMain Events?\b/gi, '')
    .replace(/\b[A-Z]-?Main\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTx(value = '') {
  return String(value || '').replace(/[^0-9]/g, '').trim();
}

function getVehicleId(vehicle = {}) {
  return String(vehicle.id || vehicle.vehicleId || vehicle.key || '').trim();
}

function getVehicleTx(vehicle = {}) {
  return normalizeTx(vehicle.transponder || vehicle.tx || vehicle.transponderNumber || vehicle.transponderId || vehicle.number || '');
}

function getRaceNumber(text = '', href = '') {
  const value = `${clean(text)} ${clean(href)}`;
  return (
    value.match(/\brace\s*#?\s*(\d+)\b/i)?.[1] ||
    value.match(/\br(?:ace)?[_-]?(\d+)\b/i)?.[1] ||
    value.match(/[?&]race(?:_id|Id)?=(\d+)/i)?.[1] ||
    ''
  );
}

function getRoundFromText(text = '') {
  const haystack = clean(text);
  const mainMatch = haystack.match(/\b(Main Events?|[A-Z]-?Main|Finals?)\b/i);
  if (mainMatch) {
    const mainLabel = clean(mainMatch[1]).replace(/^main events?$/i, 'Main Events');
    return { roundType: 'main', roundNum: 999, roundLabel: mainLabel };
  }

  const qualMatch = haystack.match(/\bQualifier\s+Round\s+(\d+)\b/i);
  if (qualMatch) return { roundType: 'qualifier', roundNum: Number(qualMatch[1]) || 0, roundLabel: `Qualifier Round ${qualMatch[1]}` };

  const shortQualMatch = haystack.match(/\bQ\s*(\d+)\b/i);
  if (shortQualMatch) return { roundType: 'qualifier', roundNum: Number(shortQualMatch[1]) || 0, roundLabel: `Qualifier Round ${shortQualMatch[1]}` };

  return { roundType: '', roundNum: 0, roundLabel: '' };
}

function compareRoundPriority(a = {}, b = {}) {
  const aPriority = a.roundType === 'main' ? 10000 : Number(a.roundNum || 0);
  const bPriority = b.roundType === 'main' ? 10000 : Number(b.roundNum || 0);
  return bPriority - aPriority;
}

function sliceRaceLineupsSection(html = '') {
  const source = String(html || '');
  const lower = source.toLowerCase();
  const startCandidates = [
    lower.indexOf('race lineups & entry list'),
    lower.indexOf('race lineups'),
    lower.indexOf('lineups & entry list'),
  ].filter((idx) => idx >= 0);
  if (!startCandidates.length) return source;

  const start = Math.min(...startCandidates);
  const endCandidates = [
    lower.indexOf('race results', start + 1),
    lower.indexOf('overall results', start + 1),
    lower.indexOf('rankings', start + 1),
  ].filter((idx) => idx > start);
  const end = endCandidates.length ? Math.min(...endCandidates) : source.length;
  return source.slice(start, end);
}

function getAnchorContext(sectionHtml = '', anchorRaw = '') {
  const index = sectionHtml.indexOf(anchorRaw);
  if (index < 0) return stripTags(anchorRaw);

  const before = sectionHtml.slice(Math.max(0, index - 2600), index);
  const after = sectionHtml.slice(index, Math.min(sectionHtml.length, index + 1200));
  const beforeText = stripTags(before);
  const roundMatches = Array.from(beforeText.matchAll(/\b(?:Qualifier\s+Round\s+\d+|Q\s*\d+|Main Events?|[A-Z]-?Main|Finals?)\b/gi));
  const nearestRound = clean(roundMatches[roundMatches.length - 1]?.[0] || '');
  const rowStart = before.lastIndexOf('<tr');
  const rowEnd = after.search(/<\/tr>/i);
  if (rowStart >= 0 && rowEnd >= 0) {
    const rowContext = stripTags(before.slice(rowStart) + after.slice(0, rowEnd + 5));
    return clean(`${nearestRound} ${rowContext}`);
  }
  return clean(`${nearestRound} ${stripTags(before.slice(-900) + ' ' + after.slice(0, 900))}`);
}

function isLikelyLineupLink(anchor = {}, context = '') {
  const href = String(anchor.href || '');
  const text = clean(anchor.text || '');
  const combined = `${href} ${text} ${context}`;

  if (/view_(race_)?result|view_round_ranking|view_event|view_entry_list/i.test(href)) return false;
  // LiveRC publishes pre-race lineups as standalone heat sheets. These links
  // are available before a result exists and are the authoritative source for
  // the yellow Race # badge.
  if (/view_heat_sheet/i.test(href) || /[?&]p=view_heat_sheet\b/i.test(href)) return true;
  if (/view_(race_)?lineup|lineup/i.test(href)) return true;
  if (/\bRace\s*#?\s*\d+\b/i.test(combined) && /\bQualifier\s+Round\s+\d+\b|\bMain Events?\b|\b[A-Z]-?Main\b/i.test(combined)) return true;
  return false;
}

function extractClassFromLineupContext(context = '') {
  const text = clean(context);
  const racePattern = /(?:Race\s*#?\s*\d+\s*[:\-]?\s*)([^|\n\r<>]+?)(?=\s*(?:\bRace\s*#?\s*\d+\b|\bQualifier\s+Round\s+\d+\b|\bMain Events?\b|$))/i;
  const raceMatch = text.match(racePattern);
  if (raceMatch?.[1]) return normalizeClass(raceMatch[1]);

  // Common LiveRC context may be: "Race 25 25.5 Hcot Truck".
  const afterRaceNumber = text.match(/\bRace\s*#?\s*\d+\s+(.{2,80})/i)?.[1] || '';
  if (afterRaceNumber) {
    const cleaned = normalizeClass(afterRaceNumber.split(/\s{2,}|\|/)[0]);
    if (cleaned && !/^Race$/i.test(cleaned)) return cleaned;
  }

  return '';
}

export function parseRaceLineupLinksFromEventHtml(html = '', options = {}) {
  const { eventUrl = '', siteUrl = '' } = options;
  const sectionHtml = sliceRaceLineupsSection(html);
  const anchors = getAnchors(sectionHtml);
  const links = [];
  const seen = new Set();

  for (const anchor of anchors) {
    const context = getAnchorContext(sectionHtml, anchor.raw);
    if (!isLikelyLineupLink(anchor, context)) continue;

    const url = resolveLiveRcUrl(eventUrl || siteUrl, anchor.href);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const combined = `${context} ${anchor.text} ${anchor.href}`;
    // The anchor itself is authoritative (for example, "Qualifier Round 2").
    // Broad surrounding context can already contain the next Main heading.
    const anchorRound = getRoundFromText(`${anchor.text} ${anchor.href}`);
    const round = anchorRound.roundType ? anchorRound : getRoundFromText(combined);
    const raceNumber = getRaceNumber(combined, anchor.href);
    const className = extractClassFromLineupContext(combined);

    links.push({
      url,
      raceUrl: url,
      raceNumber,
      raceLabel: raceNumber ? `Race ${raceNumber}` : clean(anchor.text || 'Race'),
      className,
      classKey: textKey(className),
      roundType: round.roundType,
      roundNum: round.roundNum,
      roundLabel: round.roundLabel,
      source: 'Race Lineups & Entry List',
      context: clean(context).slice(0, 600),
    });
  }

  return links.sort(compareRoundPriority);
}

function getRaceHeadingBeforeTable(prefixHtml = '', fallback = {}) {
  const prefixText = stripTags(prefixHtml);
  // The first table prefix also contains "Qualifier Round 2 Race Lineup".
  // Only inspect the text after that page title so the round number cannot be
  // mistaken for the actual race number.
  const headingText = prefixText.split(/Race\s+Lineup/i).pop() || prefixText;
  const matches = Array.from(headingText.matchAll(/(?:^|\s)(\d{1,3})\s+(.+?)\s+Length\s*:/gi));
  const match = matches[matches.length - 1];
  const raceNumber = clean(match?.[1] || fallback.raceNumber || '');
  const heading = clean(match?.[2] || '');
  const className = normalizeClass(heading || fallback.className || '');

  return {
    raceNumber,
    raceLabel: raceNumber ? `Race ${raceNumber}` : fallback.raceLabel || '',
    className,
    classKey: textKey(className),
    roundType: fallback.roundType || '',
    roundNum: Number(fallback.roundNum || 0) || 0,
    roundLabel: fallback.roundLabel || '',
  };
}

function parseLineupRowsFromHtml(html = '', fallback = {}) {
  const rows = [];
  const tables = getTables(html);
  let searchFrom = 0;

  for (const table of tables) {
    const tableIndex = String(html).indexOf(table, searchFrom);
    const prefixStart = String(html).lastIndexOf('</table>', Math.max(0, tableIndex - 1));
    const prefixHtml = String(html).slice(prefixStart >= 0 ? prefixStart + 8 : 0, Math.max(0, tableIndex));
    const raceHeading = getRaceHeadingBeforeTable(prefixHtml, fallback);
    searchFrom = Math.max(searchFrom, tableIndex + table.length);

    for (const rowHtml of getRows(table)) {
      const cells = getCells(rowHtml).map(clean).filter(Boolean);
      if (cells.length < 2) continue;
      const joined = cells.join(' | ');
      if (/driver\s*class|transponder|position|race/i.test(joined) && !/\d{4,}/.test(joined)) continue;

      const tx = normalizeTx(joined.match(/\b(\d{5,9})\b/)?.[1] || '');
      const position = cells.find((cell) => /^\d{1,2}$/.test(cell)) || '';
      const driverCell = cells.find((cell) => /[A-Za-z]/.test(cell) && !/class|race|transponder|position/i.test(cell)) || '';
      const classCell = cells.slice().reverse().find((cell) => /[A-Za-z]/.test(cell) && cell !== driverCell && !/^\d{1,2}$/.test(cell)) || '';

      rows.push({
        ...raceHeading,
        position,
        driver: clean(driverCell),
        driverKey: normalizeDriver(driverCell),
        className: raceHeading.className || normalizeClass(classCell || ''),
        classKey: raceHeading.classKey || textKey(classCell || ''),
        tx,
        cells,
        text: joined,
      });
    }
  }

  if (!rows.length) {
    const plain = stripTags(html);
    const lines = plain.split(/\n|\r|(?=\b\d+\s+[A-Za-z])/).map(clean).filter(Boolean);
    for (const line of lines) {
      if (!/\b\d{5,9}\b/.test(line) && !/\b[A-Za-z]{2,}\b/.test(line)) continue;
      const tx = normalizeTx(line.match(/\b(\d{5,9})\b/)?.[1] || '');
      const position = line.match(/^\s*(\d{1,2})\b/)?.[1] || '';
      const driver = line
        .replace(/^\s*\d{1,2}\s+/, '')
        .replace(/\([^)]*\d{5,9}[^)]*\)/g, '')
        .split(/\s{2,}|\|/)[0];
      rows.push({
        raceNumber: fallback.raceNumber || '',
        raceLabel: fallback.raceLabel || '',
        roundType: fallback.roundType || '',
        roundNum: Number(fallback.roundNum || 0) || 0,
        roundLabel: fallback.roundLabel || '',
        position,
        driver: clean(driver),
        driverKey: normalizeDriver(driver),
        className: '',
        classKey: '',
        tx,
        cells: [line],
        text: line,
      });
    }
  }

  return rows.filter((row) => row.driver || row.tx || row.className);
}

function getTargetInfo(vehicle = {}, entryMatch = {}) {
  const vehicleId = getVehicleId(vehicle) || String(entryMatch.vehicleId || entryMatch.id || '').trim();
  const tx = getVehicleTx(vehicle) || normalizeTx(entryMatch.tx || entryMatch.transponder || entryMatch.transponderNumber || '');
  const driver = normalizeDriver(
    entryMatch.driver ||
    entryMatch.driverName ||
    entryMatch.nickname ||
    vehicle.driverNickname ||
    vehicle.driver ||
    vehicle.nickname ||
    vehicle.driverName ||
    vehicle.name ||
    '',
  );
  const fullName = normalizeDriver(
    entryMatch.fullName ||
    entryMatch.name ||
    vehicle.fullName ||
    vehicle.ownerName ||
    vehicle.driverName ||
    '',
  );
  const className = normalizeClass(
    entryMatch.className ||
    entryMatch.class ||
    vehicle.className ||
    vehicle.raceClass ||
    vehicle.class ||
    '',
  );

  return { vehicleId, tx, driver, fullName, className, classKey: textKey(className) };
}

function classMatches(link = {}, row = {}, target = {}) {
  if (!target.classKey) return true;
  const linkKey = textKey(link.className || '');
  if (linkKey) return linkKey.includes(target.classKey) || target.classKey.includes(linkKey);

  const rowKey = textKey(row.className || '');
  if (!rowKey) return true;
  return rowKey.includes(target.classKey) || target.classKey.includes(rowKey);
}

function rowMatchesTarget(row = {}, target = {}, link = {}) {
  const txOk = target.tx && row.tx && target.tx === row.tx;
  const driverOk = target.driver && row.driverKey && (row.driverKey === target.driver || row.driverKey.includes(target.driver) || target.driver.includes(row.driverKey));
  const fullNameOk = target.fullName && row.driverKey && (row.driverKey === target.fullName || row.driverKey.includes(target.fullName) || target.fullName.includes(row.driverKey));

  return classMatches(link, row, target) && (txOk || driverOk || fullNameOk);
}

function buildBestLineup(currentBest, candidate) {
  return pickPreferredLineup(currentBest, candidate);
}

export async function findRaceLineupsForVehicles(options = {}) {
  const { eventUrl = '', siteUrl = '', vehicles = [], entryMatches = [], eventHtml = '', fetchText = fetchLiveRcText, debug = false } = options;
  if (!eventUrl) return [];

  const html = eventHtml || (await fetchText(eventUrl));
  const links = parseRaceLineupLinksFromEventHtml(html, { eventUrl, siteUrl });
  const entryByVehicle = new Map((entryMatches || []).map((entry) => [String(entry.vehicleId || entry.id || ''), entry]));
  const targets = (vehicles || []).map((vehicle) => getTargetInfo(vehicle, entryByVehicle.get(getVehicleId(vehicle)) || {}));
  const byVehicle = new Map();

  if (debug) {
    console.log(DEBUG_PREFIX, 'lineup links found', { count: links.length, sample: links.slice(0, 8).map((link) => ({ roundLabel: link.roundLabel, raceNumber: link.raceNumber, className: link.className, url: link.url })) });
  }

  for (const link of links) {
    let lineupHtml = '';
    try {
      lineupHtml = await fetchText(link.url);
    } catch (error) {
      if (debug) console.log(DEBUG_PREFIX, 'lineup page failed', { url: link.url, message: error?.message });
      continue;
    }

    const rows = parseLineupRowsFromHtml(lineupHtml, link);
    if (debug) console.log(DEBUG_PREFIX, 'lineup rows parsed', { roundLabel: link.roundLabel, raceNumber: link.raceNumber, className: link.className, rows: rows.length });

    for (const target of targets) {
      if (!target.vehicleId) continue;
      const matchedRow = rows.find((row) => rowMatchesTarget(row, target, link));
      if (!matchedRow) continue;

      const lineup = {
        vehicleId: target.vehicleId,
        tx: target.tx,
        driver: matchedRow.driver || target.driver || target.fullName || '',
        className: target.className || matchedRow.className || link.className || '',
        raceNumber: matchedRow.raceNumber || link.raceNumber,
        raceLabel: matchedRow.raceNumber ? `Race ${matchedRow.raceNumber}` : (link.raceNumber ? `Race ${link.raceNumber}` : link.raceLabel),
        roundLabel: matchedRow.roundLabel || link.roundLabel,
        roundType: matchedRow.roundType || link.roundType,
        roundNum: Number(matchedRow.roundNum || link.roundNum || 0),
        lineupUrl: link.url,
        source: 'Race Lineups & Entry List',
        updatedAt: new Date().toISOString(),
      };

      byVehicle.set(target.vehicleId, buildBestLineup(byVehicle.get(target.vehicleId), lineup));
    }
  }

  return Array.from(byVehicle.values());
}

export function getBestLineupForVehicle(lineups = [], vehicle = {}, entryMatch = {}) {
  const target = getTargetInfo(vehicle, entryMatch);
  const matches = (lineups || []).filter((lineup) => String(lineup.vehicleId || '') === target.vehicleId);
  return matches.reduce((best, lineup) => pickPreferredLineup(best, lineup), null);
}
