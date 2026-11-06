import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppColors } from '../theme/colors';

const items = [
  { key: 'home', label: 'Home', glyph: '⌂', route: '/' },
  { key: 'garage', label: 'Garage', glyph: '▱', route: '/garage' },
  { key: 'raceday', label: 'RaceDay', glyph: '⚑', route: '/raceday/dashboard' },
  { key: 'tools', label: 'Tools', glyph: '⌁', route: '/tools' },
];

export default function NewLookBottomNav({ active = 'home', router, onRaceDay }) {
  const { width, height } = useWindowDimensions();
  const compact = height < 620 || width > height;
  const tabletLandscape = width >= 700 && width > height;

  return (
    <View style={[styles.bottomNav, compact && styles.bottomNavCompact, tabletLandscape && styles.bottomNavTabletLandscape]}>
      {items.map((item) => (
        <Pressable
          key={item.key}
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
  bottomNavCompact: { minHeight: 54, paddingTop: 4, paddingBottom: 4 },
  bottomNavTabletLandscape: { minHeight: 78, paddingHorizontal: 22, paddingTop: 7, paddingBottom: 7 },
  navItem: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navItemCompact: { minHeight: 44 },
  navItemTabletLandscape: { minHeight: 64, gap: 4 },
  navItemActive: { backgroundColor: AppColors.surface },
  navGlyph: { color: AppColors.mutedText, fontSize: 18 },
  navGlyphCompact: { fontSize: 15 },
  navGlyphTabletLandscape: { fontSize: 23, lineHeight: 25 },
  navLabel: { color: AppColors.mutedText, fontSize: 8, fontWeight: '700' },
  navLabelCompact: { fontSize: 7 },
  navLabelTabletLandscape: { fontSize: 11, lineHeight: 13, fontWeight: '800' },
  navTextActive: { color: AppColors.primary },
  pressed: { opacity: 0.72 },
});
