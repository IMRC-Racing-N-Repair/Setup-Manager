const DEFAULT_TIMEOUT_MS = 15000;

function allowedLiveRcUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:'
      && (host === 'liverc.com' || host.endsWith('.liverc.com'));
  } catch {
    return false;
  }
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const target = requestUrl.searchParams.get('url') || '';

  if (!allowedLiveRcUrl(target)) {
    return Response.json(
      { error: 'Only secure LiveRC track URLs are allowed.' },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(target, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
        'User-Agent': 'IMRC-Setup-Manager-Web/2.1 RaceDay',
      },
      signal: controller.signal,
    });

    if (response.url && !allowedLiveRcUrl(response.url)) {
      return Response.json({ error: 'LiveRC redirected to an unsupported address.' }, { status: 502 });
    }

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-IMRC-LiveRC-Proxy': '1',
      },
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return Response.json(
      { error: timedOut ? 'LiveRC timed out.' : 'LiveRC could not be reached.' },
      { status: timedOut ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
