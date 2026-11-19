import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import RaceDayLapOverlay, { lapSeriesColor } from './RaceDayLapOverlay';
import { getTimedLaps } from './RaceDayLapChart';
import { raceDayColors as colors } from '../styles/raceDayStyles';

function clean(value) {
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

export default function RaceDayDesktopStandings({ rows, run, buildStats, displayPosition, makeRowKey, compact = false }) {
  const [expandedKey, setExpandedKey] = useState(null);
  const drivers = useMemo(() => {
    const ranked = rows.map((row, index) => {
      const position = displayPosition(row);
      const rank = Number(position);
      return { row, index, position, rank: Number.isInteger(rank) && rank > 0 ? rank : Infinity };
    });
    ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);

    return ranked.map(({ row, index, position }, colorIndex) => {
      const laps = getTimedLaps(row);
      return {
        row,
        id: makeRowKey(row, index),
        name: clean(row.driver || row.driverName),
        position,
        color: lapSeriesColor(colorIndex),
        laps: laps.length || !row.isMe ? laps : getTimedLaps(run || {}),
      };
    });
  }, [rows, run, displayPosition, makeRowKey]);

  return (
    <View style={styles.standings}>
      <RaceDayLapOverlay series={drivers} compact={compact} />

      {!compact && (
        <View style={[styles.row, styles.head]}>
          <Text style={[styles.label, styles.identity]}>Driver</Text>
          {buildStats().slice(0, 3).map((stat) => <Text key={stat.key} style={[styles.label, styles.number]}>{stat.label}</Text>)}
          <View style={styles.actionCell} />
        </View>
      )}
      {drivers.map(({ row, id, name, color, position }) => {
        const expanded = expandedKey === id;
        const stats = buildStats(row);
        return (
          <View key={id} style={[styles.driver, row.isMe && styles.myDriver]}>
            <View style={[styles.row, compact && styles.compactRow]}>
              <View style={[styles.identity, styles.driverIdentity]}>
                <Text style={[styles.position, { color }]}>P{position}</Text>
                <View style={styles.driverCopy}>
                  <Text style={styles.name}>{name}</Text>
                  {row.isMe && <Text style={styles.me}>Selected driver</Text>}
                </View>
              </View>
              {!compact && stats.slice(0, 3).map((stat) => <Text key={stat.key} style={[styles.value, styles.number]}>{clean(stat.value)}</Text>)}
              <Pressable accessibilityRole="button" accessibilityLabel={`${expanded ? 'Hide' : 'Show'} details for ${name}`}
                aria-expanded={expanded} onPress={() => setExpandedKey(expanded ? null : id)}
                style={[styles.button, styles.actionCell, compact && styles.touchTarget]}>
                <Text style={styles.buttonText}>{expanded ? 'Hide details' : 'Details'}</Text>
              </Pressable>
            </View>
            {compact && <StandingStats stats={stats.slice(0, 3)} compact />}
            {expanded && <StandingStats stats={stats.slice(3)} compact={compact} />}
          </View>
        );
      })}
    </View>
  );
}

function StandingStats({ stats, compact }) {
  return (
    <View style={[styles.stats, compact && styles.compactStats]}>
      {stats.map((stat) => (
        <View key={stat.key} style={[styles.stat, compact && styles.compactStat]}>
          <Text style={styles.label}>{stat.label}</Text>
          <Text style={styles.value}>{clean(stat.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  standings: { width: '100%', paddingBottom: 8 },
  driver: { borderBottomWidth: 1, borderBottomColor: colors.border },
  myDriver: { backgroundColor: colors.accentSofter },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9 },
  compactRow: { minHeight: 44, paddingVertical: 3, gap: 5 },
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
  touchTarget: { minHeight: 44 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 10 },
  compactStats: { gap: 6, paddingTop: 0, paddingBottom: 7 },
  compactStat: { flexBasis: '30%', flexGrow: 1, gap: 1, minWidth: 0 },
  stat: { minWidth: 84, gap: 3 },
});
