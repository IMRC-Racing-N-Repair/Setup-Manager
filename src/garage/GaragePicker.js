import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import StableSafeAreaView from '../layout/StableSafeAreaView';
import AppScreenHeader from '../layout/AppScreenHeader';
import { AppColors } from '../theme/colors';

function clean(value) {
  return String(value ?? '').trim();
}

export function GaragePickerScreen({
  title,
  subtitle,
  countLabel,
  onBack,
  loading = false,
  emptyMessage = '',
  children,
  footer = null,
  flatList = false,
}) {
  return (
    <StableSafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <AppScreenHeader title={title} kicker="IMRC GARAGE" onBack={onBack} />

        <View style={styles.subHeader}>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {!!countLabel && <View style={styles.countBadge}><Text style={styles.countText}>{countLabel}</Text></View>}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={AppColors.primary} /></View>
        ) : emptyMessage ? (
          <View style={styles.empty}><Text style={styles.emptyText}>{emptyMessage}</Text></View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.list, flatList && styles.flatList]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        )}
        {footer}
      </View>
    </StableSafeAreaView>
  );
}

export function GarageVehicleChoice({ vehicle, selected = false, multiSelect = false, onPress }) {
  const name = clean(vehicle?.name || vehicle?.vehicleName) || 'Unnamed vehicle';
  const manufacturer = [vehicle?.manufacturer, vehicle?.model].filter(Boolean).join(' ') || 'Manufacturer / Model not set';
  const chassis = clean(vehicle?.chassisStyle || vehicle?.vehicleStyle) || 'Chassis style not set';
  const tx = clean(vehicle?.transponder || vehicle?.transponderNumber || vehicle?.transponderId) || '—';

  return (
    <Pressable style={({ pressed }) => [styles.choiceRow, selected && styles.choiceRowSelected, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.choiceAccent} />
      {multiSelect ? (
        <View style={[styles.selectBox, selected && styles.selectBoxSelected]}>
          <Text style={styles.selectCheck}>{selected ? '✓' : ''}</Text>
        </View>
      ) : null}
      <View style={styles.choiceIdentity}>
        <Text style={styles.choiceTitle} numberOfLines={1}>{name}</Text>
        <Text style={styles.choiceMeta} numberOfLines={1}>{manufacturer}</Text>
        <Text style={styles.choiceDetail} numberOfLines={1}>{chassis}</Text>
      </View>
      <View style={styles.txBox}>
        <Text style={styles.txLabel}>TX</Text>
        <Text style={styles.txValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{tx}</Text>
      </View>
      {!multiSelect ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

export function GarageTrackChoice({ track, actionLabel = 'SELECT', selected = false, onPress, disabled = false, flat = false }) {
  const name = clean(track?.trackName || track?.name || track?.title) || 'Unnamed track';
  const typeSurface = [track?.trackType || track?.type, track?.surface].filter(Boolean).join(' · ') || 'Track details';
  const location = [track?.city, track?.state].filter(Boolean).join(', ') || clean(track?.location) || 'Location not set';

  return (
    <Pressable
      style={({ pressed }) => [styles.choiceRow, styles.trackChoiceRow, flat && styles.flatTrackChoiceRow, selected && styles.choiceRowSelected, flat && selected && styles.flatTrackChoiceRowSelected, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
      onPress={disabled ? undefined : onPress}
    >
      <View style={[styles.choiceAccent, flat && styles.flatChoiceAccent]} />
      <View style={styles.choiceIdentity}>
        <Text style={styles.choiceTitle} numberOfLines={1}>{name}</Text>
        <Text style={styles.choiceMeta} numberOfLines={1}>{typeSurface}</Text>
        <Text style={styles.choiceDetail} numberOfLines={1}>{location}</Text>
      </View>
      {flat ? (
        <View style={styles.flatTrackAction}>
          <Text style={[styles.flatTrackActionLabel, selected && styles.actionTextSelected]}>{actionLabel}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      ) : (
        <View style={[styles.actionBox, selected && styles.actionBoxSelected]}>
          <Text style={[styles.actionText, selected && styles.actionTextSelected]}>{actionLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  root: { flex: 1, backgroundColor: AppColors.background },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: AppColors.borderStrong },
  backButton: { width: 72, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: AppColors.border, borderRadius: 5, backgroundColor: AppColors.surface },
  backText: { color: AppColors.text, fontSize: 13, fontWeight: '900' },
  headerTitle: { flex: 1, minWidth: 0 },
  headerSpacer: { width: 72 },
  kicker: { color: AppColors.primary, fontSize: 10, lineHeight: 12, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: AppColors.textStrong, fontSize: 22, lineHeight: 26, fontWeight: '900' },
  subHeader: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  subtitle: { flex: 1, color: AppColors.mutedText, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  countBadge: { paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(47,140,255,0.55)', borderRadius: 999, backgroundColor: AppColors.primarySoft },
  countText: { color: AppColors.text, fontSize: 9, fontWeight: '900' },
  scroll: { flex: 1 },
  list: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 22, gap: 7 },
  flatList: { paddingTop: 0, gap: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, margin: 14, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.card },
  emptyText: { color: AppColors.mutedText, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  choiceRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingLeft: 14, paddingRight: 9, overflow: 'hidden', borderWidth: 1, borderColor: AppColors.border, borderRadius: 5, backgroundColor: AppColors.card },
  trackChoiceRow: { minHeight: 66 },
  flatTrackChoiceRow: { minHeight: 70, borderWidth: 0, borderBottomWidth: 1, borderRadius: 0, paddingLeft: 12, paddingRight: 2, backgroundColor: 'transparent' },
  flatTrackChoiceRowSelected: { borderBottomColor: AppColors.primary, backgroundColor: AppColors.primarySoft },
  choiceRowSelected: { borderColor: AppColors.primary, backgroundColor: AppColors.primarySoft },
  choiceAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: AppColors.primary },
  flatChoiceAccent: { width: 2 },
  selectBox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: AppColors.borderStrong, backgroundColor: AppColors.surface },
  selectBoxSelected: { borderColor: AppColors.primary, backgroundColor: AppColors.primary },
  selectCheck: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  choiceIdentity: { flex: 1, minWidth: 0 },
  choiceTitle: { color: AppColors.textStrong, fontSize: 16, lineHeight: 19, fontWeight: '900' },
  choiceMeta: { marginTop: 1, color: AppColors.mutedText, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  choiceDetail: { marginTop: 1, color: AppColors.subtleText, fontSize: 10, lineHeight: 13, fontWeight: '800' },
  txBox: { width: 64, height: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 1, borderColor: 'rgba(47,140,255,0.70)', borderRadius: 2, backgroundColor: 'rgba(47,140,255,0.12)' },
  txLabel: { color: AppColors.primary, fontSize: 6, lineHeight: 7, fontWeight: '900', letterSpacing: 0.5 },
  txValue: { width: '100%', color: AppColors.textStrong, fontSize: 9, lineHeight: 11, fontWeight: '900', textAlign: 'center' },
  chevron: { color: AppColors.primary, fontSize: 21 },
  actionBox: { minWidth: 62, minHeight: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, borderWidth: 1, borderColor: AppColors.borderStrong, backgroundColor: AppColors.surface },
  actionBoxSelected: { borderColor: AppColors.primary, backgroundColor: AppColors.primarySoft },
  actionText: { color: AppColors.text, fontSize: 8, fontWeight: '900', letterSpacing: 0.35 },
  actionTextSelected: { color: AppColors.primary },
  flatTrackAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8 },
  flatTrackActionLabel: { color: AppColors.mutedText, fontSize: 8, fontWeight: '900', letterSpacing: 0.45 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.52 },
});
