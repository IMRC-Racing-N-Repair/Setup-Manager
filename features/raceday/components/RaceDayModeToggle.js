import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { raceDayColors } from '../styles/raceDayStyles';

export default function RaceDayModeToggle({ mode = 'race', onChange, desktop = false }) {
  const activeMode = mode === 'practice' ? 'practice' : 'race';

  return (
    <View style={[styles.wrap, desktop && styles.desktopWrap]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected: activeMode === 'race' }}
        style={[styles.button, desktop && styles.desktopButton, activeMode === 'race' && styles.activeButton]}
        onPress={() => onChange?.('race')}
        activeOpacity={0.84}
      >
        <Text style={[styles.buttonText, desktop && styles.desktopLabel, activeMode === 'race' && styles.activeButtonText]}>Race</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected: activeMode === 'practice' }}
        style={[styles.button, desktop && styles.desktopButton, activeMode === 'practice' && styles.activeButton]}
        onPress={() => onChange?.('practice')}
        activeOpacity={0.84}
      >
        <Text style={[styles.buttonText, desktop && styles.desktopLabel, activeMode === 'practice' && styles.activeButtonText]}>Practice</Text>
      </TouchableOpacity>
    </View>
  );
}

export { RaceDayModeToggle };

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: raceDayColors.border,
    marginBottom: 10,
  },
  desktopWrap: { alignSelf: 'flex-start', borderTopWidth: 0, marginBottom: 18 },
  desktopButton: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minHeight: 42, paddingHorizontal: 24 },
  desktopLabel: { fontSize: 13, textTransform: 'none' },
  button: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeButton: {
    backgroundColor: raceDayColors.accentSofter,
    borderBottomColor: raceDayColors.accent,
  },
  buttonText: {
    color: raceDayColors.muted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.75,
  },
  activeButtonText: {
    color: raceDayColors.accent,
  },
});
