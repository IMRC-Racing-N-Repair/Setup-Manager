import { FieldGuide, useFieldGuide } from '../../support/components/FieldGuide';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCompareLabel, sortCompareFieldsForDashboard } from '../lib/raceDayCompare';
import RaceDayLapChart from './RaceDayLapChart';
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
  wide = false,
  third = false,
  desktop = false,
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
        wide && raceDayStyles.resultStatBoxWide,
        third && raceDayStyles.resultStatBoxThird,
        selectable && raceDayStyles.resultStatBoxSelectable,
        selected && raceDayStyles.resultStatBoxSelected,
        desktop && localStyles.desktopStat,
        desktop && wide && localStyles.desktopWideStat,
        desktop && selected && localStyles.desktopSelectedStat,
      ]}
      accessibilityRole={selectable ? 'button' : undefined}
      accessibilityState={selectable ? { selected } : undefined}
      onPress={selectable ? () => onToggleCompareField(compareKey) : undefined}
      activeOpacity={selectable ? 0.84 : 1}
    >
      <View style={raceDayStyles.resultStatHeaderRow}>
        <Text style={[raceDayStyles.statLabel, desktop && localStyles.desktopStatLabel]} numberOfLines={1}>{label}</Text>
        {selected ? <Text style={raceDayStyles.resultShownBadge}>Shown</Text> : null}
      </View>
      <Text style={[raceDayStyles.resultStatValue, desktop && localStyles.desktopStatValue]} numberOfLines={1}>{clean(value)}</Text>
    </Box>
  );
}

function SectionTitle({ children, desktop }) {
  return <Text style={[raceDayStyles.resultSectionTitle, desktop && localStyles.desktopSection]}>{children}</Text>;
}

export default function RaceDayResultCard({ visible, run, desktop = false, compareFields = [], onToggleCompareField, onOpenTop5, onOpenRaceResults }) {
  const fieldGuide = useFieldGuide('run-results', visible && Boolean(run));
  if (!run) {
    return (
      <View style={raceDayStyles.empty}>
        <Text style={raceDayStyles.emptyText}>No synced race result yet.</Text>
      </View>
    );
  }

  const mobileWeb = Platform.OS === 'web' && !desktop;
  const round = run.roundLabel || 'Race Result';
  const raceNumber = run.raceNumber ? `Race ${run.raceNumber}` : '';
  const resultType = run.resultType ? String(run.resultType).toUpperCase() : 'RACE';
  const selectedLabels = sortCompareFieldsForDashboard(compareFields).map(getCompareLabel).join(' • ');
  const hasRaceUrl = Boolean(run.raceUrl || run.resultUrl || run.url);

  return (
    <View style={[raceDayStyles.resultDetailCard, desktop && localStyles.desktopCard]}>
      <FieldGuide guide={fieldGuide} />
      <View style={[raceDayStyles.rowBetween, desktop && localStyles.desktopHeader, mobileWeb && localStyles.mobileHeader]}>
        <View style={raceDayStyles.flex1}>
          <Text style={[raceDayStyles.cardTitle, desktop && localStyles.desktopRound]}>{round}</Text>
          <Text style={[raceDayStyles.cardSub, desktop && localStyles.desktopMeta]}>
            {[raceNumber, run.className, resultType].filter(Boolean).join(' • ')}
          </Text>
        </View>
        <View style={[localStyles.resultActionRow, desktop && localStyles.desktopActions, mobileWeb && localStyles.mobileActions]}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[raceDayStyles.resultTop5Button, localStyles.resultActionButton, desktop && localStyles.desktopButton, mobileWeb && localStyles.mobileButton, !hasRaceUrl && localStyles.disabledButton]}
            onPress={onOpenRaceResults ? () => onOpenRaceResults(run) : undefined}
            disabled={!hasRaceUrl}
            activeOpacity={0.82}
          >
            <Text style={[raceDayStyles.resultTop5ButtonText, desktop && localStyles.desktopButtonText]}>Race Results</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[raceDayStyles.resultTop5Button, localStyles.resultActionButton, desktop && localStyles.desktopButton, mobileWeb && localStyles.mobileButton]}
            onPress={onOpenTop5 ? () => onOpenTop5(run) : undefined}
            disabled={!onOpenTop5}
            activeOpacity={0.82}
          >
            <Text style={[raceDayStyles.resultTop5ButtonText, desktop && localStyles.desktopButtonText]}>View Top 5</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(desktop || mobileWeb) && <RaceDayLapChart run={run} detailed compact />}
      <View style={[raceDayStyles.dashboardBlockHintBox, desktop && localStyles.desktopHint]}>
        <Text style={raceDayStyles.dashboardBlockHintTitle}>Dashboard Blocks</Text>
        <Text style={[raceDayStyles.dashboardBlockHintText, desktop && localStyles.desktopMeta]} numberOfLines={2}>
          {desktop ? 'Select a stat to show it on the dashboard. Showing ' : 'Tap any stat box to show it on the dashboard. Current: '}{selectedLabels || 'none'}
        </Text>
      </View>

      <SectionTitle desktop={desktop}>Race</SectionTitle>
      <View style={[raceDayStyles.resultStatGrid, desktop && localStyles.desktopGrid]}>
        <Stat desktop={desktop} label="Driver" value={run.driver || run.driverName || run.stats?.driverName} wide />
        <Stat desktop={desktop} label="Position" value={run.position} compareKey="position" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat desktop={desktop} label="Laps/Time" value={getRunValue(run, 'lapsTime')} compareKey="lapsTime" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat desktop={desktop} label="Fast Lap" value={getRunValue(run, 'fastestLap')} compareKey="fastestLap" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat desktop={desktop} label="Avg Lap" value={getRunValue(run, 'avgLap')} compareKey="avgLap" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
      </View>

      <SectionTitle desktop={desktop}>Averages</SectionTitle>
      <View style={[raceDayStyles.resultStatGrid, desktop && localStyles.desktopGrid]}>
        <Stat desktop={desktop} third label="Avg Top 5" value={getRunValue(run, 'top5Avg')} compareKey="top5Avg" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat desktop={desktop} third label="Avg Top 10" value={getRunValue(run, 'top10Avg')} compareKey="top10Avg" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat desktop={desktop} third label="Avg Top 15" value={getRunValue(run, 'top15Avg')} compareKey="top15Avg" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
      </View>

      <SectionTitle desktop={desktop}>Consecutive / Consistency</SectionTitle>
      <View style={[raceDayStyles.resultStatGrid, desktop && localStyles.desktopGrid]}>
        <Stat desktop={desktop} label="Top 2 Cons." value={getRunValue(run, 'top2Consecutive')} compareKey="top2Consecutive" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat desktop={desktop} label="Top 3 Cons." value={getRunValue(run, 'top3Consecutive')} compareKey="top3Consecutive" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat desktop={desktop} label="Std Dev" value={getRunValue(run, 'stdDeviation')} compareKey="stdDeviation" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
        <Stat desktop={desktop} label="Consistency" value={getRunValue(run, 'consistency')} compareKey="consistency" activeCompareFields={compareFields} onToggleCompareField={onToggleCompareField} />
      </View>

      {Array.isArray(run.stats?.laps) && run.stats.laps.length ? (
        <>
          <SectionTitle desktop={desktop}>Laps</SectionTitle>
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
  mobileHeader: { flexWrap: 'wrap', gap: 6 },
  mobileActions: { flexWrap: 'wrap', marginLeft: 0 },
  mobileButton: { minHeight: 44, paddingHorizontal: 8, borderRadius: 6 },
  desktopCard: { backgroundColor: 'transparent', borderWidth: 0, padding: 0, gap: 2 },
  desktopHeader: { alignItems: 'center', gap: 10 },
  desktopRound: { fontSize: 21 },
  desktopMeta: { fontSize: 13, lineHeight: 18 },
  desktopActions: { flexWrap: 'wrap', marginLeft: 0 },
  desktopButton: { minHeight: 38, borderRadius: 6, backgroundColor: raceDayColors.cardAlt },
  desktopButtonText: { fontSize: 13, color: '#A6CDFF' },
  desktopHint: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, marginTop: 4 },
  desktopGrid: { gap: 6 },
  desktopStat: { flexBasis: '22%', minHeight: 46, backgroundColor: raceDayColors.card, borderRadius: 8 },
  desktopWideStat: { flexBasis: '100%' },
  desktopSelectedStat: { backgroundColor: raceDayColors.accentSoft },
  desktopStatLabel: { fontSize: 11, color: raceDayColors.muted },
  desktopStatValue: { fontSize: 16, lineHeight: 20, fontVariant: ['tabular-nums'] },
  desktopSection: { color: raceDayColors.text, fontSize: 13, lineHeight: 19 },
  resultActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
    marginLeft: 8,
  },
  resultActionButton: {
    minHeight: 31,
    paddingHorizontal: 10,
  },
  disabledButton: {
    opacity: 0.45,
    borderColor: raceDayColors.border,
    backgroundColor: raceDayColors.cardAlt,
  },
});
