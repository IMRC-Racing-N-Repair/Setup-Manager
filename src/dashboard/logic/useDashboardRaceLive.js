import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import useLiveRcLiveFeed from '../../../features/raceday/hooks/useLiveRcLiveFeed';
import {
  getActiveRaceDay,
  getTrackById,
  getVehiclesByIds,
} from '../../../features/raceday/lib/raceDayStorage';
import { getRaceDayLineups } from '../../../features/raceday/lib/raceDayLineupStorage';
import { getLineupRaceNumber } from '../../../features/raceday/lib/raceDayLineupPriority';
import { getRaceDayLiveStatus } from '../../../features/raceday/lib/raceDayLiveStatus';

function clean(value) {
  return String(value ?? '').trim();
}

function numericRace(value) {
  const match = clean(value).match(/\d+/);
  return match ? Number(match[0]) || 0 : 0;
}

export function useDashboardRaceLive(raceDayReady) {
  const [context, setContext] = useState({ raceDay: null, track: null, vehicles: [], lineups: [] });

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const raceDay = await getActiveRaceDay();
          if (!raceDay || !raceDayReady) {
            if (mounted) setContext({ raceDay: null, track: null, vehicles: [], lineups: [] });
            return;
          }
          const [track, vehicles, lineups] = await Promise.all([
            getTrackById(raceDay.trackId),
            getVehiclesByIds(raceDay.vehicleIds || []),
            getRaceDayLineups(raceDay),
          ]);
          if (mounted) setContext({ raceDay, track, vehicles, lineups });
        } catch {
          if (mounted) setContext({ raceDay: null, track: null, vehicles: [], lineups: [] });
        }
      })();
      return () => { mounted = false; };
    }, [raceDayReady]),
  );

  const siteUrl = clean(context.track?.liveRcUrl || context.track?.livercUrl || context.raceDay?.siteUrl);
  const liveState = useLiveRcLiveFeed(siteUrl, Boolean(raceDayReady && siteUrl));
  const liveStatus = useMemo(
    () => getRaceDayLiveStatus(context.raceDay || {}, liveState),
    [context.raceDay, liveState],
  );

  const nextRace = useMemo(() => {
    const vehicleMap = new Map(
      context.vehicles.map((vehicle) => [clean(vehicle?.id || vehicle?.vehicleId), vehicle]),
    );
    const candidates = context.lineups
      .map((lineup) => {
        const raceNumber = getLineupRaceNumber(lineup);
        const raceOrder = numericRace(raceNumber);
        const vehicle = vehicleMap.get(clean(lineup?.vehicleId));
        return {
          ...lineup,
          raceNumber,
          raceOrder,
          vehicle,
          vehicleName: clean(vehicle?.name) || clean(lineup?.vehicleName) || 'Race vehicle',
          className: clean(lineup?.className || lineup?.class || vehicle?.className) || 'Class not listed',
        };
      })
      .filter((lineup) => lineup.raceOrder > 0)
      .sort((a, b) => a.raceOrder - b.raceOrder);

    const currentRace = numericRace(liveState?.raceNumber);
    if (!candidates.length) return null;
    if (!currentRace) return candidates[0];
    return candidates.find((lineup) => lineup.raceOrder > currentRace)
      || candidates.find((lineup) => lineup.raceOrder === currentRace)
      || candidates[0];
  }, [context.lineups, context.vehicles, liveState?.raceNumber]);

  return {
    raceDay: context.raceDay,
    selectedTrack: context.track,
    liveState,
    nextRace,
    ...liveStatus,
  };
}

export default useDashboardRaceLive;
