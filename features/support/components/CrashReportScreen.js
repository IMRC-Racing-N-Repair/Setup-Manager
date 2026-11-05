import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  makeCrashReport,
  openCrashReportEmail,
  saveCrashReport,
} from '../crashReporting';

export default function CrashReportScreen({ error, report: suppliedReport, onRetry }) {
  const [sending, setSending] = useState(false);
  const report = useMemo(
    () => suppliedReport || makeCrashReport(error, { fatal: true, source: 'startup-recovery-screen' }),
    [error, suppliedReport]
  );

  const sendReport = async () => {
    if (sending) return;
    setSending(true);
    try {
      await saveCrashReport(report);
      await openCrashReportEmail(report);
    } catch (sendError) {
      Alert.alert(
        'Unable to open email',
        `${sendError?.message || 'No email app is available.'}\n\nPlease email shopimrc@gmail.com.`
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>IMRC could not finish starting</Text>
      <Text style={styles.body}>
        The app caught a JavaScript startup error. Send the report so IMRC can see the app version,
        build number, error, and stack trace.
      </Text>

      <View style={styles.details}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text selectable style={styles.errorText}>
            {report?.error?.message || 'Unknown startup error'}
          </Text>
          <Text selectable style={styles.reportId}>Report: {report?.id || 'unknown'}</Text>
        </ScrollView>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={sendReport}
        disabled={sending}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, sending && styles.disabled]}
      >
        {sending ? <ActivityIndicator color="#03111a" /> : <Text style={styles.primaryText}>Send Crash Report</Text>}
      </Pressable>

      {typeof onRetry === 'function' ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>Try Starting Again</Text>
        </Pressable>
      ) : null}

      <Text style={styles.note}>Email is addressed to shopimrc@gmail.com. Review it, then tap Send.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 56,
    paddingBottom: 30,
    alignItems: 'center',
    backgroundColor: '#070a10',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 18,
  },
  title: {
    color: '#f8fafc',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    color: '#a7b0c0',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 520,
  },
  details: {
    width: '100%',
    maxWidth: 520,
    maxHeight: 150,
    marginTop: 18,
    marginBottom: 18,
    padding: 13,
    borderRadius: 6,
    backgroundColor: '#151923',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  errorText: {
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  reportId: {
    marginTop: 8,
    color: '#7f8a9b',
    fontSize: 11,
  },
  primaryButton: {
    width: '100%',
    maxWidth: 520,
    minHeight: 50,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38bdf8',
  },
  primaryText: {
    color: '#03111a',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    width: '100%',
    maxWidth: 520,
    minHeight: 48,
    marginTop: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d121c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  secondaryText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  note: {
    marginTop: 14,
    color: '#7f8a9b',
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.65,
  },
});

