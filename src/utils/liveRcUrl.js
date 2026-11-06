const LIVERC_ROOT_HOST = 'liverc.com';

function clean(value = '') {
  return String(value ?? '').trim();
}

/**
 * Extract a genuine LiveRC hostname from user-entered text.
 *
 * Racers frequently paste addresses with a missing or misspelled protocol
 * (for example `htps\://track.liverc.com`). Finding the hostname first lets
 * us safely discard that broken prefix and rebuild one consistent HTTPS URL.
 */
export function getLiveRcHost(value = '') {
  const input = clean(value).toLowerCase();
  if (!input) return '';

  const pattern = /(?:^|[^a-z0-9-])((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*liverc\.com)(?![a-z0-9.-])/gi;
  const matches = [];
  let match;

  while ((match = pattern.exec(input)) !== null) {
    matches.push(match[1]);
  }

  for (const candidate of matches) {
    const host = candidate.toLowerCase().replace(/^www\./, '');
    if (host === LIVERC_ROOT_HOST || host.endsWith(`.${LIVERC_ROOT_HOST}`)) {
      return host;
    }
  }

  return '';
}

export function normalizeLiveRcOrigin(value = '') {
  const host = getLiveRcHost(value);
  return host ? `https://${host}` : '';
}

export function isLiveRcUrl(value = '') {
  return Boolean(normalizeLiveRcOrigin(value));
}
