import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, usePathname } from 'expo-router';

import { AppColors } from '../theme/colors';

const sections = [
  { label: 'Workspace', items: [
    { label: 'Home', icon: '⌂', href: '/' },
    { label: 'Garage', icon: '▱', href: '/garage' },
    { label: 'RaceDay', icon: '⚑', href: '/raceday/dashboard', root: '/raceday' },
    { label: 'LiveRC Results', icon: '▤', href: '/live-results' },
    { label: 'Tools', icon: '⌁', href: '/tools' },
  ] },
  { label: 'Garage records', items: [
    { label: 'Vehicles', icon: '◇', href: '/vehicles' },
    { label: 'Tracks', icon: '◎', href: '/tracks' },
    { label: 'Setups', icon: '≡', href: '/setups' },
  ] },
  { items: [{ label: 'Support', icon: '?', href: '/support' }] },
];

export default function WebSidebar() {
  const pathname = usePathname() || '/';

  return (
    <View accessibilityRole="navigation" accessibilityLabel="Setup Manager" style={styles.sidebar}>
      <Link href="/" style={styles.brand} accessibilityLabel="IMRC Setup Manager home">
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brandName}>IMRC<Text style={styles.brandSub}>{'\n'}Setup Manager</Text></Text>
      </Link>
      <ScrollView contentContainerStyle={styles.menu}>
        {sections.map(({ label, items }) => (
          <View key={label || 'Support'} style={styles.section}>
            {label && <Text style={styles.sectionLabel}>{label}</Text>}
            {items.map(({ label: name, icon, href, root = href }) => {
              const selected = pathname === root || pathname.startsWith(root + '/');
              return (
                <Link key={href} href={href} aria-current={selected ? 'page' : undefined} style={[styles.item, selected && styles.selected]}>
                  <Text aria-hidden style={styles.icon}>{icon}</Text>
                  <Text style={styles.label}>{name}</Text>
                </Link>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 200, flexShrink: 0, backgroundColor: '#0A101B', borderRightWidth: 1, borderRightColor: AppColors.border },
  brand: { minHeight: 87, flexDirection: 'row', alignItems: 'center', display: 'flex', gap: 10, paddingHorizontal: 17, textDecorationLine: 'none' },
  logo: { width: 37, height: 37, borderRadius: 9 },
  brandName: { color: AppColors.textStrong, fontSize: 17, fontWeight: '900', lineHeight: 18 },
  brandSub: { color: AppColors.mutedText, fontSize: 12, fontWeight: '600' },
  menu: { paddingHorizontal: 12, paddingBottom: 16, gap: 15 },
  section: { gap: 4, borderTopWidth: 1, borderTopColor: AppColors.border, paddingTop: 12 },
  sectionLabel: { color: AppColors.mutedText, fontSize: 12, paddingHorizontal: 10, marginBottom: 4 },
  item: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 43, borderRadius: 8, paddingHorizontal: 10, color: AppColors.mutedText, textDecorationLine: 'none' },
  selected: { backgroundColor: '#152948', color: '#9DC9FF', boxShadow: 'inset 3px 0 #4E9EFF' },
  icon: { width: 24, textAlign: 'center', color: 'inherit', fontSize: 19 },
  label: { color: 'inherit', fontSize: 14, fontWeight: '700' },
});
