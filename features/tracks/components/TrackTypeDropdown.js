// features/tracks/components/TrackTypeDropdown.js

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { TRACK_TYPE_OPTIONS } from '../constants/trackTypes';
import { trackStyles as styles } from '../styles/trackStyles';
import { useSafeAreaLayout } from '../../../src/layout/safeAreaLayout';

export function TrackTypeButton({
  value,
  onPress,
  error,
  placeholder = 'Select Track Type',
}) {
  const selectedLabel = value || placeholder;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dropdownButton,
        error && styles.inputError,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text
        style={[
          styles.dropdownButtonText,
          !value && styles.dropdownPlaceholderText,
        ]}
        numberOfLines={1}
      >
        {selectedLabel}
      </Text>
      <Text style={styles.dropdownChevron}>▾</Text>
    </Pressable>
  );
}

export function TrackTypeOverlay({ visible = true, value, onChange, onClose, embedded = false }) {
  const [rendered, setRendered] = useState(Boolean(visible));
  const slideY = useRef(new Animated.Value(visible ? 0 : 42)).current;
  const backdropOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const selectingRef = useRef(false);
  const { modalAvailableHeight, modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({ modalSize: 'small' });
  const pickerHeight = Math.max(220, Math.min(620, Math.floor(modalAvailableHeight)));

  useEffect(() => {
    let frame = null;

    if (visible) {
      selectingRef.current = false;
      setRendered(true);
      slideY.setValue(42);
      backdropOpacity.setValue(0);
      frame = requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(slideY, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 170,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: 42,
          duration: 190,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      slideY.stopAnimation();
      backdropOpacity.stopAnimation();
    };
  }, [visible]);

  function selectOption(option) {
    if (selectingRef.current) return;
    selectingRef.current = true;
    onChange?.(option);
    onClose?.();
  }

  const content = (
    <Animated.View
      style={[
        styles.dropdownOverlay,
        embedded && styles.dropdownOverlayEmbedded,
        !embedded && modalBackdropStyle,
        { opacity: backdropOpacity },
      ]}
    >
      <Animated.View
        style={[
          styles.dropdownModal,
          modalCardStyle,
          {
            width: '100%',
            height: pickerHeight,
            maxHeight: pickerHeight,
            flexShrink: 0,
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        <View style={styles.dropdownHeader}>
          <Text style={styles.dropdownTitle}>Track Type</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.dropdownCloseButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.dropdownCloseText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.dropdownList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.dropdownListContent}
        >
          {TRACK_TYPE_OPTIONS.map(option => {
            const selected = option === value;

            return (
              <Pressable
                key={option}
                onPress={() => selectOption(option)}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  selected && styles.dropdownOptionSelected,
                  pressed && styles.dropdownOptionPressed,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    selected && styles.dropdownOptionTextSelected,
                  ]}
                >
                  {option}
                </Text>
                {selected ? <Text style={styles.dropdownCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );

  if (!rendered) return null;
  if (embedded) return content;

  return (
    <Modal
        transparent
        visible={rendered}
        animationType="none"
        onRequestClose={onClose}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
      >
        {content}
      </Modal>
  );
}

export default function TrackTypeDropdown(props) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TrackTypeButton {...props} onPress={() => setOpen(true)} />
      <TrackTypeOverlay
        visible={open}
        value={props.value}
        onChange={props.onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
