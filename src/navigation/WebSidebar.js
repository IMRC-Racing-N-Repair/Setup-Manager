import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { AppColors } from '../theme/colors';

const ITEMS = [
  { key: 'home', label: 'Home', glyph: '⌂', route: '/' },
  { key: 'garage', label: 'Garage', glyph: '▱', route: '/garage' },
  { key: 'raceday', label: 'RaceDay', glyph: '⚑', route: '/raceday/dashboard' },
  { key: 'tools', label: 'Tools', glyph: '⌁', route: '/tools' },
  { key: 'vehicles', label: 'Vehicles', glyph: 'V', route: '/vehicles' },
  { key: 'tracks', label: 'Tracks', glyph: 'T', route: '/tracks' },
  { key: 'setups', label: 'Setups', glyph: 'S', route: '/setups' },
  { key: 'support', label: 'Support', glyph: '?', route: '/support' },
];

function selectedRoute(pathname, route) {
  if (route === '/') return pathname === '/';
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default function WebSidebar() {
  const pathname = usePathname() || '/';
  const router = useRouter();

  return (
    <View style={styles.sidebar}>
      <Pressable style={styles.brand} onPress={() => router.replace('/')}>
        <Text style={styles.brandMark}>IMRC</Text>
        <Text style={styles.brandSub}>SETUP</Text>
      </Pressable>

      <View style={styles.items}>
        {ITEMS.map((item) => {
          const selected = selectedRoute(pathname, item.route);
          return (
            <Pressable
              key={item.key}
              onPress={() => router.replace(item.route)}
              style={({ pressed }) => [
                styles.item,
                selected && styles.itemSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.glyph, selected && styles.selectedText]}>{item.glyph}</Text>
              <Text style={[styles.label, selected && styles.selectedText]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 112,
    flexShrink: 0,
    alignSelf: 'stretch',
    borderRightWidth: 1,
    borderRightColor: AppColors.borderStrong,
    backgroundColor: AppColors.background,
    paddingHorizontal: 8,
    paddingVertical: 12,
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
    fontSize: 17,
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
  items: { flex: 1, gap: 4 },
  item: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    gap: 3,
  },
  itemSelected: {
    borderLeftColor: AppColors.primary,
    backgroundColor: AppColors.surface,
  },
  glyph: { color: AppColors.mutedText, fontSize: 18, fontWeight: '900' },
  label: { color: AppColors.mutedText, fontSize: 9, fontWeight: '800' },
  selectedText: { color: AppColors.primary },
  pressed: { opacity: 0.72 },
});
