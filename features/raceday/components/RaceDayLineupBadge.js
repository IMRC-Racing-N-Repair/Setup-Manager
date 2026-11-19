import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors } from '../../../src/theme/colors';
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
    borderRadius: 8,
    backgroundColor: AppColors.raceNumberSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 3,
    marginRight: 10,
  },
  label: {
    width: '100%',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    color: AppColors.raceNumber,
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
    color: AppColors.raceNumber,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
});
