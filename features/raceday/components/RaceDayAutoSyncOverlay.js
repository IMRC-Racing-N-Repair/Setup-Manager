import React, { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

function getStageLabel(item = {}) {
  if (isDone(item)) return 'Done';
  if (isFailed(item)) return 'Needs review';
  if (item.status === 'pending' || item.phase === 'queued') return 'Waiting';

  if (item.phase === 'start') return 'Preparing';
  if (item.phase === 'entryList' || item.phase === 'transponder') {
    return item.transponder ? 'Searching TX' : 'Searching driver';
  }
  if (item.phase === 'driver') return item.status === 'matched' ? 'Driver found' : 'Searching driver';
  if (item.phase === 'class') return item.status === 'matched' ? 'Class found' : 'Searching class';
  if (item.phase === 'raceScanner') return 'Searching rounds';
  if (item.phase === 'raceParser') {
    const round = String(item.roundLabel || '').trim();
    return round ? `Checking ${round}` : 'Checking results';
  }
  if (item.phase === 'lineups') return 'Checking lineups';
  return 'Checking';
}

function getMilestones(item = {}) {
  if (item.phase === 'lineups') return item.lineupsFound != null ? `${item.lineupsFound} lineups found` : 'Current race assignments';

  const steps = [];
  if (item.transponder) steps.push(`TX ${item.transponder}${item.transponderFound ? ' ✓' : ''}`);
  if (item.driverFound || item.driverName) steps.push('Driver ✓');
  if (item.classFound || item.className) steps.push('Class ✓');
  if (item.phase === 'raceScanner' || item.phase === 'raceParser' || isDone(item)) {
    const checked = Number(item.roundsChecked ?? item.racesComplete ?? item.runsFound ?? 0);
    const total = Number(item.roundsToCheck ?? item.raceCandidates ?? 0);
    steps.push(total ? `Rounds ${checked}/${total}` : 'Rounds');
  }
  return steps.join('  ·  ');
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
  const statusLabel = getStageLabel(item);
  const milestones = getMilestones(item);
  const detail = String(item.message || '').trim();

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
        <View style={styles.progressHeading}>
          <Text style={styles.progressTitle} numberOfLines={1}>{title}</Text>
          <Text style={[
            styles.progressStatus,
            isDone(item) && styles.progressStatusDone,
            isFailed(item) && styles.progressStatusFailed,
          ]} numberOfLines={1}>{statusLabel}</Text>
        </View>
        {showVehicleName || milestones ? (
          <Text style={styles.progressVehicle} numberOfLines={1}>
            {[showVehicleName ? item.vehicleName : '', milestones].filter(Boolean).join('  ·  ')}
          </Text>
        ) : null}
        {detail ? <Text style={styles.progressDetail} numberOfLines={2}>{detail}</Text> : null}
      </View>
    </View>
  );
}

export default function RaceDayAutoSyncOverlay({ visible, progress = [], onCancel }) {
  const activeItem = useMemo(
    () => [...progress].reverse().find((item) => isWorking(item)),
    [progress],
  );
  const currentLabel = activeItem
    ? (activeItem.message || `${getStageLabel(activeItem)}: ${getRowTitle(activeItem)}`)
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
        <Pressable style={styles.cancelButton} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel RaceDay refresh">
          <Text style={styles.cancelButtonText}>×</Text>
        </Pressable>
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
    maxHeight: 276,
    marginTop: 10,
  },
  cancelButton: {
    position: 'absolute',
    top: 9,
    right: 9,
    zIndex: 2,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: raceDayColors.border,
    backgroundColor: raceDayColors.cardAlt,
  },
  cancelButtonText: {
    color: raceDayColors.text,
    fontSize: 23,
    lineHeight: 25,
    fontWeight: '700',
  },
  progressListContent: {
    gap: 5,
  },
  progressRow: {
    minHeight: 44,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 4,
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
  progressHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressTitle: {
    flex: 1,
    color: raceDayColors.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  progressVehicle: {
    color: raceDayColors.muted,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '700',
  },
  progressDetail: {
    marginTop: 2,
    color: raceDayColors.muted,
    fontSize: 8,
    lineHeight: 11,
  },
  progressStatus: {
    flexShrink: 0,
    color: raceDayColors.blue,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '900',
    textAlign: 'right',
  },
  progressStatusDone: {
    color: raceDayColors.accent,
  },
  progressStatusFailed: {
    color: raceDayColors.danger,
  },
});
