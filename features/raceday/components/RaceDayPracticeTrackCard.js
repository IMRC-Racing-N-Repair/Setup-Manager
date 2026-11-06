import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { raceDayStyles } from '../styles/raceDayStyles';

export default function RaceDayPracticeTrackCard({
  raceDay,
  trackName = '',
  vehicleCount = 0,
  practiceDayLabel = '',
  onSelectPracticeDay,
  onRefreshPractice,
  refreshing = false,
  liveEnabled = true,
  liveMatched = false,
  onToggleLive,
  children,
}) {
  const startedLabel = raceDay?.startedAt ? new Date(raceDay.startedAt).toLocaleDateString() : new Date().toLocaleDateString();
  const dayLabel = practiceDayLabel || 'Select Practice Date';

  return (
    <View style={raceDayStyles.trackCard}>
      <View style={raceDayStyles.trackCardHeader}>
        <View style={raceDayStyles.flex1}>
          <Text style={raceDayStyles.trackCardEyebrow}>Live Practice</Text>
          <Text style={raceDayStyles.cardTitle}>{trackName}</Text>
          <Text style={raceDayStyles.cardSub} numberOfLines={1}>
            {startedLabel} • {vehicleCount} vehicle{vehicleCount === 1 ? '' : 's'}
          </Text>
          <Text style={raceDayStyles.dashboardEventDate} numberOfLines={1}>
            {dayLabel}
          </Text>
        </View>

        <TouchableOpacity
          style={[raceDayStyles.trackLiveBadge, (!liveEnabled || !liveMatched) && raceDayStyles.trackLiveBadgeInactive]}
          onPress={onToggleLive}
          activeOpacity={0.76}
        >
          <View style={[raceDayStyles.trackLiveDot, (!liveEnabled || !liveMatched) && raceDayStyles.trackLiveDotInactive]} />
          <Text style={[raceDayStyles.trackLiveBadgeText, (!liveEnabled || !liveMatched) && raceDayStyles.trackLiveBadgeTextInactive]}>
            {!liveEnabled ? 'LIVE OFF' : liveMatched ? 'LIVE' : 'WAITING'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={raceDayStyles.trackNavigationRow}>
        <TouchableOpacity style={raceDayStyles.trackNavigationButton} onPress={onSelectPracticeDay} activeOpacity={0.82}>
          <View>
            <Text style={raceDayStyles.trackNavigationLabel}>PRACTICE DATE</Text>
            <Text style={raceDayStyles.trackNavigationText}>Change Date</Text>
          </View>
          <Text style={raceDayStyles.trackNavigationArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[raceDayStyles.trackSyncButton, refreshing && { opacity: 0.55 }]}
          onPress={onRefreshPractice}
          disabled={refreshing}
          activeOpacity={0.82}
        >
          {refreshing ? <ActivityIndicator size="small" /> : (
            <>
              <Text style={raceDayStyles.trackNavigationLabel}>PRACTICE</Text>
              <Text style={raceDayStyles.trackSyncText}>REFRESH</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

export { RaceDayPracticeTrackCard };
