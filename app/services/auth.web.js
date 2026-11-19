import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { auth } from './firebaseClient';

let currentUser = null;
let initialized = false;
let unsubscribe = null;
const listeners = new Set();

const REAUTH_SCHEMA_VERSION = '2.0.0';
const REAUTH_COMPLETE_KEY = '@imrc_v2_reauth_complete_v1';

async function markV2ReauthComplete() {
  try {
    await AsyncStorage.setItem(REAUTH_COMPLETE_KEY, REAUTH_SCHEMA_VERSION);
  } catch {}
}

async function hasV2ReauthCompleted() {
  try {
    return (await AsyncStorage.getItem(REAUTH_COMPLETE_KEY)) === REAUTH_SCHEMA_VERSION;
  } catch {
    return false;
  }
}

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(currentUser);
    } catch {}
  });
}

function ensureObserver() {
  if (unsubscribe) return;
  unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user && !(await hasV2ReauthCompleted())) {
      await markV2ReauthComplete();
      try {
        await firebaseSignOut(auth);
      } catch {}
      currentUser = null;
    } else {
      currentUser = user || null;
    }
    initialized = true;
    notify();
  });
}

function finishSignIn(user) {
  currentUser = user || null;
  initialized = true;
  notify();
  return currentUser;
}

export function listenToAuth(listener) {
  if (typeof listener === 'function') listeners.add(listener);
  ensureObserver();
  if (initialized && listener) listener(currentUser);
  return () => listeners.delete(listener);
}

export async function awaitAuthReady() {
  ensureObserver();
  if (initialized) return currentUser;
  return new Promise((resolve) => {
    const off = listenToAuth((user) => {
      off();
      resolve(user);
    });
  });
}

export function getCurrentUser() {
  return currentUser;
}

export async function signOut() {
  await firebaseSignOut(auth);
  return finishSignIn(null);
}

export async function signIn(email, password) {
  await markV2ReauthComplete();
  const result = await signInWithEmailAndPassword(auth, String(email).trim(), String(password));
  return finishSignIn(result.user);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await markV2ReauthComplete();
  const result = await signInWithPopup(auth, provider);
  return finishSignIn(result.user);
}

export async function signInWithApple() {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  await markV2ReauthComplete();
  const result = await signInWithPopup(auth, provider);
  return finishSignIn(result.user);
}

export async function getV2ReauthStatus() {
  return {
    schemaVersion: REAUTH_SCHEMA_VERSION,
    completed: await hasV2ReauthCompleted(),
  };
}

export async function forceSignBackInForV2() {
  ensureObserver();
  const user = auth.currentUser || currentUser;
  await markV2ReauthComplete();
  if (!user) {
    finishSignIn(null);
    return { didSignOut: false, reason: 'no-active-user', schemaVersion: REAUTH_SCHEMA_VERSION };
  }
  await firebaseSignOut(auth);
  finishSignIn(null);
  return { didSignOut: true, reason: 'v2-upgrade', schemaVersion: REAUTH_SCHEMA_VERSION };
}

export const requireSignBackInForV2 = forceSignBackInForV2;

export function getUserFirstName(user) {
  if (!user) return 'Sign In';
  if (user.displayName) return user.displayName.split(' ')[0];
  if (user.email) return user.email.split('@')[0];
  return 'Racer';
}

export function getAuthMode() {
  return 'web-js-sdk';
}

export function isNativeFirebaseAvailable() {
  return false;
}

export function configureGoogleSignIn() {
  return true;
}
