// features/tracks/components/TrackEditSheet.js

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import PopupScrollTab from './PopupScrollTab';
import { TrackTypeButton, TrackTypeOverlay } from './TrackTypeDropdown';
import { trackStyles as styles } from '../styles/trackStyles';
import { validateTrack } from '../storage/trackStorage';
import { useSafeAreaLayout } from '../../../src/layout/safeAreaLayout';

const EMPTY_TRACK = {
  trackName: '',
  trackType: '',
  surface: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  liveRcUrl: '',
  direction: '',
  tractionLevel: '',
  runLine: '',
  trackDimensions: '',
  notes: '',
};

export default function TrackEditSheet({
  visible,
  initialTrack,
  isNew = false,
  saving = false,
  onCancel,
  onSave,
  onDelete,
  onViewSetups,
  onSubmitTrack,
  onDismiss,
}) {
  const [track, setTrack] = useState(() => ({
    ...EMPTY_TRACK,
    ...(initialTrack || {}),
  }));
  const [errors, setErrors] = useState({});
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [scrollVisibleHeight, setScrollVisibleHeight] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const [trackTypeOpen, setTrackTypeOpen] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const fieldPositionsRef = useRef({});
  const focusedFieldRef = useRef(null);
  const actionLockedRef = useRef(false);
  const scrollTimerRef = useRef(null);
  const blurTimerRef = useRef(null);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isNarrowPhone = width < 370;
  const { insets, modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({ modalSize: 'normal' });

  const halfFieldStyle = useMemo(() => [styles.sheetFieldHalf, isNarrowPhone && styles.sheetFieldNarrow], [isNarrowPhone]);
  const thirdFieldStyle = useMemo(() => [styles.sheetFieldThird, isNarrowPhone && styles.sheetFieldNarrow], [isNarrowPhone]);
  const twoThirdFieldStyle = useMemo(() => [styles.sheetFieldTwoThird, isNarrowPhone && styles.sheetFieldNarrow], [isNarrowPhone]);

  const keyboardFooterBottom = keyboardHeight > 0 ? keyboardHeight + insets.bottom + 8 : insets.bottom + 8;

  useEffect(() => {
    if (visible) {
      actionLockedRef.current = false;
      setTrack({
        ...EMPTY_TRACK,
        ...(initialTrack || {}),
      });
      setErrors({});
      setTrackTypeOpen(false);
    } else {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      scrollTimerRef.current = null;
      blurTimerRef.current = null;
      setKeyboardOpen(false);
      setKeyboardHeight(0);
      focusedFieldRef.current = null;
      fieldPositionsRef.current = {};
      setTrackTypeOpen(false);
    }
  }, [visible, initialTrack]);

  useEffect(() => {
    if (!visible) return undefined;

    const showSub = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardOpen(true);
      setKeyboardHeight(event?.endCoordinates?.height || 0);

      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        scrollFocusedFieldIntoView();
        scrollTimerRef.current = null;
      }, 80);
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
      focusedFieldRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, [visible]);

  function updateField(key, value) {
    const nextValue = key === 'state' ? String(value || '').toUpperCase() : value;

    setTrack(current => ({
      ...current,
      [key]: nextValue,
    }));

    if (errors[key]) {
      setErrors(current => ({
        ...current,
        [key]: undefined,
      }));
    }
  }

  function handleSave() {
    if (actionLockedRef.current) return;
    const result = validateTrack(track);

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    onSave?.(track);
  }

  function handleCancel() {
    if (actionLockedRef.current) return;
    actionLockedRef.current = true;
    Keyboard.dismiss();
    setTrackTypeOpen(false);
    onCancel?.();
  }

  function handleViewSetups() {
    if (actionLockedRef.current) return;
    actionLockedRef.current = true;
    Keyboard.dismiss();
    setTrackTypeOpen(false);
    onViewSetups?.();
  }

  function handleSubmitTrack() {
    if (actionLockedRef.current) return;
    const result = validateTrack(track);

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    actionLockedRef.current = true;
    Keyboard.dismiss();
    setTrackTypeOpen(false);
    onSubmitTrack?.(track);
  }

  function confirmDelete() {
    if (!onDelete || isNew) return;

    Alert.alert(
      'Delete Track?',
      'This removes the track from local storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  }

  function rememberFieldLayout(key, event) {
    fieldPositionsRef.current[key] = event.nativeEvent.layout.y;
  }

  function scrollFocusedFieldIntoView() {
    const key = focusedFieldRef.current;
    const y = fieldPositionsRef.current[key];

    if (typeof y !== 'number') return;

    const topBuffer = 18;
    const targetY = Math.max(0, y - topBuffer);

    scrollRef.current?.scrollTo({
      y: targetY,
      animated: true,
    });
  }

  function getInputFocusProps(key) {
    return {
      onFocus: () => {
        focusedFieldRef.current = key;
        setKeyboardOpen(true);

        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
          scrollFocusedFieldIntoView();
          scrollTimerRef.current = null;
        }, 120);
      },
      onBlur: () => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        blurTimerRef.current = setTimeout(() => {
          if (keyboardHeight <= 0) {
            setKeyboardOpen(false);
          }
          blurTimerRef.current = null;
        }, 160);
      },
    };
  }

  function renderActionButtons(isFloating = false) {
    return (
      <View style={[styles.sheetActionsBlock, isFloating && styles.sheetActionsBlockFloating]}>
        <View style={styles.sheetStationaryActions}>
          <Pressable
            onPress={handleSubmitTrack}
            style={({ pressed }) => [
              styles.stationarySubmitButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.stationarySubmitButtonText}>Submit Track</Text>
          </Pressable>

          {!isNew ? (
            <Pressable
              onPress={confirmDelete}
              style={({ pressed }) => [
                styles.stationaryDeleteButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.stationaryDeleteButtonText}>Delete Track</Text>
            </Pressable>
          ) : (
            <View style={styles.stationaryActionSpacer} />
          )}
        </View>

        <View style={styles.sheetFooterRow}>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              saving && styles.disabledButton,
              pressed && !saving && styles.buttonPressed,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Track'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={trackTypeOpen ? () => setTrackTypeOpen(false) : handleCancel}
      onDismiss={onDismiss}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.sheetOverlay, modalBackdropStyle]}>
        <Pressable style={styles.sheetDimmer} onPress={handleCancel} />

        <View
          style={[
            styles.bottomSheet,
            isLandscape && styles.bottomSheetLandscape,
            modalCardStyle,
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeaderRow}>
            <View style={styles.sheetHeaderTextWrap}>
              <Text style={styles.sheetEyebrow}>TRACK</Text>
              <Text style={styles.sheetTitle}>
                {isNew ? 'Add Track' : 'Edit Track'}
              </Text>
            </View>

            {!isNew ? (
              <Pressable
                onPress={handleViewSetups}
                style={({ pressed }) => [
                  styles.sheetSmallButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.sheetSmallButtonText}>View Setups</Text>
              </Pressable>
            ) : null}
          </View>

          <PopupScrollTab
            scrollY={scrollY}
            visibleHeight={scrollVisibleHeight}
            contentHeight={scrollContentHeight}
            style={styles.popupScrollTab}
          />

          <Animated.ScrollView
            ref={scrollRef}
            style={styles.sheetScroll}
            contentContainerStyle={[
              styles.sheetContent,
              keyboardOpen && styles.sheetContentKeyboardOpen,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onLayout={event => setScrollVisibleHeight(event.nativeEvent.layout.height)}
            onContentSizeChange={(_, contentHeight) => setScrollContentHeight(contentHeight)}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
          >
            <View style={styles.sheetGrid}>
              <View style={styles.sheetFieldFull} onLayout={event => rememberFieldLayout('trackName', event)}>
                <Text style={styles.inputLabel}>Track Name *</Text>
                <TextInput
                  {...getInputFocusProps('trackName')}
                  value={track.trackName}
                  onChangeText={value => updateField('trackName', value)}
                  placeholder="Phoenix RC Racing Club"
                  placeholderTextColor="#8B96AA"
                  style={[styles.textInput, errors.trackName && styles.inputError]}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                {errors.trackName ? <Text style={styles.errorText}>{errors.trackName}</Text> : null}
              </View>

              <View style={halfFieldStyle}>
                <Text style={styles.inputLabel}>Track Type *</Text>
                <TrackTypeButton
                  value={track.trackType}
                  error={errors.trackType}
                  onPress={() => {
                    Keyboard.dismiss();
                    setTrackTypeOpen(true);
                  }}
                />
                {errors.trackType ? <Text style={styles.errorText}>{errors.trackType}</Text> : null}
              </View>

              <View style={halfFieldStyle} onLayout={event => rememberFieldLayout('surface', event)}>
                <Text style={styles.inputLabel}>Surface</Text>
                <TextInput
                  {...getInputFocusProps('surface')}
                  value={track.surface}
                  onChangeText={value => updateField('surface', value)}
                  placeholder="CRC Gray"
                  placeholderTextColor="#8B96AA"
                  style={styles.textInput}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.sheetFieldFull} onLayout={event => rememberFieldLayout('liveRcUrl', event)}>
                <Text style={styles.inputLabel}>LiveRC URL</Text>
                <TextInput
                  {...getInputFocusProps('liveRcUrl')}
                  value={track.liveRcUrl}
                  onChangeText={value => updateField('liveRcUrl', value)}
                  placeholder="https://thestable.liverc.com/"
                  placeholderTextColor="#8B96AA"
                  style={styles.textInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Location</Text>

                <View style={styles.sheetGridNested}>
                  <View style={styles.sheetFieldFull} onLayout={event => rememberFieldLayout('address', event)}>
                    <Text style={styles.inputLabel}>Street Address</Text>
                    <TextInput
                      {...getInputFocusProps('address')}
                      value={track.address}
                      onChangeText={value => updateField('address', value)}
                      placeholder="112 Main Street"
                      placeholderTextColor="#8B96AA"
                      style={styles.textInput}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={twoThirdFieldStyle} onLayout={event => rememberFieldLayout('city', event)}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      {...getInputFocusProps('city')}
                      value={track.city}
                      onChangeText={value => updateField('city', value)}
                      placeholder="East Randolph"
                      placeholderTextColor="#8B96AA"
                      style={styles.textInput}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={thirdFieldStyle} onLayout={event => rememberFieldLayout('state', event)}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      {...getInputFocusProps('state')}
                      value={track.state}
                      onChangeText={value => updateField('state', value)}
                      placeholder="NY"
                      placeholderTextColor="#8B96AA"
                      style={styles.textInput}
                      autoCapitalize="characters"
                      maxLength={2}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.sheetFieldFull} onLayout={event => rememberFieldLayout('zipCode', event)}>
                    <Text style={styles.inputLabel}>Zip Code</Text>
                    <TextInput
                      {...getInputFocusProps('zipCode')}
                      value={track.zipCode}
                      onChangeText={value => updateField('zipCode', value)}
                      placeholder="14730"
                      placeholderTextColor="#8B96AA"
                      style={styles.textInput}
                      keyboardType="number-pad"
                      returnKeyType="next"
                    />
                  </View>
                </View>
              </View>

              <View style={halfFieldStyle} onLayout={event => rememberFieldLayout('phone', event)}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  {...getInputFocusProps('phone')}
                  value={track.phone}
                  onChangeText={value => updateField('phone', value)}
                  placeholder="Phone number"
                  placeholderTextColor="#8B96AA"
                  style={styles.textInput}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>

              <View style={halfFieldStyle} onLayout={event => rememberFieldLayout('direction', event)}>
                <Text style={styles.inputLabel}>Direction</Text>
                <TextInput
                  {...getInputFocusProps('direction')}
                  value={track.direction}
                  onChangeText={value => updateField('direction', value)}
                  placeholder="Counter-Clockwise"
                  placeholderTextColor="#8B96AA"
                  style={styles.textInput}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={thirdFieldStyle} onLayout={event => rememberFieldLayout('tractionLevel', event)}>
                <Text style={styles.inputLabel}>Traction</Text>
                <TextInput
                  {...getInputFocusProps('tractionLevel')}
                  value={track.tractionLevel}
                  onChangeText={value => updateField('tractionLevel', value)}
                  placeholder="Medium"
                  placeholderTextColor="#8B96AA"
                  style={styles.textInput}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={thirdFieldStyle} onLayout={event => rememberFieldLayout('runLine', event)}>
                <Text style={styles.inputLabel}>Run Line</Text>
                <TextInput
                  {...getInputFocusProps('runLine')}
                  value={track.runLine}
                  onChangeText={value => updateField('runLine', value)}
                  placeholder="103"
                  placeholderTextColor="#8B96AA"
                  style={styles.textInput}
                  returnKeyType="next"
                />
              </View>

              <View style={thirdFieldStyle} onLayout={event => rememberFieldLayout('trackDimensions', event)}>
                <Text style={styles.inputLabel}>Size</Text>
                <TextInput
                  {...getInputFocusProps('trackDimensions')}
                  value={track.trackDimensions}
                  onChangeText={value => updateField('trackDimensions', value)}
                  placeholder={"24' x 60'"}
                  placeholderTextColor="#8B96AA"
                  style={styles.textInput}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.sheetFieldFull} onLayout={event => rememberFieldLayout('notes', event)}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  {...getInputFocusProps('notes')}
                  value={track.notes}
                  onChangeText={value => updateField('notes', value)}
                  placeholder="Optional track notes..."
                  placeholderTextColor="#8B96AA"
                  style={[styles.textInput, styles.notesInputCompact]}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>
          </Animated.ScrollView>

          {!keyboardOpen ? renderActionButtons(false) : null}
        </View>

        {keyboardOpen ? (
          <View
            style={[
              styles.keyboardFloatingActions,
              { bottom: keyboardFooterBottom },
            ]}
          >
            {renderActionButtons(true)}
          </View>
        ) : null}

        <TrackTypeOverlay
          embedded
          visible={trackTypeOpen}
          value={track.trackType}
          onChange={value => updateField('trackType', value)}
          onClose={() => setTrackTypeOpen(false)}
        />
      </View>
    </Modal>
  );
}
