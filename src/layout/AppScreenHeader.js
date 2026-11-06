import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { AppColors } from '../theme/colors';

export default function AppScreenHeader({
  title,
  subtitle = '',
  kicker = 'IMRC SETUP MANAGER',
  onBack,
  backLabel = 'BACK',
  right = null,
  rightLabel = '',
  onRightPress,
  rightTone = 'primary',
  applyTopInset = false,
  style,
  titleStyle,
  version = Constants.expoConfig?.version || '',
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const narrow = width < 375;
  const compact = height < 620 || width > height;
  const showRightAction = Boolean(rightLabel && onRightPress);

  return (
    <View style={[styles.header, compact && styles.headerCompact, applyTopInset && { paddingTop: Math.max(insets.top, 8) }, style]}>
      {onBack ? (
        <Pressable style={({ pressed }) => [styles.backButton, narrow && styles.sideNarrow, compact && styles.buttonCompact, pressed && styles.pressed]} onPress={onBack}>
          <Text style={[styles.backText, compact && styles.actionTextCompact]}>‹ {String(backLabel || 'BACK').toUpperCase()}</Text>
        </Pressable>
      ) : <View style={[styles.sideSpacer, narrow && styles.sideNarrow, compact && styles.buttonCompact]} />}

      <View style={styles.titleBlock}>
        {!!kicker && (
          <View style={styles.kickerRow}>
            <Text style={[styles.kicker, compact && styles.kickerCompact]} numberOfLines={1}>{String(kicker).toUpperCase()}</Text>
            {String(kicker).toUpperCase().includes('SETUP MANAGER') && version ? (
              <Text style={styles.versionText}>v{version}</Text>
            ) : null}
          </View>
        )}
        <Text style={[styles.title, compact && styles.titleCompact, titleStyle]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={1}>{subtitle}</Text>}
      </View>

      {right || (showRightAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            narrow && styles.sideNarrow,
            compact && styles.buttonCompact,
            rightTone === 'danger' && styles.actionDanger,
            rightTone === 'outline' && styles.actionOutline,
            pressed && styles.pressed,
          ]}
          onPress={onRightPress}
        >
          <Text style={[
            styles.actionText,
            compact && styles.actionTextCompact,
            rightTone === 'danger' && styles.actionDangerText,
            rightTone === 'outline' && styles.actionOutlineText,
          ]}>{String(rightLabel).toUpperCase()}</Text>
        </Pressable>
      ) : <View style={[styles.sideSpacer, narrow && styles.sideNarrow, compact && styles.buttonCompact]} />)}
    </View>
  );
}

export const appScreenHeaderStyles = styles;

const styles = StyleSheet.create({
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderStrong,
    backgroundColor: AppColors.background,
  },
  headerCompact: { minHeight: 58, gap: 8 },
  backButton: {
    width: 64,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.borderStrong,
    backgroundColor: 'transparent',
  },
  backText: {
    color: AppColors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  sideSpacer: { width: 64, minHeight: 34 },
  sideNarrow: { width: 58, minWidth: 58 },
  buttonCompact: { minHeight: 30 },
  titleBlock: { flex: 1, minWidth: 0, justifyContent: 'center' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kicker: {
    flexShrink: 1,
    color: AppColors.primary,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  kickerCompact: { fontSize: 8, lineHeight: 10, letterSpacing: 1.1 },
  versionText: {
    color: AppColors.subtleText,
    fontSize: 7,
    lineHeight: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    marginTop: 1,
    color: AppColors.textStrong,
    fontSize: 27,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  titleCompact: { fontSize: 23, lineHeight: 25 },
  subtitle: { marginTop: 1, color: AppColors.mutedText, fontSize: 10, lineHeight: 13 },
  subtitleCompact: { fontSize: 9, lineHeight: 11 },
  actionButton: {
    minWidth: 64,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primary,
  },
  actionText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.45 },
  actionTextCompact: { fontSize: 8 },
  actionOutline: { backgroundColor: 'transparent', borderColor: AppColors.borderStrong },
  actionOutlineText: { color: AppColors.primary },
  actionDanger: { backgroundColor: 'rgba(230,92,92,0.14)', borderColor: 'rgba(230,92,92,0.48)' },
  actionDangerText: { color: '#FCA5A5' },
  pressed: { opacity: 0.76 },
});
