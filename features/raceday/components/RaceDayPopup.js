import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaLayout } from '../../../src/layout/safeAreaLayout';
import { raceDayStyles } from '../styles/raceDayStyles';

export default function RaceDayPopup({
  visible,
  title,
  subtitle,
  onClose,
  onDismiss,
  children,
  centered = false,
  keyboardAware = false,
  showScrollIndicator = false,
  contentContainerStyle,
  bodyScroll = true,
  desktop = false,
}) {
  const { insets, compact, modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({
    edgeGap: centered ? 10 : 0,
    horizontalGap: centered ? 12 : 0,
    modalSize: desktop ? 'large' : 'normal',
  });
  const Wrapper = keyboardAware ? KeyboardAvoidingView : View;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss} presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent>
      <Wrapper
        style={[
          raceDayStyles.modalBackdrop,
          centered ? raceDayStyles.modalBackdropCenter : raceDayStyles.modalBackdropBottom,
          centered && modalBackdropStyle,
        ]}
        behavior={keyboardAware ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined}
        keyboardVerticalOffset={keyboardAware ? Math.max(insets.top, 12) : 0}
      >
        <View
          style={[
            raceDayStyles.modalCard,
            centered && raceDayStyles.centeredModalCard,
            modalCardStyle,
            desktop && styles.card,
            {
              padding: compact ? 12 : 16,
              paddingBottom: centered ? (compact ? 12 : 16) : Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={[raceDayStyles.rowBetween, desktop && styles.header]}>
            <View style={raceDayStyles.flex1}>
              <Text accessibilityRole="header" style={[raceDayStyles.modalTitle, desktop && styles.title]}>{title}</Text>
              {subtitle ? <Text style={[raceDayStyles.modalSub, desktop && styles.subtitle]}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity accessibilityRole="button" style={[raceDayStyles.smallButton, desktop && styles.close]} onPress={onClose} activeOpacity={0.82}>
              <Text style={[raceDayStyles.smallButtonText, desktop && styles.closeText]}>Close</Text>
            </TouchableOpacity>
          </View>
          {bodyScroll ? (
            <ScrollView
              style={raceDayStyles.modalBodyScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={showScrollIndicator}
              contentContainerStyle={[{ paddingTop: 14, paddingBottom: 12 }, contentContainerStyle]}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[raceDayStyles.modalBodyFixed, { paddingTop: 14, paddingBottom: 12 }, contentContainerStyle]}>
              {children}
            </View>
          )}
        </View>
      </Wrapper>
    </Modal>
  );
}

export { RaceDayPopup };

const styles = StyleSheet.create({
  card: { borderRadius: 13 },
  header: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#26364C', gap: 12 },
  title: { fontSize: 23, lineHeight: 29 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  close: { minHeight: 40, borderRadius: 6 },
  closeText: { fontSize: 13 },
});
