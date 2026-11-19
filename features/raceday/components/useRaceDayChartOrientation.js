import { useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

let chartCount = 0;
let pendingOrientation = Promise.resolve();
let restoreOrientation;

function updateOrientation() {
  // Serialize locks and restores if a chart closes during a rotation or
  // another chart opens while the previous modal is dismissing.
  pendingOrientation = pendingOrientation.then(async () => {
    if (chartCount > 0 && !restoreOrientation) {
      const orientation = await import('expo-screen-orientation');
      const previous = await orientation.getOrientationLockAsync();
      if (!chartCount) return;
      await orientation.lockAsync(orientation.OrientationLock.LANDSCAPE);
      restoreOrientation = previous === orientation.OrientationLock.OTHER
        ? orientation.unlockAsync
        : () => orientation.lockAsync(previous);
    } else if (!chartCount && restoreOrientation) {
      await restoreOrientation();
      restoreOrientation = undefined;
    }
  }).catch((error) => {
    // Keep the chart usable in clients or windows that cannot rotate.
    console.warn('[RaceDay chart] Could not change screen orientation', error);
  });
}

export default function useRaceDayChartOrientation(active) {
  const { width, height } = useWindowDimensions();
  const phone = Platform.OS === 'ios'
    ? !Platform.isPad && !Platform.isTV
    : Platform.OS === 'android' && Math.min(width, height) < 600 && !Platform.isTV;

  useEffect(() => {
    if (!active || !phone) return;
    chartCount += 1;
    updateOrientation();
    return () => {
      chartCount -= 1;
      updateOrientation();
    };
  }, [active, phone]);
}
