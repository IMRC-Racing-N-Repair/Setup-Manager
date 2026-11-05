// src/dashboard/DashboardScreen.js
import { AppState, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { dashboardStyles as styles } from './dashboard.styles';
import { formatLastSync } from './logic/formatters';
import { markCloudDirty } from '../../app/services/cloudSync';
import { useAuthCloudSync } from './logic/useAuthCloudSync';
import { useDashboardData } from './logic/useDashboardData';
import { useImportIntent } from './logic/useImportIntent';
import { useRaceDayHome } from './logic/useRaceDayHome';
import { useRecentChanges } from './logic/useRecentChanges';
import { useSponsorBanner } from './logic/useSponsorBanner';
import StableSafeAreaView from '../layout/StableSafeAreaView';

import ActiveRaceDayModal from './modals/ActiveRaceDayModal';
import DashboardHeader from './components/DashboardHeader';
import BottomActions from './components/BottomActions';
import RaceDayArchiveModal from './modals/RaceDayArchiveModal';
import RaceDayButton from './buttons/RaceDayButton';
import RaceDayStartModal from './modals/RaceDayStartModal';
import RecentChangesCard from './components/RecentChangesCard';
import SponsorBanner from './components/SponsorBanner';
import SponsorStartupModal from './modals/SponsorStartupModal';
import StatsRow from './components/StatsRow';
import FlootDashboardView from './components/FlootDashboardView';

let sponsorPopupShownThisLaunch = false;

function Footer({ version, lastSyncAt, style }) {
  return <Text style={[styles.footerText, style]}>v{version} · last sync {formatLastSync(lastSyncAt)}</Text>;
}

function isTruthyStoredFlag(value) {
  const t = String(value ?? '').trim().toLowerCase();
  return !!t && t !== '0' && t !== 'false' && t !== 'null' && t !== 'undefined' && t !== '[]' && t !== '{}';
}

function safeParseJson(raw, fallback) {
  try {
    if (raw === null || raw === undefined || raw === '') return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function getRaceDayId(value) {
  if (!value || typeof value !== 'object') return '';
  return String(value.id || value.sessionId || value.raceDayId || '').trim();
}

async function repairEndedRaceDayActivePointers() {
  try {
    const pairs = await AsyncStorage.multiGet([
      '@raceDayActive_v1',
      '@activeRaceDay',
      '@raceDayEnded_v1',
      '@raceDaySessions_v1',
    ]);
    const map = Object.fromEntries(pairs || []);
    const activeRaw = map['@raceDayActive_v1'] || map['@activeRaceDay'] || '';
    const activeObj = safeParseJson(activeRaw, null);
    const activeId = getRaceDayId(activeObj);
    if (!activeId) return false;

    const endedFlagSet = isTruthyStoredFlag(map['@raceDayEnded_v1']);
    const sessions = safeParseJson(map['@raceDaySessions_v1'] || '[]', []);
    const activeSessionEnded = Array.isArray(sessions)
      ? sessions.some((s) => getRaceDayId(s) === activeId && String(s?.status || '').toLowerCase() === 'ended')
      : false;

    if (!endedFlagSet && !activeSessionEnded) return false;

    const endedAtMs = Date.now();
    const normalizedSessions = Array.isArray(sessions) ? [...sessions] : [];
    let found = false;
    const nextSessions = normalizedSessions.map((s) => {
      if (getRaceDayId(s) !== activeId) return s;
      found = true;
      return {
        ...s,
        id: activeId,
        status: 'ended',
        endedAtMs: Number(s?.endedAtMs || 0) || endedAtMs,
        updatedAtMs: Math.max(Number(s?.updatedAtMs || 0) || 0, endedAtMs),
        syncUpdatedAt: Math.max(Number(s?.syncUpdatedAt || 0) || 0, endedAtMs),
      };
    });

    if (!found) {
      nextSessions.unshift({
        ...(activeObj || {}),
        id: activeId,
        status: 'ended',
        endedAtMs,
        updatedAtMs: endedAtMs,
        syncUpdatedAt: endedAtMs,
      });
    }

    await AsyncStorage.multiSet([
      ['@raceDayActive_v1', ''],
      ['@activeRaceDay', ''],
      ['@raceDayEnded_v1', '1'],
      ['@raceDaySessions_v1', JSON.stringify(nextSessions)],
    ]);

    await markCloudDirty({
      reason: 'dashboard-raceday-ended-repair',
      keys: [
        '@raceDayActive_v1',
        '@activeRaceDay',
        '@raceDayEnded_v1',
        '@raceDaySessions_v1',
      ],
      type: 'raceDaySession',
      id: activeId,
    });

    return true;
  } catch {
    return false;
  }
}

export default function DashboardScreen({
  cloudSyncStatus = null,
  syncStatus = null,
  onManualCloudSync = null,
  onCloudSyncPress = null,
} = {}) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const pendingStartActionRef = useRef(null);
  const pendingActiveSessionRef = useRef(null);
  const pendingArchiveSessionRef = useRef(null);
  const startDismissTimerRef = useRef(null);
  const activeDismissTimerRef = useRef(null);
  const archiveDismissTimerRef = useRef(null);
  const [showSponsorPopup, setShowSponsorPopup] = useState(() => {
    if (sponsorPopupShownThisLaunch) return false;
    sponsorPopupShownThisLaunch = true;
    return true;
  });

  const isShortLandscape = isLandscape && height < 540;
  const isVeryShortLandscape = isLandscape && height < 470;

  const landscapeSizing = isLandscape
    ? {
        root: {
          paddingHorizontal: isVeryShortLandscape ? 8 : isShortLandscape ? 10 : 12,
          paddingTop: isVeryShortLandscape ? 4 : isShortLandscape ? 6 : 12,
          paddingBottom: isVeryShortLandscape ? 18 : isShortLandscape ? 22 : 26,
          gap: isVeryShortLandscape ? 10 : isShortLandscape ? 12 : 18,
        },
        left: {
          flex: isVeryShortLandscape ? 0.40 : isShortLandscape ? 0.42 : 0.43,
        },
        right: {
          flex: isVeryShortLandscape ? 0.60 : isShortLandscape ? 0.58 : 0.57,
        },
        header: {
          height: isVeryShortLandscape ? 56 : isShortLandscape ? 68 : 86,
          marginBottom: isVeryShortLandscape ? 2 : isShortLandscape ? 4 : 8,
        },
        bannerImage: {
          height: isVeryShortLandscape ? 54 : isShortLandscape ? 66 : 86,
        },
        statsRow: {
          gap: isVeryShortLandscape ? 6 : isShortLandscape ? 7 : 9,
          marginBottom: isVeryShortLandscape ? 6 : isShortLandscape ? 8 : 10,
        },
        statCard: {
          minHeight: isVeryShortLandscape ? 38 : isShortLandscape ? 44 : 54,
          padding: isVeryShortLandscape ? 5 : isShortLandscape ? 6 : 8,
          borderRadius: 4,
        },
        statValue: {
          fontSize: isVeryShortLandscape ? 15 : isShortLandscape ? 17 : 20,
          marginTop: 0,
        },
        statIconBubble: {
          width: isVeryShortLandscape ? 20 : isShortLandscape ? 23 : 28,
          height: isVeryShortLandscape ? 20 : isShortLandscape ? 23 : 28,
        },
        raceDayButton: {
          marginBottom: isVeryShortLandscape ? 8 : 12,
          borderRadius: 6,
        },
        raceDayGradient: {
          minHeight: isVeryShortLandscape ? 52 : isShortLandscape ? 60 : 70,
          paddingHorizontal: isVeryShortLandscape ? 12 : 14,
        },
        raceDayText: {
          fontSize: isVeryShortLandscape ? 14 : 16,
        },
        bottomActions: {
          gap: isVeryShortLandscape ? 8 : 12,
          marginTop: isVeryShortLandscape ? 4 : 6,
        },
        bottomButton: {
          minHeight: isVeryShortLandscape ? 38 : isShortLandscape ? 42 : 46,
          borderRadius: 5,
        },
        footerText: {
          marginTop: isVeryShortLandscape ? 3 : 6,
          fontSize: isVeryShortLandscape ? 10 : 11,
        },
        recentCard: {
          minHeight: isVeryShortLandscape ? 92 : isShortLandscape ? 108 : 124,
          maxHeight: Math.max(92, Math.min(isVeryShortLandscape ? 150 : 190, Math.floor(height * 0.36))),
          padding: isVeryShortLandscape ? 10 : isShortLandscape ? 12 : 14,
          marginBottom: isVeryShortLandscape ? 8 : 12,
        },
        recentTitle: {
          fontSize: isVeryShortLandscape ? 15 : isShortLandscape ? 16 : 18,
        },
        recentRow: {
          paddingVertical: isVeryShortLandscape ? 3 : 5,
        },
        sponsorCard: {
          padding: isVeryShortLandscape ? 6 : isShortLandscape ? 8 : 10,
        },
        sponsorImage: {
          height: Math.max(118, Math.min(isVeryShortLandscape ? 165 : isShortLandscape ? 190 : 235, Math.floor(height * (isVeryShortLandscape ? 0.34 : 0.38)))),
        },
        sponsorPlaceholder: {
          height: Math.max(118, Math.min(isVeryShortLandscape ? 165 : isShortLandscape ? 190 : 235, Math.floor(height * (isVeryShortLandscape ? 0.34 : 0.38)))),
        },
        sponsorName: {
          fontSize: isVeryShortLandscape ? 13 : 16,
          marginTop: isVeryShortLandscape ? 4 : 6,
        },
      }
    : null;


  const portraitSizing = !isLandscape
    ? (() => {
        const h = Math.max(Number(height || 0), 1);
        const isTinyPhone = h < 660;
        const isSmallPhone = h < 735;
        const isMidPhone = h < 820;

        const headerH = isTinyPhone ? 54 : isSmallPhone ? 62 : isMidPhone ? 72 : 86;
        const statH = isTinyPhone ? 40 : isSmallPhone ? 44 : isMidPhone ? 50 : 58;
        const raceH = isTinyPhone ? 46 : isSmallPhone ? 52 : isMidPhone ? 60 : 70;
        const recentMin = isTinyPhone ? 70 : isSmallPhone ? 78 : isMidPhone ? 92 : 112;
        const sponsorH = Math.max(
          isTinyPhone ? 92 : isSmallPhone ? 112 : isMidPhone ? 142 : 172,
          Math.min(
            isTinyPhone ? 112 : isSmallPhone ? 138 : isMidPhone ? 175 : 220,
            Math.floor(h * (isTinyPhone ? 0.16 : isSmallPhone ? 0.18 : isMidPhone ? 0.21 : 0.24))
          )
        );

        return {
          root: {
            paddingHorizontal: isTinyPhone ? 9 : isSmallPhone ? 10 : 16,
          },
          content: {
            padding: isTinyPhone ? 9 : isSmallPhone ? 10 : 16,
            paddingBottom: isTinyPhone ? 76 : isSmallPhone ? 86 : 104,
          },
          header: {
            height: headerH,
            marginBottom: isTinyPhone ? 4 : isSmallPhone ? 5 : 8,
          },
          authPill: {
            transform: [{ scale: isTinyPhone ? 0.86 : isSmallPhone ? 0.92 : 1 }],
          },
          statsRow: {
            gap: isTinyPhone ? 5 : isSmallPhone ? 6 : 9,
            marginBottom: isTinyPhone ? 6 : isSmallPhone ? 7 : 10,
          },
          statCard: {
            minHeight: statH,
            padding: isTinyPhone ? 5 : isSmallPhone ? 6 : 8,
            borderRadius: 4,
          },
          statValue: {
            fontSize: isTinyPhone ? 15 : isSmallPhone ? 16 : isMidPhone ? 18 : 20,
            marginTop: 0,
          },
          statIconBubble: {
            width: isTinyPhone ? 20 : isSmallPhone ? 22 : 28,
            height: isTinyPhone ? 20 : isSmallPhone ? 22 : 28,
            borderRadius: 2,
          },
          raceDayButton: {
            marginBottom: isTinyPhone ? 6 : isSmallPhone ? 7 : 12,
            borderRadius: 6,
          },
          raceDayGradient: {
            minHeight: raceH,
            paddingHorizontal: isTinyPhone ? 9 : isSmallPhone ? 10 : 14,
          },
          raceDayText: {
            fontSize: isTinyPhone ? 13 : isSmallPhone ? 14 : 16,
          },
          recentCard: {
            minHeight: recentMin,
            padding: isTinyPhone ? 8 : isSmallPhone ? 9 : 14,
            marginBottom: isTinyPhone ? 6 : isSmallPhone ? 7 : 14,
            borderRadius: 6,
          },
          recentTitle: {
            fontSize: isTinyPhone ? 14 : isSmallPhone ? 15 : 18,
          },
          recentRow: {
            paddingTop: isTinyPhone ? 2 : 4,
            marginTop: isTinyPhone ? 2 : 4,
          },
          sponsorCard: {
            padding: isTinyPhone ? 5 : isSmallPhone ? 6 : 8,
            borderRadius: 6,
          },
          sponsorImage: {
            height: sponsorH,
            maxHeight: sponsorH,
          },
          sponsorPlaceholder: {
            height: sponsorH,
            maxHeight: sponsorH,
          },
          sponsorName: {
            fontSize: isTinyPhone ? 11 : isSmallPhone ? 12 : 16,
            marginTop: isTinyPhone ? 3 : isSmallPhone ? 4 : 8,
          },
          bottomFixed: {
            left: isTinyPhone ? 9 : isSmallPhone ? 10 : 16,
            right: isTinyPhone ? 9 : isSmallPhone ? 10 : 16,
            bottom: isTinyPhone ? 4 : isSmallPhone ? 6 : 8,
            paddingTop: isTinyPhone ? 3 : 5,
          },
          bottomActions: {
            gap: isTinyPhone ? 7 : isSmallPhone ? 8 : 12,
            marginTop: 0,
          },
          bottomButton: {
            minHeight: isTinyPhone ? 34 : isSmallPhone ? 38 : 46,
            borderRadius: 5,
          },
          footerText: {
            marginTop: isTinyPhone ? 2 : isSmallPhone ? 3 : 6,
            fontSize: isTinyPhone ? 9 : isSmallPhone ? 10 : 11,
          },
        };
      })()
    : null;

  const { counts, vehicles, tracks, loadCounts } = useDashboardData();
  const raceDay = useRaceDayHome({ router, onRefresh: loadCounts });
  const { raceDayReady, hasRaceDaySelections, syncRaceDayReady } = raceDay;
  const recent = useRecentChanges({ raceDayReady, hasRaceDaySelections });
  const { refreshRecentChanges } = recent;
  const { sponsor } = useSponsorBanner();
  const dashboardRefreshCallback = useCallback(async () => {
    await loadCounts();
    await refreshRecentChanges();
  }, [loadCounts, refreshRecentChanges]);

  const auth = useAuthCloudSync({
    onDashboardRefresh: dashboardRefreshCallback,
    onRaceDayRefresh: syncRaceDayReady,
  });


  const incomingSyncStatus = cloudSyncStatus || syncStatus || null;
  const incomingDotColor = incomingSyncStatus?.color || '';
  const authDotResolved = !!auth.authUser && !!auth.statusDotColor && auth.statusDotColor !== '#6B7280';
  const dashboardStatusDotColor = authDotResolved ? auth.statusDotColor : (incomingDotColor || auth.statusDotColor);
  const dashboardLastSyncAt = Number(incomingSyncStatus?.lastSyncAt || 0) || auth.lastSyncAt;
  const handleDashboardAuthPress = auth.handleAuthPress;

  const finishStartModalDismissal = useCallback(async () => {
    const action = pendingStartActionRef.current;
    if (!action) return;
    pendingStartActionRef.current = null;
    if (startDismissTimerRef.current) {
      clearTimeout(startDismissTimerRef.current);
      startDismissTimerRef.current = null;
    }

    if (action === 'newEvent') await raceDay.startNewRaceDayFlow();
    if (action === 'pastEvents') await raceDay.openPastEventsPicker();
  }, [raceDay.openPastEventsPicker, raceDay.startNewRaceDayFlow]);

  const queueStartModalAction = useCallback((action) => {
    pendingStartActionRef.current = action;
    raceDay.modals.setShowStartModal(false);
    if (Platform.OS !== 'ios') {
      if (startDismissTimerRef.current) clearTimeout(startDismissTimerRef.current);
      startDismissTimerRef.current = setTimeout(finishStartModalDismissal, 260);
    }
  }, [finishStartModalDismissal, raceDay.modals]);

  const finishActiveModalDismissal = useCallback(async () => {
    const session = pendingActiveSessionRef.current;
    if (!session) return;
    pendingActiveSessionRef.current = null;
    if (activeDismissTimerRef.current) {
      clearTimeout(activeDismissTimerRef.current);
      activeDismissTimerRef.current = null;
    }
    await raceDay.setActivePointerFromSession(session);
    router.replace('/raceday/dashboard');
  }, [raceDay.setActivePointerFromSession, router]);

  const queueActiveSession = useCallback((session) => {
    pendingActiveSessionRef.current = session;
    raceDay.modals.setShowActiveModal(false);
    if (Platform.OS !== 'ios') {
      if (activeDismissTimerRef.current) clearTimeout(activeDismissTimerRef.current);
      activeDismissTimerRef.current = setTimeout(finishActiveModalDismissal, 260);
    }
  }, [finishActiveModalDismissal, raceDay.modals]);

  const finishArchiveModalDismissal = useCallback(async () => {
    const session = pendingArchiveSessionRef.current;
    if (!session) return;
    pendingArchiveSessionRef.current = null;
    if (archiveDismissTimerRef.current) {
      clearTimeout(archiveDismissTimerRef.current);
      archiveDismissTimerRef.current = null;
    }
    await raceDay.recallPastRaceDaySession(session);
  }, [raceDay.recallPastRaceDaySession]);

  const queueArchiveSession = useCallback((session) => {
    pendingArchiveSessionRef.current = session;
    raceDay.modals.setShowPastEventsModal(false);
    if (Platform.OS !== 'ios') {
      if (archiveDismissTimerRef.current) clearTimeout(archiveDismissTimerRef.current);
      archiveDismissTimerRef.current = setTimeout(finishArchiveModalDismissal, 260);
    }
  }, [finishArchiveModalDismissal, raceDay.modals]);

  useImportIntent({ router });

  const refreshDashboard = useCallback(async () => {
    await repairEndedRaceDayActivePointers();
    await syncRaceDayReady();
    await loadCounts();
    await refreshRecentChanges();
  }, [loadCounts, refreshRecentChanges, syncRaceDayReady]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refreshDashboard(); });
    return () => { try { sub.remove(); } catch {} };
  }, [refreshDashboard]);

  useEffect(() => () => {
    if (startDismissTimerRef.current) clearTimeout(startDismissTimerRef.current);
    if (activeDismissTimerRef.current) clearTimeout(activeDismissTimerRef.current);
    if (archiveDismissTimerRef.current) clearTimeout(archiveDismissTimerRef.current);
  }, []);

  useFocusEffect(useCallback(() => { refreshDashboard(); }, [refreshDashboard]));

  const mainContent = (
    <>
      <SponsorBanner
        sponsor={sponsor}
        style={portraitSizing?.sponsorCard}
        imageStyle={portraitSizing?.sponsorImage}
        placeholderStyle={portraitSizing?.sponsorPlaceholder}
        nameStyle={portraitSizing?.sponsorName}
      />
      <StatsRow
        counts={counts}
        router={router}
        rowStyle={portraitSizing?.statsRow}
        cardStyle={portraitSizing?.statCard}
        valueStyle={portraitSizing?.statValue}
        iconBubbleStyle={portraitSizing?.statIconBubble}
      />
      <RaceDayButton
        raceDayReady={raceDayReady}
        onPress={raceDay.handleRaceDayPress}
        style={portraitSizing?.raceDayButton}
        gradientStyle={portraitSizing?.raceDayGradient}
        textStyle={portraitSizing?.raceDayText}
      />
      <RecentChangesCard
        rows={recent.recentRows}
        onViewMore={() => router.push('/recent-changes')}
        style={portraitSizing?.recentCard}
        titleStyle={portraitSizing?.recentTitle}
        rowStyle={portraitSizing?.recentRow}
      />
    </>
  );

  const landscapeLeftContent = (
    <>
      <DashboardHeader
        userName={auth.userFirstName}
        statusDotColor={dashboardStatusDotColor}
        onAuthPress={handleDashboardAuthPress}
        onAuthLongPress={auth.handleAuthLongPress}
        style={landscapeSizing?.header}
        imageStyle={landscapeSizing?.bannerImage}
      />
      <View style={styles.landscapeControlsBlock}>
        <StatsRow
          counts={counts}
          router={router}
          rowStyle={landscapeSizing?.statsRow}
          cardStyle={landscapeSizing?.statCard}
          valueStyle={landscapeSizing?.statValue}
          iconBubbleStyle={landscapeSizing?.statIconBubble}
        />
        <RaceDayButton
          raceDayReady={raceDayReady}
          onPress={raceDay.handleRaceDayPress}
          style={landscapeSizing?.raceDayButton}
          gradientStyle={landscapeSizing?.raceDayGradient}
          textStyle={landscapeSizing?.raceDayText}
        />
      </View>
    </>
  );

  const landscapeRightContent = (
    <>
      <SponsorBanner
        sponsor={sponsor}
        style={landscapeSizing?.sponsorCard}
        imageStyle={landscapeSizing?.sponsorImage}
        placeholderStyle={landscapeSizing?.sponsorPlaceholder}
        nameStyle={landscapeSizing?.sponsorName}
      />
      <RecentChangesCard
        rows={recent.recentRows}
        onViewMore={() => router.push('/recent-changes')}
        style={landscapeSizing?.recentCard}
        titleStyle={landscapeSizing?.recentTitle}
        rowStyle={landscapeSizing?.recentRow}
      />
    </>
  );

  return (
    <StableSafeAreaView style={styles.safe}>
      <FlootDashboardView
        userName={auth.userFirstName}
        statusDotColor={dashboardStatusDotColor}
        onAuthPress={handleDashboardAuthPress}
        onAuthLongPress={auth.handleAuthLongPress}
        counts={counts}
        vehicles={vehicles}
        tracks={tracks}
        raceDayReady={raceDayReady}
        onRaceDayPress={raceDay.handleRaceDayPress}
        sponsor={sponsor}
        recentRows={recent.recentRows}
        router={router}
        version={auth.version}
        lastSyncAt={dashboardLastSyncAt}
        isLandscape={isLandscape}
      />

      <RaceDayStartModal
        visible={raceDay.modals.showStartModal}
        onClose={() => raceDay.modals.setShowStartModal(false)}
        onNewEvent={() => queueStartModalAction('newEvent')}
        onPastEvents={() => queueStartModalAction('pastEvents')}
        onDismiss={finishStartModalDismissal}
      />

      <ActiveRaceDayModal
        visible={raceDay.modals.showActiveModal}
        choices={raceDay.modals.activeChoices}
        onClose={() => raceDay.modals.setShowActiveModal(false)}
        onContinue={queueActiveSession}
        onDismiss={finishActiveModalDismissal}
        onEnd={async (sessionId) => {
          await raceDay.endRaceDaySessionById(sessionId);
          await repairEndedRaceDayActivePointers();
          await refreshDashboard();
        }}
      />
      <RaceDayArchiveModal
        visible={raceDay.modals.showPastEventsModal}
        trackChoices={raceDay.modals.pastTrackChoices}
        sessionChoices={raceDay.modals.pastSessionChoices}
        selectedTrackId={raceDay.modals.selectedPastTrackId}
        detail={raceDay.modals.archiveDetail}
        loading={raceDay.modals.archiveLoading}
        onClose={() => {
          raceDay.modals.setShowPastEventsModal(false);
          raceDay.modals.setArchiveDetail?.(null);
        }}
        onBack={() => raceDay.selectPastTrack('')}
        onSelectTrack={raceDay.selectPastTrack}
        onOpenSession={queueArchiveSession}
        onCloseDetail={() => raceDay.modals.setArchiveDetail?.(null)}
        onDismiss={finishArchiveModalDismissal}
      />
      <SponsorStartupModal
        visible={showSponsorPopup}
        sponsor={sponsor}
        onClose={() => setShowSponsorPopup(false)}
      />
    </StableSafeAreaView>
  );
}
