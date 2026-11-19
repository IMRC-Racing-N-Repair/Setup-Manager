import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { AppColors } from '../../../src/theme/colors';
import { getCompareValue } from '../lib/raceDayCompare';

function getLapSeconds(value) {
  const text = String(value ?? '').trim().replace(/s$/i, '').trim();
  if (!/^(?:\d+:)?\d+(?:\.\d+)?$/.test(text)) return 0;
  const parts = text.split(':').map(Number);
  return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
}

function LapPlot({ laps, detailed }) {
  const first = laps[0].number;
  const last = laps[laps.length - 1].number;
  const best = laps.reduce((fastest, lap) => !lap.invalid && (!fastest || lap.seconds < fastest.seconds) ? lap : fastest, null);
  const fastest = laps.reduce((min, lap) => Math.min(min, lap.seconds), Infinity);
  const slowest = laps.reduce((max, lap) => Math.max(max, lap.seconds), 0);
  const span = slowest - fastest;
  const x = (lap) => 8 + (lap.number - first) / (last - first || 1) * 344;
  const y = (lap) => span ? 10 + (slowest - lap.seconds) / span * 64 : 42;
  const points = laps.map((lap) => `${x(lap)},${y(lap)}`).join(' ');

  return (
    <View style={styles.plot}>
      <Svg accessibilityRole="image" accessibilityLabel={best ? `Lap progression. Fastest lap ${best.number} at ${best.seconds.toFixed(3)} seconds.` : 'Lap progression. No valid laps.'} width="100%" height={detailed ? 158 : 94} viewBox="0 0 360 84" preserveAspectRatio="none">
        {[10, 42, 74].map((position) => (
          <Line key={position} x1={8} x2={352} y1={position} y2={position} stroke={AppColors.border} vectorEffect="non-scaling-stroke" />
        ))}
        {laps.length > 1 && <Polyline points={points} fill="none" stroke="#82B9FF" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {laps.filter((lap) => lap.invalid).map((lap) => <Circle key={lap.number} cx={x(lap)} cy={y(lap)} r={3} fill="#FFB479" />)}
        {best && <Circle cx={x(best)} cy={y(best)} r={3} fill="#74DFAB" />}
      </Svg>
      {detailed && <Text style={styles.caption}>Lap time range · {fastest.toFixed(3)}–{slowest.toFixed(3)} s</Text>}
      <View style={styles.axis}>
        <Text style={styles.caption}>Lap {first}</Text>
        {best && <Text style={styles.caption}>Best {best.seconds.toFixed(3)}s · Lap {best.number}</Text>}
        {last !== first && <Text style={styles.caption}>Lap {last}</Text>}
      </View>
    </View>
  );
}

export function getTimedLaps(run) {
  const entries = Array.isArray(run.stats?.laps) && run.stats.laps.length ? run.stats.laps : run.laps;
  return (Array.isArray(entries) ? entries : []).map((lap) => ({
    number: Number(lap?.lapNumber ?? lap?.lap),
    seconds: getLapSeconds(lap?.lapTime ?? lap?.time ?? lap?.value),
    invalid: lap?.invalid === true,
  })).filter(({ number, seconds }) => Number.isInteger(number) && number > 0 && Number.isFinite(seconds) && seconds > 0)
    .sort((a, b) => a.number - b.number);
}

export default function RaceDayLapChart({ run, detailed = false }) {
  const laps = getTimedLaps(run);
  const consistencyValue = getCompareValue(run, 'consistency').trim();
  const consistency = /^\d+(?:\.\d+)?\s*%?$/.test(consistencyValue) ? Number.parseFloat(consistencyValue) : null;
  const hasConsistency = consistency !== null && consistency <= 100;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Lap progression</Text>
      {laps.length > 0
        ? <LapPlot laps={laps} detailed={detailed} />
        : <Text style={styles.caption}>Lap-by-lap times are unavailable for this run.</Text>}
      {hasConsistency && (
        <View style={styles.consistency}>
          <Text style={styles.caption}>Consistency</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${consistency}%` }]} />
          </View>
          <Text style={styles.value}>{consistency}%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 8, padding: 12, borderRadius: 9, gap: 8, backgroundColor: AppColors.surface },
  title: { color: AppColors.text, fontSize: 14, fontWeight: '700' },
  plot: { gap: 4 },
  axis: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 5 },
  caption: { color: AppColors.mutedText, fontSize: 12 },
  consistency: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  track: { flex: 1, height: 5, backgroundColor: AppColors.border, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#74DFAB' },
  value: { color: '#B5EBD2', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
