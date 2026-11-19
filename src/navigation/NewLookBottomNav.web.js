import { Pressable, StyleSheet, Text, View } from 'react-native';
import useViewport from '../layout/useViewport';

import { AppColors } from '../theme/colors';

const primaryItems = [
  { key: 'home', label: 'Home', glyph: '⌂', route: '/' },
  { key: 'garage', label: 'Garage', glyph: '▱', route: '/garage' },
  { key: 'raceday', label: 'RaceDay', glyph: '⚑', route: '/raceday/dashboard' },
  { key: 'tools', label: 'Tools', glyph: '⌁', route: '/tools' },
];

const desktopItems = [
  ...primaryItems,
  { key: 'vehicles', label: 'Vehicles', glyph: 'V', route: '/vehicles' },
  { key: 'tracks', label: 'Tracks', glyph: 'T', route: '/tracks' },
  { key: 'setups', label: 'Setups', glyph: 'S', route: '/setups' },
  { key: 'support', label: 'Support', glyph: '?', route: '/support' },
];

function openItem(item, router, onRaceDay) {
  if (item.key === 'raceday' && onRaceDay) onRaceDay();
  else if (item.route === '/') router.replace('/');
  else router.push(item.route);
}

function NavItem({ item, active, router, onRaceDay, desktop }) {
  const selected = active === item.key;
  return (
    <Pressable
      style={({ pressed }) => [
        desktop ? styles.desktopItem : styles.mobileItem,
        selected && (desktop ? styles.desktopItemActive : styles.mobileItemActive),
        pressed && styles.pressed,
      ]}
      onPress={() => openItem(item, router, onRaceDay)}
    >
      <Text style={[
        desktop ? styles.desktopGlyph : styles.mobileGlyph,
        selected && styles.activeText,
      ]}>{item.glyph}</Text>
      <Text style={[
        desktop ? styles.desktopLabel : styles.mobileLabel,
        selected && styles.activeText,
      ]}>{item.label}</Text>
    </Pressable>
  );
}

export default function NewLookBottomNav({ active = 'home', router, onRaceDay, bottomOffset = 0 }) {
  const { width } = useViewport();
  const desktop = width >= 900;

  if (desktop) return null;

  const safeBottom = Math.max(0, Number(bottomOffset) || 0);
  return (
    <View style={[styles.mobileNav, safeBottom > 0 && { paddingBottom: 6 + safeBottom }]}>
      {primaryItems.map((item) => (
        <NavItem key={item.key} item={item} active={active} router={router} onRaceDay={onRaceDay} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  desktopNav: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: 104,
    zIndex: 1000,
    borderRightWidth: 1,
    borderRightColor: AppColors.borderStrong,
    backgroundColor: AppColors.background,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  brand: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderStrong,
    marginBottom: 10,
  },
  brandMark: {
    color: AppColors.primary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandSub: {
    color: AppColors.mutedText,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
  },
  desktopItems: {
    flex: 1,
    gap: 4,
  },
  desktopItem: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    gap: 3,
  },
  desktopItemActive: {
    borderLeftColor: AppColors.primary,
    backgroundColor: AppColors.surface,
  },
  desktopGlyph: {
    color: AppColors.mutedText,
    fontSize: 18,
    fontWeight: '900',
  },
  desktopLabel: {
    color: AppColors.mutedText,
    fontSize: 9,
    fontWeight: '800',
  },
  mobileNav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 66,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderStrong,
    backgroundColor: AppColors.background,
    zIndex: 1000,
  },
  mobileItem: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  mobileItemActive: {
    backgroundColor: AppColors.surface,
  },
  mobileGlyph: {
    color: AppColors.mutedText,
    fontSize: 18,
  },
  mobileLabel: {
    color: AppColors.mutedText,
    fontSize: 8,
    fontWeight: '700',
  },
  activeText: {
    color: AppColors.primary,
  },
  pressed: {
    opacity: 0.72,
  },
});
