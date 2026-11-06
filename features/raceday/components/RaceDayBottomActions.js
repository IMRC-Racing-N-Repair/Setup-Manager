import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { raceDayStyles } from '../styles/raceDayStyles';

export default function RaceDayBottomActions({
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  onPrimaryPress,
  onSecondaryPress,
  onTertiaryPress,
  primaryDisabled = false,
  secondaryDisabled = false,
  tertiaryDisabled = false,
  docked = false,
  tabletLandscape = false,
}) {
  const insets = useSafeAreaInsets();

  if (docked) {
    const actions = [
      secondaryLabel ? { key: 'notes', glyph: '▤', label: secondaryLabel, onPress: onSecondaryPress, disabled: secondaryDisabled } : null,
      tertiaryLabel ? { key: 'changes', glyph: '↻', label: tertiaryLabel, onPress: onTertiaryPress, disabled: tertiaryDisabled } : null,
      primaryLabel ? { key: 'add', glyph: '＋', label: primaryLabel, onPress: onPrimaryPress, disabled: primaryDisabled, primary: true } : null,
    ].filter(Boolean);

    return (
      <View style={[
        raceDayStyles.bottomBar,
        raceDayStyles.bottomBarDocked,
        tabletLandscape && raceDayStyles.bottomBarTabletLandscape,
        tabletLandscape && raceDayStyles.bottomBarDockedTabletLandscape,
        { bottom: 66 + insets.bottom },
      ]}>
        <View style={[raceDayStyles.actionNavRow, tabletLandscape && raceDayStyles.actionNavRowTabletLandscape]}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={[
                raceDayStyles.actionNavItem,
                tabletLandscape && raceDayStyles.actionNavItemTabletLandscape,
                action.disabled && raceDayStyles.actionNavItemDisabled,
              ]}
              onPress={action.disabled ? undefined : action.onPress}
              activeOpacity={0.72}
            >
              <Text style={[
                raceDayStyles.actionNavGlyph,
                tabletLandscape && raceDayStyles.actionNavGlyphTabletLandscape,
                action.primary && raceDayStyles.actionNavPrimary,
              ]}>{action.glyph}</Text>
              <Text style={[
                raceDayStyles.actionNavLabel,
                tabletLandscape && raceDayStyles.actionNavLabelTabletLandscape,
                action.primary && raceDayStyles.actionNavPrimary,
              ]} numberOfLines={1}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[raceDayStyles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={raceDayStyles.bottomRow}>
        {secondaryLabel ? (
          <TouchableOpacity
            style={[raceDayStyles.secondaryButton, raceDayStyles.flex1, secondaryDisabled && { opacity: 0.45 }]}
            onPress={secondaryDisabled ? undefined : onSecondaryPress}
            activeOpacity={0.82}
          >
            <Text style={raceDayStyles.secondaryButtonText} numberOfLines={1}>{secondaryLabel}</Text>
          </TouchableOpacity>
        ) : null}

        {tertiaryLabel ? (
          <TouchableOpacity
            style={[raceDayStyles.secondaryButton, raceDayStyles.flex1, tertiaryDisabled && { opacity: 0.45 }]}
            onPress={tertiaryDisabled ? undefined : onTertiaryPress}
            activeOpacity={0.82}
          >
            <Text style={raceDayStyles.secondaryButtonText} numberOfLines={1}>{tertiaryLabel}</Text>
          </TouchableOpacity>
        ) : null}

        {primaryLabel ? (
          <TouchableOpacity
            style={[raceDayStyles.primaryButton, raceDayStyles.flex1, primaryDisabled && { opacity: 0.45 }]}
            onPress={primaryDisabled ? undefined : onPrimaryPress}
            activeOpacity={0.82}
          >
            <Text style={raceDayStyles.primaryButtonText} numberOfLines={1}>{primaryLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export { RaceDayBottomActions };
