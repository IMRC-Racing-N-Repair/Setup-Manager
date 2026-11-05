// features/tools/ToolsHomeScreen.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  ToolScaffold,
  TOOL_GREEN,
  TOOL_LINE,
  TOOL_MUTED,
  TOOL_TEXT,
  goBack,
  navigateTo,
} from './ToolShared';
import { calculateRollout } from './lib/rolloutMath';

const ROLLOUT_KEYS = [
  '@imrcToolsRollout_v5_targetChart',
  '@imrcToolsRollout_v4_inchesDefault',
];

const SCALE_KEY = '@imrcToolsRaceScale_v1';
const OZ_TO_G = 28.349523125;
const TOOLS = [
  { title: 'Rollout', route: '/tools/rollout', icon: 'RO', desc: 'FDR, rollout, target pinion', statKey: 'rollout' },
  { title: 'Gear Counter', route: '/tools/gears', icon: 'GT', desc: 'Tap teeth or estimate count' },
  { title: 'Scale / Weights', route: '/tools/scale', icon: 'WT', desc: 'Total, cross, left/right, front/rear', statKey: 'scale' },
  { title: 'Camber Gauge', route: '/tools/camber', icon: 'CG', desc: 'Live phone camber gauge' },
  { title: 'Tuning Assistant', route: '/tools/tuning', icon: 'TA', desc: 'Pick a car and solve IN / CENTER / OUT' },
  { title: 'Track Near Me', route: '/tools/near-me', icon: 'TM', desc: 'IMRC Track Database + maps' },
];

function num(value) {
  const n = Number(String(value ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

async function readFirstJson(keys) {
  for (const key of keys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      return JSON.parse(raw);
    } catch (error) {
      // Keep trying older keys.
    }
  }
  return null;
}

function gramsFromStateValue(value, unit) {
  const n = num(value);
  if (!n) return 0;
  return unit === 'oz' ? n * OZ_TO_G : n;
}

function scaleWeightGrams(state, key) {
  const gramsKey = `${key}G`;
  if (state?.[gramsKey]) return num(state[gramsKey]);
  return gramsFromStateValue(state?.[key], state?.unit || 'g');
}

function buildScaleStat(state) {
  const lf = scaleWeightGrams(state, 'lf');
  const rf = scaleWeightGrams(state, 'rf');
  const lr = scaleWeightGrams(state, 'lr');
  const rr = scaleWeightGrams(state, 'rr');
  const total = lf + rf + lr + rr;

  if (total <= 0) return 'Cross —';

  const cross = rf + lr;
  return `Cross ${((cross / total) * 100).toFixed(1)}%`;
}

function buildRolloutStat(state) {
  if (!state) return 'Rollout —';

  const tireUnit = state.tireUnit === 'mm' ? 'mm' : 'in';
  const result = calculateRollout({
    tireDiameter: state.tireDiameter,
    tireUnit,
    pinion: state.pinion,
    spur: state.spur,
    internalRatio: state.internalRatio,
  });

  if (!result?.rolloutMm || Number(result.rolloutMm) <= 0) return 'Rollout —';

  return tireUnit === 'mm'
    ? `Rollout ${result.rolloutMm} mm`
    : `Rollout ${result.rolloutIn} in`;
}

export default function ToolsHomeScreen(props) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isShort = height < 720;
  const [stats, setStats] = useState({
    rollout: 'Rollout —',
    scale: 'Cross —',
  });

  const loadStats = useCallback(async () => {
    const [rolloutState, scaleRaw] = await Promise.all([
      readFirstJson(ROLLOUT_KEYS),
      AsyncStorage.getItem(SCALE_KEY).catch(() => null),
    ]);

    let scaleState = null;
    try {
      scaleState = scaleRaw ? JSON.parse(scaleRaw) : null;
    } catch (error) {
      scaleState = null;
    }

    setStats({
      rollout: buildRolloutStat(rolloutState),
      scale: buildScaleStat(scaleState),
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await loadStats();
    };

    run();

    let unsubscribe = null;
    if (props?.navigation?.addListener) {
      unsubscribe = props.navigation.addListener('focus', run);
    }

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadStats, props?.navigation]);

  return (
    <ToolScaffold title="Tools" onBack={() => goBack(props)}>
      <View style={[styles.grid, isLandscape && styles.gridLandscape]}>
        {TOOLS.filter((tool) => !tool.hidden).map((tool) => {
          const stat = tool.statKey ? stats[tool.statKey] : null;

          return (
            <Pressable
              key={tool.route}
              onPress={() => navigateTo(props, tool.route)}
              style={({ pressed }) => [
                styles.card,
                isShort && styles.cardShort,
                isLandscape && styles.cardLandscape,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.iconBubble}><Text style={styles.iconText}>{tool.icon}</Text></View>

              <View style={styles.textWrap}>
                <View style={styles.titleRow}>
                  <Text style={styles.toolTitle} numberOfLines={1}>{tool.title}</Text>
                  {!!tool.experimental && (
                    <View style={styles.experimentalPill}>
                      <Text style={styles.experimentalText}>EXPERIMENTAL</Text>
                    </View>
                  )}
                  {!!stat && (
                    <View style={styles.statPill}>
                      <Text style={styles.statText} numberOfLines={1}>{stat}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.desc} numberOfLines={1}>{tool.desc}</Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </Pressable>
          );
        })}
      </View>
    </ToolScaffold>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 7,
  },
  gridLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    minHeight: 64,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#111B29',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  cardShort: {
    minHeight: 62,
    paddingVertical: 6,
  },
  cardLandscape: {
    width: '49%',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47,140,255,0.12)',
    borderWidth: 1,
    borderColor: TOOL_LINE,
  },
  iconText: {
    color: TOOL_GREEN,
    fontWeight: '900',
    fontSize: 12,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 2,
  },
  toolTitle: {
    color: TOOL_TEXT,
    fontSize: 16,
    fontWeight: '900',
  },
  statPill: {
    maxWidth: 126,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(47,140,255,0.10)',
    borderWidth: 1,
    borderColor: TOOL_LINE,
  },
  statText: {
    color: TOOL_GREEN,
    fontSize: 10,
    fontWeight: '900',
  },
  experimentalPill: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(47,140,255,0.10)',
    borderWidth: 1,
    borderColor: TOOL_LINE,
  },
  experimentalText: {
    color: TOOL_GREEN,
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  desc: {
    color: TOOL_MUTED,
    fontSize: 11,
    fontWeight: '700',
  },
  arrow: {
    color: TOOL_GREEN,
    fontSize: 28,
    fontWeight: '900',
    marginTop: -4,
  },
});
