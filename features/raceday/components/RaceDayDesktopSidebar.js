import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import RaceDayLiveHeader from './RaceDayLiveHeader';
import { getLineupRaceNumber } from '../lib/raceDayLineupPriority';
import { getRaceDayNotesBundle } from '../lib/raceDayNotesStorage';
import { getVehicleDisplayName, normalizeId } from '../lib/raceDayModel';
import { AppColors } from '../../../src/theme/colors';

function raceOrder(value) {
  return Number(String(value || '').match(/\d+/)?.[0]) || 0;
}

export default function RaceDayDesktopSidebar({
  raceDayId, vehicles, lineups, liveState, liveIsActive, eventStatus,
  notesOpen, changesOpen, onOpenNotes, onOpenChanges,
}) {
  const [activity, setActivity] = useState(null);
  useFocusEffect(useCallback(() => {
    if (!raceDayId || notesOpen || changesOpen) return undefined;
    let current = true;
    getRaceDayNotesBundle(raceDayId).then((bundle) => {
      if (current) setActivity({ ...bundle, raceDayId });
    });
    return () => { current = false; };
  }, [raceDayId, notesOpen, changesOpen]));

  const currentRace = liveIsActive && liveState.mode === 'race' ? raceOrder(liveState.raceNumber) : 0;
  const vehicleById = new Map(vehicles.map((vehicle) => [normalizeId(vehicle.id || vehicle.vehicleId), vehicle]));
  const next = lineups
    .map((lineup) => ({ lineup, number: raceOrder(getLineupRaceNumber(lineup)), vehicle: vehicleById.get(normalizeId(lineup.vehicleId)) }))
    .filter(({ number, vehicle }) => number > currentRace && vehicle)
    .sort((a, b) => a.number - b.number)[0];
  const session = activity?.raceDayId === raceDayId ? activity : null;
  const notes = String(session?.notes?.notes || '').trim();
  const latestChange = session?.changes?.[0];

  return (
    <View style={styles.sidebar}>
      <View style={styles.live}>
        <Text accessibilityRole="header" style={styles.heading}>Live race</Text>
        {liveIsActive ? <RaceDayLiveHeader liveState={liveState} desktop /> : <Text style={styles.copy}>{eventStatus}</Text>}
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>Your next race</Text>
        {next ? (
          <View style={styles.next}>
            <Text style={styles.number}>#{next.number}</Text>
            <View style={styles.identity}>
              <Text style={styles.name}>{getVehicleDisplayName(next.vehicle)}</Text>
              <Text style={styles.copy}>{[next.lineup.className, next.lineup.roundLabel].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
        ) : <Text style={styles.copy}>{currentRace ? 'No upcoming race in the synced lineup' : 'Waiting for lineup'}</Text>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="View recent changes" style={styles.section} onPress={onOpenChanges}>
        <Text style={styles.link}>Recent changes ›</Text>
        <Text numberOfLines={2} style={styles.copy}>{latestChange ? [latestChange.vehicleName, latestChange.fieldLabel].filter(Boolean).join(' · ') : 'No changes recorded'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="View RaceDay notes" style={styles.section} onPress={onOpenNotes}>
        <Text style={styles.link}>Session notes ›</Text>
        <Text numberOfLines={3} style={styles.copy}>{notes || 'No notes saved'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { flex: 1, minWidth: 220, backgroundColor: AppColors.surface, borderRadius: 14, paddingHorizontal: 18 },
  live: { paddingVertical: 18, gap: 8 },
  section: { paddingVertical: 16, gap: 6, borderTopWidth: 1, borderTopColor: AppColors.border },
  heading: { color: AppColors.textStrong, fontSize: 17, fontWeight: '800' },
  copy: { color: AppColors.mutedText, fontSize: 14, lineHeight: 20 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: { color: '#FFAC70', fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  name: { color: AppColors.textStrong, fontSize: 16, fontWeight: '700' },
  identity: { flex: 1, minWidth: 0 },
  link: { color: '#A6CDFF', fontSize: 15, fontWeight: '700' },
});
