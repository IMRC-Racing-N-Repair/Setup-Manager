import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { lessons } from './guideLessons';

const KEY = '@imrc_guided_tutorial_v2';
const TourContext = createContext(null);
export const useGuidedTour = () => useContext(TourContext);
// Scroll long native screens to the same control the spotlight measures.
export function useGuideScroll(route) {
  const pathname = usePathname();
  const { step, refFor } = useGuidedTour();
  const scroll = useRef(null);
  useEffect(() => {
    if (!step || pathname !== route) return;
    const frame = requestAnimationFrame(() => {
      const target = refFor(step)?.current;
      const container = scroll.current;
      if (!target || !container) return;
      if (target.scrollIntoView) {
        target.scrollIntoView({ block: 'nearest' });
      } else {
        const content = container.getInnerViewRef?.();
        if (content) target.measureLayout(content, (x, y) => container.scrollTo({ y: Math.max(0, y - 12), animated: false }), () => {});
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, route, step, refFor]);
  return scroll;
}

const initial = { status: 'new', step: 'account', resultsDone: false, toolsDone: false };
export function GuideHint({ step, children }) {
  const tour = useGuidedTour();
  if (tour.step !== step) return null;
  return <Text style={s.hint}>{children}</Text>;
}

const editorSteps = ['corner', 'setup-results', 'setup-notes', 'setup-history'];

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
  const targetRef = useRef(null);
  const saved = useRef(null);
  const writes = useRef(Promise.resolve());
  const [state, setState] = useState(null);
  const [homeReady, setHomeReady] = useState(false);
  const [roundReady, setRoundReady] = useState(false);
  const invite = useCallback(() => setHomeReady(true), []);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY).then(raw => raw ? JSON.parse(raw) : initial).catch(() => initial).then(record => {
      if (!mounted || saved.current) return;
      saved.current = record && lessons[record.step] ? record : initial;
      setState(saved.current);
    });
    return () => { mounted = false; };
  }, []);
  const update = useCallback(patch => {
    const record = { ...(saved.current || initial), ...patch };
    saved.current = record;
    setState(record);
    writes.current = writes.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(record))).catch(() => {});
  }, []);
  const go = useCallback((step, navigate = true, patch = {}) => {
    update({ status: 'active', step, ...patch });
    const route = lessons[step].route;
    if (navigate && route && pathname !== route) router.push(route);
  }, [pathname, router, update]);
  const start = useCallback(() => go('account', true, { toolsDone: false, resultsDone: false, resumeTool: null }), [go]);
  const active = state?.status === 'active';
  const step = active ? state.step : null;
  const previousPath = useRef(pathname);
  const initialized = useRef(false);
  useEffect(() => {
    if (!state || initialized.current) return;
    if (pathname === '/' && state.status === 'new' && !homeReady) return;
    initialized.current = true;
    if (state.status === 'new' && pathname === '/') start();
    else if (active && pathname === '/') {
      // Re-enter a chapter through its picker when a restart lost a record-specific route.
      const checkpoint = editorSteps.includes(step) || step === 'setup-track' ? 'setup-car'
        : ['race-track','race-cars','race-page','race-sync','after-sync','wrench','lap','run-results'].includes(step) ? 'race-start' : step;
      go(checkpoint);
    }
  }, [state, pathname, homeReady, active, step, start, go]);
  useEffect(() => {
    if (state?.status === 'new' && homeReady && pathname === '/') start();
  }, [state?.status, homeReady, pathname, start]);
  useEffect(() => {
    const prev = previousPath.current;
    previousPath.current = pathname;
    if (pathname === '/raceday/dashboard' && roundReady && !state?.resultsDone &&
      (state?.status === 'waiting' || step === 'after-sync' || lessons[step]?.section === 'Tools')) {
      go('wrench', false, { resumeTool: lessons[step]?.section === 'Tools' ? step : null });
    }
    else if (['race-start','race-track','race-cars'].includes(step)) {
      const routeStep = { '/raceday/select-track': 'race-track', '/raceday/select-vehicles': 'race-cars', '/raceday/dashboard': 'race-page' }[pathname];
      if (routeStep && routeStep !== step) go(routeStep, false);
    } else if (['setup-track','setup-car'].includes(step) && pathname.startsWith('/setups/editor/')) go('corner', false);
    else if (editorSteps.includes(step) && prev.startsWith('/setups/editor/') && !pathname.startsWith('/setups/editor/')) go('race-start');
  }, [pathname, step, state?.status, roundReady, go]);
  const milestone = useCallback((from, to) => {
    if (saved.current?.status === 'active' && saved.current.step === from) go(to);
  }, [go]);
  const next = () => {
    const dest = lessons[step].next;
    if (dest === 'tools-done') update({ toolsDone: true, status: state.resultsDone ? 'completed' : 'waiting' });
    else if (dest === 'results-done') {
      if (state.toolsDone) update({ resultsDone: true, status: 'completed' });
      else go(state.resumeTool || 'rollout', true, { resultsDone: true, resumeTool: null });
    } else if (dest) go(dest);
  };
  const value = useMemo(() => ({
    active, step, status: state?.status, invite, start, milestone, setRoundReady,
    refFor: id => id && id === step ? targetRef : undefined,
  }), [active, step, state?.status, invite, start, milestone]);
  return (
    <TourContext.Provider value={value}>
      {children}
      {active && <Spotlight key={step} id={step} targetRef={targetRef} next={next} close={() => update({ status: 'skipped' })} />}
    </TourContext.Provider>
  );
}

function Spotlight({ id, targetRef, close, next }) {
  const { section, title, body, next: destination, label } = lessons[id];
  const [compact, setCompact] = useState(false);
  const root = useRef(null);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [measured, setRect] = useState(null);
  const rect = measured;
  useEffect(() => {
    let active = true;
    const update = () => {
      const target = targetRef.current;
      if (!target) { setRect(null); return; }
      measure(root.current, (rx, ry, rw, rh) => measure(target, (x, y, w, h) => {
        if (!active || target !== targetRef.current) return;
        if ((y + h < ry || y > ry + rh) && target.scrollIntoView) target.scrollIntoView({ block: 'center' });
        const left = Math.max(0, x - rx - 4);
        const top = Math.max(0, y - ry - 4);
        const right = Math.min(rw, x - rx + w + 4);
        const bottom = Math.min(rh, y - ry + h + 4);
        const box = w > 0 && h > 0 && right > left && bottom > top ? { left, right, top, bottom, rh } : null;
        setRect(prev => box && prev && Object.keys(box).every(k => prev[k] === box[k]) ? prev : box);
      }));
    };
    update();

    const timer = setInterval(update, 180);
    return () => { active = false; clearInterval(timer); };
  }, [targetRef, window.width, window.height]);

  const below = rect && rect.top < rect.rh - rect.bottom;
  const space = rect ? Math.max(rect.top - insets.top, rect.rh - rect.bottom - insets.bottom) : 0;
  const inset = space < 180 ? { top: insets.top + 8, bottom: insets.bottom + 8 } : below ? { top: rect.bottom + 8, bottom: insets.bottom + 8 } :
    rect ? { bottom: rect.rh - rect.top + 8, top: insets.top + 8 } : { top: insets.top + 8, bottom: insets.bottom + 8 };
  const leftEdge = insets.left + 12;
  const rightEdge = window.width - insets.right - 12;
  const cardWidth = Math.min(430, rightEdge - leftEdge);
  const cardLeft = rect
    ? Math.max(leftEdge, Math.min(rightEdge - cardWidth, (rect.left + rect.right - cardWidth) / 2))
    : (leftEdge + rightEdge - cardWidth) / 2;
  return (
    <View ref={root} collapsable={false} pointerEvents="box-none" style={[StyleSheet.absoluteFill, s.root]}>
        {rect && !compact ? <>
          <View pointerEvents="none" style={[s.shade, { top: 0, left: 0, right: 0, height: rect.top }]} />
          <View pointerEvents="none" style={[s.shade, { top: rect.bottom, left: 0, right: 0, bottom: 0 }]} />
          <View pointerEvents="none" style={[s.shade, { top: rect.top, height: rect.bottom - rect.top, left: 0, width: rect.left }]} />
          <View pointerEvents="none" style={[s.shade, { top: rect.top, height: rect.bottom - rect.top, left: rect.right, right: 0 }]} />
          <View pointerEvents="none" style={[s.outline, { top: rect.top, left: rect.left, width: rect.right - rect.left, height: rect.bottom - rect.top }]} />
        </> : null}
        <View pointerEvents="box-none" style={[s.placement, inset, { left: cardLeft, width: cardWidth, justifyContent: space < 180 ? 'flex-end' : below ? 'flex-start' : 'flex-end' }]}>
          {compact ? <Pressable accessibilityRole="button" style={[s.button, s.primary]} onPress={() => setCompact(false)}><Text style={s.label}>Show guide</Text></Pressable> : <View style={s.card}>
            <ScrollView bounces={false} style={{ flexGrow: 0 }}>
              <Text style={s.count}>GUIDE  ·  {section.toUpperCase()}</Text>
              <Text accessibilityRole="header" style={s.title}>{title}</Text>
              <Text style={s.body}>{body}</Text>
            </ScrollView>
            <View style={s.actions}>
              <Pressable accessibilityRole="button" onPress={close} style={s.button}><Text style={s.label}>Skip tour</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => setCompact(true)} style={s.button}><Text style={s.label}>Hide tip</Text></Pressable>
              {destination && <Pressable accessibilityRole="button" onPress={next} style={[s.button, s.primary]}><Text style={s.label}>{label || 'Next'}</Text></Pressable>}
            </View>
          </View>}
        </View>
    </View>
  );
}

const s = StyleSheet.create({
  hint: { color: '#BAD9FF', backgroundColor: '#132B47', padding: 8, marginVertical: 4, borderRadius: 6, fontSize: 14 },
  root: { zIndex: 2000, elevation: 12 },
  shade: { position: 'absolute', backgroundColor: 'rgba(1,5,12,0.82)' },
  outline: { position: 'absolute', borderColor: '#64ACFF', borderWidth: 2, borderRadius: 8 },
  placement: { position: 'absolute', alignItems: 'center' },
  card: { width: '100%', maxWidth: 430, maxHeight: '100%', borderRadius: 10, backgroundColor: '#111B29', borderWidth: 1, borderColor: '#344963', padding: 14 },
  count: { color: '#97C7FF', fontSize: 11, fontWeight: '800' },
  title: { color: '#EEF5FF', fontWeight: '800', fontSize: 20, marginVertical: 4 },
  body: { color: '#C4D1E1', fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  button: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  primary: { backgroundColor: '#235FAE', borderRadius: 6 },
  label: { color: '#EEF5FF', fontWeight: '700' },
});
