import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

function ComparisonPlot({ drivers, hiddenDrivers }) {
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
        <Svg accessibilityRole="image" accessibilityLabel={`Lap times for ${visible.map(({ name }) => name).join(', ')}`} width="100%" height={142} viewBox="0 0 600 120" preserveAspectRatio="none" style={styles.svg}>
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

export default function RaceDayDesktopStandings({ rows, run, buildStats, displayPosition, makeRowKey }) {
  const [hiddenDrivers, setHiddenDrivers] = useState(() => new Set());
  const [expandedKey, setExpandedKey] = useState(null);
  const drivers = useMemo(() => rows.map((row, index) => {
    const laps = getTimedLaps(row);
    return {
      row,
      id: makeRowKey(row, index),
      name: clean(row.driver || row.driverName),
      color: colorForDriver(index),
      laps: laps.length || !row.isMe ? laps : getTimedLaps(run || {}),
    };
  }), [rows, run, makeRowKey]);
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
    <View style={styles.standings}>
      <View style={styles.chart}>
        <View style={styles.chartHeader}>
          <Text accessibilityRole="header" style={styles.title}>Lap time comparison</Text>
          {chartable.length > 1 && active.length < chartable.length && (
            <Pressable accessibilityRole="button" onPress={() => setHiddenDrivers(new Set())} style={styles.button}>
              <Text style={styles.buttonText}>Show all</Text>
            </Pressable>
          )}
        </View>
        {active.length ? <ComparisonPlot drivers={chartable} hiddenDrivers={hiddenDrivers} /> : (
          <Text style={styles.axisText}>{chartable.length ? 'Select a driver to show laps.' : 'Lap-by-lap times are unavailable for these results.'}</Text>
        )}
        {!!drivers.length && (
          <View style={styles.legend}>
            {drivers.map(({ id, name, color, laps }) => {
              const selected = !!laps.length && !hiddenDrivers.has(id);
              return (
                <Pressable key={id} accessibilityRole="checkbox" aria-checked={selected}
                  accessibilityLabel={laps.length ? name : `${name}, no lap times`} disabled={!laps.length}
                  onPress={() => toggleDriver(id)} style={[styles.legendButton, selected && { borderColor: color }]}>
                  <View aria-hidden style={[styles.dot, { backgroundColor: color, opacity: selected ? 1 : 0.48 }]} />
                  <Text style={[styles.legendName, selected && { color }]}>{name}{laps.length ? '' : ' · No laps'}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={[styles.row, styles.head]}>
        <Text style={[styles.label, styles.identity]}>Driver</Text>
        {buildStats().slice(0, 3).map((stat) => <Text key={stat.key} style={[styles.label, styles.number]}>{stat.label}</Text>)}
        <View style={styles.actionCell} />
      </View>
      {drivers.map(({ row, id, name, color }) => {
        const expanded = expandedKey === id;
        const stats = buildStats(row);
        return (
          <View key={id} style={[styles.driver, row.isMe && styles.myDriver]}>
            <View style={styles.row}>
              <View style={[styles.identity, styles.driverIdentity]}>
                <Text style={[styles.position, { color }]}>P{displayPosition(row)}</Text>
                <View style={styles.driverCopy}>
                  <Text style={styles.name}>{name}</Text>
                  {row.isMe && <Text style={styles.me}>Selected driver</Text>}
                </View>
              </View>
              {stats.slice(0, 3).map((stat) => <Text key={stat.key} style={[styles.value, styles.number]}>{clean(stat.value)}</Text>)}
              <Pressable accessibilityRole="button" accessibilityLabel={`${expanded ? 'Hide' : 'Show'} details for ${name}`}
                aria-expanded={expanded} onPress={() => setExpandedKey(expanded ? null : id)}
                style={[styles.button, styles.actionCell]}>
                <Text style={styles.buttonText}>{expanded ? 'Hide details' : 'Details'}</Text>
              </Pressable>
            </View>
            {expanded && (
              <View style={styles.stats}>
                {stats.slice(3).map((stat) => (
                  <View key={stat.key} style={styles.stat}>
                    <Text style={styles.label}>{stat.label}</Text>
                    <Text style={styles.value}>{clean(stat.value)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  standings: { width: '100%', paddingBottom: 8 },
  chart: { backgroundColor: colors.bg, borderRadius: 10, padding: 14, gap: 10, marginBottom: 12 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  plot: { flexDirection: 'row', alignItems: 'stretch', gap: 6 },
  svg: { flex: 1, width: 0 },
  yAxis: { width: 61, justifyContent: 'space-between' },
  axisText: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  xAxis: { marginLeft: 67, flexDirection: 'row', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 9, minHeight: 36, maxWidth: '100%' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendName: { color: colors.muted, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  driver: { borderBottomWidth: 1, borderBottomColor: colors.border },
  myDriver: { backgroundColor: colors.accentSofter },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9 },
  head: { minHeight: 35, borderBottomWidth: 1, borderBottomColor: colors.border },
  identity: { flex: 2, minWidth: 0 },
  driverIdentity: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  driverCopy: { flex: 1, minWidth: 0 },
  position: { fontSize: 14, fontWeight: '800', minWidth: 29, fontVariant: ['tabular-nums'] },
  name: { color: colors.text, fontSize: 15, fontWeight: '800' },
  me: { color: '#A6CDFF', fontSize: 11, marginTop: 2 },
  number: { flex: 1, minWidth: 0 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  value: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  actionCell: { width: 90 },
  button: { minHeight: 36, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt, borderRadius: 6 },
  buttonText: { color: '#A6CDFF', fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 10 },
  stat: { minWidth: 84, gap: 3 },
});
