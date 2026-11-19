import { normalizeLiveRcSiteUrl } from './liveRcUrls';

const DEFAULT_TIMEOUT_MS = 15000;

function proxyUrl(target) {
  return `/api/liverc?url=${encodeURIComponent(String(target || ''))}`;
}

export async function fetchLiveRcText(url, options = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(proxyUrl(url), {
      method: 'GET',
      headers: { Accept: 'text/html,text/plain,*/*' },
      signal: controller?.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      let message = `LiveRC request failed: ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error) message = parsed.error;
      } catch {}
      const error = new Error(message);
      error.status = response.status;
      error.url = url;
      error.bodyPreview = text.slice(0, 500);
      throw error;
    }
    return text;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function connectToLiveRc(siteUrl) {
  const normalized = normalizeLiveRcSiteUrl(siteUrl);
  if (!normalized) throw new Error('LiveRC URL is required.');
  const html = await fetchLiveRcText(normalized);
  return {
    siteUrl: normalized,
    ok: /LiveRC|view_event|results/i.test(html),
    html,
  };
}
