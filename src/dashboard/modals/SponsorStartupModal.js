import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '../../theme/colors';
import SponsorBanner from '../components/SponsorBanner';

export default function SponsorStartupModal({ visible, sponsor, onClose }) {
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

          <SponsorBanner
            sponsor={sponsor}
            style={styles.banner}
            imageStyle={styles.bannerImage}
            placeholderStyle={styles.bannerImage}
            nameStyle={styles.bannerName}
          />

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
  banner: {
    marginBottom: 16,
    borderRadius: 5,
  },
  bannerImage: {
    height: 168,
    maxHeight: 168,
  },
  bannerName: {
    fontSize: 14,
    marginTop: 6,
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
