import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import AppScreenHeader from '../../src/layout/AppScreenHeader';
import TrackEditSheet from '../../features/tracks/components/TrackEditSheet';
import TrackImportSheet from '../../features/tracks/components/TrackImportSheet';
import {
  deleteTrack,
  getTracks,
  normalizeTrack,
  upsertTrack,
} from '../../features/tracks/storage/trackStorage';
import {
  buildTrackExportPayload,
  parseTrackImportText,
} from '../../features/tracks/utils/trackImportExport';
import { AppColors } from '../../src/theme/colors';

const NEW_TRACK = {
  trackName: '',
  trackType: '',
  surface: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  liveRcUrl: '',
  direction: '',
  tractionLevel: '',
  runLine: '',
  trackDimensions: '',
  notes: '',
};

function trackName(track) {
  return String(track?.trackName || track?.name || 'Unnamed track');
}

function trackMeta(track) {
  return [track?.surface, track?.trackType, track?.direction].filter(Boolean).join(' · ') || 'Track details';
}

function trackLocation(track) {
  return [track?.city, track?.state].filter(Boolean).join(', ') || track?.address || 'Location not set';
}

function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function selectTrackFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.imrctrack,application/json,text/plain';
    input.multiple = false;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files?.[0] || null;
      input.remove();
      resolve(file ? { name: file.name, text: await file.text() } : null);
    }, { once: true });
    input.click();
  });
}

export default function TracksWebScreen() {
  const router = useRouter();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTrack, setEditingTrack] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [directoryVisible, setDirectoryVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const importingRef = useRef(false);

  const loadTracks = useCallback(async () => {
    setLoading(true);
    setTracks(await getTracks());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    loadTracks();
  }, [loadTracks]));

  async function saveTrack(nextTrack) {
    try {
      setSaving(true);
      const saved = await upsertTrack({ ...editingTrack, ...nextTrack });
      setEditingTrack(saved);
      setSheetVisible(false);
      await loadTracks();
    } catch (error) {
      Alert.alert('Save Failed', error?.validationErrors ? 'Track Name and Track Type are required.' : 'The track could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function removeTrack() {
    if (!editingTrack?.id) return;
    await deleteTrack(editingTrack.id);
    setSheetVisible(false);
    setEditingTrack(null);
    await loadTracks();
  }

  async function importFile() {
    if (importingRef.current) return;
    importingRef.current = true;
    try {
      const picked = await selectTrackFile();
      if (!picked) return;
      const parsed = JSON.parse(picked.text);
      const candidates = Array.isArray(parsed?.tracks)
        ? parsed.tracks
        : Array.isArray(parsed)
          ? parsed
          : [parsed?.track || parsed];

      let imported = 0;
      for (const candidate of candidates) {
        const track = parseTrackImportText(JSON.stringify({ track: candidate }));
        await upsertTrack(normalizeTrack(track));
        imported += 1;
      }
      await loadTracks();
      window.alert(`${imported} track${imported === 1 ? '' : 's'} imported.`);
    } catch (error) {
      window.alert(error?.userMessage || error?.message || 'The track file could not be imported.');
    } finally {
      importingRef.current = false;
    }
  }

  function exportTracks() {
    const exportedTracks = tracks.map((track) => ({
      ...buildTrackExportPayload(track),
      id: track.id,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    }));
    downloadJson(`imrc-tracks-${new Date().toISOString().slice(0, 10)}.json`, {
      schema: 'imrc-tracks-export-v1',
      exportedAt: new Date().toISOString(),
      tracks: exportedTracks,
    });
  }

  function openTrack(track) {
    setEditingTrack(track);
    setSheetVisible(true);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <AppScreenHeader
          title="Tracks"
          kicker="IMRC GARAGE"
          onBack={() => router.replace('/garage')}
          rightLabel="+ ADD"
          onRightPress={() => openTrack({ ...NEW_TRACK })}
        />

        <View style={styles.intro}>
          <Text style={styles.introText}>Saved tracks are used for Setups and RaceDay.</Text>
          <Text style={styles.savedCount}>{tracks.length} SAVED</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={importFile}>
            <Text style={styles.actionIcon}>⇩</Text>
            <View><Text style={styles.actionTitle}>IMPORT FILE</Text><Text style={styles.actionMeta}>JSON / IMRC TRACK</Text></View>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={exportTracks} disabled={!tracks.length}>
            <Text style={styles.actionIcon}>⇧</Text>
            <View><Text style={styles.actionTitle}>EXPORT ALL</Text><Text style={styles.actionMeta}>DOWNLOAD BACKUP</Text></View>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => setDirectoryVisible(true)}>
            <Text style={styles.actionIcon}>◎</Text>
            <View><Text style={styles.actionTitle}>ONLINE DIRECTORY</Text><Text style={styles.actionMeta}>FIND A TRACK</Text></View>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.submitButton]} onPress={() => router.push('/tracks/submit')}>
            <Text style={styles.actionIcon}>↗</Text>
            <View><Text style={styles.actionTitle}>SUBMIT TRACK</Text><Text style={styles.actionMeta}>SHARE WITH IMRC</Text></View>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={AppColors.primary} /><Text style={styles.muted}>Loading tracks…</Text></View>
        ) : (
          <FlatList
            data={tracks}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => openTrack(item)}>
                <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={styles.identity}>
                  <Text style={styles.name}>{trackName(item)}</Text>
                  <Text style={styles.meta}>{trackMeta(item)}</Text>
                  <Text style={styles.location}>{trackLocation(item)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No saved tracks yet</Text>
                <Text style={styles.muted}>Add a track, import a backup, or choose one from the online directory.</Text>
              </View>
            }
          />
        )}
      </View>

      <TrackEditSheet
        visible={sheetVisible}
        initialTrack={editingTrack || NEW_TRACK}
        isNew={!editingTrack?.id}
        saving={saving}
        onCancel={() => { setSheetVisible(false); setEditingTrack(null); }}
        onSave={saveTrack}
        onDelete={removeTrack}
        onViewSetups={() => {
          const id = editingTrack?.id;
          setSheetVisible(false);
          if (id) router.replace({ pathname: '/setups', params: { trackId: id, mode: 'track' } });
        }}
        onSubmitTrack={() => router.push('/tracks/submit')}
      />

      <TrackImportSheet
        visible={directoryVisible}
        onCancel={() => setDirectoryVisible(false)}
        onImported={async () => { setDirectoryVisible(false); await loadTracks(); }}
        onSubmitTrack={() => { setDirectoryVisible(false); router.push('/tracks/submit'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { flex: 1, width: '100%', paddingHorizontal: 22, paddingTop: 16 },
  intro: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: AppColors.border },
  introText: { color: AppColors.mutedText, fontSize: 12 },
  savedCount: { color: AppColors.mutedText, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: AppColors.borderStrong },
  actionButton: { minWidth: 210, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: AppColors.borderStrong, backgroundColor: AppColors.surface },
  submitButton: { borderColor: AppColors.primary, backgroundColor: AppColors.primarySoft },
  actionIcon: { width: 26, color: AppColors.primary, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  actionTitle: { color: AppColors.textStrong, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  actionMeta: { marginTop: 2, color: AppColors.subtleText, fontSize: 7, fontWeight: '800', letterSpacing: 0.35 },
  list: { paddingBottom: 30 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  number: { width: 28, color: AppColors.subtleText, fontSize: 10, fontWeight: '800' },
  identity: { flex: 1, minWidth: 0 },
  name: { color: AppColors.textStrong, fontSize: 16, fontWeight: '900' },
  meta: { marginTop: 3, color: AppColors.mutedText, fontSize: 10 },
  location: { marginTop: 3, color: AppColors.subtleText, fontSize: 9, fontWeight: '700' },
  chevron: { color: AppColors.primary, fontSize: 24 },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 10 },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { color: AppColors.textStrong, fontSize: 18, fontWeight: '900' },
  muted: { color: AppColors.mutedText, fontSize: 11 },
  pressed: { opacity: 0.72 },
});
