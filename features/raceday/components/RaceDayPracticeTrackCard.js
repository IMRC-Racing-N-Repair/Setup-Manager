import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { raceDayStyles } from '../styles/raceDayStyles';
import { raceDayDesktopStyles as desktopStyles } from '../styles/raceDayDesktopStyles';

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
  desktop = false,
  children,
}) {
  const startedLabel = raceDay?.startedAt ? new Date(raceDay.startedAt).toLocaleDateString() : new Date().toLocaleDateString();
  const dayLabel = practiceDayLabel || 'Select Practice Date';

  return (
    <View style={[raceDayStyles.trackCard, desktop && desktopStyles.event]}>
      <View style={raceDayStyles.trackCardHeader}>
        <View style={raceDayStyles.flex1}>
          {!desktop && <Text style={raceDayStyles.trackCardEyebrow}>Live Practice</Text>}
          <Text style={[raceDayStyles.cardTitle, desktop && desktopStyles.eventTitle]}>{trackName}</Text>
          <Text style={raceDayStyles.cardSub} numberOfLines={1}>
            {desktop ? `RaceDay started ${startedLabel}` : `${startedLabel} • ${vehicleCount} vehicle${vehicleCount === 1 ? '' : 's'}`}
          </Text>
          {!desktop && <Text style={raceDayStyles.dashboardEventDate} numberOfLines={1}>
            {dayLabel}
          </Text>}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={liveEnabled ? 'Turn live feed off' : 'Turn live feed on'}
          style={[raceDayStyles.trackLiveBadge, (!liveEnabled || !liveMatched) && raceDayStyles.trackLiveBadgeInactive, desktop && desktopStyles.liveButton]}
          onPress={onToggleLive}
          activeOpacity={0.76}
        >
          <View style={[raceDayStyles.trackLiveDot, (!liveEnabled || !liveMatched) && raceDayStyles.trackLiveDotInactive]} />
          <Text style={[raceDayStyles.trackLiveBadgeText, (!liveEnabled || !liveMatched) && raceDayStyles.trackLiveBadgeTextInactive, desktop && liveMatched && desktopStyles.liveLabel]}>
            {!liveEnabled ? 'LIVE OFF' : liveMatched ? 'LIVE' : 'WAITING'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[raceDayStyles.trackNavigationRow, desktop && desktopStyles.navigation]}>
        <TouchableOpacity style={raceDayStyles.trackNavigationButton} onPress={onSelectPracticeDay} activeOpacity={0.82}>
          <View style={desktop && raceDayStyles.trackEventIdentity}>
            <Text style={[raceDayStyles.trackNavigationLabel, desktop && desktopStyles.navigationLabel]}>PRACTICE DATE</Text>
            <Text style={[raceDayStyles.trackNavigationText, desktop && desktopStyles.navigationText]}>{desktop ? dayLabel : 'Change Date'}</Text>
            {desktop && <Text style={[raceDayStyles.trackNavigationMeta, desktopStyles.navigationMeta]}>
              {vehicleCount} vehicle{vehicleCount === 1 ? '' : 's'}
            </Text>}
          </View>
          <View style={desktop && raceDayStyles.trackEventChangeAction}>
            {desktop && <Text style={[raceDayStyles.trackEventChangeText, desktopStyles.navigationAction]}>{practiceDayLabel ? 'CHANGE' : 'SELECT'}</Text>}
            <Text style={raceDayStyles.trackNavigationArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[raceDayStyles.trackSyncButton, desktop && desktopStyles.sync, refreshing && { opacity: 0.55 }]}
          onPress={onRefreshPractice}
          disabled={refreshing}
          activeOpacity={0.82}
        >
          {refreshing ? <ActivityIndicator size="small" /> : (
            <>
              <Text style={[raceDayStyles.trackNavigationLabel, desktop && desktopStyles.navigationLabel]}>PRACTICE</Text>
              <Text style={[raceDayStyles.trackSyncText, desktop && desktopStyles.navigationAction]}>REFRESH</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

export { RaceDayPracticeTrackCard };
