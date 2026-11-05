import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { flootDashboardStyles as styles } from '../flootDashboard.styles';
import { formatLastSync } from '../logic/formatters';
import NewLookBottomNav from '../../navigation/NewLookBottomNav';

function textValue(value, fallback = '—') {
  const next = String(value ?? '').trim();
  return next || fallback;
}

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
  raceDayReady,
  onRaceDayPress,
  sponsor,
  recentRows,
  router,
  version,
  lastSyncAt,
  isLandscape,
}) {
  const activeTrack = Array.isArray(tracks) && tracks.length ? tracks[0] : null;
  const recentVehicles = (Array.isArray(vehicles) ? vehicles : []).slice(0, 3);
  const sponsorImage = sponsor?.logo || sponsor?.image || '';
  const syncColor = statusDotColor || '#6F7D74';
  const openSponsor = () => sponsor?.url && Linking.openURL(sponsor.url).catch(() => {});

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

        <Pressable style={({ pressed }) => [styles.trackStrip, pressed && styles.pressed]} onPress={() => router.push('/tracks')}>
          <Text style={styles.trackGlyph}>⌖</Text>
          <View style={styles.trackIdentity}>
            <Text style={styles.trackName} numberOfLines={1}>{textValue(activeTrack?.name || activeTrack?.trackName, 'Select a track')}</Text>
            <Text style={styles.trackMeta} numberOfLines={1}>
              {activeTrack ? [activeTrack.surface, activeTrack.type || activeTrack.trackType].filter(Boolean).join(' · ') || 'Track details' : 'No track selected'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

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

        <View style={[styles.primaryGrid, isLandscape && styles.primaryGridLandscape]}>
          <View style={[styles.racePanel, isLandscape && styles.racePanelLandscape]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.microLabel}>{raceDayReady ? 'ACTIVE RACEDAY' : 'RACEDAY'}</Text>
                <Text style={styles.sectionTitle}>{raceDayReady ? 'Race workspace ready' : 'Prepare for race day'}</Text>
              </View>
              <View style={[styles.liveBadge, !raceDayReady && styles.idleBadge]}>
                <View style={[styles.liveDot, !raceDayReady && styles.idleDot]} />
                <Text style={[styles.liveText, !raceDayReady && styles.idleText]}>{raceDayReady ? 'LIVE' : 'READY'}</Text>
              </View>
            </View>

            <Pressable style={({ pressed }) => [styles.raceLine, pressed && styles.pressed]} onPress={onRaceDayPress}>
              <View style={styles.raceBadge}>
                <Text style={styles.raceBadgeTop}>RACE</Text>
                <Text style={styles.raceBadgeValue}>{raceDayReady ? 'GO' : '—'}</Text>
              </View>
              <View style={styles.raceMain}>
                <Text style={styles.mutedLabel}>{raceDayReady ? 'CONTINUE' : 'START'}</Text>
                <Text style={styles.raceMainTitle}>{raceDayReady ? 'Open RaceDay' : 'New RaceDay'}</Text>
                <Text style={styles.raceMainMeta}>{textValue(activeTrack?.name, 'Choose track and vehicles')}</Text>
              </View>
              <Text style={styles.chevronLarge}>›</Text>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={onRaceDayPress}>
              <Text style={styles.primaryButtonText}>{raceDayReady ? 'OPEN RACEDAY' : 'START RACEDAY'}</Text>
              <Text style={styles.primaryButtonArrow}>›</Text>
            </Pressable>
          </View>

          <View style={[styles.quickPanel, isLandscape && styles.quickPanelLandscape]}>
            <Text style={styles.microLabel}>QUICK ACTION</Text>
            <Text style={styles.sectionTitle}>New setup</Text>
            <Text style={styles.quickCopy}>Capture a baseline or record a track-side change.</Text>
            <View style={styles.quickActionsRow}>
              <Pressable style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]} onPress={() => router.push('/setups')}>
                <Text style={styles.quickButtonText}>＋  CREATE</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.quickButton, styles.quickButtonOutline, pressed && styles.pressed]} onPress={() => router.push('/tools')}>
                <Text style={styles.quickButtonText}>≡  TOOLS</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.garageSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.microLabel}>GARAGE</Text>
              <Text style={styles.sectionTitle}>Recent vehicles</Text>
            </View>
            <Pressable onPress={() => router.push('/vehicles')}><Text style={styles.viewAll}>VIEW ALL  ›</Text></Pressable>
          </View>
          <View style={styles.garageMetrics}>
            <CountCell label="VEHICLES" value={counts?.vehicles || 0} onPress={() => router.push('/vehicles')} />
            <CountCell label="TRACKS" value={counts?.tracks || 0} onPress={() => router.push('/tracks')} />
            <CountCell label="SETUPS" value={counts?.setups || 0} onPress={() => router.push('/setups')} />
          </View>
          <View style={styles.vehicleList}>
            {recentVehicles.length ? recentVehicles.map((vehicle, index) => (
              <Pressable key={String(vehicle?.id || index)} style={({ pressed }) => [styles.vehicleRow, pressed && styles.pressed]} onPress={() => router.push('/vehicles')}>
                <Text style={styles.vehicleIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={styles.vehicleIdentity}>
                  <Text style={styles.vehicleName} numberOfLines={1}>{textValue(vehicle?.name, 'Unnamed vehicle')}</Text>
                  <Text style={styles.vehicleMeta} numberOfLines={1}>
                    {[vehicle?.chassisStyle, vehicle?.transponder ? `TX ${vehicle.transponder}` : ''].filter(Boolean).join(' · ') || 'Vehicle details'}
                  </Text>
                </View>
                <Text style={[styles.vehicleStatus, isLandscape && styles.vehicleStatusLandscape]}>SETUP READY</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )) : (
              <Pressable style={styles.emptyVehicleRow} onPress={() => router.push('/vehicles')}>
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

      <NewLookBottomNav active="home" router={router} onRaceDay={onRaceDayPress} />
    </View>
  );
}
