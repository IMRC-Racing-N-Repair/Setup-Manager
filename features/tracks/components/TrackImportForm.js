// features/tracks/components/TrackImportForm.js
// V8 compatibility wrapper. The main Track screen uses TrackImportSheet as a modal.

import React from 'react';
import { View } from 'react-native';

import TrackImportSheet from './TrackImportSheet';
import { trackStyles as styles } from '../styles/trackStyles';

export default function TrackImportForm({ visible = true, onImported, onCancel, onSubmitTrack, onDismiss }) {
  return (
    <View style={styles.screen}>
      <TrackImportSheet
        visible={visible}
        onImported={onImported}
        onCancel={onCancel}
        onSubmitTrack={onSubmitTrack}
        onDismiss={onDismiss}
      />
    </View>
  );
}
