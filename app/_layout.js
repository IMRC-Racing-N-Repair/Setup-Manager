import React from 'react';
import { StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import useIncomingIMRC from '../features/setups/hooks/useIncomingIMRC';
import { GuidedTourProvider } from '../features/support/components/GuidedTour';
import AppCrashBoundary from '../features/support/components/AppCrashBoundary';

function RootContent() {
  useIncomingIMRC();
  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics} style={styles.root}>
      <StatusBar style="light" />
      <AppCrashBoundary>
        <GuidedTourProvider>
          <RootContent />
        </GuidedTourProvider>
      </AppCrashBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070B13',
  },
});
