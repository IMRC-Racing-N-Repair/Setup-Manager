import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '../theme/colors';

const items = [
  { key: 'home', label: 'Home', glyph: '⌂', route: '/' },
  { key: 'garage', label: 'Garage', glyph: '▱', route: '/garage' },
  { key: 'raceday', label: 'RaceDay', glyph: '⚑', route: '/raceday/dashboard' },
  { key: 'tools', label: 'Tools', glyph: '⌁', route: '/tools' },
];

export default function NewLookBottomNav({ active = 'home', router, onRaceDay }) {
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          style={({ pressed }) => [styles.navItem, active === item.key && styles.navItemActive, pressed && styles.pressed]}
          onPress={() => {
            if (item.key === 'raceday' && onRaceDay) onRaceDay();
            else if (item.route === '/') router.replace('/');
            else router.push(item.route);
          }}
        >
          <Text style={[styles.navGlyph, active === item.key && styles.navTextActive]}>{item.glyph}</Text>
          <Text style={[styles.navLabel, active === item.key && styles.navTextActive]}>{item.label}</Text>
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
  navItem: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navItemActive: { backgroundColor: AppColors.surface },
  navGlyph: { color: AppColors.mutedText, fontSize: 18 },
  navLabel: { color: AppColors.mutedText, fontSize: 8, fontWeight: '700' },
  navTextActive: { color: AppColors.primary },
  pressed: { opacity: 0.72 },
});
