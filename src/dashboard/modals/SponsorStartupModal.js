import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { AppColors } from '../../theme/colors';

export default function SponsorStartupModal({ visible, sponsor, onClose }) {
  const sponsorImage = sponsor?.logo || sponsor?.image || '';
  const openSponsor = () => {
    if (!sponsor?.url) return;
    Linking.openURL(sponsor.url).catch(() => {});
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={!!visible}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.kicker}>IMRC RACEDAY PARTNER</Text>
          <Text style={styles.title}>Today’s sponsor</Text>
          <Text style={styles.intro}>Our sponsors help keep IMRC Setup Manager available to racers.</Text>

          <Pressable style={({ pressed }) => [styles.sponsorArtwork, pressed && styles.pressed]} onPress={openSponsor}>
            {sponsorImage ? (
              <Image
                source={{ uri: sponsorImage }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={120}
                style={styles.sponsorImage}
              />
            ) : (
              <View style={styles.sponsorPlaceholder}>
                <Text style={styles.sponsorPlaceholderText}>YOUR BUSINESS HERE</Text>
              </View>
            )}
            <View style={styles.sponsorCaption}>
              <Text style={styles.sponsorCaptionLabel}>PRESENTED BY</Text>
              <Text style={styles.sponsorCaptionName} numberOfLines={2}>
                {sponsor?.name || 'Available Banner'}
              </Text>
            </View>
          </Pressable>

          <View style={styles.actions}>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={onClose}>
              <Text style={styles.secondaryText}>CONTINUE</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={openSponsor}>
              <Text style={styles.primaryText}>VISIT SPONSOR</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: AppColors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppColors.borderStrong,
    backgroundColor: AppColors.elevated,
  },
  kicker: {
    color: AppColors.success,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 3,
    color: AppColors.textStrong,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '900',
  },
  intro: {
    marginTop: 7,
    marginBottom: 14,
    color: AppColors.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
  sponsorArtwork: {
    position: 'relative',
    width: '100%',
    height: 232,
    marginBottom: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: AppColors.borderStrong,
    backgroundColor: '#F4F4F0',
    overflow: 'hidden',
  },
  sponsorImage: {
    width: '100%',
    height: '100%',
  },
  sponsorPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 58,
  },
  sponsorPlaceholderText: {
    color: '#18201B',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  sponsorCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(5, 10, 8, 0.90)',
  },
  sponsorCaptionLabel: {
    color: AppColors.success,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  sponsorCaptionName: {
    marginTop: 2,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: AppColors.borderStrong,
    backgroundColor: AppColors.surface,
  },
  primaryButton: {
    flex: 1.2,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: AppColors.success,
  },
  secondaryText: {
    color: AppColors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  primaryText: {
    color: '#06140B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.86,
  },
});
