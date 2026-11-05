import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Linking, Platform } from 'react-native';

export const CRASH_REPORT_EMAIL = 'shopimrc@gmail.com';
export const CRASH_REPORT_STORAGE_KEY = '@imrc_latest_crash_report_v1';

const MAX_MESSAGE_LENGTH = 3000;
const MAX_STACK_LENGTH = 12000;
let globalHandlerInstalled = false;
let handlingFatalError = false;

function limited(value, maxLength) {
  const text = String(value ?? '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n[truncated]` : text;
}

function appDetails() {
  return {
    appVersion: Application.nativeApplicationVersion || 'unknown',
    buildVersion: Application.nativeBuildVersion || 'unknown',
    applicationId: Application.applicationId || 'unknown',
    platform: Platform.OS,
    platformVersion: String(Platform.Version ?? 'unknown'),
    architecture: global?.nativeFabricUIManager ? 'new-architecture' : 'legacy/unknown',
  };
}

export function makeCrashReport(error, options = {}) {
  const normalizedError = error instanceof Error ? error : new Error(String(error || 'Unknown error'));
  return {
    schemaVersion: 1,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    fatal: !!options.fatal,
    source: String(options.source || 'unknown'),
    context: options.context && typeof options.context === 'object' ? options.context : {},
    error: {
      name: limited(normalizedError.name || 'Error', 200),
      message: limited(normalizedError.message || normalizedError, MAX_MESSAGE_LENGTH),
      stack: limited(normalizedError.stack || '', MAX_STACK_LENGTH),
      componentStack: limited(options.componentStack || '', MAX_STACK_LENGTH),
    },
    device: appDetails(),
  };
}

export async function saveCrashReport(report) {
  try {
    await AsyncStorage.setItem(CRASH_REPORT_STORAGE_KEY, JSON.stringify(report));
    return true;
  } catch {
    return false;
  }
}

export async function recordCrash(error, options = {}) {
  const report = makeCrashReport(error, options);
  await saveCrashReport(report);
  return report;
}

export async function getLatestCrashReport() {
  try {
    const raw = await AsyncStorage.getItem(CRASH_REPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function makeDiagnosticReport(context = {}) {
  return {
    schemaVersion: 1,
    id: `diagnostic-${Date.now()}`,
    createdAt: new Date().toISOString(),
    fatal: false,
    source: 'manual-diagnostic',
    context,
    error: {
      name: 'Manual diagnostic report',
      message: 'No captured JavaScript crash was available. The user requested a diagnostic report.',
      stack: '',
      componentStack: '',
    },
    device: appDetails(),
  };
}

export function formatCrashReport(report) {
  const value = report || makeDiagnosticReport();
  const device = value.device || {};
  const error = value.error || {};
  const contextText = (() => {
    try {
      return JSON.stringify(value.context || {}, null, 2);
    } catch {
      return '{}';
    }
  })();

  return [
    'IMRC Setup Manager crash report',
    '',
    `Report ID: ${value.id || 'unknown'}`,
    `Time: ${value.createdAt || 'unknown'}`,
    `Source: ${value.source || 'unknown'}`,
    `Fatal: ${value.fatal ? 'yes' : 'no'}`,
    `App version: ${device.appVersion || 'unknown'}`,
    `Build: ${device.buildVersion || 'unknown'}`,
    `Application ID: ${device.applicationId || 'unknown'}`,
    `Platform: ${device.platform || 'unknown'} ${device.platformVersion || ''}`.trim(),
    `Architecture: ${device.architecture || 'unknown'}`,
    '',
    `Error: ${error.name || 'Error'}`,
    error.message || 'No message captured.',
    '',
    'Context:',
    contextText,
    '',
    'JavaScript stack:',
    error.stack || 'No JavaScript stack was captured.',
    '',
    'React component stack:',
    error.componentStack || 'No component stack was captured.',
  ].join('\n');
}

export async function openCrashReportEmail(report) {
  const value = report || makeDiagnosticReport();
  const version = value.device?.appVersion || 'unknown';
  const build = value.device?.buildVersion || 'unknown';
  const subject = `IMRC Crash Report v${version} (${build})`;
  const body = formatCrashReport(value);

  try {
    const MailComposer = await import('expo-mail-composer');
    const available = await MailComposer.isAvailableAsync();
    if (available) {
      return await MailComposer.composeAsync({
        recipients: [CRASH_REPORT_EMAIL],
        subject,
        body,
      });
    }
  } catch {
    // Fall through to the platform mailto handler.
  }

  const mailto = `mailto:${CRASH_REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const supported = await Linking.canOpenURL(mailto);
  if (!supported) throw new Error('No email app is available on this device.');
  await Linking.openURL(mailto);
  return { status: 'opened' };
}

export function installGlobalCrashHandler() {
  if (globalHandlerInstalled) return true;
  const errorUtils = global?.ErrorUtils;
  if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) return false;

  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (handlingFatalError) {
      previousHandler?.(error, isFatal);
      return;
    }

    handlingFatalError = true;
    const finish = () => {
      try {
        previousHandler?.(error, isFatal);
      } finally {
        handlingFatalError = false;
      }
    };

    // Give AsyncStorage a brief opportunity to persist the report before the
    // release handler terminates the process. The timeout prevents a storage
    // failure from leaving the app stuck.
    Promise.race([
      recordCrash(error, { fatal: !!isFatal, source: 'global-js-handler' }),
      new Promise((resolve) => setTimeout(resolve, 450)),
    ]).then(finish, finish);
  });

  globalHandlerInstalled = true;
  return true;
}

