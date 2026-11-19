import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RaceDayPopup from './RaceDayPopup';
import { raceDayColors } from '../styles/raceDayStyles';

function clean(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export default function RaceDayVehicleLinkPopup({
  item,
  onClose,
  onSelectClass,
  onSubmitDriverName,
}) {
  const [driverName, setDriverName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const visible = Boolean(item);
  const needsDriverName = item?.status === 'needs-driver-name';
  const needsClass = item?.status === 'needs-selection';
  const searching = visible && !needsDriverName && !needsClass;
  const initialDriverName = clean(item?.requestedDriverName || item?.driverName || item?.nickname || item?.fullName);

  useEffect(() => {
    setDriverName(initialDriverName);
    setSubmitting(false);
  }, [item?.vehicleId, item?.status, initialDriverName]);

  async function submitDriverName() {
    const nextName = clean(driverName);
    if (!nextName || submitting) return;
    setSubmitting(true);
    try {
      await onSubmitDriverName?.(item, nextName);
    } finally {
      setSubmitting(false);
    }
  }

  async function selectClass(option) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSelectClass?.(item, option);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RaceDayPopup
      visible={visible}
      title="Link Missing Vehicle"
      subtitle="Match this car to its LiveRC entry for this event."
      onClose={onClose}
      centered
      keyboardAware
      showScrollIndicator
      contentContainerStyle={styles.popupContent}
    >
      <View style={styles.vehicleCard}>
        <Text style={styles.overline}>MISSING CAR</Text>
        <Text style={styles.vehicleName}>{item?.vehicleName || 'Vehicle'}</Text>
        <View style={styles.detailsRow}>
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>SAVED TX</Text>
            <Text style={styles.detailValue}>{clean(item?.transponder) || 'Not set'}</Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>DRIVER</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              {clean(item?.driverName || item?.requestedDriverName) || 'Not matched'}
            </Text>
          </View>
        </View>
      </View>

      {needsDriverName ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Name</Text>
          <Text style={styles.helpText}>
            Enter the driver name exactly as it appears in the LiveRC event entry list.
          </Text>
          <TextInput
            value={driverName}
            onChangeText={setDriverName}
            placeholder="Driver name on LiveRC"
            placeholderTextColor={raceDayColors.faint}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={submitDriverName}
            editable={!submitting}
            selectTextOnFocus={false}
            style={styles.driverNameInput}
          />
          <TouchableOpacity
            style={[styles.primaryButton, (!clean(driverName) || submitting) && styles.disabledButton]}
            disabled={!clean(driverName) || submitting}
            onPress={submitDriverName}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Search LiveRC for ${clean(driverName) || 'driver name'}`}
          >
            {submitting ? <ActivityIndicator size="small" color={raceDayColors.text} /> : null}
            <Text style={styles.primaryButtonText}>SEARCH DRIVER NAME</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {searching ? (
        <View style={styles.searchingSection}>
          <ActivityIndicator size="small" color={raceDayColors.blue} />
          <View style={styles.searchingTextWrap}>
            <Text style={styles.sectionTitle}>Searching LiveRC</Text>
            <Text style={styles.helpText}>
              {clean(item?.message) || 'Checking the driver name and finding the available classes…'}
            </Text>
          </View>
        </View>
      ) : null}

      {needsClass ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Class</Text>
          <Text style={styles.helpText}>
            {clean(item?.driverName) || 'The driver'} was found. Select the class that belongs to this car.
          </Text>
          <View style={styles.classOptions}>
            {(item?.classOptions || []).map((option) => (
              <TouchableOpacity
                key={`${item?.vehicleId || item?.vehicleName}_${option.className}`}
                style={[styles.classButton, submitting && styles.disabledButton]}
                disabled={submitting}
                onPress={() => selectClass(option)}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={`Link ${item?.vehicleName || 'vehicle'} to ${option.className}`}
              >
                <View style={styles.classTextWrap}>
                  <Text style={styles.className}>{option.className || 'Unnamed class'}</Text>
                  {clean(option.driverName) ? <Text style={styles.classDriver}>{clean(option.driverName)}</Text> : null}
                </View>
                <Text style={styles.useClassText}>USE CLASS ›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </RaceDayPopup>
  );
}

export { RaceDayVehicleLinkPopup };

const styles = StyleSheet.create({
  popupContent: {
    gap: 14,
    paddingBottom: 18,
  },
  vehicleCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: raceDayColors.blue,
    backgroundColor: raceDayColors.blueSoft,
  },
  overline: {
    color: raceDayColors.blue,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  vehicleName: {
    marginTop: 3,
    color: raceDayColors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  detailBlock: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    color: raceDayColors.faint,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  detailValue: {
    marginTop: 2,
    color: raceDayColors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  section: {
    gap: 9,
  },
  sectionTitle: {
    color: raceDayColors.text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  helpText: {
    color: raceDayColors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  driverNameInput: {
    width: '100%',
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: raceDayColors.border,
    backgroundColor: raceDayColors.input,
    color: raceDayColors.text,
    fontSize: 16,
    lineHeight: 21,
  },
  primaryButton: {
    width: '100%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: raceDayColors.blue,
    backgroundColor: raceDayColors.blueSoft,
  },
  primaryButtonText: {
    color: raceDayColors.blue,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.45,
  },
  searchingSection: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: raceDayColors.blue,
    backgroundColor: raceDayColors.blueSoft,
  },
  searchingTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  classOptions: {
    gap: 8,
  },
  classButton: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: raceDayColors.blue,
    backgroundColor: raceDayColors.cardAlt,
  },
  classTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  className: {
    color: raceDayColors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  classDriver: {
    marginTop: 2,
    color: raceDayColors.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  useClassText: {
    flexShrink: 0,
    color: raceDayColors.blue,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
  },
});
