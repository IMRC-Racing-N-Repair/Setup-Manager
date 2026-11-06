import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { flootDashboardStyles as styles } from '../flootDashboard.styles';
import { formatLastSync } from '../logic/formatters';
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
  lastSyncAt,
  isLandscape,
  dashboardTrackId,
  onSelectDashboardTrack,
}) {
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
  const sponsorImage = sponsor?.logo || sponsor?.image || '';
  const syncColor = statusDotColor || '#6F7D74';
  const openSponsor = () => sponsor?.url && Linking.openURL(sponsor.url).catch(() => {});
  const chooseTrack = (trackId) => {
    onSelectDashboardTrack?.(trackId);
    setShowTrackPicker(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>IMRC SETUP MANAGER</Text>
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

        <Pressable style={({ pressed }) => [styles.sponsorStrip, pressed && styles.pressed]} onPress={openSponsor}>
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

        <Pressable style={({ pressed }) => [styles.trackStrip, pressed && styles.pressed]} onPress={() => setShowTrackPicker(true)}>
          <Text style={styles.trackGlyph}>⌖</Text>
          <View style={styles.trackIdentity}>
            <Text style={styles.trackName} numberOfLines={1}>{textValue(activeTrack?.name || activeTrack?.trackName, 'No track')}</Text>
            <Text style={styles.trackMeta} numberOfLines={1}>
              {activeTrack ? [activeTrack.surface, activeTrack.type || activeTrack.trackType].filter(Boolean).join(' · ') || 'Track details' : 'No track selected'}
            </Text>
          </View>
          {raceDayReady && activeTrack ? (
            <View style={styles.trackLiveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.trackLiveText}>LIVE · RACE {currentRaceNumber}</Text>
            </View>
          ) : <Text style={styles.chevron}>›</Text>}
        </Pressable>

        {activeTrack ? <View style={styles.primaryGrid}>
          <View style={styles.racePanel}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.microLabel}>{raceDayReady ? 'LIVE RACEDAY' : 'RACEDAY'}</Text>
                <Text style={styles.sectionTitle}>{textValue(activeTrack?.name || activeTrack?.trackName, raceDayReady ? 'Live race workspace' : 'Prepare for race day')}</Text>
              </View>
              <View style={[styles.liveBadge, !raceDayReady && styles.idleBadge]}>
                <View style={[styles.liveDot, !raceDayReady && styles.idleDot]} />
                <Text style={[styles.liveText, !raceDayReady && styles.idleText]}>{raceDayReady ? 'LIVE' : 'READY'}</Text>
              </View>
            </View>

            <Pressable style={({ pressed }) => [styles.raceLine, pressed && styles.pressed]} onPress={onRaceDayPress}>
              <View style={styles.raceBadge}>
                <Text style={styles.raceBadgeTop}>RACE</Text>
                <Text style={styles.raceBadgeValue}>{raceDayReady ? currentRaceNumber : '—'}</Text>
              </View>
              <View style={styles.raceMain}>
                <Text style={styles.mutedLabel}>{raceDayReady ? 'CURRENT RACE' : 'START'}</Text>
                <Text style={styles.raceMainTitle}>{currentRaceTitle}</Text>
                <Text style={styles.raceMainMeta}>{currentRaceMeta}</Text>
              </View>
              <Text style={styles.chevronLarge}>›</Text>
            </Pressable>

            <View style={styles.nextRaceBlock}>
              <Text style={styles.microLabel}>YOUR NEXT RACE</Text>
              <View style={styles.nextRaceRow}>
                <View style={styles.nextRaceIdentity}>
                  <Text style={styles.nextRaceVehicle} numberOfLines={1}>{nextRace?.vehicleName || (raceDayReady ? 'Waiting for lineup' : 'No active RaceDay')}</Text>
                  <Text style={styles.nextRaceClass} numberOfLines={1}>{nextRace ? nextRace.className : 'Lineup details will appear after sync'}</Text>
                </View>
                <View style={styles.nextRaceNumberBox}>
                  <Text style={styles.nextRaceNumberLabel}>RACE</Text>
                  <Text style={styles.nextRaceNumber}>{nextRace?.raceNumber || '—'}</Text>
                </View>
              </View>
            </View>

            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={onRaceDayPress}>
              <Text style={styles.primaryButtonText}>{raceDayReady ? 'OPEN RACEDAY' : 'START RACEDAY'}</Text>
              <Text style={styles.primaryButtonArrow}>›</Text>
            </Pressable>
          </View>
        </View> : null}

        <View style={[styles.garageSection, !activeTrack && styles.garageSectionNoTrack]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.microLabel}>GARAGE</Text>
              <Text style={styles.sectionTitle}>Last viewed vehicle</Text>
            </View>
            <Pressable onPress={() => router.push('/garage')}><Text style={styles.viewAll}>OPEN GARAGE  ›</Text></Pressable>
          </View>
          {activeTrack ? <View style={styles.garageMetrics}>
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
            ) : (
              <Pressable style={styles.emptyVehicleRow} onPress={() => router.push('/garage')}>
                <Text style={styles.emptyTitle}>No vehicles saved</Text>
                <Text style={styles.emptyCopy}>Add your first vehicle to begin building setups.</Text>
              </Pressable>
            )}
          </View>
        </View>

        {!!recentRows?.length && (
          <View style={styles.activityStrip}>
            <Text style={styles.microLabel}>LATEST CHANGE</Text>
            <Text style={styles.activityText} numberOfLines={1}>
              {recentRows[0]?.vehicleName} · {recentRows[0]?.fieldLabel} · {recentRows[0]?.beforeValue} → {recentRows[0]?.afterValue}
            </Text>
          </View>
        )}

        <Text style={styles.footer}>v{version} · last sync {formatLastSync(lastSyncAt)}</Text>
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
