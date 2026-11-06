import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import StableSafeAreaView from '../../src/layout/StableSafeAreaView';
import AppScreenHeader from '../../src/layout/AppScreenHeader';
import HowToUseAppModal from './components/HowToUseAppModal';
import {
  getLatestCrashReport,
  makeDiagnosticReport,
  openCrashReportEmail,
} from './crashReporting';

const FACEBOOK_URL = 'https://www.facebook.com/IMRCracingNrepair';
const DISCORD_URL = 'https://discord.gg/rTSYeh5cGZ';
const SUPPORT_EMAIL = 'shopimrc@gmail.com';

const SUPPORT_ACCENT = '#2F8CFF';
const BG = '#070B13';
const PANEL = '#0E1622';
const CARD = '#111B29';
const BORDER = '#26364C';
const TEXT = '#EEF5FF';
const MUTED = '#9AA9BC';

export default function SupportScreen({ navigation }) {
  const [guideVisible, setGuideVisible] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  const canGoBack = true;

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    try {
      if (typeof router.canGoBack === 'function' && router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (error) {
      router.replace('/');
    }
  };

  const openUrl = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Unable to open link', url);
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Unable to open link', 'Please try again from your device.');
    }
  };

  const openEmail = () => {
    const subject = encodeURIComponent('IMRC Setup Manager Support');
    openUrl(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
  };

  const sendCrashReport = async () => {
    if (sendingReport) return;
    setSendingReport(true);
    try {
      const report = (await getLatestCrashReport()) || makeDiagnosticReport({ requestedFrom: 'support-screen' });
      await openCrashReportEmail(report);
    } catch (error) {
      Alert.alert(
        'Unable to open email',
        `${error?.message || 'No email app is available.'}\n\nPlease email ${SUPPORT_EMAIL}.`
      );
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <StableSafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.sharedHeaderInset}>
          <AppScreenHeader title="Support" kicker="IMRC SUPPORT" onBack={canGoBack ? handleBack : undefined} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Need help?</Text>
            <Text style={styles.heroBody}>
              Contact IMRC Racing N Repair, join the community, or reopen the app guide anytime.
            </Text>
          </View>

          <SupportCard
            title="Facebook Page"
            body="Message us, follow updates, and see IMRC announcements."
            actionLabel="Open Facebook"
            onPress={() => openUrl(FACEBOOK_URL)}
          />

          <SupportCard
            title="Discord"
            body="Join the IMRC community for setup help, race talk, and app support."
            actionLabel="Join Discord"
            onPress={() => openUrl(DISCORD_URL)}
          />

          <SupportCard
            title="Email Support"
            body={SUPPORT_EMAIL}
            actionLabel="Email Us"
            onPress={openEmail}
          />

          <SupportCard
            title="Send Crash Report"
            body="Email the latest captured startup error and app/build details to IMRC."
            actionLabel={sendingReport ? 'Opening Email...' : 'Send Report'}
            onPress={sendCrashReport}
            accent
          />

          <SupportCard
            title="How to Use This App"
            body="Open the walkthrough again for Vehicles, Tracks, Setups, RaceDay, Cloud Sync, and Support."
            actionLabel="Open Guide"
            onPress={() => setGuideVisible(true)}
            accent
          />
        </ScrollView>

        <HowToUseAppModal
          visible={guideVisible}
          onClose={() => setGuideVisible(false)}
          title="How to Use IMRC Setup Manager 2.0"
        />
      </View>
    </StableSafeAreaView>
  );
}

function SupportCard({ title, body, actionLabel, onPress, accent = false }) {
  return (
    <View style={[styles.card, accent && styles.accentCard]}>
      <View style={styles.cardTextWrap}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{body}</Text>
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardButton, pressed && styles.pressed]}
      >
        <Text style={styles.cardButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  sharedHeaderInset: { paddingHorizontal: 15 },
  header: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  headerButton: {
    minWidth: 72,
    height: 38,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerButtonHidden: {
    opacity: 0,
  },
  headerButtonText: {
    color: SUPPORT_ACCENT,
    fontSize: 13,
    fontWeight: '900',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerKicker: {
    color: SUPPORT_ACCENT,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  headerButtonSpacer: {
    width: 72,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 7,
  },
  heroCard: {
    borderRadius: 3,
    padding: 12,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 5,
  },
  heroBody: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  card: {
    borderRadius: 3,
    padding: 11,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accentCard: {
    borderColor: 'rgba(47,140,255,0.40)',
    backgroundColor: 'rgba(47,140,255,0.09)',
  },
  cardTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardBody: {
    color: MUTED,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '650',
  },
  cardButton: {
    minWidth: 112,
    height: 40,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SUPPORT_ACCENT,
    paddingHorizontal: 12,
  },
  cardButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
