// app/tracks/import.js

import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

import TrackImportForm from '../../features/tracks/components/TrackImportForm';

export default function TrackImportScreen() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const pendingActionRef = useRef('');
  const dismissTimerRef = useRef(null);

  useEffect(() => () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  function finishDismissal() {
    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = '';
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (action === 'tracks') router.replace('/tracks');
    if (action === 'back') router.back();
    if (action === 'submit') router.replace('/tracks/submit');
  }

  function closeThen(action) {
    pendingActionRef.current = action;
    setVisible(false);
    if (Platform.OS !== 'ios') {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(finishDismissal, 260);
    }
  }

  function handleImported() {
    closeThen('tracks');
  }

  function handleCancel() {
    closeThen('back');
  }

  function handleSubmitTrack() {
    closeThen('submit');
  }

  return (
    <TrackImportForm
      visible={visible}
      onImported={handleImported}
      onCancel={handleCancel}
      onSubmitTrack={handleSubmitTrack}
      onDismiss={finishDismissal}
    />
  );
}
