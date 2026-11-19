import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import useViewport from '../../layout/useViewport';
import { Image } from 'expo-image';

import { desktopDashboardStyles, mobileWorkspaceDashboardStyles } from '../flootDashboard.styles';
import NewLookBottomNav from '../../navigation/NewLookBottomNav';

function textValue(value, fallback = '—') {
  const next = String(value ?? '').trim();
  return next || fallback;
}

function entityId(value) {
  return String(value?.id || value?.trackId || '').trim();
}

const NO_TRACK = '__none__';

function CountCell({ label, value, onPress, styles }) {
  return (
    <Pressable style={({ pressed }) => [styles.countCell, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.microLabel}>{label}</Text>
      <Text style={styles.countValue}>{value}</Text>
    </Pressable>
  );
}

export default function FlootDashboardView({
  userName,
  signedIn,
  syncBusy,
  syncProblemLabel,
  statusDotColor,
  onAuthPress,
  onAuthLongPress,
  counts,
  vehicles,
  tracks,
  lastOpened,
  raceDayReady,
  raceLive,
  onRaceDayPress,
  sponsor,
  recentRows,
  router,
  version,
  isLandscape,
  dashboardTrackId,
  onSelectDashboardTrack,
  loading = false,
}) {
  const { width, height } = useViewport();
  const desktop = width >= 900 && (Platform.OS === 'web' || width > height);
  const styles = desktop ? desktopDashboardStyles : mobileWorkspaceDashboardStyles;
  const compactLayout = !desktop && (width < 430 || height < 900);
  const shortLayout = !desktop && height < 850;
  const tabletLandscape = !desktop && width >= 700 && width > height;
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const trackList = Array.isArray(tracks) ? tracks : [];
  const savedTrackChoice = trackList.find((track) => entityId(track) === String(dashboardTrackId || '')) || null;
  const noTrackSelected = dashboardTrackId === NO_TRACK;
  const activeTrack = noTrackSelected
    ? null
    : savedTrackChoice || raceLive?.selectedTrack || (trackList.length ? trackList[0] : null);
  const lastOpenedItem = lastOpened || null;
  const liveState = raceLive?.liveState || {};
  const currentEvent = Boolean(raceDayReady && raceLive?.currentDay);
  const eventMatches = Boolean(currentEvent && raceLive?.eventMatches);
  const eventMismatch = Boolean(currentEvent && raceLive?.eventMismatch);
  const liveActive = Boolean(eventMatches && raceLive?.liveActive);
  const nextRace = eventMatches ? raceLive?.nextRace || null : null;
  const currentRaceNumber = textValue(liveState?.raceNumber);
  const currentRaceTitle = !raceDayReady || !currentEvent
    ? 'No Current Event'
    : eventMismatch
      ? 'Event does not match RaceDay'
      : eventMatches
        ? liveActive
          ? textValue(liveState?.className, 'Race in progress')
          : 'Waiting for track activity'
        : 'Checking LiveRC event';
  const currentRaceMeta = !raceDayReady || !currentEvent
    ? 'Choose today’s event in RaceDay'
    : eventMismatch
      ? 'The live track event is different from the selected RaceDay event'
      : eventMatches
        ? liveActive
          ? [liveState?.roundType, liveState?.heat, liveState?.raceStatus].filter(Boolean).join(' · ') || 'Current race is live'
          : 'No race is currently live'
        : 'Confirming the selected event with LiveRC';
  const lineupTitle = !currentEvent
    ? (desktop ? 'No upcoming race' : 'No Current Event')
    : eventMismatch
      ? "Event does not match RaceDay's"
      : !eventMatches
        ? 'Checking LiveRC event'
        : nextRace?.vehicleName || 'Waiting for lineup';
  const lineupMeta = !currentEvent
    ? 'Select an event dated today to enable live RaceDay information'
    : eventMismatch
      ? 'Choose the same event in RaceDay that is currently live at the track'
      : !eventMatches
        ? 'Waiting for LiveRC to identify the current event'
        : nextRace?.className || 'Lineup details will appear after sync';
  const workspaceTrackName = loading
    ? 'Checking saved RaceDay'
    : textValue(activeTrack?.name || activeTrack?.trackName, 'No track');
  const workspaceTrackMeta = loading
    ? 'Loading track, event, and race information'
    : activeTrack
      ? [activeTrack.surface, activeTrack.type || activeTrack.trackType].filter(Boolean).join(' · ') || 'Track details'
      : 'No track selected';
  const raceDayTrackName = textValue(
    raceLive?.selectedTrack?.name || raceLive?.selectedTrack?.trackName,
    workspaceTrackName,
  );
  const sponsorImage = sponsor?.logo || sponsor?.image || '';
  const syncColor = statusDotColor || '#6F7D74';
  const syncLabel = !signedIn ? 'SIGN IN'
    : syncBusy ? 'SYNCING'
      : syncProblemLabel?.toUpperCase() || (syncColor === '#22C55E' ? 'SYNCED' : 'CLOUD SYNC');
  const openSponsor = () => sponsor?.url && Linking.openURL(sponsor.url).catch(() => {});
  const chooseTrack = (trackId) => {
    onSelectDashboardTrack?.(trackId);
    setShowTrackPicker(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          desktop && Platform.OS !== 'web' && { paddingBottom: 92 },
          compactLayout && styles.contentCompact,
          shortLayout && styles.contentShort,
          tabletLandscape && styles.contentTabletLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.topbar, compactLayout && styles.topbarCompact]}>
          <View style={styles.titleBlock}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.eyebrow}>IMRC SETUP MANAGER</Text>
              {!!version && <Text style={styles.versionText}>v{version}</Text>}
            </View>
            <Text style={styles.pageTitle}>Race workspace</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable
              style={({ pressed }) => [styles.syncButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={signedIn ? (syncProblemLabel ? 'View Cloud Sync details' : 'Sync account') : 'Sign in'}
              onPress={onAuthPress}
              onLongPress={onAuthLongPress}
            >
              <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
              <View>
                <Text style={styles.syncLabel}>{syncLabel}</Text>
                <Text style={styles.syncName} numberOfLines={1}>{signedIn ? userName : 'Cloud sync'}</Text>
              </View>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} accessibilityLabel="Support" onPress={() => router.push('/support')}>
              <Text style={styles.iconButtonText}>•••</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={({ pressed }) => [styles.sponsorStrip, compactLayout && styles.sponsorStripCompact, pressed && styles.pressed]} onPress={openSponsor}>
          {sponsorImage ? (
            <Image source={{ uri: sponsorImage }} contentFit="contain" cachePolicy="memory-disk" style={styles.sponsorLogo} />
          ) : (
            <View style={styles.sponsorFallback}><Text style={styles.sponsorFallbackText}>IMRC</Text></View>
          )}
          <View style={styles.sponsorIdentity}>
            <Text style={styles.microLabel}>PRESENTED BY</Text>
            <Text style={styles.sponsorName} numberOfLines={1}>{sponsor?.name || 'Available Banner'}</Text>
          </View>
          {!!sponsor?.url && <Text style={styles.sponsorVisit}>Visit sponsor</Text>}
        </Pressable>


        <View style={styles.workspaceGrid}>
          <View style={styles.primaryGrid}>
            <View style={[styles.racePanel, compactLayout && styles.racePanelCompact]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.microLabel}>{loading ? 'CHECKING RACEDAY' : liveActive ? 'LIVE RACEDAY' : 'RACEDAY'}</Text>
                  <Text style={styles.sectionTitle} numberOfLines={2}>{raceDayTrackName}</Text>
                </View>
                <View style={[styles.liveBadge, (loading || !liveActive) && styles.idleBadge]}>
                  <View style={[styles.liveDot, (loading || !liveActive) && styles.idleDot]} />
                  <Text style={[styles.liveText, (loading || !liveActive) && styles.idleText]}>{loading ? 'LOADING' : liveActive ? 'LIVE' : currentEvent ? 'WAITING' : 'NO EVENT'}</Text>
                </View>
              </View>

              <Pressable disabled={loading} style={({ pressed }) => [styles.raceLine, compactLayout && styles.raceLineCompact, loading && styles.loadingMuted, pressed && styles.pressed]} onPress={onRaceDayPress}>
                <View style={styles.raceBadge}>
                  <Text style={styles.raceBadgeTop}>RACE</Text>
                  <Text style={styles.raceBadgeValue}>{!loading && liveActive ? currentRaceNumber : '—'}</Text>
                </View>
                <View style={styles.raceMain}>
                  <Text style={styles.mutedLabel}>{loading ? 'LOADING' : liveActive ? 'CURRENT RACE' : 'EVENT STATUS'}</Text>
                  <Text style={styles.raceMainTitle}>{loading ? 'Checking race information' : currentRaceTitle}</Text>
                  <Text style={styles.raceMainMeta}>{loading ? 'Reading your saved RaceDay and LiveRC data' : currentRaceMeta}</Text>
                </View>
                <Text style={styles.chevronLarge}>›</Text>
              </Pressable>

              <View style={styles.nextRaceBlock}>
                <Text style={styles.microLabel}>YOUR NEXT RACE</Text>
                <View style={styles.nextRaceRow}>
                  <View style={styles.nextRaceIdentity}>
                    <Text style={styles.nextRaceVehicle} numberOfLines={1}>{loading ? 'Checking your vehicles' : lineupTitle}</Text>
                    <Text style={styles.nextRaceClass} numberOfLines={desktop ? 2 : 1}>{loading ? 'Loading class and lineup details' : lineupMeta}</Text>
                  </View>
                  <View style={styles.nextRaceNumberBox}>
                    <Text style={styles.nextRaceNumberLabel}>RACE</Text>
                    <Text style={styles.nextRaceNumber}>{nextRace?.raceNumber || '—'}</Text>
                  </View>
                </View>
              </View>

              <Pressable disabled={loading} style={({ pressed }) => [styles.primaryButton, loading && styles.loadingMuted, pressed && styles.pressed]} onPress={onRaceDayPress}>
                <Text style={styles.primaryButtonText}>{loading ? 'LOADING RACEDAY' : raceDayReady ? 'OPEN RACEDAY' : 'START RACEDAY'}</Text>
                {!desktop && <Text style={styles.primaryButtonArrow}>›</Text>}
              </Pressable>
            </View>
          </View>

          <View style={styles.garageColumn}>
            <View style={[styles.garageSection, compactLayout && styles.garageSectionCompact]}>
              <View style={styles.sectionHeader}>
                <View>
                  {!desktop && <Text style={styles.microLabel}>GARAGE</Text>}
                  <Text style={styles.sectionTitle}>Garage</Text>
                </View>
                <Pressable onPress={() => router.push('/garage')}><Text style={styles.viewAll}>OPEN GARAGE  ›</Text></Pressable>
              </View>
              <View style={styles.garageMetrics}>
                <CountCell styles={styles} label="VEHICLES" value={counts?.vehicles || 0} onPress={() => router.push('/vehicles')} />
                <CountCell styles={styles} label="TRACKS" value={counts?.tracks || 0} onPress={() => router.push('/tracks')} />
                <CountCell styles={styles} label="SETUPS" value={counts?.setups || 0} onPress={() => router.push('/setups')} />
              </View>
              <View style={styles.vehicleList}>
                {lastOpenedItem ? (
                  <Pressable
                    style={({ pressed }) => [styles.vehicleRow, pressed && styles.pressed]}
                    onPress={() => router.push(lastOpenedItem.route)}
                  >
                    <Text style={styles.vehicleIndex}>LAST</Text>
                    <View style={styles.vehicleIdentity}>
                      <Text style={styles.vehicleName} numberOfLines={1}>{textValue(lastOpenedItem.title, 'Recently opened')}</Text>
                      <Text style={styles.vehicleMeta} numberOfLines={1}>{textValue(lastOpenedItem.meta, 'Open again')}</Text>
                    </View>
                    <Text style={[styles.vehicleStatus, isLandscape && styles.vehicleStatusLandscape]}>
                      {lastOpenedItem.type === 'tool' ? 'TOOL' : 'SETUP'}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ) : loading ? (
                  <View style={styles.emptyVehicleRow}>
                    <Text style={styles.emptyTitle}>Loading recent item…</Text>
                    <Text style={styles.emptyCopy}>Checking your last opened tool or setup.</Text>
                  </View>
                ) : (
                  <Pressable style={styles.emptyVehicleRow} onPress={() => router.push('/tools')}>
                    <Text style={styles.emptyTitle}>Nothing opened yet</Text>
                    <Text style={styles.emptyCopy}>Open a tool or setup and it will appear here.</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {!!recentRows?.length && !shortLayout && (
              <View style={styles.activityStrip}>
                <Text style={styles.microLabel}>LATEST CHANGE</Text>
                <Text style={styles.activityText} numberOfLines={1}>
                  {recentRows[0]?.vehicleName} · {recentRows[0]?.fieldLabel} · {recentRows[0]?.beforeValue} → {recentRows[0]?.afterValue}
                </Text>
              </View>
            )}

            {trackList.length > 0 && (
              <Pressable style={({ pressed }) => [styles.trackStrip, pressed && styles.pressed]} onPress={() => setShowTrackPicker(true)}>
                <View style={styles.trackIdentity}>
                  <Text style={styles.microLabel}>HOME TRACK</Text>
                  <Text style={styles.trackName}>{workspaceTrackName}</Text>
                  <Text style={styles.trackMeta}>{workspaceTrackMeta}</Text>
                </View>
                <Text style={styles.viewAll}>Change track</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showTrackPicker} transparent animationType="fade" onRequestClose={() => setShowTrackPicker(false)}>
        <View style={styles.trackPickerBackdrop}>
          <Pressable style={styles.trackPickerDismiss} onPress={() => setShowTrackPicker(false)} />
          <View style={styles.trackPickerSheet}>
            <View style={styles.trackPickerHeader}>
              <View>
                <Text style={styles.microLabel}>HOME DISPLAY</Text>
                <Text style={styles.trackPickerTitle}>Select track</Text>
              </View>
              <Pressable style={styles.trackPickerClose} onPress={() => setShowTrackPicker(false)}>
                <Text style={styles.trackPickerCloseText}>CLOSE</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.trackPickerScroll} contentContainerStyle={styles.trackPickerList} showsVerticalScrollIndicator={false}>
              <Pressable
                style={({ pressed }) => [styles.trackPickerRow, noTrackSelected && styles.trackPickerRowSelected, pressed && styles.pressed]}
                onPress={() => chooseTrack(NO_TRACK)}
              >
                <View style={styles.trackPickerIdentity}>
                  <Text style={styles.trackPickerName}>No track</Text>
                  <Text style={styles.trackPickerMeta}>Clear the home track selection</Text>
                </View>
                <Text style={[styles.trackPickerMark, noTrackSelected && styles.trackPickerMarkSelected]}>{noTrackSelected ? '✓' : '›'}</Text>
              </Pressable>
              {trackList.map((track) => {
                const id = entityId(track);
                const selected = !!id && entityId(activeTrack) === id && !noTrackSelected;
                return (
                  <Pressable
                    key={id || textValue(track?.name || track?.trackName)}
                    style={({ pressed }) => [styles.trackPickerRow, selected && styles.trackPickerRowSelected, pressed && styles.pressed]}
                    onPress={() => chooseTrack(id)}
                  >
                    <View style={styles.trackPickerIdentity}>
                      <Text style={styles.trackPickerName} numberOfLines={1}>{textValue(track?.name || track?.trackName, 'Unnamed track')}</Text>
                      <Text style={styles.trackPickerMeta} numberOfLines={1}>{[track?.surface, track?.type || track?.trackType].filter(Boolean).join(' · ') || 'Track details'}</Text>
                    </View>
                    <Text style={[styles.trackPickerMark, selected && styles.trackPickerMarkSelected]}>{selected ? '✓' : '›'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NewLookBottomNav active="home" router={router} onRaceDay={onRaceDayPress} />
    </View>
  );
}
