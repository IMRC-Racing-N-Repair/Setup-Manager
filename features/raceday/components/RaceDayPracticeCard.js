import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { RaceDayVehicleCardFrame, RaceRunStat } from './RaceDayVehicleCard';
import { raceDayStyles } from '../styles/raceDayStyles';

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

export default function RaceDayPracticeCard({ vehicle, summary = {}, onOpenSessions, onOpenSetup }) {
  const runCount = summary?.runCount || 0;
  const latest = summary?.latestSession || null;
  const hasSessions = runCount > 0;

  const subtitle = `Practice Summary • ${runCount} run${runCount === 1 ? '' : 's'} • ${summary?.totalLaps || 0} laps`;

  return (
    <RaceDayVehicleCardFrame vehicle={vehicle} onOpenSetup={onOpenSetup} subtitle={subtitle}>
      <View style={raceDayStyles.raceRunCardThin}>
        <View style={raceDayStyles.raceRunTopRow}>
          <Text style={raceDayStyles.raceRunTitleThin}>
            {hasSessions ? `Latest practice • ${formatTime(latest?.endedAt || latest?.startedAt)}` : 'Practice'}
          </Text>
          <TouchableOpacity accessibilityRole="button" style={raceDayStyles.resultsMiniButton} onPress={onOpenSessions} activeOpacity={0.82}>
            <Text style={raceDayStyles.resultsMiniButtonText}>View Practice Sessions</Text>
          </TouchableOpacity>
        </View>
        {hasSessions ? (
          <View style={raceDayStyles.raceRunStatsRow}>
            <RaceRunStat label="Fast lap" value={clean(summary.latestFastLap || latest?.fastLap)} />
            <RaceRunStat label="Avg lap" value={clean(latest?.avgLap)} />
            <RaceRunStat label="Top 5" value={clean(summary.latestTop5Avg || latest?.top5Avg)} />
          </View>
        ) : <Text style={raceDayStyles.cardSub}>No practice sessions saved for this vehicle yet.</Text>}
      </View>
      {hasSessions && (
        <View style={raceDayStyles.raceRunCardThin}>
          <Text style={raceDayStyles.raceRunTitleThin}>Practice day totals</Text>
          <View style={raceDayStyles.raceRunStatsRow}>
            <RaceRunStat label="Best lap" value={clean(summary.bestLap)} />
            <RaceRunStat label="Best top 5" value={clean(summary.bestTop5)} />
            <RaceRunStat label="Total laps" value={summary.totalLaps || 0} />
          </View>
        </View>
      )}
    </RaceDayVehicleCardFrame>
  );
}

export { RaceDayPracticeCard };
