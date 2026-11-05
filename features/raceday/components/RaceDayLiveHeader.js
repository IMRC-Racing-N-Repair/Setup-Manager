import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { raceDayStyles } from '../styles/raceDayStyles';

const MARQUEE_PIXELS_PER_SECOND = 58;

function connectionLabel(connection) {
  if (connection === 'connected') return 'Connected';
  if (connection === 'paused') return 'Paused';
  if (connection === 'reconnecting') return 'Reconnecting';
  return 'Connecting';
}

function raceLabel(liveState) {
  if (liveState.mode === 'practice') return 'PRACTICE';
  const number = liveState.raceNumber || '—';
  return liveState.totalRaces ? `RACE ${number} OF ${liveState.totalRaces}` : `RACE ${number}`;
}

function detailLabel(liveState) {
  const details = [];
  const roundCode = String(liveState.roundNumber || '').toUpperCase();
  const heat = String(liveState.heat || '');
  const roundLabel = roundCode === 'M'
    ? 'Main'
    : roundCode === 'Q'
      ? 'Qualifier'
      : liveState.roundType || (roundCode && roundCode !== 'OP' ? `Round ${roundCode}` : '');
  if (heat && heat !== liveState.className) details.push(heat);
  if (roundLabel && !heat.toLowerCase().includes(roundLabel.toLowerCase())) details.push(roundLabel);
  if (liveState.raceStatus && liveState.mode === 'race') {
    const status = String(liveState.raceStatus);
    details.push(status.charAt(0).toUpperCase() + status.slice(1).toLowerCase());
  }
  return details.filter(Boolean).join(' • ');
}

function driverLabel(drivers = []) {
  if (!drivers.length) return 'Waiting for drivers on track…';
  return drivers
    .map((driver) => `${driver.position ? `${driver.position}. ` : ''}${driver.name || `Car ${driver.carNumber}`}`)
    .join('     •     ');
}

function driverItemLabel(driver) {
  return `${driver.position ? `${driver.position}. ` : ''}${driver.name || `Car ${driver.carNumber}`}`;
}

export default function RaceDayLiveHeader({ liveState, embedded = false }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const active = Boolean(liveState?.active);
  const connection = liveState?.connection || 'connecting';
  const driversText = useMemo(() => driverLabel(liveState?.drivers || []), [liveState?.drivers]);
  const marqueeDrivers = (liveState?.drivers || []).slice(0, 5);
  const details = detailLabel(liveState || {});

  useEffect(() => {
    animationRef.current?.stop?.();
    translateX.stopAnimation();

    if (!active || !viewportWidth || !contentWidth) {
      translateX.setValue(0);
      return undefined;
    }

    const distance = viewportWidth + contentWidth;
    const duration = Math.max(7000, Math.round((distance / MARQUEE_PIXELS_PER_SECOND) * 1000));
    translateX.setValue(viewportWidth);
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -contentWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animationRef.current = animation;
    animation.start();

    return () => animation.stop();
  }, [active, contentWidth, driversText, translateX, viewportWidth]);

  if (!liveState?.configured) return null;

  if (!active) {
    return (
      <View style={[raceDayStyles.liveHeaderWrap, embedded && raceDayStyles.liveHeaderWrapEmbedded]}>
        <View style={[raceDayStyles.liveHeaderIdle, embedded && raceDayStyles.liveHeaderIdleEmbedded]}>
          <View
            style={[
              raceDayStyles.liveConnectionDot,
              connection === 'connected'
                ? raceDayStyles.liveConnectionDotConnected
                : connection === 'reconnecting'
                  ? raceDayStyles.liveConnectionDotReconnecting
                  : raceDayStyles.liveConnectionDotConnecting,
            ]}
          />
          <Text style={raceDayStyles.liveIdleLabel}>LIVE</Text>
          <Text style={raceDayStyles.liveIdleText} numberOfLines={1}>
            {connection === 'connected'
              ? 'Waiting for track activity'
              : connection === 'paused'
                ? 'Updates paused while app is inactive'
                : `${connectionLabel(connection)} to LiveRC…`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[raceDayStyles.liveHeaderWrap, embedded && raceDayStyles.liveHeaderWrapEmbedded]}>
      <View style={[raceDayStyles.liveHeaderActive, embedded && raceDayStyles.liveHeaderActiveEmbedded]}>
      <View style={raceDayStyles.liveHeaderTopRow}>
        <View style={raceDayStyles.liveTitleWrap}>
          <View
            style={[
              raceDayStyles.liveConnectionDot,
              connection === 'connected'
                ? raceDayStyles.liveConnectionDotConnected
                : raceDayStyles.liveConnectionDotReconnecting,
            ]}
          />
          <Text style={raceDayStyles.liveLabel}>LIVE</Text>
          <Text style={raceDayStyles.liveClassName} numberOfLines={1}>{liveState.className || 'Live Track'}</Text>
        </View>
        <View style={raceDayStyles.liveRaceBadge}>
          <Text style={raceDayStyles.liveRaceBadgeText}>{raceLabel(liveState)}</Text>
        </View>
      </View>

      {details ? <Text style={raceDayStyles.liveDetails} numberOfLines={1}>{details}</Text> : null}

      <View
        style={raceDayStyles.liveMarqueeViewport}
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[raceDayStyles.liveMarqueeContent, { transform: [{ translateX }] }]}
          onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
        >
          {marqueeDrivers.length ? marqueeDrivers.map((driver, index) => (
            <Text key={driver.key || driver.driverId || `${driver.position}-${driver.name}`} style={raceDayStyles.liveDriverItem}>
              {driverItemLabel(driver)}{index < marqueeDrivers.length - 1 ? '     •     ' : ''}
            </Text>
          )) : (
            <Text style={raceDayStyles.liveDriverItem}>Waiting for drivers on track…</Text>
          )}
        </Animated.View>
      </View>
      </View>
    </View>
  );
}

export { RaceDayLiveHeader };
