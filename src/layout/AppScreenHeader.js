import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import useViewport from './useViewport';
import { DESKTOP_WEB_MIN_WIDTH } from './desktopWorkspace';
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
  const { width, height } = useViewport();
  const narrow = width < 375;
  const desktop = Platform.OS === 'web' && width >= DESKTOP_WEB_MIN_WIDTH;
  const compact = !desktop && (height < 620 || width > height);
  const showRightAction = Boolean(rightLabel && onRightPress);

  return (
    <View style={[styles.header, compact && styles.headerCompact, desktop && styles.headerDesktop, applyTopInset && { paddingTop: Math.max(insets.top, 8) }, style]}>
      {onBack ? (
        <Pressable style={({ pressed }) => [styles.backButton, desktop && styles.buttonDesktop, desktop && styles.backButtonDesktop, narrow && styles.sideNarrow, compact && styles.buttonCompact, pressed && styles.pressed]} onPress={onBack}>
          <Text style={[styles.backText, desktop && styles.actionTextDesktop, compact && styles.actionTextCompact]}>‹ {String(backLabel || 'BACK').toUpperCase()}</Text>
        </Pressable>
      ) : <View style={[styles.sideSpacer, narrow && styles.sideNarrow, compact && styles.buttonCompact]} />}

      <View style={styles.titleBlock}>
        {!!kicker && (
          <View style={styles.kickerRow}>
            <Text style={[styles.kicker, desktop && styles.kickerDesktop, compact && styles.kickerCompact]} numberOfLines={1}>{String(kicker).toUpperCase()}</Text>
            {String(kicker).toUpperCase().includes('SETUP MANAGER') && version ? (
              <Text style={[styles.versionText, desktop && styles.versionDesktop]}>v{version}</Text>
            ) : null}
          </View>
        )}
        <Text style={[styles.title, desktop && styles.titleDesktop, compact && styles.titleCompact, titleStyle]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, desktop && styles.subtitleDesktop, compact && styles.subtitleCompact]} numberOfLines={1}>{subtitle}</Text>}
      </View>

      {right || (showRightAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            desktop && styles.buttonDesktop,
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
            desktop && styles.actionTextDesktop,
            compact && styles.actionTextCompact,
            rightTone === 'danger' && styles.actionDangerText,
            rightTone === 'outline' && styles.actionOutlineText,
          ]}>{String(rightLabel).toUpperCase()}</Text>
        </Pressable>
      ) : <View style={[styles.sideSpacer, narrow && styles.sideNarrow, compact && styles.buttonCompact]} />)}
    </View>
  );
}

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
  headerDesktop: { minHeight: 78, gap: 14 },
  buttonDesktop: { minHeight: 40, borderRadius: 7, paddingHorizontal: 12 },
  backButtonDesktop: { width: 80 },
  actionTextDesktop: { fontSize: 12 },
  kickerDesktop: { fontSize: 11, lineHeight: 15, color: '#8EBCFF' },
  versionDesktop: { fontSize: 11, lineHeight: 15, color: AppColors.mutedText },
  titleDesktop: { fontSize: 30, lineHeight: 35 },
  subtitleDesktop: { fontSize: 13, lineHeight: 17 },
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

export const appScreenHeaderStyles = styles;
