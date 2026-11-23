import { useGuidedTour } from '../../features/support/components/GuidedTour';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppColors } from '../theme/colors';

const items = [
  { key: 'home', label: 'Home', glyph: '⌂', route: '/' },
  { key: 'garage', label: 'Garage', glyph: '▱', route: '/garage' },
  { key: 'raceday', label: 'RaceDay', glyph: '⚑', route: '/raceday/dashboard' },
  { key: 'tools', label: 'Tools', glyph: '⌁', route: '/tools' },
];

export default function NewLookBottomNav({ active = 'home', router, onRaceDay, bottomOffset = 0, inFlow = false, compact: preferCompact = false }) {
  const tour = useGuidedTour();
  const { width, height } = useWindowDimensions();
  const compact = preferCompact || height < 620 || width > height;
  const tabletLandscape = width >= 700 && width > height;
  const safeBottom = Math.max(0, Number(bottomOffset) || 0);

  return (
    <View
      style={[
        styles.bottomNav,
        inFlow && styles.bottomNavInFlow,
        compact && styles.bottomNavCompact,
        tabletLandscape && styles.bottomNavTabletLandscape,
        safeBottom > 0 && {
          minHeight: (tabletLandscape ? 66 : compact ? 54 : 66) + safeBottom,
          paddingBottom: (tabletLandscape ? 5 : compact ? 4 : 6) + safeBottom,
        },
      ]}
    >
      {items.map((item) => (
        <Pressable
          ref={active === 'home' ? tour?.refFor(item.key) : undefined}
          key={item.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === item.key }}
          style={({ pressed }) => [
            styles.navItem,
            compact && styles.navItemCompact,
            tabletLandscape && styles.navItemTabletLandscape,
            active === item.key && styles.navItemActive,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            if (item.key === 'raceday' && onRaceDay) onRaceDay();
            else if (item.route === '/') router.replace('/');
            else router.push(item.route);
          }}
        >
          <Text style={[styles.navGlyph, compact && styles.navGlyphCompact, tabletLandscape && styles.navGlyphTabletLandscape, active === item.key && styles.navTextActive]}>{item.glyph}</Text>
          <Text style={[styles.navLabel, compact && styles.navLabelCompact, tabletLandscape && styles.navLabelTabletLandscape, active === item.key && styles.navTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
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
  },
  bottomNavInFlow: { position: 'relative' },
  bottomNavCompact: { minHeight: 54, paddingTop: 4, paddingBottom: 4 },
  bottomNavTabletLandscape: { minHeight: 66, paddingHorizontal: 22, paddingTop: 5, paddingBottom: 5 },
  navItem: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navItemCompact: { minHeight: 44 },
  navItemTabletLandscape: { minHeight: 52, gap: 2 },
  navItemActive: { backgroundColor: AppColors.primarySoft, borderRadius: 8 },
  navGlyph: { color: AppColors.mutedText, fontSize: 18 },
  navGlyphCompact: { fontSize: 15 },
  navGlyphTabletLandscape: { fontSize: 20, lineHeight: 22 },
  navLabel: { color: AppColors.mutedText, fontSize: 11, fontWeight: '700' },
  navLabelCompact: { fontSize: 10 },
  navLabelTabletLandscape: { fontSize: 9, lineHeight: 11, fontWeight: '800' },
  navTextActive: { color: AppColors.primary },
  pressed: { opacity: 0.72 },
});
