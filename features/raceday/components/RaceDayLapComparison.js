import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { getTimedLaps } from './RaceDayLapChart';
import RaceDayLapOverlay, { lapSeriesColor } from './RaceDayLapOverlay';

export function sortRaceDayStandings(rows, displayPosition) {
  const rank = (row) => {
    const position = Number(displayPosition(row));
    return Number.isInteger(position) && position > 0 ? position : Infinity;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b));
}

export default function RaceDayLapComparison({ rows, run, makeRowKey }) {
  const { width, height } = useWindowDimensions();
  const compact = width > height && height < 620;
  const drivers = useMemo(() => {
    return rows.map((row, index) => {
      const laps = getTimedLaps(row);
      return {
        id: makeRowKey(row, index),
        name: String(row.driver || row.driverName || '—'),
        color: lapSeriesColor(index),
        laps: laps.length || !row.isMe ? laps : getTimedLaps(run || {}),
      };
    });
  }, [rows, run, makeRowKey]);
  return <RaceDayLapOverlay series={drivers} compact={compact} />;
}
