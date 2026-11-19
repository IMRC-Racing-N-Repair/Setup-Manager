import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getVehicleDisplayName } from '../lib/raceDayModel';
import { raceDayColors, raceDayStyles } from '../styles/raceDayStyles';
import { raceDayDesktopStyles as desktopStyles } from '../styles/raceDayDesktopStyles';
import { RaceDayVehicleCardFrame, RaceRunStat } from './RaceDayVehicleCard';

function clean(value) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function formatTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function Stat({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{clean(value)}</Text>
    </View>
  );
}

export default function RaceDayPracticeCard({ vehicle, summary = {}, onOpenSessions, onOpenSetup, desktop = false }) {
  const vehicleName = getVehicleDisplayName(vehicle || {});
  const runCount = summary?.runCount || 0;
  const latest = summary?.latestSession || null;
  const hasSessions = runCount > 0;
  const countLabel = `Practice Summary • ${runCount} run${runCount === 1 ? '' : 's'} • ${summary?.totalLaps || 0} laps`;

  if (desktop) {
    return (
      <RaceDayVehicleCardFrame vehicle={vehicle} desktop onOpenSetup={onOpenSetup}>
        <View style={[raceDayStyles.raceRunList, desktopStyles.vehicleRuns]}>
          <View style={[raceDayStyles.raceRunCardThin, desktopStyles.run, desktopStyles.firstRun]}>
            <View style={raceDayStyles.raceRunTopRow}>
              <Text style={[raceDayStyles.raceRunTitleThin, desktopStyles.runTitle]}>
                {hasSessions ? `Latest practice • ${formatTime(latest?.endedAt || latest?.startedAt)}` : 'Practice'}
              </Text>
              <TouchableOpacity accessibilityRole="button" style={[raceDayStyles.resultsMiniButton, desktopStyles.resultsButton]} onPress={onOpenSessions} activeOpacity={0.82}>
                <Text style={[raceDayStyles.resultsMiniButtonText, desktopStyles.resultsButtonText]}>View Practice Sessions</Text>
              </TouchableOpacity>
            </View>
            <Text style={desktopStyles.runClass}>{countLabel}</Text>
            {hasSessions ? (
              <View style={[raceDayStyles.raceRunStatsRow, desktopStyles.runStats]}>
                <RaceRunStat desktop label="Fast lap" value={clean(summary.latestFastLap || latest?.fastLap)} />
                <RaceRunStat desktop label="Avg lap" value={clean(latest?.avgLap)} />
                <RaceRunStat desktop label="Top 5" value={clean(summary.latestTop5Avg || latest?.top5Avg)} />
              </View>
            ) : <Text style={raceDayStyles.cardSub}>No practice sessions saved for this vehicle yet.</Text>}
          </View>
          {hasSessions && (
            <View style={[raceDayStyles.raceRunCardThin, desktopStyles.run]}>
              <Text style={[raceDayStyles.raceRunTitleThin, desktopStyles.runTitle]}>Practice day totals</Text>
              <View style={[raceDayStyles.raceRunStatsRow, desktopStyles.runStats]}>
                <RaceRunStat desktop label="Best lap" value={clean(summary.bestLap)} />
                <RaceRunStat desktop label="Best top 5" value={clean(summary.bestTop5)} />
                <RaceRunStat desktop label="Total laps" value={summary.totalLaps || 0} />
              </View>
            </View>
          )}
        </View>
      </RaceDayVehicleCardFrame>
    );
  }

  return (
    <View style={[raceDayStyles.card, raceDayStyles.dashboardCardCompact]}>
      <View style={raceDayStyles.cardAccent} />
      <View style={styles.headerRow}>
        <View style={raceDayStyles.flex1}>
          <Text style={raceDayStyles.cardTitle}>{vehicleName}</Text>
          <Text style={raceDayStyles.cardSub} numberOfLines={1}>
            {countLabel}
          </Text>
        </View>
        <TouchableOpacity style={styles.wrenchButton} onPress={onOpenSetup} activeOpacity={0.82}>
          <Text style={styles.wrenchText}>Wrench</Text>
        </TouchableOpacity>
      </View>

      {hasSessions ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Latest</Text>
            <Text style={styles.sectionMeta}>{formatTime(latest?.endedAt || latest?.startedAt)}</Text>
          </View>
          <View style={styles.statRow}>
            <Stat label="Fast" value={summary.latestFastLap || latest?.fastLap} />
            <Stat label="Avg" value={latest?.avgLap} />
            <Stat label="Top 5" value={summary.latestTop5Avg || latest?.top5Avg} />
          </View>
          <View style={styles.statRow}>
            <Stat label="Best Lap" value={summary.bestLap} />
            <Stat label="Best Top 5" value={summary.bestTop5} />
            <Stat label="Total Laps" value={summary.totalLaps || 0} />
          </View>
        </>
      ) : (
        <View style={styles.emptyPracticeBox}>
          <Text style={styles.emptyPracticeText}>No practice sessions saved for this vehicle yet.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.sessionsButton} onPress={onOpenSessions} activeOpacity={0.82}>
        <Text style={styles.sessionsButtonText}>View Practice Sessions</Text>
      </TouchableOpacity>
    </View>
  );
}

export { RaceDayPracticeCard };

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  wrenchButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: raceDayColors.border,
    backgroundColor: raceDayColors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrenchText: {
    color: raceDayColors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  sectionHeaderRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: raceDayColors.accent,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionMeta: {
    color: raceDayColors.faint,
    fontSize: 11,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    minHeight: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: raceDayColors.border,
    backgroundColor: raceDayColors.cardAlt,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  statLabel: {
    color: raceDayColors.faint,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statValue: {
    color: raceDayColors.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 3,
  },
  emptyPracticeBox: {
    marginTop: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: raceDayColors.border,
    backgroundColor: raceDayColors.cardAlt,
    padding: 12,
  },
  emptyPracticeText: {
    color: raceDayColors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  sessionsButton: {
    marginTop: 12,
    minHeight: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: raceDayColors.accent,
    backgroundColor: raceDayColors.accentSoft,
  },
  sessionsButtonText: {
    color: raceDayColors.text,
    fontSize: 12,
    fontWeight: '900',
  },
});
