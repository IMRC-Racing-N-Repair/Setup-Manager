import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import useIncomingIMRC from '../features/setups/hooks/useIncomingIMRC';
import AppCrashBoundary from '../features/support/components/AppCrashBoundary';
import WebSidebar from '../src/navigation/WebSidebar';

function RootContent() {
  useIncomingIMRC();
  const { width } = useWindowDimensions();
  const desktopWeb = Platform.OS === 'web' && width >= 900;

  return (
    <View style={[styles.shell, desktopWeb && styles.desktopShell]}>
      {desktopWeb ? <WebSidebar /> : null}
      <View style={[styles.content, desktopWeb && styles.desktopContent]}>
        <Slot />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics} style={styles.root}>
      <StatusBar style="light" />
      <AppCrashBoundary>
        <RootContent />
      </AppCrashBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070B13',
  },
  shell: {
    flex: 1,
    backgroundColor: '#070B13',
  },
  desktopShell: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#070B13',
  },
  desktopContent: {
    maxWidth: 1800,
    alignSelf: 'stretch',
  },
});
