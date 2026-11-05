// src/dashboard/logic/useSponsorBanner.js
import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SPONSOR_URL = 'https://raw.githubusercontent.com/shopimrc/IMRCSetupManger/refs/heads/main/sponsor.json';
const SPONSOR_CACHE_KEY = '@dashboardSponsorCache_v1';
const SPONSOR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const DEFAULT_SPONSOR = {
  active: true,
  name: 'Available Banner',
  nameColor: '#FFFFFF',
  logo: null,
  url: 'https://www.shopimrc.com',
};

export function useSponsorBanner() {
  const [sponsor, setSponsor] = useState(DEFAULT_SPONSOR);

  useEffect(() => {
    let alive = true;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 8000) : null;
    async function loadSponsor() {
      try {
        const cachedRaw = await AsyncStorage.getItem(SPONSOR_CACHE_KEY);
        const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
        if (alive && cached?.sponsor) setSponsor(cached.sponsor);
        if (cached?.savedAt && Date.now() - Number(cached.savedAt) < SPONSOR_CACHE_TTL_MS) return;

        const res = await fetch(SPONSOR_URL, { signal: controller?.signal });
        if (!res.ok) throw new Error(`Sponsor request failed: ${res.status}`);
        const json = await res.json();
        const todayKey = DAY_KEYS[new Date().getDay()];
        const todayDate = new Date().toISOString().slice(0, 10);
        const match = json?.sponsors?.find((s) => {
          const days = Array.isArray(s?.days) ? s.days : [];
          return s?.active === true && days.includes(todayKey) && todayDate >= String(s?.startDate || '0000-00-00') && todayDate <= String(s?.endDate || '9999-99-99');
        });
        const nextSponsor = match || DEFAULT_SPONSOR;
        if (alive) setSponsor(nextSponsor);
        await AsyncStorage.setItem(SPONSOR_CACHE_KEY, JSON.stringify({ sponsor: nextSponsor, savedAt: Date.now() }));
      } catch {
        // Keep the cached sponsor or built-in fallback already on screen.
      }
    }
    loadSponsor();
    return () => {
      alive = false;
      if (timeout) clearTimeout(timeout);
      controller?.abort();
    };
  }, []);

  const normalizedSponsor = useMemo(() => ({
    ...DEFAULT_SPONSOR,
    ...(sponsor || {}),
    image: sponsor?.logo || sponsor?.image || null,
    label: 'Sponsored By',
  }), [sponsor]);

  return { sponsor: normalizedSponsor };
}
