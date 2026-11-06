import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import { flootDashboardStyles as styles } from '../flootDashboard.styles';
import NewLookBottomNav from '../../navigation/NewLookBottomNav';

function textValue(value, fallback = '—') {
  const next = String(value ?? '').trim();
  return next || fallback;
}

function entityId(value) {
  return String(value?.id || value?.trackId || '').trim();
}

const NO_TRACK = '__none__';

function CountCell({ label, value, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.countCell, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.microLabel}>{label}</Text>
      <Text style={styles.countValue}>{value}</Text>
    </Pressable>
  );
}

export default function FlootDashboardView({
  userName,
  statusDotColor,
  onAuthPress,
  onAuthLongPress,
  counts,
  vehicles,
  tracks,
  lastViewedVehicle,
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
  const { width, height } = useWindowDimensions();
  const compactLayout = width < 430 || height < 900;
  const shortLayout = height < 850;
  const tabletLandscape = width >= 700 && width > height;
  const allowHomeScroll = isLandscape || height < 680;
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const trackList = Array.isArray(tracks) ? tracks : [];
  const savedTrackChoice = trackList.find((track) => entityId(track) === String(dashboardTrackId || '')) || null;
  const noTrackSelected = dashboardTrackId === NO_TRACK;
  const activeTrack = noTrackSelected
    ? null
    : savedTrackChoice || raceLive?.selectedTrack || (trackList.length ? trackList[0] : null);
  const viewedVehicle = lastViewedVehicle || (Array.isArray(vehicles) ? vehicles[0] : null);
  const liveState = raceLive?.liveState || {};
  const nextRace = raceLive?.nextRace || null;
  const currentRaceNumber = textValue(liveState?.raceNumber);
  const currentRaceTitle = raceDayReady
    ? textValue(liveState?.className, liveState?.active ? 'Race in progress' : 'Waiting for track activity')
    : 'Start a RaceDay';
  const currentRaceMeta = raceDayReady
    ? [liveState?.roundType, liveState?.heat, liveState?.raceStatus].filter(Boolean).join(' · ') || 'LiveRC updates will appear here'
    : 'Choose a track and your race vehicles';
  const workspaceTrackName = loading
    ? 'Checking saved RaceDay'
    : textValue(activeTrack?.name || activeTrack?.trackName, 'No track');
  const workspaceTrackMeta = loading
    ? 'Loading track, event, and race information'
    : activeTrack
      ? [activeTrack.surface, activeTrack.type || activeTrack.trackType].filter(Boolean).join(' · ') || 'Track details'
      : 'No track selected';
  const showWorkspace = loading || !!activeTrack;
  const sponsorImage = sponsor?.logo || sponsor?.image || '';
  const syncColor = statusDotColor || '#6F7D74';
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
          compactLayout && styles.contentCompact,
          shortLayout && styles.contentShort,
          tabletLandscape && styles.contentTabletLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={allowHomeScroll}
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
              onPress={onAuthPress}
              onLongPress={onAuthLongPress}
            >
              <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
              <View>
                <Text style={styles.syncLabel}>{userName ? 'SYNCED' : 'SIGN IN'}</Text>
                <Text style={styles.syncName} numberOfLines={1}>{userName || 'Cloud sync'}</Text>
              </View>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} onPress={() => router.push('/support')}>
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
          <Text style={styles.sponsorVisit}>VISIT  ›</Text>
        </Pressable>

        <Pressable disabled={loading} style={({ pressed }) => [styles.trackStrip, compactLayout && styles.trackStripCompact, loading && styles.loadingMuted, pressed && styles.pressed]} onPress={() => setShowTrackPicker(true)}>
          <Text style={styles.trackGlyph}>⌖</Text>
          <View style={styles.trackIdentity}>
            <Text style={styles.trackName} numberOfLines={1}>{workspaceTrackName}</Text>
            <Text style={styles.trackMeta} numberOfLines={1}>{workspaceTrackMeta}</Text>
          </View>
          {!loading && raceDayReady && activeTrack ? (
            <View style={styles.trackLiveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.trackLiveText}>LIVE · RACE {currentRaceNumber}</Text>
            </View>
          ) : <Text style={styles.chevron}>›</Text>}
        </Pressable>

        {showWorkspace ? <View style={styles.primaryGrid}>
          <View style={[styles.racePanel, compactLayout && styles.racePanelCompact]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.microLabel}>{loading ? 'CHECKING RACEDAY' : raceDayReady ? 'LIVE RACEDAY' : 'RACEDAY'}</Text>
                <Text style={styles.sectionTitle}>{workspaceTrackName}</Text>
              </View>
              <View style={[styles.liveBadge, (loading || !raceDayReady) && styles.idleBadge]}>
                <View style={[styles.liveDot, (loading || !raceDayReady) && styles.idleDot]} />
                <Text style={[styles.liveText, (loading || !raceDayReady) && styles.idleText]}>{loading ? 'LOADING' : raceDayReady ? 'LIVE' : 'READY'}</Text>
              </View>
            </View>

            <Pressable disabled={loading} style={({ pressed }) => [styles.raceLine, compactLayout && styles.raceLineCompact, loading && styles.loadingMuted, pressed && styles.pressed]} onPress={onRaceDayPress}>
              <View style={styles.raceBadge}>
                <Text style={styles.raceBadgeTop}>RACE</Text>
                <Text style={styles.raceBadgeValue}>{!loading && raceDayReady ? currentRaceNumber : '—'}</Text>
              </View>
              <View style={styles.raceMain}>
                <Text style={styles.mutedLabel}>{loading ? 'LOADING' : raceDayReady ? 'CURRENT RACE' : 'START'}</Text>
                <Text style={styles.raceMainTitle}>{loading ? 'Checking race information' : currentRaceTitle}</Text>
                <Text style={styles.raceMainMeta}>{loading ? 'Reading your saved RaceDay and LiveRC data' : currentRaceMeta}</Text>
              </View>
              <Text style={styles.chevronLarge}>›</Text>
            </Pressable>

            <View style={styles.nextRaceBlock}>
              <Text style={styles.microLabel}>YOUR NEXT RACE</Text>
              <View style={styles.nextRaceRow}>
                <View style={styles.nextRaceIdentity}>
                  <Text style={styles.nextRaceVehicle} numberOfLines={1}>{loading ? 'Checking your vehicles' : nextRace?.vehicleName || (raceDayReady ? 'Waiting for lineup' : 'No active RaceDay')}</Text>
                  <Text style={styles.nextRaceClass} numberOfLines={1}>{loading ? 'Loading class and lineup details' : nextRace ? nextRace.className : 'Lineup details will appear after sync'}</Text>
                </View>
                <View style={styles.nextRaceNumberBox}>
                  <Text style={styles.nextRaceNumberLabel}>RACE</Text>
                  <Text style={styles.nextRaceNumber}>{nextRace?.raceNumber || '—'}</Text>
                </View>
              </View>
            </View>

            <Pressable disabled={loading} style={({ pressed }) => [styles.primaryButton, loading && styles.loadingMuted, pressed && styles.pressed]} onPress={onRaceDayPress}>
              <Text style={styles.primaryButtonText}>{loading ? 'LOADING RACEDAY' : raceDayReady ? 'OPEN RACEDAY' : 'START RACEDAY'}</Text>
              <Text style={styles.primaryButtonArrow}>›</Text>
            </Pressable>
          </View>
        </View> : null}

        <View style={[styles.garageSection, compactLayout && styles.garageSectionCompact, !activeTrack && styles.garageSectionNoTrack]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.microLabel}>GARAGE</Text>
              <Text style={styles.sectionTitle}>Last viewed vehicle</Text>
            </View>
            <Pressable onPress={() => router.push('/garage')}><Text style={styles.viewAll}>OPEN GARAGE  ›</Text></Pressable>
          </View>
          {showWorkspace ? <View style={styles.garageMetrics}>
            <CountCell label="VEHICLES" value={counts?.vehicles || 0} onPress={() => router.push('/vehicles')} />
            <CountCell label="TRACKS" value={counts?.tracks || 0} onPress={() => router.push('/tracks')} />
            <CountCell label="SETUPS" value={counts?.setups || 0} onPress={() => router.push('/setups')} />
          </View> : null}
          <View style={styles.vehicleList}>
            {viewedVehicle ? (
              <Pressable key={String(viewedVehicle?.id || 'last-viewed')} style={({ pressed }) => [styles.vehicleRow, pressed && styles.pressed]} onPress={() => router.push('/garage')}>
                <Text style={styles.vehicleIndex}>LAST</Text>
                <View style={styles.vehicleIdentity}>
                  <Text style={styles.vehicleName} numberOfLines={1}>{textValue(viewedVehicle?.name, 'Unnamed vehicle')}</Text>
                  <Text style={styles.vehicleMeta} numberOfLines={1}>
                    {[viewedVehicle?.chassisStyle, viewedVehicle?.transponder ? `TX ${viewedVehicle.transponder}` : ''].filter(Boolean).join(' · ') || 'Vehicle details'}
                  </Text>
                </View>
                <Text style={[styles.vehicleStatus, isLandscape && styles.vehicleStatusLandscape]}>LAST VIEWED</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ) : loading ? (
              <View style={styles.emptyVehicleRow}>
                <Text style={styles.emptyTitle}>Loading garage…</Text>
                <Text style={styles.emptyCopy}>Checking your last viewed vehicle and saved setups.</Text>
              </View>
            ) : (
              <Pressable style={styles.emptyVehicleRow} onPress={() => router.push('/garage')}>
                <Text style={styles.emptyTitle}>No vehicles saved</Text>
                <Text style={styles.emptyCopy}>Add your first vehicle to begin building setups.</Text>
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
                  <Text style={styles.trackPickerMeta}>Show the last viewed vehicle on Home</Text>
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
