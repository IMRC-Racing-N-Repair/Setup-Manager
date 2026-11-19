import { StyleSheet, Text, View } from 'react-native';
import { AppColors } from '../theme/colors';

const corners = [
  ['LF', 'Left front'],
  ['RF', 'Right front'],
  ['LR', 'Left rear'],
  ['RR', 'Right rear'],
];

export default function CornerWeightChart({ weights }) {
  const values = corners.map(([key, label]) => {
    const raw = weights?.[key];
    return { key, label, value: raw == null || String(raw).trim() === '' ? NaN : Number(raw) };
  });
  if (values.some(({ value }) => !Number.isFinite(value) || value < 0)) return null;
  const total = values.reduce((sum, { value }) => sum + value, 0);
  if (total <= 0) return null;

  return (
    <View style={styles.chart}>
      <Text accessibilityRole="header" style={styles.title}>Corner weight distribution</Text>
      {values.map(({ key, label, value }) => {
        const share = value / total * 100;
        return (
          <View key={key} accessibilityLabel={`${label}, ${share.toFixed(1)}% of total`} style={styles.row}>
            <Text style={styles.corner}>{key}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${share}%` }]} />
            </View>
            <Text style={styles.value}>{share.toFixed(1)}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: 9, paddingVertical: 12, borderTopWidth: 1, borderTopColor: AppColors.border },
  title: { color: AppColors.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  corner: { color: AppColors.mutedText, fontSize: 12, fontWeight: '700', minWidth: 22 },
  track: { flex: 1, height: 6, backgroundColor: AppColors.border, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#82B9FF' },
  value: { minWidth: 49, textAlign: 'right', color: AppColors.text, fontSize: 12, fontVariant: ['tabular-nums'] },
});
