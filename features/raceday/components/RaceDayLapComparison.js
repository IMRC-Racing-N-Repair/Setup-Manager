import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { getTimedLaps } from './RaceDayLapChart';
import { raceDayColors as colors } from '../styles/raceDayStyles';

const driverColors = ['#81B9FF', '#FFB479', '#77DFC4', '#DFABFF', '#F6DA75', '#FF96B3', '#A3D885', '#86D7FA', '#C2B2FF', '#FFA5A0'];

function colorForDriver(index) {
  return driverColors[index] || `hsl(${Math.round(index * 137.508) % 360}, 76%, 73%)`;
}

function clean(value) {
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

function ComparisonPlot({ drivers, hiddenDrivers, compact }) {
  const visible = drivers.filter(({ id }) => !hiddenDrivers.has(id));
  const laps = drivers.flatMap((driver) => driver.laps);
  const lastLap = laps.reduce((max, lap) => Math.max(max, lap.number), 1);
  const low = laps.reduce((min, lap) => Math.min(min, lap.seconds), Infinity);
  const high = laps.reduce((max, lap) => Math.max(max, lap.seconds), 0);
  const min = low === high ? Math.max(0, low - 0.05) : low;
  const max = low === high ? high + 0.05 : high;
  const x = ({ number }) => 8 + (number - 1) / Math.max(1, lastLap - 1) * 584;
  const y = ({ seconds }) => 5 + (max - seconds) / (max - min) * 110;
  const ticks = [max, (max + min) / 2, min];

  return (
    <>
      <View style={styles.plot}>
        <View style={styles.yAxis}>
          {ticks.map((tick) => <Text key={tick} style={styles.axisText}>{tick.toFixed(3)} s</Text>)}
        </View>
        <Svg accessibilityRole="image" accessibilityLabel={`Lap times for ${visible.map(({ name }) => name).join(', ')}`} height={compact ? 112 : 142} viewBox="0 0 600 120" preserveAspectRatio="none" style={styles.svg}>
          {[5, 60, 115].map((height) => (
            <Line key={height} x1={8} x2={592} y1={height} y2={height} stroke={colors.border} vectorEffect="non-scaling-stroke" />
          ))}
          {visible.map(({ id, color, laps: times }) => times.length === 1 ? (
            <Circle key={id} cx={x(times[0])} cy={y(times[0])} r={3} fill={color} />
          ) : (
            <Polyline key={id} points={times.map((lap) => `${x(lap)},${y(lap)}`).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
        </Svg>
      </View>
      <View style={styles.xAxis}>
        <Text style={styles.axisText}>Lap 1</Text>
        {lastLap > 1 && <Text style={styles.axisText}>Lap {lastLap}</Text>}
      </View>
    </>
  );
}

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
  const [hiddenDrivers, setHiddenDrivers] = useState(() => new Set());
  const drivers = useMemo(() => {
    return rows.map((row, index) => {
      const laps = getTimedLaps(row);
      return {
        id: makeRowKey(row, index),
        name: clean(row.driver || row.driverName),
        color: colorForDriver(index),
        laps: laps.length || !row.isMe ? laps : getTimedLaps(run || {}),
      };
    });
  }, [rows, run, makeRowKey]);
  const chartable = drivers.filter(({ laps }) => laps.length);
  // Keep the same scale as drivers are toggled so lap times remain comparable.
  const active = chartable.filter(({ id }) => !hiddenDrivers.has(id));

  function toggleDriver(id) {
    setHiddenDrivers((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <View style={[styles.chart, compact && styles.chartCompact]}>
      <View style={[styles.chartHeader, compact && styles.chartHeaderCompact]}>
        <Text accessibilityRole="header" style={styles.title}>Lap time comparison</Text>
        {chartable.length > 1 && active.length < chartable.length && (
          <Pressable accessibilityRole="button" onPress={() => setHiddenDrivers(new Set())} style={styles.button}>
            <Text style={styles.buttonText}>Show all</Text>
          </Pressable>
        )}
      </View>
      {active.length ? <ComparisonPlot drivers={chartable} hiddenDrivers={hiddenDrivers} compact={compact} /> : (
        <Text style={styles.axisText}>{chartable.length ? 'Select a driver to show laps.' : 'Lap-by-lap times are unavailable for these results.'}</Text>
      )}
      {!!drivers.length && (
        <View style={styles.legend}>
          {drivers.map(({ id, name, color, laps }) => {
            const selected = !!laps.length && !hiddenDrivers.has(id);
            return (
              <Pressable key={id} accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled: !laps.length }}
                accessibilityLabel={laps.length ? name : `${name}, no lap times`} disabled={!laps.length}
                onPress={() => toggleDriver(id)} style={[styles.legendButton, compact && styles.legendButtonCompact, selected && { borderColor: color }]}>
                <View accessible={false} style={[styles.dot, { backgroundColor: color, opacity: selected ? 1 : 0.48 }]} />
                <Text style={[styles.legendName, selected && { color }]}>{name}{laps.length ? '' : ' · No laps'}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { backgroundColor: colors.bg, borderRadius: 10, padding: 14, gap: 10, marginBottom: 12 },
  chartCompact: { padding: 8, gap: 5, marginBottom: 6 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  chartHeaderCompact: { minHeight: 26 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  plot: { flexDirection: 'row', alignItems: 'stretch', gap: 6 },
  svg: { flex: 1, width: 0 },
  yAxis: { width: 61, justifyContent: 'space-between' },
  axisText: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  xAxis: { marginLeft: 67, flexDirection: 'row', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 9, minHeight: 44, maxWidth: '100%' },
  legendButtonCompact: { minHeight: 38 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendName: { color: colors.muted, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  button: { minHeight: 36, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt, borderRadius: 6 },
  buttonText: { color: '#A6CDFF', fontSize: 12, fontWeight: '700' },
});
