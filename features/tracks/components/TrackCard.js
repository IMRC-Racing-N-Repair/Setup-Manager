// features/tracks/components/TrackCard.js

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { buildTrackLocation } from '../storage/trackStorage';
import { trackStyles as styles } from '../styles/trackStyles';

function hasValue(value) {
  return Boolean(String(value || '').trim());
}

export default function TrackCard({ track, onPress }) {
  const location = buildTrackLocation(track) || 'Location not set';
  const topDetail = hasValue(track.surface) ? track.surface : 'Surface not set';
  const rightTop = hasValue(track.zipCode) ? 'ZIP' : 'TYPE';
  const rightBottom = hasValue(track.zipCode)
    ? track.zipCode
    : (track.trackType || '—');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.trackCard,
        pressed && styles.trackCardPressed,
      ]}
    >
      <View style={styles.cardBlueBar} />

      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {track.trackName || 'Unnamed Track'}
        </Text>

        <Text style={styles.cardSubLine} numberOfLines={1}>
          {track.trackType || 'Track Type not set'} / {topDetail}
        </Text>

        <Text style={styles.cardBottomLine} numberOfLines={1}>
          {location}
        </Text>
      </View>

      <View style={styles.cardRightPill}>
        <Text style={styles.cardRightLabel}>{rightTop}</Text>
        <Text style={styles.cardRightValue} numberOfLines={1}>
          {rightBottom}
        </Text>
      </View>
    </Pressable>
  );
}
