import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';

import { getVehicles } from '../vehicles/logic/vehicleStorage';
import { getTracks } from '../tracks/storage/trackStorage';
import { getSetups } from '../setups/lib/setupStorage';
import StableSafeAreaView from '../../src/layout/StableSafeAreaView';
import NewLookBottomNav from '../../src/navigation/NewLookBottomNav';
import { AppColors } from '../../src/theme/colors';

const sections = [
  { key: 'vehicles', kicker: 'VEHICLES', title: 'Saved cars', copy: 'Chassis, electronics and transponders', route: '/vehicles' },
  { key: 'tracks', kicker: 'TRACKS', title: 'Track library', copy: 'Surface, layout and LiveRC information', route: '/tracks' },
  { key: 'setups', kicker: 'SETUPS', title: 'Setup records', copy: 'Track-specific setup sheets and history', route: '/setups' },
];

function vehicleMeta(vehicle) {
  return [vehicle?.chassisStyle, vehicle?.transponder ? `TX ${vehicle.transponder}` : ''].filter(Boolean).join(' · ') || 'Vehicle details';
}

export default function GarageScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [counts, setCounts] = useState({ vehicles: 0, tracks: 0, setups: 0 });

  const loadGarage = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicleRows, trackRows, setupRows] = await Promise.all([getVehicles(), getTracks(), getSetups()]);
      const nextVehicles = Array.isArray(vehicleRows) ? vehicleRows : [];
      setVehicles(nextVehicles);
      setCounts({
        vehicles: nextVehicles.length,
        tracks: Array.isArray(trackRows) ? trackRows.length : 0,
        setups: Array.isArray(setupRows) ? setupRows.length : 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadGarage(); }, [loadGarage]));

  return (
    <StableSafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.replace('/')}><Text style={styles.backText}>‹ HOME</Text></Pressable>
            <View style={styles.headerText}>
              <Text style={styles.kicker}>IMRC GARAGE</Text>
              <Text style={styles.title}>Garage</Text>
            </View>
          </View>

          <Text style={styles.intro}>Vehicles, tracks and setups—organized in one compact workspace.</Text>

          {loading ? (
            <ActivityIndicator color={AppColors.primary} style={styles.loading} />
          ) : (
            <View style={styles.sectionList}>
              {sections.map((section, index) => (
                <Pressable key={section.key} style={({ pressed }) => [styles.sectionRow, index === 0 && styles.sectionRowFirst, pressed && styles.pressed]} onPress={() => router.push(section.route)}>
                  <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
                  <View style={styles.sectionIdentity}>
                    <Text style={styles.kicker}>{section.kicker}</Text>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionCopy}>{section.copy}</Text>
                  </View>
                  <Text style={styles.sectionCount}>{counts[section.key]}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.recentHeader}>
            <View><Text style={styles.kicker}>RECENT</Text><Text style={styles.recentTitle}>Vehicles</Text></View>
            <Pressable onPress={() => router.push('/vehicles')}><Text style={styles.viewAll}>VIEW ALL  ›</Text></Pressable>
          </View>

          <View style={styles.vehicleList}>
            {vehicles.slice(0, 4).map((vehicle, index) => (
              <Pressable key={String(vehicle?.id || index)} style={({ pressed }) => [styles.vehicleRow, pressed && styles.pressed]} onPress={() => router.push('/vehicles')}>
                <Text style={styles.vehicleIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={styles.vehicleIdentity}>
                  <Text style={styles.vehicleName} numberOfLines={1}>{vehicle?.name || 'Unnamed vehicle'}</Text>
                  <Text style={styles.vehicleMeta} numberOfLines={1}>{vehicleMeta(vehicle)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
            {!vehicles.length && !loading ? <Text style={styles.empty}>No vehicles saved yet.</Text> : null}
          </View>
        </ScrollView>
        <NewLookBottomNav active="garage" router={router} />
      </View>
    </StableSafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  root: { flex: 1, backgroundColor: AppColors.background },
  content: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 15, paddingBottom: 92 },
  header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: AppColors.borderStrong },
  backButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 9, borderWidth: 1, borderColor: AppColors.border },
  backText: { color: AppColors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  headerText: { flex: 1 },
  kicker: { color: AppColors.primary, fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 1.1 },
  title: { marginTop: 2, color: AppColors.textStrong, fontSize: 30, lineHeight: 32, fontWeight: '900', letterSpacing: -0.6 },
  intro: { paddingVertical: 10, color: AppColors.mutedText, fontSize: 11, lineHeight: 16, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  loading: { marginTop: 30 },
  sectionList: { marginTop: 12, borderBottomWidth: 1, borderBottomColor: AppColors.borderStrong },
  sectionRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: AppColors.border },
  sectionRowFirst: { borderTopColor: AppColors.borderStrong },
  sectionNumber: { width: 30 },
  sectionNumberText: { color: AppColors.subtleText, fontSize: 9, fontWeight: '800' },
  sectionIdentity: { flex: 1, minWidth: 0 },
  sectionTitle: { marginTop: 2, color: AppColors.textStrong, fontSize: 17, fontWeight: '900' },
  sectionCopy: { marginTop: 2, color: AppColors.mutedText, fontSize: 10 },
  sectionCount: { minWidth: 34, color: AppColors.textStrong, fontSize: 23, fontWeight: '900', textAlign: 'right' },
  chevron: { color: AppColors.primary, fontSize: 22 },
  recentHeader: { marginTop: 22, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  recentTitle: { marginTop: 2, color: AppColors.textStrong, fontSize: 20, fontWeight: '900' },
  viewAll: { color: AppColors.mutedText, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  vehicleList: { marginTop: 9, borderTopWidth: 1, borderTopColor: AppColors.borderStrong },
  vehicleRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  vehicleIndex: { width: 24, color: AppColors.subtleText, fontSize: 9 },
  vehicleIdentity: { flex: 1, minWidth: 0 },
  vehicleName: { color: AppColors.textStrong, fontSize: 14, fontWeight: '900' },
  vehicleMeta: { marginTop: 2, color: AppColors.mutedText, fontSize: 9 },
  empty: { paddingVertical: 18, color: AppColors.mutedText, fontSize: 11 },
  pressed: { opacity: 0.72 },
});
