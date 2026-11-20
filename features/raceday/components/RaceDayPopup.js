import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaLayout } from '../../../src/layout/safeAreaLayout';
import { raceDayStyles } from '../styles/raceDayStyles';

const chartOrientations = ['portrait', 'landscape'];

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
  chart = false,
}) {
  const { insets, compact, modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({
    edgeGap: chart ? 5 : centered ? 10 : 0,
    horizontalGap: chart ? 6 : centered ? 12 : 0,
    modalSize: chart ? 'large' : 'normal',
  });
  const cardPadding = chart ? 8 : compact ? 12 : 16;
  const bodyPadding = chart ? styles.chartBody : styles.body;
  const Wrapper = keyboardAware ? KeyboardAvoidingView : View;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={chart ? 'fade' : 'slide'}
      onRequestClose={onClose}
      onDismiss={onDismiss}
      presentationStyle="overFullScreen"
      supportedOrientations={chart ? chartOrientations : undefined}
      statusBarTranslucent
      navigationBarTranslucent
    >
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
            {
              padding: cardPadding,
              paddingBottom: centered ? cardPadding : Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={raceDayStyles.rowBetween}>
            <View style={raceDayStyles.flex1}>
              <Text style={[raceDayStyles.modalTitle, chart && styles.chartTitle]}>{title}</Text>
              {subtitle ? <Text style={[raceDayStyles.modalSub, chart && styles.chartSubtitle]}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity style={[raceDayStyles.smallButton, chart && styles.chartClose]} accessibilityRole="button" onPress={onClose} activeOpacity={0.82}>
              <Text style={raceDayStyles.smallButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          {bodyScroll ? (
            <ScrollView
              style={raceDayStyles.modalBodyScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={showScrollIndicator}
              contentContainerStyle={[bodyPadding, contentContainerStyle]}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[raceDayStyles.modalBodyFixed, bodyPadding, contentContainerStyle]}>
              {children}
            </View>
          )}
        </View>
      </Wrapper>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: 14, paddingBottom: 12 },
  chartBody: { paddingTop: 4, paddingBottom: 4 },
  chartTitle: { fontSize: 16 },
  chartSubtitle: { marginTop: 1, lineHeight: 15 },
  chartClose: { minWidth: 54, minHeight: 36, borderRadius: 5 },
});

export { RaceDayPopup };
