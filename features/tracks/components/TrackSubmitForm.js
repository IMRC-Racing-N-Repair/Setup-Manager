// features/tracks/components/TrackSubmitForm.js

import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import TrackTypeDropdown from './TrackTypeDropdown';
import { TRACK_SUBMISSION_EMAIL } from '../constants/trackSubmit';
import { validateTrack } from '../storage/trackStorage';
import { openTrackSubmissionEmail } from '../utils/trackSubmitEmail';
import { trackStyles as styles } from '../styles/trackStyles';
import AppScreenHeader from '../../../src/layout/AppScreenHeader';
import { normalizeLiveRcOrigin } from '../../../src/utils/liveRcUrl';

const EMPTY_SUBMISSION = {
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

export default function TrackSubmitForm({ initialTrack, onCancel }) {
  const [track, setTrack] = useState(() => ({
    ...EMPTY_SUBMISSION,
    ...(initialTrack || {}),
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const halfFieldStyle = useMemo(
    () => (isLandscape ? styles.formFieldHalf : styles.formFieldFull),
    [isLandscape]
  );

  const thirdFieldStyle = useMemo(
    () => (isLandscape ? styles.formFieldThird : styles.formFieldFull),
    [isLandscape]
  );

  function updateField(key, value) {
    const nextValue = key === 'state' ? String(value || '').toUpperCase() : value;

    setTrack(current => ({ ...current, [key]: nextValue }));

    if (errors[key]) {
      setErrors(current => ({ ...current, [key]: undefined }));
    }
  }

  function normalizeLiveRcField() {
    const normalized = normalizeLiveRcOrigin(track.liveRcUrl);
    if (normalized) updateField('liveRcUrl', normalized);
  }

  async function handleSubmit() {
    const result = validateTrack(track);

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    try {
      setSubmitting(true);
      await openTrackSubmissionEmail(track);
      setSubmitting(false);
    } catch (error) {
      setSubmitting(false);
      Alert.alert(
        'Email Not Opened',
        error.userMessage || 'The track submission email could not be opened.'
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.formShell}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={[
          styles.formContent,
          isLandscape && styles.formContentLandscape,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.editHeader}>
          <AppScreenHeader
            title="Submit Track"
            onBack={onCancel}
            rightLabel={submitting ? 'OPENING…' : 'SUBMIT'}
            onRightPress={submitting ? undefined : handleSubmit}
          />

          <View style={styles.submitIntro}>
            <Text style={styles.submitIntroEyebrow}>SHARE WITH IMRC</Text>
            <Text style={styles.editSubtitle}>
              Complete the track profile below. We’ll prepare an email draft to {TRACK_SUBMISSION_EMAIL}.
            </Text>
          </View>
        </View>

        <View style={styles.formGrid}>
          <View style={styles.formSectionHeader}>
            <Text style={styles.formSectionEyebrow}>IDENTITY</Text>
            <Text style={styles.formSectionTitle}>Track details</Text>
          </View>

          <View style={halfFieldStyle}>
            <Text style={styles.inputLabel}>Track Name *</Text>
            <TextInput
              value={track.trackName}
              onChangeText={value => updateField('trackName', value)}
              placeholder="Track name"
              placeholderTextColor="#64748B"
              style={[styles.textInput, errors.trackName && styles.inputError]}
              autoCapitalize="words"
            />
            {errors.trackName ? <Text style={styles.errorText}>{errors.trackName}</Text> : null}
          </View>

          <View style={styles.formSectionHeader}>
            <Text style={styles.formSectionEyebrow}>CONTACT & TRACK CONDITIONS</Text>
            <Text style={styles.formSectionTitle}>Race-day information</Text>
          </View>

          <View style={halfFieldStyle}>
            <Text style={styles.inputLabel}>Track Type *</Text>
            <TrackTypeDropdown
              value={track.trackType}
              error={errors.trackType}
              onChange={value => updateField('trackType', value)}
            />
            {errors.trackType ? <Text style={styles.errorText}>{errors.trackType}</Text> : null}
          </View>

          <View style={halfFieldStyle}>
            <Text style={styles.inputLabel}>Surface</Text>
            <TextInput
              value={track.surface}
              onChangeText={value => updateField('surface', value)}
              placeholder="CRC Gray"
              placeholderTextColor="#64748B"
              style={styles.textInput}
              autoCapitalize="words"
            />
          </View>

          <View style={halfFieldStyle}>
            <Text style={styles.inputLabel}>LiveRC URL</Text>
            <TextInput
              value={track.liveRcUrl}
              onChangeText={value => updateField('liveRcUrl', value)}
              onBlur={normalizeLiveRcField}
              placeholder="https://thestable.liverc.com/"
              placeholderTextColor="#64748B"
              style={[styles.textInput, errors.liveRcUrl && styles.inputError]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {errors.liveRcUrl ? <Text style={styles.errorText}>{errors.liveRcUrl}</Text> : null}
          </View>

          <View style={styles.compactSection}>
            <Text style={styles.compactSectionTitle}>Location</Text>

            <View style={styles.formGridNested}>
              <View style={styles.formFieldFull}>
                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  value={track.address}
                  onChangeText={value => updateField('address', value)}
                  placeholder="112 Main Street"
                  placeholderTextColor="#64748B"
                  style={styles.textInput}
                  autoCapitalize="words"
                />
              </View>

              <View style={thirdFieldStyle}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  value={track.city}
                  onChangeText={value => updateField('city', value)}
                  placeholder="East Randolph"
                  placeholderTextColor="#64748B"
                  style={styles.textInput}
                  autoCapitalize="words"
                />
              </View>

              <View style={thirdFieldStyle}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  value={track.state}
                  onChangeText={value => updateField('state', value)}
                  placeholder="NY"
                  placeholderTextColor="#64748B"
                  style={styles.textInput}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>

              <View style={thirdFieldStyle}>
                <Text style={styles.inputLabel}>Zip Code</Text>
                <TextInput
                  value={track.zipCode}
                  onChangeText={value => updateField('zipCode', value)}
                  placeholder="14730"
                  placeholderTextColor="#64748B"
                  style={styles.textInput}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <View style={halfFieldStyle}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              value={track.phone}
              onChangeText={value => updateField('phone', value)}
              placeholder="Phone number"
              placeholderTextColor="#64748B"
              style={styles.textInput}
              keyboardType="phone-pad"
            />
          </View>

          <View style={halfFieldStyle}>
            <Text style={styles.inputLabel}>Direction</Text>
            <TextInput
              value={track.direction}
              onChangeText={value => updateField('direction', value)}
              placeholder="Counter-Clockwise"
              placeholderTextColor="#64748B"
              style={styles.textInput}
              autoCapitalize="words"
            />
          </View>

          <View style={thirdFieldStyle}>
            <Text style={styles.inputLabel}>Traction Level</Text>
            <TextInput
              value={track.tractionLevel}
              onChangeText={value => updateField('tractionLevel', value)}
              placeholder="Medium"
              placeholderTextColor="#64748B"
              style={styles.textInput}
              autoCapitalize="words"
            />
          </View>

          <View style={thirdFieldStyle}>
            <Text style={styles.inputLabel}>Run Line</Text>
            <TextInput
              value={track.runLine}
              onChangeText={value => updateField('runLine', value)}
              placeholder="103"
              placeholderTextColor="#64748B"
              style={styles.textInput}
            />
          </View>

          <View style={thirdFieldStyle}>
            <Text style={styles.inputLabel}>Track Dimensions</Text>
            <TextInput
              value={track.trackDimensions}
              onChangeText={value => updateField('trackDimensions', value)}
              placeholder={"24' x 60'"}
              placeholderTextColor="#64748B"
              style={styles.textInput}
            />
          </View>

          <View style={styles.formSectionHeader}>
            <Text style={styles.formSectionEyebrow}>NOTES</Text>
            <Text style={styles.formSectionTitle}>Anything else we should know</Text>
          </View>

          <View style={styles.formFieldFull}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              value={track.notes}
              onChangeText={value => updateField('notes', value)}
              placeholder="Anything we should know about this track?"
              placeholderTextColor="#64748B"
              style={[styles.textInput, styles.notesInput]}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={[styles.actionRow, isLandscape && styles.actionRowLandscape]}>
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryButton,
              submitting && styles.disabledButton,
              pressed && !submitting && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Opening Email...' : 'Submit by Email'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.submitBackButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.submitBackButtonText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
