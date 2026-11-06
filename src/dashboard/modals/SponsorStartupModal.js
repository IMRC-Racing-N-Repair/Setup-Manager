import { Linking, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import { AppColors } from '../../theme/colors';

export default function SponsorStartupModal({ visible, sponsor, onClose }) {
  const { height } = useWindowDimensions();
  const artworkHeight = Math.max(165, Math.min(285, Math.round(height * 0.35)));
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
                contentFit="cover"
                contentPosition="center"
                cachePolicy="memory-disk"
                transition={120}
                style={[styles.sponsorImage, { height: artworkHeight }]}
              />
            ) : (
              <View style={styles.sponsorPlaceholder}>
                <Text style={styles.sponsorPlaceholderText}>YOUR BUSINESS HERE</Text>
              </View>
            )}
            <View style={styles.sponsorCaption}>
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
    padding: 14,
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
    marginTop: 1,
    color: AppColors.textStrong,
    fontSize: 25,
    lineHeight: 27,
    fontWeight: '900',
  },
  intro: {
    marginTop: 2,
    marginBottom: 6,
    color: AppColors.mutedText,
    fontSize: 12,
    lineHeight: 14,
  },
  sponsorArtwork: {
    width: '100%',
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: AppColors.borderStrong,
    backgroundColor: '#F4F4F0',
    overflow: 'hidden',
  },
  sponsorImage: {
    width: '100%',
  },
  sponsorPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  sponsorPlaceholderText: {
    color: '#18201B',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  sponsorCaption: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#202522',
  },
  sponsorCaptionName: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: AppColors.borderStrong,
    backgroundColor: AppColors.surface,
  },
  primaryButton: {
    flex: 1.2,
    minHeight: 42,
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.86,
  },
});
