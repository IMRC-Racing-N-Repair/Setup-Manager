import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { EMPTY_LIVE_RC_STATE, LiveRcLiveFeed } from '../lib/liverc/liveRcLiveFeed';

export default function useLiveRcLiveFeed(siteUrl = '', enabled = true) {
  const [liveState, setLiveState] = useState(() => ({
    ...EMPTY_LIVE_RC_STATE,
    configured: Boolean(siteUrl),
  }));

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      let feed = null;

      if (!enabled || !siteUrl) {
        setLiveState({ ...EMPTY_LIVE_RC_STATE, configured: false });
        return () => {
          mounted = false;
        };
      }

      feed = new LiveRcLiveFeed({
        siteUrl,
        onState: (nextState) => {
          if (mounted) setLiveState(nextState);
        },
      });

      const startIfActive = () => {
        if (AppState.currentState === 'active' || !AppState.currentState) feed?.start();
      };

      startIfActive();
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          feed?.start();
        } else {
          feed?.stop({ preserveState: true });
          if (mounted) {
            setLiveState((current) => ({ ...current, connection: 'paused' }));
          }
        }
      });

      return () => {
        mounted = false;
        subscription?.remove?.();
        feed?.stop({ preserveState: true });
        feed = null;
      };
    }, [enabled, siteUrl]),
  );

  return liveState;
}

export { useLiveRcLiveFeed };

