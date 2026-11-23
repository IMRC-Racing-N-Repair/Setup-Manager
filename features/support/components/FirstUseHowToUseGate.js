import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGuidedTour } from './GuidedTour';

export const HOW_TO_USE_SEEN_KEY = '@imrc_how_to_use_seen_v1';
let offered = false;

export default function FirstUseHowToUseGate() {
  const { invite } = useGuidedTour();
  useEffect(() => {
    let mounted = true;
    async function check() {
      const seen = await AsyncStorage.getItem(HOW_TO_USE_SEEN_KEY).catch(() => null);
      if (!mounted || offered || seen === '1') return;
      offered = true;
      invite();
      await AsyncStorage.setItem(HOW_TO_USE_SEEN_KEY, '1').catch(() => {});
    }
    check();
    return () => { mounted = false; };
  }, [invite]);
  return null;
}
