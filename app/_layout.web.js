import React from 'react';
import { StyleSheet, View } from 'react-native';
import useViewport from '../src/layout/useViewport';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppCrashBoundary from '../features/support/components/AppCrashBoundary';
import WebSidebar from '../src/navigation/WebSidebar';

export default function WebRootLayout() {
  const { width } = useViewport();
  const desktop = width >= 900;

  return (
    <SafeAreaProvider style={styles.root}>
      <AppCrashBoundary>
        <View style={[styles.shell, desktop && styles.desktopShell]}>
          {desktop ? <WebSidebar /> : null}
          <View style={styles.stage}>
            <Slot />
          </View>
        </View>
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
  stage: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    maxWidth: 1800,
    alignSelf: 'stretch',
    backgroundColor: '#070B13',
  },
});
