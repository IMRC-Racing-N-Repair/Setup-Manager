// app/index.js
// Dashboard entry. Authentication and cloud-sync state have one owner inside
// DashboardScreen so the app does not create duplicate listeners and pollers.

import { Fragment, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import CrashReportScreen from '../features/support/components/CrashReportScreen';
import { makeCrashReport, saveCrashReport } from '../features/support/crashReporting';

export default function HomeScreen() {
  const [startup, setStartup] = useState({ Dashboard: null, FirstUseGate: null, error: null, report: null, attempt: 0 });

  useEffect(() => {
    let active = true;

    Promise.all([
      import('../src/dashboard/DashboardScreen'),
      import('../features/support/components/FirstUseHowToUseGate'),
    ]).then(([dashboardModule, firstUseModule]) => {
      if (!active) return;
      setStartup((state) => ({
        ...state,
        Dashboard: dashboardModule.default,
        FirstUseGate: firstUseModule.default,
        error: null,
        report: null,
      }));
    }).catch((error) => {
      if (!active) return;
      const report = makeCrashReport(error, { fatal: true, source: 'dashboard-module-startup' });
      saveCrashReport(report).catch(() => null);
      setStartup((state) => ({ ...state, error, report }));
    });

    return () => {
      active = false;
    };
  }, [startup.attempt]);

  if (startup.error) {
    return (
      <CrashReportScreen
        error={startup.error}
        report={startup.report}
        onRetry={() => setStartup((state) => ({
          Dashboard: null,
          FirstUseGate: null,
          error: null,
          report: null,
          attempt: state.attempt + 1,
        }))}
      />
    );
  }

  if (!startup.Dashboard || !startup.FirstUseGate) {
    return (
      <View style={styles.loadingScreen}>
        <Image source={require('../assets/logo.png')} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator color="#38bdf8" size="large" />
        <Text style={styles.loadingText}>Starting IMRC...</Text>
      </View>
    );
  }

  const DashboardScreen = startup.Dashboard;
  const FirstUseHowToUseGate = startup.FirstUseGate;
  return (
    <Fragment>
      <DashboardScreen />
      <FirstUseHowToUseGate />
    </Fragment>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070a10',
  },
  loadingLogo: {
    width: 112,
    height: 112,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    color: '#a7b0c0',
    fontSize: 14,
    fontWeight: '800',
  },
});
