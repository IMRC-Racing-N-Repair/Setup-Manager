import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildSetupExportBundle,
  importSetupExportBundle,
  saveSetupCopyToTarget,
} from './setupStorage';
import { buildSetupPdfHtml } from './setupPdfExport';

export const IMRC_SETUP_FILE_SCHEMA = 'imrc-setup-file-v1';
export const PENDING_IMRC_IMPORT_URI_KEY = '@pendingImrcImportUri_v1';
export const LAST_HANDLED_IMRC_IMPORT_URI_KEY = '@lastHandledImrcImportUri_v1';

function safeFileName(value, fallback = 'setup') {
  const clean = String(value || fallback)
    .trim()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return clean || fallback;
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstSetupFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload.data || payload;
  return data.setup || payload.setup || asArray(data.setups || payload.setups)[0] || null;
}

function countSetupsInPayload(payload) {
  if (!payload || typeof payload !== 'object') return 0;
  const data = payload.data || payload;
  const setups = asArray(data.setups || payload.setups);
  const histories = asArray(data.setupHistories || payload.setupHistories || data.histories || payload.histories);
  return (data.setup || payload.setup ? 1 : 0)
    + setups.length
    + histories.reduce((sum, group) => sum + asArray(group.history || group.versions || group.items).length, 0);
}

function buildImportReview({ payload, uri = '', fileName = 'setup-import.imrc' }) {
  const setup = firstSetupFromPayload(payload);
  const data = payload?.data || payload || {};
  return {
    uri,
    fileName,
    payload,
    setup,
    isSingleSetup: Boolean(setup),
    setupCount: countSetupsInPayload(payload) || (setup ? 1 : 0),
    suggestedVehicleId: String(setup?.vehicleId || data.vehicleId || ''),
    suggestedTrackId: String(setup?.trackId || data.trackId || ''),
    suggestedVehicleName: setup?.vehicleName || setup?.carName || setup?.vehicle || data.vehicleName || '',
    suggestedTrackName: setup?.trackName || setup?.track || data.trackName || '',
    sourceVehicleName: setup?.vehicleName || setup?.carName || setup?.vehicle || data.vehicleName || 'Imported Vehicle',
    sourceTrackName: setup?.trackName || setup?.track || data.trackName || 'Imported Track',
    sourceChassisStyle: setup?.vehicleChassisStyle || setup?.chassisStyle || setup?.chassisProfile?.label || '',
    sourceTrackType: setup?.trackType || setup?.trackStyle || setup?.trackCategory || setup?.surface || '',
    exportedAt: payload?.exportedAt || data.exportedAt || setup?.savedAt || setup?.updatedAt || '',
  };
}

function downloadFile(fileName, contents, mimeType = 'application/octet-stream') {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return url;
}

function pickTextFile(accept = '.imrc,.json,application/json,text/plain') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = false;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    }, { once: true });
    input.addEventListener('change', async () => {
      const file = input.files?.[0] || null;
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve({ file, text: await file.text() });
      } catch (error) {
        reject(error);
      }
    }, { once: true });
    input.click();
  });
}

function buildSetupFilePayload(setup) {
  return {
    schema: IMRC_SETUP_FILE_SCHEMA,
    app: 'IMRC Setup Manager 2.0',
    exportedAt: new Date().toISOString(),
    data: {
      setup,
      setups: setup ? [setup] : [],
      setupHistories: setup?.vehicleId && setup?.trackId
        ? [{ vehicleId: String(setup.vehicleId), trackId: String(setup.trackId), history: [setup] }]
        : [],
      lastViewedSetup: setup?.vehicleId && setup?.trackId
        ? {
            setupId: setup.id || setup.setupId,
            vehicleId: setup.vehicleId,
            trackId: setup.trackId,
            vehicleName: setup.vehicleName,
            trackName: setup.trackName,
            savedAt: setup.savedAt || setup.updatedAt,
          }
        : null,
    },
  };
}

export function getReadableImportUriFromUrl(value) {
  return String(value || '').trim();
}

export function isLikelyImrcUri(uri) {
  return String(uri || '').toLowerCase().includes('.imrc');
}

export function isIncomingFileOpenUri() {
  return false;
}

export function canQueueReadableImrcImport() {
  return false;
}

export async function clearPendingIncomingImrcImport() {
  await AsyncStorage.removeItem(PENDING_IMRC_IMPORT_URI_KEY);
}

export async function queueIncomingImrcImport() {
  return false;
}

export async function consumePendingIncomingImrcImport() {
  const raw = await AsyncStorage.getItem(PENDING_IMRC_IMPORT_URI_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(PENDING_IMRC_IMPORT_URI_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function prepareSetupImportFromUri(uri, fileName = 'setup-import.imrc') {
  const source = String(uri || '').trim();
  let text = source;
  if (!source.startsWith('{') && !source.startsWith('[')) {
    const response = await fetch(source);
    if (!response.ok) throw new Error('The setup file could not be read.');
    text = await response.text();
  }
  return buildImportReview({ payload: JSON.parse(text), uri: source, fileName });
}

export async function pickSetupImportForReview() {
  const picked = await pickTextFile();
  if (!picked) return { canceled: true };
  return {
    canceled: false,
    ...buildImportReview({
      payload: JSON.parse(picked.text),
      fileName: picked.file.name || 'setup-import.imrc',
    }),
  };
}

export async function importPreparedSetupToTarget(preparedImport, options = {}) {
  if (!preparedImport?.setup) throw new Error('This file does not contain a setup.');
  const savedSetup = await saveSetupCopyToTarget(preparedImport.setup, {
    ...options,
    source: 'imrc-import',
  });
  return { savedSetup, mergedSetupCount: 1, fileName: preparedImport.fileName || 'setup-import.imrc' };
}

export async function importPreparedSetupBundle(preparedImport) {
  if (!preparedImport?.payload) throw new Error('No setup data is ready to import.');
  return importSetupExportBundle(preparedImport.payload);
}

export async function shareSetupsExportJson() {
  const bundle = await buildSetupExportBundle();
  const fileName = `imrc-setups-export-${timestampForFile()}.imrc`;
  const uri = downloadFile(fileName, JSON.stringify(bundle, null, 2));
  return {
    uri,
    setupCount: bundle?.data?.setups?.length || 0,
    historyCount: bundle?.data?.setupHistories?.length || 0,
  };
}

export async function importSetupsExportJson() {
  const prepared = await pickSetupImportForReview();
  if (prepared?.canceled) return { canceled: true };
  return {
    ...(await importPreparedSetupBundle(prepared)),
    canceled: false,
    fileName: prepared.fileName,
  };
}

export async function shareSetupVersionImrc(setup) {
  if (!setup) throw new Error('No setup selected.');
  const fileName = `${safeFileName(setup.vehicleName)}-${safeFileName(setup.trackName)}-${timestampForFile()}.imrc`;
  const uri = downloadFile(fileName, JSON.stringify(buildSetupFilePayload(setup), null, 2));
  return { uri };
}

export async function shareSetupVersionJson(setup) {
  return shareSetupVersionImrc(setup);
}

export async function shareSetupPdf(setup) {
  if (!setup) throw new Error('No setup selected.');
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) throw new Error('Allow pop-ups to print this setup.');
  printWindow.document.open();
  printWindow.document.write(buildSetupPdfHtml(setup));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
  return { printed: true };
}
