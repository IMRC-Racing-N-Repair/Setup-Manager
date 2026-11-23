import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGuidedTour } from './GuidedTour';

const guides = {
  'vehicle-add': [
    ['Vehicle name · Required', 'Give this car a name you’ll recognize in Garage and RaceDay.'],
    ['Chassis style · Required', 'Choose the platform this car is built on. Its chassis style determines which setup fields you’ll see.'],
    ['Transponder number (TX) · Suggested', 'Enter the number used for this car in LiveTime. RaceDay uses it to match your car to LiveRC timing results. You can save the car without it.'],
  ],
  'track-add': [
    ['Track name · Required', 'Enter the venue or layout name you want to see in Garage and RaceDay.'],
    ['Track type · Required', 'Choose the racing style for this layout. Use the separate Surface field for carpet, clay, asphalt or another surface.'],
    ['LiveRC URL · Suggested', 'Paste the track’s own LiveRC address, such as https://prwevents.liverc.com. RaceDay uses it to find events and sync results. You can save the track without it.'],
  ],
  'run-results': [
    ['Choose your dashboard stats', 'Tap the stat boxes you want on this car’s main RaceDay card. “Shown” marks your selections. Tap a selected box to remove it. You can display up to three.'],
  ],
};

export function useFieldGuide(id, open, scrollRef) {
  const replay = useGuidedTour()?.step === id;
  const [current, setCurrent] = useState(null);
  const anchor = useRef(null);
  useEffect(() => {
    let mounted = true;
    setCurrent(null);
    if (open) {
      const key = '@imrc_field_guide_v1_' + id;
      AsyncStorage.getItem(key).catch(() => null).then(seen => {
        if (!mounted || (seen && !replay)) return;
        setCurrent(0);
        AsyncStorage.setItem(key, '1').catch(() => {});
      });
    }
    return () => { mounted = false; };
  }, [id, open, replay]);

  useEffect(() => {
    if (current === null || !scrollRef) return;
    const frame = requestAnimationFrame(() => {
      const node = anchor.current;
      if (node?.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
      else {
        const content = scrollRef.current?.getInnerViewRef?.();
        if (content) node?.measureLayout(content, (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true }), () => {});
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [current, scrollRef]);
  return { steps: guides[id], current: open ? current : null, setCurrent, anchor };
}

export function FieldGuide({ guide, index = 0 }) {
  if (guide.current !== index) return null;
  const [title, body] = guide.steps[index];
  const more = index + 1 < guide.steps.length;
  return (
    <View collapsable={false} ref={guide.anchor} style={styles.tip}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.text}>{body}</Text>
      <View style={styles.actions}>
        {more && <Pressable accessibilityRole="button" onPress={() => guide.setCurrent(null)} style={styles.button}><Text style={styles.label}>Dismiss</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={() => guide.setCurrent(more ? index + 1 : null)} style={styles.button}>
          <Text style={styles.label}>{more ? 'Next field' : 'Got it'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  tip: { backgroundColor: '#132B47', padding: 10, borderRadius: 6, marginVertical: 4, borderLeftWidth: 2, borderColor: '#65AAFF' },
  title: { color: '#EEF5FF', fontWeight: '800', fontSize: 14 },
  text: { color: '#BED5EF', marginTop: 3, lineHeight: 18, fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  button: { paddingHorizontal: 8, minHeight: 40, justifyContent: 'center' },
  label: { color: '#9DCBFF', fontWeight: '700' },
});
