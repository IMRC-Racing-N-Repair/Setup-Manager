import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaLayout } from '../../../src/layout/safeAreaLayout';
import { raceDayStyles } from '../styles/raceDayStyles';
import useRaceDayChartOrientation from './useRaceDayChartOrientation';

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
  hasChartData = chart,
}) {
  useRaceDayChartOrientation(visible && hasChartData);
  const { insets, compact, isLandscape, isShortScreen, modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({
    edgeGap: chart ? 5 : centered ? 10 : 0,
    horizontalGap: chart ? 6 : centered ? 12 : 0,
    modalSize: chart ? 'large' : 'normal',
  });
  const compactChart = chart && isLandscape && isShortScreen;
  const cardPadding = compactChart ? 8 : compact ? 12 : 16;
  const bodyPadding = compactChart ? { paddingTop: 6, paddingBottom: 6 } : { paddingTop: 14, paddingBottom: 12 };
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

export { RaceDayPopup };
