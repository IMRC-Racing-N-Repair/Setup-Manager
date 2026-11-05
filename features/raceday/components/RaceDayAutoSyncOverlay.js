import React, { useMemo } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { raceDayColors, raceDayStyles } from '../styles/raceDayStyles';

function isFailed(item = {}) {
  return item.status === 'failed' || item.status === 'error';
}

function isDone(item = {}) {
  return item.phase === 'complete' || item.status === 'complete' || item.status === 'done';
}

function isWorking(item = {}) {
  return !isDone(item) && !isFailed(item) && item.status !== 'pending';
}

function getRowTitle(item = {}) {
  if (item.phase === 'lineups') return 'Race lineups';
  return item.className || item.vehicleName || 'Vehicle';
}

function ProgressIcon({ item }) {
  if (isWorking(item)) {
    return <ActivityIndicator size="small" color={raceDayColors.blue} />;
  }

  if (isDone(item)) {
    return <Text style={[styles.statusIconText, { color: raceDayColors.accent }]}>✓</Text>;
  }

  if (isFailed(item)) {
    return <Text style={[styles.statusIconText, { color: raceDayColors.danger }]}>!</Text>;
  }

  return <View style={styles.pendingDot} />;
}

function ProgressRow({ item }) {
  const title = getRowTitle(item);
  const showVehicleName = item.className && item.vehicleName && item.className !== item.vehicleName;
  const statusLabel = isDone(item) ? 'Done' : isFailed(item) ? 'Could not verify' : isWorking(item) ? 'Checking…' : 'Waiting';

  return (
    <View style={[
      styles.progressRow,
      isWorking(item) && styles.progressRowActive,
      isDone(item) && styles.progressRowDone,
    ]}>
      <View style={styles.statusIcon}>
        <ProgressIcon item={item} />
      </View>
      <View style={styles.progressTextWrap}>
        <Text style={styles.progressTitle} numberOfLines={1}>{title}</Text>
        {showVehicleName ? <Text style={styles.progressVehicle} numberOfLines={1}>{item.vehicleName}</Text> : null}
      </View>
      <Text style={[
        styles.progressStatus,
        isDone(item) && styles.progressStatusDone,
        isFailed(item) && styles.progressStatusFailed,
      ]}>{statusLabel}</Text>
    </View>
  );
}

export default function RaceDayAutoSyncOverlay({ visible, progress = [] }) {
  const activeItem = useMemo(
    () => [...progress].reverse().find((item) => isWorking(item)),
    [progress],
  );
  const currentLabel = activeItem
    ? `Checking ${getRowTitle(activeItem)}…`
    : progress.length && progress.every((item) => isDone(item) || isFailed(item))
      ? 'Refresh complete'
      : 'Preparing LiveRC refresh…';

  if (!visible) return null;

  return (
    <View
      style={raceDayStyles.autoSyncBackdrop}
      accessibilityViewIsModal
      accessibilityLabel="Refreshing RaceDay"
    >
      <View style={raceDayStyles.autoSyncCard}>
        <View style={raceDayStyles.autoSyncLogoWrap}>
          <ActivityIndicator
            size="large"
            color={raceDayColors.accent}
            style={raceDayStyles.autoSyncSpinner}
          />
          <Image
            source={require('../../../assets/logo.png')}
            resizeMode="contain"
            style={raceDayStyles.autoSyncLogo}
          />
        </View>
        <Text style={raceDayStyles.autoSyncTitle}>Refreshing RaceDay</Text>
        <Text style={raceDayStyles.autoSyncSub}>{currentLabel}</Text>
        <ScrollView
          style={styles.progressList}
          contentContainerStyle={styles.progressListContent}
          showsVerticalScrollIndicator={progress.length > 5}
        >
          {progress.map((item) => (
            <ProgressRow key={String(item.key || item.vehicleId || item.vehicleName || item.phase)} item={item} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

export { RaceDayAutoSyncOverlay };

const styles = StyleSheet.create({
  progressList: {
    width: '100%',
    maxHeight: 238,
    marginTop: 14,
  },
  progressListContent: {
    gap: 7,
  },
  progressRow: {
    minHeight: 46,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: raceDayColors.border,
    backgroundColor: raceDayColors.cardAlt,
  },
  progressRowActive: {
    borderColor: raceDayColors.blue,
    backgroundColor: raceDayColors.blueSoft,
  },
  progressRowDone: {
    borderColor: raceDayColors.accentBorder,
    backgroundColor: raceDayColors.accentSofter,
  },
  statusIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  statusIconText: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '900',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: raceDayColors.faint,
  },
  progressTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  progressTitle: {
    color: raceDayColors.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  progressVehicle: {
    color: raceDayColors.muted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
  },
  progressStatus: {
    color: raceDayColors.muted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    marginLeft: 8,
  },
  progressStatusDone: {
    color: raceDayColors.accent,
  },
  progressStatusFailed: {
    color: raceDayColors.danger,
  },
});
