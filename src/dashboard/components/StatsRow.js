// src/dashboard/components/StatsRow.js
import { View } from 'react-native';
import { dashboardStyles as styles } from '../dashboard.styles';
import VehicleButton from '../buttons/VehicleButton';
import TrackButton from '../buttons/TrackButton';
import SetupsButton from '../buttons/SetupsButton';

export default function StatsRow({ counts, router, rowStyle, cardStyle, valueStyle, iconBubbleStyle }) {
  const shared = { cardStyle, valueStyle, iconBubbleStyle };
  return (
    <View style={[styles.statsRow, rowStyle]}>
      <VehicleButton count={counts.vehicles} onPress={() => router.push('/garage')} {...shared} />
      <TrackButton count={counts.tracks} onPress={() => router.push('/garage')} {...shared} />
      <SetupsButton count={counts.setups} onPress={() => router.push('/garage')} {...shared} />
    </View>
  );
}
