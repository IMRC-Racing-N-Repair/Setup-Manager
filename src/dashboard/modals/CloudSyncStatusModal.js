import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaLayout } from '../../layout/safeAreaLayout';
import { dashboardStyles as styles } from '../dashboard.styles';

export default function CloudSyncStatusModal({ visible, status, busy, onClose, onRetry }) {
  const { modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({ modalSize: 'small' });
  const label = busy ? 'Syncing' : status?.label || 'Sync status unavailable';
  const message = busy
    ? 'Cloud Sync is running.'
    : status?.message || 'No additional details are available.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={[styles.modalWrap, modalBackdropStyle]} pointerEvents="box-none">
        <View style={[styles.modalCard, modalCardStyle]}>
          <View style={styles.modalHeaderRow}>
            <Text accessibilityRole="header" style={styles.modalTitle}>Cloud Sync</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close Cloud Sync details" onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.modalSub}>{label}</Text>
          <ScrollView style={styles.modalScroll}>
            <Text selectable accessibilityLiveRegion="polite" style={styles.sessionTitle}>{message}</Text>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onRetry}
            style={[styles.modalButton, styles.modalButtonBlue, busy && { opacity: 0.55 }]}
          >
            <Text style={styles.modalButtonText}>{busy ? 'Syncing…' : 'Retry sync'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
