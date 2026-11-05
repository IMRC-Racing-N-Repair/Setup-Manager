import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
}) {
  const { insets, compact, modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({
    edgeGap: centered ? 10 : 0,
    horizontalGap: centered ? 12 : 0,
    modalSize: 'normal',
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
            {
              padding: compact ? 12 : 16,
              paddingBottom: centered ? (compact ? 12 : 16) : Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={raceDayStyles.rowBetween}>
            <View style={raceDayStyles.flex1}>
              <Text style={raceDayStyles.modalTitle}>{title}</Text>
              {subtitle ? <Text style={raceDayStyles.modalSub}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity style={raceDayStyles.smallButton} onPress={onClose} activeOpacity={0.82}>
              <Text style={raceDayStyles.smallButtonText}>Close</Text>
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
