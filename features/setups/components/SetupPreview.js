import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CornerWeightChart from '../../../src/components/CornerWeightChart';
import { AppColors as colors } from '../../../src/theme/colors';
import { getSetupHistory } from '../lib/setupStorage';
import { getTrackDisplayName } from '../lib/setupModel';

function setupTime(setup) {
  return new Date(setup?.savedAt || setup?.updatedAt || setup?.createdAt || 0).getTime() || 0;
}

function formatDate(setup) {
  const time = setupTime(setup);
  return time ? new Date(time).toLocaleString() : 'Date unavailable';
}

function Action({ children, onPress, primary = false, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary && styles.buttonPrimary, (pressed || disabled) && styles.dim]}
    >
      <Text style={[styles.buttonText, primary && styles.buttonPrimaryText]}>{children}</Text>
    </Pressable>
  );
}

const setupFields = [
  ['Spur', 'gearing', 'spur'],
  ['Pinion', 'gearing', 'pinion'],
  ['Tire diameter', 'gearing', 'tireDiameter'],
  ['Rollout', 'gearing', 'rollout'],
  ['Fast lap', 'results', 'fastLap'],
  ['Average lap', 'results', 'avgLap'],
  ['Cross weight', 'cornerWeights', 'crossWeight'],
];

function setupValue(setup, section, field) {
  return String(setup?.[section]?.[field] ?? '').trim();
}

export default function SetupPreview({ row, onOpen }) {
  const [history, setHistory] = useState([]);
  const [compare, setCompare] = useState(false);
  const { trackId, vehicleId, setup } = row;

  useEffect(() => {
    let current = true;
    getSetupHistory(vehicleId, trackId).then((versions) => {
      if (current) setHistory(versions);
    }).catch(() => {
      if (current) setHistory([]);
    });
    return () => { current = false; };
  }, [vehicleId, trackId, setup.id, setup.savedAt]);

  const earlier = history.find((version) => version.id !== setup.id && setupTime(version) < setupTime(setup));
  const previous = compare ? earlier : null;
  const fields = setupFields.map(([label, section, field]) => ({
    label,
    current: setupValue(setup, section, field),
    previous: setupValue(previous, section, field),
  })).filter((field) => field.current || field.previous);

  return (
    <View style={styles.preview}>
      <Text style={styles.sectionTitle}>{getTrackDisplayName(row.track)}</Text>
      <Text style={styles.muted}>Saved {formatDate(setup)}</Text>
      <Action primary onPress={() => onOpen(row)}>Open setup</Action>
      {earlier && <Action onPress={() => setCompare((value) => !value)}>{compare ? 'Hide comparison' : 'Compare previous save'}</Action>}
      {previous && <Text style={styles.muted}>Previous save · {formatDate(previous)}</Text>}
      {!!fields.length && (
        <View>
          {previous && (
            <View style={styles.field}>
              <Text style={[styles.muted, styles.identity]}>Setting</Text>
              <Text style={[styles.muted, styles.fieldValue]}>Current</Text>
              <Text style={[styles.muted, styles.fieldValue]}>Previous</Text>
            </View>
          )}
          {fields.map((field) => (
            <View key={field.label} style={styles.field}>
              <Text style={[styles.muted, styles.identity]}>{field.label}</Text>
              <Text style={[styles.name, styles.fieldValue]}>{field.current || '—'}</Text>
              {previous && <Text style={[styles.muted, styles.fieldValue]}>{field.previous || '—'}</Text>}
            </View>
          ))}
        </View>
      )}
      <CornerWeightChart weights={setup.cornerWeights} />
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flex: 1, minWidth: 0, gap: 4 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  muted: { color: colors.mutedText, fontSize: 13 },
  preview: { padding: 13, gap: 10, borderRadius: 10, backgroundColor: colors.surface },
  field: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldValue: { flex: 1, minWidth: 0, textAlign: 'right', fontVariant: ['tabular-nums'] },
  button: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, borderRadius: 7, paddingHorizontal: 10 },
  buttonPrimary: { backgroundColor: '#2366C5', borderColor: '#4A8DEA' },
  buttonText: { color: '#B6D5FF', fontSize: 13, fontWeight: '700' },
  buttonPrimaryText: { color: colors.textStrong },
  dim: { opacity: 0.55 },
});
