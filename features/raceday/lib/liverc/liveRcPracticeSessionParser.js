import { normalizePracticeUrl } from './liveRcPracticeUrls';
import { getAnchors, getRows } from './liveRcHtml';

function decodeHtml(value = '') {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(value = '') {
  return decodeHtml(
    String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
}

function normalizeTx(value = '') {
  return String(value || '').replace(/[^0-9]/g, '');
}

function splitCells(rowHtml = '') {
  const cells = [];
  const regex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let match;
  while ((match = regex.exec(String(rowHtml || '')))) {
    cells.push(stripTags(match[1]));
  }
  return cells;
}

function parseDriverClassCell(text = '') {
  const clean = decodeHtml(text);
  const txMatch = clean.match(/\((\d{3,})\)\s*$/);
  const transponder = txMatch ? txMatch[1] : normalizeTx(clean.match(/\bTX\s*[:#]?\s*(\d{3,})\b/i)?.[1] || '');
  const withoutTx = txMatch ? clean.slice(0, txMatch.index).trim() : clean;

  const lines = withoutTx
    .split(/\s{2,}|\n|\r|\t/g)
    .map((item) => item.trim())
    .filter(Boolean);

  // LiveRC practice pages usually show driver above class inside the same cell.
  // When tag stripping collapses the text, fall back to the first title-case looking chunk.
  let driver = lines[0] || '';
  let className = lines.slice(1).join(' ').trim();

  if (!className && withoutTx) {
    const parts = withoutTx.split(/(?=\b(?:TOUR|[0-9]+\.?[0-9]*|Novice|Sportsman|Nascar|Slash|Grom|Eurotruck)\b)/i);
    if (parts.length > 1) {
      driver = parts[0].trim();
      className = parts.slice(1).join(' ').trim();
    }
  }

  return {
    driver: driver || withoutTx,
    className,
    transponder,
  };
}

function parseFastAvgCell(text = '') {
  const clean = decodeHtml(text);
  const fast = clean.match(/\bFast\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] || '';
  const avg = clean.match(/\bAvg\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] || '';
  return { fastLap: fast, avgLap: avg };
}

function parseLapsLengthCell(text = '') {
  const clean = decodeHtml(text);
  const parts = clean.split(/\s+/).filter(Boolean);
  const lapCount = Number(parts.find((part) => /^\d+$/.test(part)) || 0) || 0;
  const length = parts.find((part) => /^\d{1,2}:\d{1,2}(?:\.\d+)?$/.test(part)) || '';
  return { lapCount, totalTime: length };
}

function normalizePracticeTime(value = '', dayKey = '') {
  const clean = decodeHtml(value);
  if (!clean) return '';
  if (!dayKey || !/^20\d{2}-\d{2}-\d{2}$/.test(dayKey)) return clean;

  const match = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return clean;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const second = Number(match[3] || 0);
  const suffix = String(match[4] || '').toLowerCase();
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  return `${dayKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

function makePracticeSessionId({ dayKey, vehicleId, tx, time, index }) {
  return [dayKey, vehicleId, tx, time, index]
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getPracticeSessionLink(row, siteUrl) {
  if (!siteUrl) return null;
  const base = new URL(siteUrl);
  for (const { href } of getAnchors(row)) {
    try {
      const url = new URL(href, base);
      const id = url.searchParams.get('id');
      if (url.origin === base.origin && /^\/practice\/?$/i.test(url.pathname)
          && url.searchParams.get('p') === 'view_session' && /^\d+$/.test(id || '')) {
        return { id, url: url.toString() };
      }
    } catch {
      // Ignore malformed links in the list.
    }
  }
  return null;
}

export function parsePracticeSessionDetail(html, { transponder }) {
  const fields = new Map(getRows(html).map((row) => {
    const [label, value] = splitCells(row);
    return [label?.toLowerCase(), value || ''];
  }));
  if (!transponder || normalizeTx(fields.get('transponder')) !== transponder) return null;

  const script = html.match(/\b(?:var|let|const)\s+lapsObj\s*=\s*(\[[\s\S]*?\])\s*;/)?.[1];
  let entries = [];
  if (script) {
    try {
      const data = JSON.parse(script);
      if (Array.isArray(data)) entries = data.map((lap) => ({
        lapNumber: Number(lap?.x),
        lapTime: String(lap?.lap_time ?? ''),
        invalid: lap?.is_valid === false || String(lap?.is_valid) === '0',
      }));
    } catch {
      // Older pages may only have the displayed lap list.
    }
  }
  if (!entries.length) {
    const lapList = html.match(/class=["'][^"']*\blaps_list\b[^"']*["'][^>]*>([\s\S]*?)(?:<div>\s*<em>|<\/section>|$)/i)?.[1] || '';
    entries = [...stripTags(lapList).matchAll(/\bLap\s+(\d+)\s*:\s*((?:\d+:)?\d+(?:\.\d+)?)(\s*\*)?/gi)]
      .map(([, number, time, invalid]) => ({ lapNumber: Number(number), lapTime: time, invalid: Boolean(invalid) }));
  }
  const laps = entries.filter(({ lapNumber, lapTime }) => Number.isInteger(lapNumber) && lapNumber > 0
    && /^(?:\d+:)?\d+(?:\.\d+)?$/.test(lapTime) && Number(lapTime.replace(':', '')) > 0)
    .sort((a, b) => a.lapNumber - b.lapNumber);

  const averages = fields.get('averages') || '';
  const sessionTime = fields.get('session time') || '';
  const metrics = {
    fastLap: fields.get('fastest lap'),
    avgLap: averages.match(/\bAvg:\s*([\d:.]+)/i)?.[1],
    top5Avg: averages.match(/\bTop 5:\s*([\d:.]+)/i)?.[1],
    top10Avg: averages.match(/\bTop 10:\s*([\d:.]+)/i)?.[1],
    top15Avg: averages.match(/\bTop 15:\s*([\d:.]+)/i)?.[1],
    stdDeviation: averages.match(/\bStd Deviation:\s*([\d:.]+)/i)?.[1],
    consistency: averages.match(/\bConsistency:\s*([\d.]+\s*%?)/i)?.[1]?.trim(),
    totalTime: sessionTime.match(/\bLength of Session:\s*([\d:.]+)/i)?.[1],
  };
  return { ...Object.fromEntries(Object.entries(metrics).filter(([, value]) => value)), laps };
}

export function getVehicleTransponder(vehicle = {}) {
  const fields = [
    vehicle.transponder,
    vehicle.transponderNumber,
    vehicle.transponderId,
    vehicle.tx,
    vehicle.txNumber,
    vehicle.personalTransponder,
    vehicle.pt,
  ];
  for (const field of fields) {
    const tx = normalizeTx(field);
    if (tx) return tx;
  }
  return '';
}

export function parsePracticeSessionsFromHtml(html = '', {
  vehicle = {},
  vehicleId = '',
  raceDayId = '',
  practiceDay = {},
  siteUrl = '',
} = {}) {
  const targetTx = getVehicleTransponder(vehicle);
  const dayKey = practiceDay?.key || practiceDay?.dateKey || '';
  if (!targetTx) return [];

  const rows = getRows(html);
  const sessions = [];

  rows.forEach((row, index) => {
    const rowText = stripTags(row);
    if (!rowText || !rowText.includes(targetTx)) return;

    const cells = splitCells(row);
    if (cells.length < 4) return;

    const driverClass = parseDriverClassCell(cells[0] || rowText);
    if (driverClass.transponder !== targetTx) return;

    const timeText = (cells[1] || '').replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+(?=\d)/, '');
    const lapsLength = parseLapsLengthCell(cells[2] || '');
    const fastAvg = parseFastAvgCell(cells[3] || rowText);
    const startedAt = normalizePracticeTime(timeText, dayKey);
    const detail = getPracticeSessionLink(row, siteUrl);
    const sessionId = makePracticeSessionId({ dayKey, vehicleId, tx: targetTx, time: detail ? '' : timeText, index: detail?.id || index });

    sessions.push({
      id: sessionId,
      sessionId,
      raceDayId,
      vehicleId,
      practiceDayKey: dayKey,
      practiceDayLabel: practiceDay?.label || practiceDay?.dateLabel || dayKey,
      practiceUrl: normalizePracticeUrl(practiceDay?.practiceUrl || '', siteUrl),
      detailUrl: detail?.url || '',
      source: 'liverc-practice',
      driver: driverClass.driver,
      className: driverClass.className,
      transponder: targetTx,
      label: timeText ? `Practice • ${timeText}` : `Practice ${index + 1}`,
      startTime: startedAt,
      startedAt,
      endedAt: startedAt,
      timeText,
      lapCount: lapsLength.lapCount,
      lapsCompleted: lapsLength.lapCount,
      totalTime: lapsLength.totalTime,
      fastLap: fastAvg.fastLap,
      avgLap: fastAvg.avgLap,
      raw: {
        rowText,
        cells,
      },
    });
  });

  return sessions;
}
