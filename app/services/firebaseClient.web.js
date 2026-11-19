import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDkDn9-2QVLZe8yOOMZsl4ioOr7vLNm96k',
  authDomain: 'imrc-racing-n-repair.firebaseapp.com',
  projectId: 'imrc-racing-n-repair',
  storageBucket: 'imrc-racing-n-repair.firebasestorage.app',
  messagingSenderId: '839652493357',
  appId: '1:839652493357:web:f15397f318552fd4fc50a4',
  measurementId: 'G-1MLM66K5LB',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Keep the browser signed in between sessions. Persistence failure should not
// prevent the website from opening; Firebase will fall back to in-memory auth.
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const db = getFirestore(app);
export { auth };
export default app;
