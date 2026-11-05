import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getLineupRaceNumber } from '../lib/raceDayLineupPriority';

export default function RaceDayLineupBadge({ lineup, style }) {
  const raceNumber = getLineupRaceNumber(lineup);
  if (!raceNumber) return null;

  return (
    <View style={[styles.badge, style]}>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={styles.label}
      >
        RACE
      </Text>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={styles.number}
      >
        {raceNumber}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 54,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#facc15',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 3,
    marginRight: 10,
    shadowColor: '#facc15',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    width: '100%',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    color: '#422006',
    letterSpacing: 0.4,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  number: {
    width: '100%',
    marginTop: -1,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
