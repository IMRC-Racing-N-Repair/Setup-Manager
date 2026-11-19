import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppCrashBoundary from '../features/support/components/AppCrashBoundary';

export default function WebRootLayout() {
  return (
    <SafeAreaProvider style={styles.root}>
      <AppCrashBoundary>
        <View style={styles.stage}>
          <Slot />
        </View>
      </AppCrashBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: '100vh',
    backgroundColor: '#070B13',
  },
  stage: {
    flex: 1,
    width: '100%',
    maxWidth: 1600,
    alignSelf: 'center',
    backgroundColor: '#070B13',
  },
});
