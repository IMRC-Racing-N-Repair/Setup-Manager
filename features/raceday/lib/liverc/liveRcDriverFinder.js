import { parseEntryTables } from './liveRcEntryList';
import { cleanClassName, findClassForRowInTable } from './liveRcClassFinder';
import { getCells, parseHiddenName, stripTags, textKey } from './liveRcHtml';

function cleanDriverNickname(value = '', fullName = '') {
  const cleanedFull = String(fullName || '').replace(/\s+/g, ' ').trim();
  const cleaned = String(value || '')
    .replace(/\b\d{5,}\b/g, ' ')
    .replace(/^\s*#?\d{1,3}\s+/, '')
    .replace(/^(driver|name|transponder|tx|car|position|pos)\s*[:#-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  if (textKey(cleaned) === textKey(cleanedFull)) return '';
  return cleaned;
}

function extractDriverNickname(rowHtml = '', fullName = '') {
  const rowWithoutHidden = rowHtml.replace(/<span\b[^>]*class=["'][^"']*hidden[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, ' ');
  const cells = getCells(rowWithoutHidden);
  const joined = cells.join(' ').replace(/\s+/g, ' ').trim();
  const txFree = joined.replace(/\b\d{5,}\b/g, '').trim();
  const cleanedFull = String(fullName || '').replace(/\s+/g, ' ').trim();
  if (!txFree) return '';
  if (textKey(txFree) === textKey(cleanedFull)) return '';

  const parts = txFree.split(/\s{2,}|\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  const candidate = parts.find((part) => textKey(part) !== textKey(cleanedFull)) || txFree;
  return cleanDriverNickname(candidate, cleanedFull);
}

function rowMatchesTransponder(rowText = '', transponder = '') {
  if (!transponder) return false;
  const pattern = new RegExp(`(^|\\D)${String(transponder).replace(/[^0-9]/g, '')}(\\D|$)`);
  return pattern.test(rowText.replace(/\s+/g, ' '));
}

function rowMatchesName(rowText = '', searchName = '') {
  if (!searchName) return false;
  return textKey(rowText).includes(textKey(searchName));
}

function classMatchesSelection(detectedClass = '', selectedClass = '') {
  const selectedKey = textKey(selectedClass);
  if (!selectedKey) return true;
  const detectedKey = textKey(detectedClass);
  if (!detectedKey) return false;
  return detectedKey.includes(selectedKey) || selectedKey.includes(detectedKey);
}

function getRowTransponder(rowText = '') {
  return String(rowText || '').match(/\b(\d{5,9})\b/)?.[1] || '';
}

function buildDriverMatch(table, row, search = {}, matchedBy = '') {
  const rowText = stripTags(row.rowHtml);
  const detectedFullName = parseHiddenName(row.rowHtml) || String(search.fullName || '').toUpperCase();
  const detectedNickname = extractDriverNickname(row.rowHtml, detectedFullName)
    || cleanDriverNickname(search.nickname, detectedFullName)
    || detectedFullName;
  const detectedClass = cleanClassName(findClassForRowInTable(table.tableHtml, row.rowIndex));

  if (matchedBy === 'driver-class' && !classMatchesSelection(detectedClass, search.className)) return null;

  return {
    transponder: getRowTransponder(rowText) || search.transponder || '',
    fullName: detectedFullName,
    nickname: detectedNickname,
    displayName: detectedNickname || detectedFullName,
    className: detectedClass,
    matchedBy,
    tableIndex: table.tableIndex,
    rowIndex: row.rowIndex,
    rowText,
  };
}

export function findDriverInEntryList(entryHtml = '', {
  transponder,
  fullName,
  nickname,
  className,
  raceClass,
  selectedClass,
} = {}, { debug } = {}) {
  const tables = parseEntryTables(entryHtml);
  const tx = String(transponder || '').replace(/[^0-9]/g, '');
  const expectedClass = cleanClassName(className || raceClass || selectedClass || '');
  const search = { transponder: tx, fullName, nickname, className: expectedClass };
  debug?.add?.('driverFinder:start', { tx, fullName, nickname, expectedClass, tableCount: tables.length });

  // First choice: an exact TX/transponder match.
  if (tx) {
    for (const table of tables) {
      for (const row of table.rows) {
        const rowText = stripTags(row.rowHtml);
        if (!rowMatchesTransponder(rowText, tx)) continue;
        const result = buildDriverMatch(table, row, search, 'transponder');
        debug?.add?.('driverFinder:matched', result);
        return result;
      }
    }
    debug?.add?.('driverFinder:txNotFound', { tx });
  }

  // Second choice: the selected driver in the selected class. This keeps a
  // stale vehicle TX from blocking RaceDay while avoiding same-name matches in
  // another class.
  if (fullName || nickname) {
    for (const table of tables) {
      for (const row of table.rows) {
        const rowText = stripTags(row.rowHtml);
        if (!rowMatchesName(rowText, nickname) && !rowMatchesName(rowText, fullName)) continue;
        const result = buildDriverMatch(table, row, search, 'driver-class');
        if (!result) continue;
        debug?.add?.('driverFinder:matched', result);
        return result;
      }
    }
  }

  debug?.add?.('driverFinder:notFound', { tx, fullName, nickname, expectedClass });
  return null;
}

