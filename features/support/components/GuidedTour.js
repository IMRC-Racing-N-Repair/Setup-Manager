import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const steps = [
  { route: '/', target: 'garage', title: 'Open your Garage', body: 'Garage keeps your cars and their track setups together. Select Garage to see where to add your first car.', next: 'Open Garage' },
  { route: '/garage', target: 'vehicle-add', title: 'Add a vehicle', body: 'Use + Add here to save your car. Give it a name and chassis style. Add its transponder to help RaceDay match your results.', next: 'Show Tracks' },
  { route: '/tracks', target: 'track-add', title: 'Save your track', body: 'Use + Add to enter a track and its surface. Include its LiveRC address to look up events on race day.', next: 'Show RaceDay' },
  { route: '/', target: 'raceday', title: 'Start a RaceDay', body: 'Open RaceDay here to choose your track and event, then follow your races and practice sessions.', next: 'Finish' },
];

const TourContext = createContext(null);
export const useGuidedTour = () => useContext(TourContext);

function measure(node, callback) {
  if (node?.getBoundingClientRect) {
    const { x, y, width, height } = node.getBoundingClientRect();
    callback(x, y, width, height);
  } else {
    node?.measureInWindow?.(callback);
  }
}

export function GuidedTourProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(null);
  const targetRef = useRef(null);
  const invitation = index === -1;
  const step = invitation ? { title: 'Take a quick tour?', body: 'See where to add a car, save a track, and open RaceDay. You can replay the tour from Support.', next: 'Start tour' } : steps[index];
  const invite = useCallback(() => setIndex(current => current ?? -1), []);
  const go = useCallback((i) => {
    setIndex(i);
    if (pathname !== steps[i].route) router.replace(steps[i].route);
  }, [pathname, router]);
  const start = useCallback(() => go(0), [go]);
  const value = useMemo(() => ({
    start, invite, active: index !== null,
    refFor: (id) => id && step?.route === pathname && step.target === id ? targetRef : undefined,
  }), [start, invite, step, pathname, index]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {step && <Spotlight step={step} index={index} targetRef={targetRef}
        close={() => setIndex(null)} next={() => index === steps.length - 1 ? setIndex(null) : go(index + 1)} />}
    </TourContext.Provider>
  );
}

function Spotlight({ step, index, targetRef, close, next }) {
  const root = useRef(null);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [measured, setRect] = useState(null);
  const rect = measured?.index === index ? measured : null;
  useEffect(() => {
    let active = true;
    const update = () => {
      const target = targetRef.current;
      if (!target) { setRect(null); return; }
      measure(root.current, (rx, ry, rw, rh) => measure(target, (x, y, w, h) => {
        if (!active || target !== targetRef.current) return;
        const left = Math.max(0, x - rx - 4);
        const top = Math.max(0, y - ry - 4);
        const right = Math.min(rw, x - rx + w + 4);
        const bottom = Math.min(rh, y - ry + h + 4);
        const box = w > 0 && h > 0 && right > left && bottom > top ? { left, right, top, bottom, rh, index } : null;
        setRect(prev => box && prev && Object.keys(box).every(k => prev[k] === box[k]) ? prev : box);
      }));
    };
    update();
    if (index < 0) return;
    const timer = setInterval(update, 180);
    return () => { active = false; clearInterval(timer); };
  }, [index, targetRef, window.width, window.height]);

  const below = rect && rect.top < rect.rh - rect.bottom;
  const inset = below ? { top: rect.bottom + 8, bottom: insets.bottom + 8 } :
    rect ? { bottom: rect.rh - rect.top + 8, top: insets.top + 8 } : { top: insets.top + 8, bottom: insets.bottom + 8 };
  const leftEdge = insets.left + 12;
  const rightEdge = window.width - insets.right - 12;
  const cardWidth = Math.min(430, rightEdge - leftEdge);
  const cardLeft = rect
    ? Math.max(leftEdge, Math.min(rightEdge - cardWidth, (rect.left + rect.right - cardWidth) / 2))
    : (leftEdge + rightEdge - cardWidth) / 2;
  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View ref={root} collapsable={false} style={s.root} accessibilityViewIsModal>
        {rect ? <>
          <View style={[s.shade, { top: 0, left: 0, right: 0, height: rect.top }]} />
          <View style={[s.shade, { top: rect.bottom, left: 0, right: 0, bottom: 0 }]} />
          <View style={[s.shade, { top: rect.top, height: rect.bottom - rect.top, left: 0, width: rect.left }]} />
          <View style={[s.shade, { top: rect.top, height: rect.bottom - rect.top, left: rect.right, right: 0 }]} />
          <Pressable accessibilityLabel={step.next} onPress={next} style={[s.outline, { top: rect.top, left: rect.left, width: rect.right - rect.left, height: rect.bottom - rect.top }]} />
        </> : <View style={[s.shade, StyleSheet.absoluteFill]} />}
        <View pointerEvents="box-none" style={[s.placement, inset, { left: cardLeft, width: cardWidth, justifyContent: !rect ? 'center' : below ? 'flex-start' : 'flex-end' }]}>
          <View style={s.card}>
            <ScrollView bounces={false} style={{ flexGrow: 0 }}>
              <Text style={s.count}>QUICK TOUR{index >= 0 ? `  ·  ${index + 1} / ${steps.length}` : ''}</Text>
              <Text accessibilityRole="header" style={s.title}>{step.title}</Text>
              <Text style={s.body}>{step.body}</Text>
            </ScrollView>
            <View style={s.actions}>
              <Pressable accessibilityRole="button" onPress={close} style={s.button}><Text style={s.label}>Skip tour</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={next} style={[s.button, s.primary]}><Text style={s.label}>{step.next}</Text></Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  shade: { position: 'absolute', backgroundColor: 'rgba(1,5,12,0.82)' },
  outline: { position: 'absolute', borderColor: '#64ACFF', borderWidth: 2, borderRadius: 8 },
  placement: { position: 'absolute', alignItems: 'center' },
  card: { width: '100%', maxWidth: 430, maxHeight: '100%', borderRadius: 10, backgroundColor: '#111B29', borderWidth: 1, borderColor: '#344963', padding: 14 },
  count: { color: '#97C7FF', fontSize: 11, fontWeight: '800' },
  title: { color: '#EEF5FF', fontWeight: '800', fontSize: 20, marginVertical: 4 },
  body: { color: '#C4D1E1', fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  button: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  primary: { backgroundColor: '#235FAE', borderRadius: 6 },
  label: { color: '#EEF5FF', fontWeight: '700' },
});
