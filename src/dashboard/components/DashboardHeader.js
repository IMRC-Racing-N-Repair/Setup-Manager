// src/dashboard/components/DashboardHeader.js
// ✅ DROP-IN FILE
// Displays the dashboard sync light using the color supplied by useAuthCloudSync.

import { Image, Text, TouchableOpacity, View } from 'react-native';
import { dashboardStyles as styles } from '../dashboard.styles';

export default function DashboardHeader({
  userName,
  statusDotColor,
  onAuthPress,
  onAuthLongPress,
  style,
  imageStyle,
  authPillStyle,
}) {
  const dotColor = statusDotColor || '#6B7280';

  return (
    <View style={[styles.header, style]}>
      <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
      <TouchableOpacity
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        delayLongPress={450}
        onPress={onAuthPress}
        onLongPress={onAuthLongPress}
        style={[styles.authPill, authPillStyle]}
        activeOpacity={0.85}
      >
        <Text style={styles.authText}>{userName || 'Sign In'}</Text>
      </TouchableOpacity>
      <Image
        source={require('../../../assets/banner-logo.png')}
        style={[styles.bannerImage, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}
