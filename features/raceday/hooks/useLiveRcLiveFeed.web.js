import useLiveRcFeedLifecycle from './useLiveRcFeedLifecycle';
import { getLiveRcProxyUrl } from '../lib/liverc/liveRcClient.web';

const browserTransport = {
  XHRImpl: null,
  WebSocketImpl: function BrowserSocket(url) {
    return new WebSocket(url);
  },
  fetchImpl(url, options) {
    const host = new URL(url).hostname;
    if (host === 'liverc.com' || host.endsWith('.liverc.com')) {
      return fetch(getLiveRcProxyUrl(url), options);
    }

    // LiveRC's realtime endpoint allows browser origins. Let the browser
    // supply those headers for its credentialed polling and handshake calls.
    const headers = new Headers(options.headers);
    headers.delete('Origin');
    headers.delete('Referer');
    return fetch(url, { ...options, headers });
  },
};

export default function useLiveRcLiveFeed(siteUrl = '', enabled = true) {
  return useLiveRcFeedLifecycle(siteUrl, enabled, browserTransport);
}

export { useLiveRcLiveFeed };
