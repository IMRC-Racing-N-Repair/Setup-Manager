import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RaceDayPopup from './RaceDayPopup';
import { raceDayColors, raceDayStyles } from '../styles/raceDayStyles';

function getProgressKey(update = {}) {
  return String(update.vehicleId || update.vehicleName || update.key || update.phase || 'sync');
}

export function mergeSyncProgress(previous = [], update = {}) {
  const key = getProgressKey(update);
  const nextItem = {
    ...(previous.find((item) => getProgressKey(item) === key) || {}),
    ...update,
    key,
    updatedAt: update.updatedAt || new Date().toISOString(),
  };

  const found = previous.some((item) => getProgressKey(item) === key);
  if (!found) return [...previous, nextItem];
  return previous.map((item) => (getProgressKey(item) === key ? nextItem : item));
}

function getStatusColor(status = '') {
  if (status === 'done' || status === 'matched' || status === 'complete') return raceDayColors.accent;
  if (status === 'failed' || status === 'error') return raceDayColors.danger;
  return raceDayColors.blue;
}

function getStatusLabel(item = {}) {
  if (item.status === 'needs-selection') return 'Choose class';
  if (item.status === 'needs-driver-name') return 'Driver needed';
  if (item.status === 'done' || item.status === 'matched' || item.status === 'complete') return 'OK';
  if (item.status === 'failed' || item.status === 'error') return 'Check';
  return 'Syncing';
}

function cleanDriverDisplay(value = '') {
  return String(value || '')
    .replace(/^\s*#?\d+\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function SyncProgressRow({ item, onSelectClass, onSubmitDriverName }) {
  const [searchName, setSearchName] = useState(String(item.requestedDriverName || '').trim());
  const statusColor = getStatusColor(item.status);
  const isWorking = item.status === 'working' || item.status === 'starting';
  const driverName = cleanDriverDisplay(item.driverName || item.nickname || item.fullName || '');
  const racesComplete = Number.isFinite(item.racesComplete) ? item.racesComplete : (Number.isFinite(item.runsFound) ? item.runsFound : 0);

  return (
    <View style={raceDayStyles.syncProgressCardCompact}>
      <View style={[raceDayStyles.cardAccent, { backgroundColor: statusColor }]} />
      <View style={raceDayStyles.rowBetween}>
        <View style={raceDayStyles.flex1}>
          <Text style={raceDayStyles.syncCompactVehicleName} numberOfLines={1}>{item.vehicleName || 'Vehicle'}</Text>
          <Text style={raceDayStyles.syncCompactMeta} numberOfLines={1}>
            {[driverName || 'Driver not matched', item.className || 'Class not matched'].join(' • ')}
          </Text>
        </View>
        <View style={raceDayStyles.syncCompactRaceCount}>
          <Text style={raceDayStyles.syncCompactRaceLabel}>RACES</Text>
          <Text style={raceDayStyles.syncCompactRaceValue}>{racesComplete}</Text>
        </View>
        <View style={[raceDayStyles.syncStatusPill, { borderColor: statusColor }]}> 
          {isWorking ? <ActivityIndicator size="small" /> : <Text style={[raceDayStyles.syncStatusPillText, { color: statusColor }]}>{getStatusLabel(item)}</Text>}
        </View>
      </View>
      {item.status === 'needs-selection' && Array.isArray(item.classOptions) ? (
        <View style={styles.classOptions}>
          {item.classOptions.map((option) => (
            <TouchableOpacity
              key={`${item.vehicleId || item.vehicleName}_${option.className}`}
              style={styles.classOptionButton}
              onPress={() => onSelectClass?.(item, option)}
              activeOpacity={0.82}
            >
              <Text style={styles.classOptionText}>USE {String(option.className || '').toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {item.status === 'needs-driver-name' ? (
        <View style={styles.driverSearchRow}>
          <TextInput
            value={searchName}
            onChangeText={setSearchName}
            placeholder="Driver name on LiveRC"
            placeholderTextColor={raceDayColors.faint}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => searchName.trim() && onSubmitDriverName?.(item, searchName.trim())}
            style={styles.driverNameInput}
          />
          <TouchableOpacity
            style={[styles.classOptionButton, !searchName.trim() && styles.disabledButton]}
            disabled={!searchName.trim()}
            onPress={() => onSubmitDriverName?.(item, searchName.trim())}
            activeOpacity={0.82}
          >
            <Text style={styles.classOptionText}>SEARCH NAME</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export function RaceDaySyncStatusList({ items = [], onSelectClass, onSubmitDriverName }) {
  if (!items.length) {
    return (
      <View style={raceDayStyles.empty}>
        <Text style={raceDayStyles.emptyText}>Waiting to start LiveRC sync.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 5 }}>
      {items.map((item) => (
        <SyncProgressRow
          key={getProgressKey(item)}
          item={item}
          onSelectClass={onSelectClass}
          onSubmitDriverName={onSubmitDriverName}
        />
      ))}
    </View>
  );
}

export default function RaceDaySyncStatusPopup({
  visible,
  syncing = false,
  progress = [],
  summary = '',
  onClose,
  onSelectClass,
  onSubmitDriverName,
}) {
  const statusText = summary || (syncing ? '' : 'Complete.');

  return (
    <RaceDayPopup
      visible={visible}
      title="LiveRC Sync"
      onClose={onClose}
      centered
      showScrollIndicator
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      {statusText ? <Text style={raceDayStyles.syncCompleteText}>{statusText}</Text> : null}
      <RaceDaySyncStatusList items={progress} onSelectClass={onSelectClass} onSubmitDriverName={onSubmitDriverName} />
      {!syncing ? (
        <TouchableOpacity style={[raceDayStyles.primaryButton, { marginTop: 12 }]} onPress={onClose} activeOpacity={0.82}>
          <Text style={raceDayStyles.primaryButtonText}>Done</Text>
        </TouchableOpacity>
      ) : null}
    </RaceDayPopup>
  );
}

export { RaceDaySyncStatusPopup };

const styles = StyleSheet.create({
  classOptions: {
    marginTop: 8,
    marginLeft: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  classOptionButton: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: raceDayColors.blue,
    backgroundColor: raceDayColors.blueSoft,
  },
  classOptionText: {
    color: raceDayColors.blue,
    fontSize: 9,
    fontWeight: '900',
  },
  driverSearchRow: {
    marginTop: 8,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverNameInput: {
    flex: 1,
    minWidth: 0,
    height: 34,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: raceDayColors.border,
    backgroundColor: raceDayColors.cardAlt,
    color: raceDayColors.text,
    fontSize: 11,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
