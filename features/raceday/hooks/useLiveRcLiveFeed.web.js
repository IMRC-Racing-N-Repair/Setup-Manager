import { useMemo } from 'react';

import { EMPTY_LIVE_RC_STATE } from '../lib/liverc/liveRcLiveFeed';

export default function useLiveRcLiveFeed(siteUrl = '', enabled = true) {
  return useMemo(() => ({
    ...EMPTY_LIVE_RC_STATE,
    configured: Boolean(siteUrl),
    connection: enabled && siteUrl ? 'proxy-ready' : 'idle',
    debug: {
      step: enabled && siteUrl
        ? 'RaceDay web proxy ready'
        : 'Live feed not configured',
      lastError: '',
    },
  }), [enabled, siteUrl]);
}

export { useLiveRcLiveFeed };
