import React from 'react';
import RaceDayLapChart from './RaceDayLapChart';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaLayout } from '../../../src/layout/safeAreaLayout';
import { raceDayColors, raceDayStyles } from '../styles/raceDayStyles';

function clean(value) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function getRunValue(run = {}, key) {
  return clean(run[key] ?? run.stats?.[key] ?? run.result?.[key]);
}

function Stat({
  label,
  value,
  size,
  compareKey,
  activeCompareFields = [],
  onToggleCompareField,
}) {
  const selectable = Boolean(compareKey && onToggleCompareField);
  const selected = selectable && activeCompareFields.includes(compareKey);
  const Box = selectable ? TouchableOpacity : View;

  return (
    <Box
      style={[
        raceDayStyles.resultStatBox,
        size,
        selectable && raceDayStyles.resultStatBoxSelectable,
        selected && raceDayStyles.resultStatBoxSelected,
      ]}
      accessibilityRole={selectable ? 'button' : undefined}
      accessibilityState={selectable ? { selected } : undefined}
      onPress={selectable ? () => onToggleCompareField(compareKey) : undefined}
      activeOpacity={selectable ? 0.84 : 1}
    >
      <View style={raceDayStyles.resultStatHeaderRow}>
        <Text style={raceDayStyles.statLabel} numberOfLines={1}>{label}</Text>
        {selected ? <Text style={raceDayStyles.resultShownBadge}>Shown</Text> : null}
      </View>
      <Text style={raceDayStyles.resultStatValue} numberOfLines={1}>{clean(value)}</Text>
    </Box>
  );
}

function SectionTitle({ children }) {
  return <Text style={raceDayStyles.resultSectionTitle}>{children}</Text>;
}

export default function RaceDayResultCard({ run, compareFields = [], onToggleCompareField, onOpenTop5, onOpenRaceResults }) {
  const { modalAvailableWidth, fontScale } = useSafeAreaLayout({ horizontalGap: 6 });
  const readableWidth = Math.min(modalAvailableWidth, 900) / Math.max(fontScale, 1);
  const fitsDriverInRow = readableWidth >= 620;
  const fourColumns = readableWidth >= 430;
  const raceStatSize = fitsDriverInRow ? localStyles.raceStatWide : fourColumns ? localStyles.statQuarter : undefined;
  const averageStatSize = readableWidth >= 340 ? localStyles.statThird : undefined;

  if (!run) {
    return (
      <View style={raceDayStyles.empty}>
        <Text style={raceDayStyles.emptyText}>No synced race result yet.</Text>
      </View>
    );
  }

  const round = run.roundLabel || 'Race Result';
  const raceNumber = run.raceNumber ? `Race ${run.raceNumber}` : '';
  const resultType = run.resultType ? String(run.resultType).toUpperCase() : 'RACE';
  const hasRaceUrl = Boolean(run.raceUrl || run.resultUrl || run.url);

  return (
    <View style={raceDayStyles.resultDetailCard}>
      <View style={localStyles.resultHeader}>
        <View style={localStyles.resultHeading}>
          <Text style={localStyles.roundTitle}>{round}</Text>
          <Text style={localStyles.roundMeta}>
            {[raceNumber, run.className, resultType].filter(Boolean).join(' • ')}
          </Text>
        </View>
        <View style={localStyles.resultActionRow}>
          <TouchableOpacity
            style={[raceDayStyles.resultTop5Button, localStyles.resultActionButton, !hasRaceUrl && localStyles.disabledButton]}
            onPress={onOpenRaceResults ? () => onOpenRaceResults(run) : undefined}
            disabled={!hasRaceUrl}
            activeOpacity={0.82}
          >
            <Text style={raceDayStyles.resultTop5ButtonText}>Race Results</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[raceDayStyles.resultTop5Button, localStyles.resultActionButton]}
            onPress={onOpenTop5 ? () => onOpenTop5(run) : undefined}
            disabled={!onOpenTop5}
            activeOpacity={0.82}
          >
            <Text style={raceDayStyles.resultTop5ButtonText}>View Top 5</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={localStyles.sectionHeading}>
        <SectionTitle>Race</SectionTitle>
        <Text style={localStyles.dashboardHint}>Tap a stat to show or hide it on the dashboard</Text>
      </View>
      <View style={raceDayStyles.resultStatGrid}>
        <Stat label="Driver" value={run.driver || run.driverName || run.stats?.driverName} size={fitsDriverInRow ? localStyles.driverWide : localStyles.driverFull} />
        <Stat size={raceStatSize} label="Position" value={run.position} compareKey="position" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat size={raceStatSize} label="Laps/Time" value={getRunValue(run, 'lapsTime')} compareKey="lapsTime" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat size={raceStatSize} label="Fast Lap" value={getRunValue(run, 'fastestLap')} compareKey="fastestLap" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat size={raceStatSize} label="Avg Lap" value={getRunValue(run, 'avgLap')} compareKey="avgLap" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
      </View>

      <SectionTitle>Averages</SectionTitle>
      <View style={raceDayStyles.resultStatGrid}>
        <Stat size={averageStatSize} label="Avg Top 5" value={getRunValue(run, 'top5Avg')} compareKey="top5Avg" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat size={averageStatSize} label="Avg Top 10" value={getRunValue(run, 'top10Avg')} compareKey="top10Avg" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat size={averageStatSize} label="Avg Top 15" value={getRunValue(run, 'top15Avg')} compareKey="top15Avg" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
      </View>

      <SectionTitle>Consecutive / Consistency</SectionTitle>
      <View style={raceDayStyles.resultStatGrid}>
        <Stat size={fourColumns && localStyles.statQuarter} label="Top 2 Cons." value={getRunValue(run, 'top2Consecutive')} compareKey="top2Consecutive" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat size={fourColumns && localStyles.statQuarter} label="Top 3 Cons." value={getRunValue(run, 'top3Consecutive')} compareKey="top3Consecutive" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat size={fourColumns && localStyles.statQuarter} label="Std Dev" value={getRunValue(run, 'stdDeviation')} compareKey="stdDeviation" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat size={fourColumns && localStyles.statQuarter} label="Consistency" value={getRunValue(run, 'consistency')} compareKey="consistency" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
      </View>

      <RaceDayLapChart run={run} detailed compact />

      {Array.isArray(run.stats?.laps) && run.stats.laps.length ? (
        <>
          <SectionTitle>Laps</SectionTitle>
          <View style={raceDayStyles.lapListBox}>
            {run.stats.laps.slice(0, 80).map((lap, index) => (
              <View key={`${lap.lapNumber || index}_${lap.lapTime || ''}`} style={raceDayStyles.lapRow}>
                <Text style={raceDayStyles.lapNum}>L{lap.lapNumber || index + 1}</Text>
                <Text style={raceDayStyles.lapTime}>{lap.lapTime || '—'}</Text>
                <Text style={raceDayStyles.lapTotal}>{lap.totalTime || ''}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

export { RaceDayResultCard };

const localStyles = StyleSheet.create({
  resultHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  resultHeading: { flexGrow: 1, flexBasis: 158, minWidth: 0 },
  roundTitle: { color: raceDayColors.text, fontSize: 16, fontWeight: '900' },
  roundMeta: { color: raceDayColors.muted, fontSize: 11, marginTop: 2 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 },
  dashboardHint: { color: raceDayColors.muted, fontSize: 11, marginBottom: 4 },
  driverFull: { flexBasis: '100%' },
  driverWide: { flexBasis: '26%' },
  raceStatWide: { flexBasis: '16%' },
  statQuarter: { flexBasis: '23%' },
  statThird: { flexBasis: '31%' },
  resultActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  resultActionButton: {
    minHeight: 32,
    paddingHorizontal: 8,
  },
  disabledButton: {
    opacity: 0.45,
    borderColor: raceDayColors.border,
    backgroundColor: raceDayColors.cardAlt,
  },
});
