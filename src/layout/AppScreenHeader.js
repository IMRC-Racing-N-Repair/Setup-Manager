import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
}) {
  const insets = useSafeAreaInsets();
  const showRightAction = Boolean(rightLabel && onRightPress);

  return (
    <View style={[styles.header, applyTopInset && { paddingTop: Math.max(insets.top, 8) }, style]}>
      {onBack ? (
        <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={onBack}>
          <Text style={styles.backText}>‹ {String(backLabel || 'BACK').toUpperCase()}</Text>
        </Pressable>
      ) : <View style={styles.sideSpacer} />}

      <View style={styles.titleBlock}>
        {!!kicker && <Text style={styles.kicker} numberOfLines={1}>{String(kicker).toUpperCase()}</Text>}
        <Text style={[styles.title, titleStyle]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>

      {right || (showRightAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            rightTone === 'danger' && styles.actionDanger,
            rightTone === 'outline' && styles.actionOutline,
            pressed && styles.pressed,
          ]}
          onPress={onRightPress}
        >
          <Text style={[
            styles.actionText,
            rightTone === 'danger' && styles.actionDangerText,
            rightTone === 'outline' && styles.actionOutlineText,
          ]}>{String(rightLabel).toUpperCase()}</Text>
        </Pressable>
      ) : <View style={styles.sideSpacer} />)}
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
  titleBlock: { flex: 1, minWidth: 0, justifyContent: 'center' },
  kicker: {
    color: AppColors.primary,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 1,
    color: AppColors.textStrong,
    fontSize: 27,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  subtitle: { marginTop: 1, color: AppColors.mutedText, fontSize: 10, lineHeight: 13 },
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
  actionOutline: { backgroundColor: 'transparent', borderColor: AppColors.borderStrong },
  actionOutlineText: { color: AppColors.primary },
  actionDanger: { backgroundColor: 'rgba(230,92,92,0.14)', borderColor: 'rgba(230,92,92,0.48)' },
  actionDangerText: { color: '#FCA5A5' },
  pressed: { opacity: 0.76 },
});
