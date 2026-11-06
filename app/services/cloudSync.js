// app/services/cloudSync.js
// ✅ Local-first Firestore sync for IMRC Setup Manager 2.0
//
// Rules enforced here:
// - Vehicle / Track / Setup screens save to AsyncStorage only.
// - Screens should call markCloudDirty() or markItemDeletedForCloud() only; they must not call Firestore.
// - Autosave setup drafts stay local only and are excluded from the cloud payload.
// - Firestore reads/writes only happen inside this service.
// - No collection reads. We read/write one backup document:
//     users/{uid}/imrc/backup_main
// - Pushes use a pre-write doc read when needed so another device's newer data is merged first.
// - Merges compare updatedAt-style timestamps and deletedAt tombstones.
// - Dynamic setup history/version keys are discovered and synced, while draft keys are excluded.
// - Saved setups/setup versions are capped at 10 per vehicleId + trackId combo.
// - V2 migration converts legacy local/cloud payloads, purges graveyard keys, and stamps schemaVersion.
// - Dashboard sync light can read local sync status without Firestore reads.
// - Cloud payload format is compression-ready, but still writes JSON by default.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { db } from "./firebaseClient";
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { normalizeLiveRcOrigin } from "../../src/utils/liveRcUrl";

// -----------------------------------------------------------------------------
// Static + dynamic sync model
// -----------------------------------------------------------------------------
const BASE_SYNC_KEYS = [
  "@vehicles",
  "@tracks",
  "@setups",
  "@recentChanges_v1",
  "@raceDayRuns_v1",
  "@raceDaySessions_v1",
  "@raceDayActive_v1",
  "@raceDayEnded_v1",
  "@activeRaceDay",
  "@raceDayStarted_v1",
  "@raceDayReady_v1",
  "@raceDay_trackId",
  "@raceDay_vehicleIds",
  "@raceDayHistory_v1",
  "@raceDayNotesIndex_v1",
  "@raceDayCompareFields",
  "@raceDayTop5Fields_v1",
  "@deleted_v1", // timestamp-aware tombstones
];

// Setup saved versions/history are now often stored per vehicleId + trackId.
// We sync these dynamic history/version keys, but never draft keys.
const DYNAMIC_SYNC_PREFIXES = [
  "@setupHistory_",
  "@setup_history_",
  "@setup_history_v1_",
  "@setupVersions_",
  "@setup_versions_",
  "@setup_versions_v1_",
  "@setupSavedVersions_",
  "@setup_saved_versions_",
  "@savedSetupVersions_",
  "@saved_setup_versions_",
  "@setupVersionHistory_",
  "@setup_version_history_",
];

const DYNAMIC_RACEDAY_PREFIXES = [
  "@raceDayRuns_",
  "@raceDayLineups_",
  "@raceDayNotes_",
  "@raceDaySetupChanges_",
  "@raceDayChanges_",
  "@raceDayArchive_",
  "@raceDayResults_",
];

const LOCAL_ONLY_PREFIXES = [
  "@draft_setup_",
  "@setupDraft_",
  "@setup_draft_",
  "@draftSetup_",
];

const META_LOCAL_KEY = "@cloudSync_meta_v5";
const DIRTY_LOCAL_KEY = "@cloudSync_dirty_v1";
const DEVICE_ID_KEY = "@cloudSync_deviceId_v1";

const AUTO_SYNC_DEBOUNCE_MS = 12 * 1000;
const AUTO_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;

// Emergency write guards. These protect Firebase from queued-write storms caused by
// repeated renders/effects, bad network retries, or multiple screens requesting sync.
// Manual/device sync still goes through this same gate because the goal is to keep
// exactly one cloud write active at a time.
const CLOUD_WRITE_MIN_SPACING_MS = 60 * 1000;
const CLOUD_WRITE_ERROR_BACKOFF_MS = 10 * 60 * 1000;

const TOMBSTONE_KEEP_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_SETUPS_PER_VEHICLE_TRACK = 10;

// -----------------------------------------------------------------------------
// Cloud payload format / future compression gate
// -----------------------------------------------------------------------------
// Keep this OFF for the 2.0 launch. The app will continue writing readable JSON
// in `payload`, while every cloud read/write goes through encode/decode helpers.
// Later, compression can be enabled by adding a codec inside encodePayloadForCloudDoc()
// and decodePayloadFromCloudDoc() without changing any screens.
const CLOUD_PAYLOAD_ENCODING_JSON = "json-v1";
const CLOUD_PAYLOAD_ENCODING_LZ_UTF16 = "lz-string-utf16-v1"; // reserved for future use
const CLOUD_PAYLOAD_COMPRESSED_ENABLED = false;

const CLOUD_SCHEMA_VERSION = "2.0.0";
const LOCAL_SCHEMA_KEY = "@imrc_schema_version_v1";
const LOCAL_MIGRATION_LOG_KEY = "@imrc_v2_migration_log_v1";

// Legacy/common old storage names that can be converted into the V2 sync model.
// Keeping this list broad lets older installs upgrade without requiring old screens to run.
const LEGACY_KEY_ALIASES = {
  "@vehicles": ["@vehicleList", "@savedVehicles", "@vehicles_v1", "vehicles", "vehicleData", "savedVehicles"],
  "@tracks": ["@trackList", "@savedTracks", "@tracks_v1", "tracks", "trackData", "savedTracks"],
  "@setups": ["@setupList", "@savedSetups", "@setups_v1", "setups", "setupData", "savedSetups"],
  "@recentChanges_v1": ["@recentChanges", "recentChanges"],
  "@raceDayRuns_v1": ["@raceDayRuns", "raceDayRuns"],
  "@raceDaySessions_v1": ["@raceDaySessions", "raceDaySessions"],
  "@deleted_v1": ["@deleted", "@deletedItems", "deletedItems", "@tombstones", "tombstones"],
};

const LEGACY_SETUP_VERSION_KEYS = [
  "@setupHistory",
  "@setupHistory_v1",
  "@setup_history",
  "@setupVersions",
  "@setupVersions_v1",
  "@setup_versions",
  "@setupSavedVersions",
  "@setup_saved_versions",
  "@savedSetupVersions",
  "@saved_setup_versions",
];

const GRAVEYARD_EXACT_KEYS = [
  "@cloudSync_meta_v1",
  "@cloudSync_meta_v2",
  "@cloudSync_meta_v3",
  "@cloudSync_meta_v4",
  "@cloudSync_lastHash",
  "@cloudSync_lastSync",
  "@cloudSync_pending",
  "@syncCache",
  "@syncQueue",
  "@oldSyncQueue",
  "@migrationBackup_v1",
  "@migrationBackup_v2",
  ...Object.values(LEGACY_KEY_ALIASES).flat(),
  ...LEGACY_SETUP_VERSION_KEYS,
];

const GRAVEYARD_PREFIXES = [
  "@old_",
  "@legacy_",
  "@graveyard_",
  "@tmp_",
  "@temp_",
  "@syncTemp_",
  "@cloudSync_tmp_",
  "@draft_setup_",
  "@setupDraft_",
  "@setup_draft_",
  "@draftSetup_",
];

let pendingTimer = null;
let pendingRequest = null;

// Whole-sync activity guard. This is separate from the cloud-write guard so
// Dashboard can show Syncing during reads/pulls too, and not turn green until
// the complete sync path finishes.
let syncInFlight = null;
let syncInFlightLabel = "";
let syncInFlightStartedAt = 0;
let cloudPushInFlight = null;
let cloudPushStartedAt = 0;

const statusListeners = new Set();

async function notifySyncStatusListeners() {
  const listeners = Array.from(statusListeners);
  for (const entry of listeners) {
    try {
      const status = await getCloudSyncStatus({ uid: entry.uid });
      entry.cb(status);
    } catch {}
  }
}

const syncCounters = {
  reads: 0,
  writes: 0,
  blockedAutoReads: 0,
};

function backupDocRef(uid) {
  return doc(db, `users/${uid}/imrc/backup_main`);
}

function hashString(str) {
  const s = String(str || "");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function safeJsonParse(raw, fallback) {
  try {
    if (raw === null || raw === undefined || raw === "") return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function stableStringify(obj) {
  if (obj === null) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  const seen = new WeakSet();
  const walk = (v) => {
    if (v === null) return "null";
    if (typeof v !== "object") return JSON.stringify(v);
    if (seen.has(v)) return '"[Circular]"';
    seen.add(v);
    if (Array.isArray(v)) return "[" + v.map(walk).join(",") + "]";
    const keys = Object.keys(v).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + walk(v[k])).join(",") + "}";
  };
  return walk(obj);
}

function getJsonByteLength(value) {
  try {
    return JSON.stringify(value || {}).length;
  } catch {
    return 0;
  }
}

function encodePayloadForCloudDoc(payload) {
  // JSON stays the default for now. This preserves inspectability in Firebase and
  // avoids adding a new dependency before we actually need compression.
  const rawBytes = getJsonByteLength(payload || {});

  if (!CLOUD_PAYLOAD_COMPRESSED_ENABLED) {
    return {
      payload: payload || {},
      payloadEncoding: CLOUD_PAYLOAD_ENCODING_JSON,
      payloadCompressed: null,
      payloadCodecVersion: 1,
      payloadBytesRaw: rawBytes,
      payloadBytesStored: rawBytes,
      compressionReady: true,
      compressionEnabled: false,
    };
  }

  // Future hook:
  // 1. Install: npm install lz-string
  // 2. Import at top: import LZString from "lz-string";
  // 3. Replace this block with:
  //    const json = JSON.stringify(payload || {});
  //    const packed = LZString.compressToUTF16(json);
  //    return {
  //      payload: null,
  //      payloadEncoding: CLOUD_PAYLOAD_ENCODING_LZ_UTF16,
  //      payloadCompressed: packed,
  //      payloadCodecVersion: 1,
  //      payloadBytesRaw: json.length,
  //      payloadBytesStored: String(packed || "").length,
  //      compressionReady: true,
  //      compressionEnabled: true,
  //    };
  throw new Error("[CloudSync] Compression is reserved but no compression codec is wired yet.");
}

function decodePayloadFromCloudDoc(data) {
  const docData = data && typeof data === "object" ? data : {};
  const encoding = String(docData.payloadEncoding || "").trim();

  // Existing / legacy cloud docs.
  if (docData.payload && typeof docData.payload === "object") {
    return {
      payload: docData.payload || {},
      encoding: encoding || CLOUD_PAYLOAD_ENCODING_JSON,
      compressed: false,
      needsRewrite: encoding !== CLOUD_PAYLOAD_ENCODING_JSON || !!docData.payloadCompressed,
    };
  }

  // Future compressed cloud docs. This branch is intentionally centralized so
  // compression can be added later without screen changes.
  if (docData.payloadCompressed) {
    if (encoding === CLOUD_PAYLOAD_ENCODING_LZ_UTF16) {
      // Future hook:
      // const raw = LZString.decompressFromUTF16(String(docData.payloadCompressed || ""));
      // return { payload: raw ? JSON.parse(raw) : {}, encoding, compressed: true, needsRewrite: false };
      throw new Error(
        "[CloudSync] This backup uses compressed payloads, but this build does not include the compression codec yet."
      );
    }

    throw new Error(`[CloudSync] Unsupported cloud payload encoding: ${encoding || "unknown"}`);
  }

  return {
    payload: {},
    encoding: encoding || CLOUD_PAYLOAD_ENCODING_JSON,
    compressed: false,
    needsRewrite: false,
  };
}

function lowerKey(key) {
  return String(key || "").toLowerCase();
}

function isLocalOnlyKey(key) {
  const k = String(key || "");
  const l = lowerKey(k);
  if (LOCAL_ONLY_PREFIXES.some((p) => k.startsWith(p))) return true;

  // Any setup draft/autosave key must stay local-only.
  if (l.includes("setup") && (l.includes("draft") || l.includes("autosave"))) return true;
  return false;
}

function isDynamicSetupHistoryKey(key) {
  const k = String(key || "");
  // Legacy non-parameterized history/version buckets are converted into
  // @setupHistory_{vehicleId}_{trackId} and then purged.
  if (LEGACY_SETUP_VERSION_KEYS.includes(k)) return false;
  if (DYNAMIC_SYNC_PREFIXES.some((p) => k.startsWith(p))) return true;

  // Fallback for future names, as long as it is clearly a setup saved-history/version key.
  const l = lowerKey(k);
  return (
    k.startsWith("@") &&
    l.includes("setup") &&
    (l.includes("history") || l.includes("version") || l.includes("saved")) &&
    !isLocalOnlyKey(k)
  );
}

function isSyncKey(key) {
  const k = String(key || "");
  if (!k || isLocalOnlyKey(k)) return false;
  if (BASE_SYNC_KEYS.includes(k)) return true;
  if (isDynamicSetupHistoryKey(k)) return true;
  if (DYNAMIC_RACEDAY_PREFIXES.some((prefix) => k.startsWith(prefix))) return true;
  return false;
}

async function discoverLocalSyncKeys(extraPayload = null) {
  const set = new Set(BASE_SYNC_KEYS);

  try {
    const keys = await AsyncStorage.getAllKeys();
    for (const key of Array.isArray(keys) ? keys : []) {
      if (isSyncKey(key)) set.add(key);
    }
  } catch {}

  if (extraPayload && typeof extraPayload === "object") {
    for (const key of Object.keys(extraPayload)) {
      if (isSyncKey(key)) set.add(key);
    }
  }

  return Array.from(set).sort();
}

function logRead(label, count = 1) {
  syncCounters.reads += count;
  console.log(`[CloudSync READ] ${label}`, { count, totalReads: syncCounters.reads });
}

function logWrite(label, count = 1) {
  syncCounters.writes += count;
  console.log(`[CloudSync WRITE] ${label}`, { count, totalWrites: syncCounters.writes });
}

export function getCloudSyncDebugStats() {
  return { ...syncCounters };
}

export function resetCloudSyncDebugStats() {
  syncCounters.reads = 0;
  syncCounters.writes = 0;
  syncCounters.blockedAutoReads = 0;
}

async function getMeta() {
  try {
    const raw = await AsyncStorage.getItem(META_LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setMeta(next) {
  try {
    await AsyncStorage.setItem(META_LOCAL_KEY, JSON.stringify(next || {}));
  } catch {}
  notifySyncStatusListeners();
}

async function getDirtyState() {
  try {
    const raw = await AsyncStorage.getItem(DIRTY_LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setDirtyState(next) {
  try {
    await AsyncStorage.setItem(DIRTY_LOCAL_KEY, JSON.stringify(next || {}));
  } catch {}
  notifySyncStatusListeners();
}

async function clearDirtyState(extra = {}) {
  const prev = await getDirtyState();
  await setDirtyState({
    ...prev,
    dirty: false,
    reasons: [],
    keys: [],
    entities: [],
    clearedAtMs: Date.now(),
    ...extra,
  });
}

async function getDeviceId() {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (id) return id;
    id = `dev_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return `dev_unknown_${Date.now().toString(16)}`;
  }
}

function getAnyId(item) {
  if (!item || typeof item !== "object") return null;
  const candidates = [item.id, item.setupId, item.versionId, item.runId, item.sessionId, item._id, item.uuid];
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return null;
}

const SYNC_META_FIELDS = new Set([
  "syncUpdatedAt",
  "syncDeviceId",
  "syncDeletedAt",
  "cloudUpdatedAt",
  "cloudSyncedAt",
]);

function stripSyncFieldsForFingerprint(value) {
  if (Array.isArray(value)) return value.map(stripSyncFieldsForFingerprint);
  if (!value || typeof value !== "object") return value;

  const out = {};
  for (const k of Object.keys(value)) {
    if (SYNC_META_FIELDS.has(k)) continue;
    out[k] = stripSyncFieldsForFingerprint(value[k]);
  }
  return out;
}

function fingerprint(item) {
  return hashString(stableStringify(stripSyncFieldsForFingerprint(item)));
}

function getTimestampMs(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof value === "object") {
    if (typeof value.toMillis === "function") {
      try {
        const n = value.toMillis();
        if (Number.isFinite(n)) return n;
      } catch {}
    }
    if (typeof value.seconds === "number") return value.seconds * 1000;
  }
  return 0;
}

function getItemUpdatedAt(item) {
  if (!item || typeof item !== "object") return 0;
  const candidates = [
    item.syncUpdatedAt,
    item.updatedAtMs,
    item.updatedAt,
    item.modifiedAtMs,
    item.modifiedAt,
    item.savedAtMs,
    item.savedAt,
    item.createdAtMs,
    item.createdAt,
    item.ts,
  ];
  for (const c of candidates) {
    const n = getTimestampMs(c);
    if (n) return n;
  }
  return 0;
}

function inferArrayTypeForKey(key) {
  if (key === "@vehicles") return "vehicle";
  if (key === "@tracks") return "track";
  if (key === "@setups") return "setup";
  if (key === "@raceDayRuns_v1") return "run";
  if (key === "@raceDaySessions_v1") return "raceDaySession";
  if (isDynamicSetupHistoryKey(key)) return "setupVersion";
  return "item";
}

function tombstoneMapKey(t) {
  const type = String(t?.type || "").trim();
  const id = String(t?.id || "").trim();
  const key = String(t?.key || "").trim();
  if (!type || !id) return "";
  return `${type}:${key}:${id}`;
}

function normalizeTombstones(arr) {
  const list = Array.isArray(arr) ? arr : [];
  const map = new Map();
  for (const t of list) {
    const type = String(t?.type || "").trim();
    const id = String(t?.id || "").trim();
    if (!type || !id) continue;
    const key = String(t?.key || "").trim();
    const deletedAt = getTimestampMs(t?.deletedAt) || 0;
    const deviceId = String(t?.deviceId || "").trim();
    const mapKey = `${type}:${key}:${id}`;
    const prev = map.get(mapKey);
    if (!prev || deletedAt > Number(prev.deletedAt || 0)) {
      map.set(mapKey, { type, id, key, deletedAt, deviceId });
    }
  }
  return Array.from(map.values());
}

function mergeTombstones(localArr, cloudArr) {
  return normalizeTombstones([
    ...(Array.isArray(cloudArr) ? cloudArr : []),
    ...(Array.isArray(localArr) ? localArr : []),
  ]);
}

function buildTombstoneLookup(tombs) {
  const byExact = new Map();
  const byLoose = new Map();

  for (const t of normalizeTombstones(tombs)) {
    const exact = tombstoneMapKey(t);
    if (exact) byExact.set(exact, t);

    const loose = `${String(t.type || "")}:${String(t.id || "")}`;
    const prev = byLoose.get(loose);
    if (!prev || Number(t.deletedAt || 0) > Number(prev.deletedAt || 0)) byLoose.set(loose, t);
  }

  return { byExact, byLoose };
}

function getTombstoneForItem({ lookup, type, key, id }) {
  if (!lookup || !type || !id) return null;

  const exact = lookup.byExact.get(`${type}:${String(key || "")}:${String(id)}`);
  if (exact) return exact;

  // Global tombstones without a key can apply to normal app arrays.
  const globalExact = lookup.byExact.get(`${type}::${String(id)}`);
  if (globalExact) return globalExact;

  return null;
}

function mergeArrayById(localArr, cloudArr) {
  const local = Array.isArray(localArr) ? localArr : [];
  const cloud = Array.isArray(cloudArr) ? cloudArr : [];
  const byKey = new Map();

  for (const item of cloud) {
    const id = getAnyId(item);
    const key = id ? `id:${id}` : `fp:${fingerprint(item)}`;
    byKey.set(key, item);
  }

  for (const item of local) {
    const id = getAnyId(item);
    const key = id ? `id:${id}` : `fp:${fingerprint(item)}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, item);
      continue;
    }

    const cloudUpdated = getItemUpdatedAt(existing);
    const localUpdated = getItemUpdatedAt(item);

    if (cloudUpdated || localUpdated) byKey.set(key, localUpdated >= cloudUpdated ? item : existing);
    else byKey.set(key, { ...existing, ...item });
  }

  return Array.from(byKey.values());
}

function mergeJsonObjectsByUpdatedAt(localObj, cloudObj) {
  const localUpdated = getItemUpdatedAt(localObj);
  const cloudUpdated = getItemUpdatedAt(cloudObj);

  if (localUpdated || cloudUpdated) return localUpdated >= cloudUpdated ? localObj : cloudObj;
  return { ...(cloudObj || {}), ...(localObj || {}) };
}

function mergePayloadValue(localStr, cloudStr, key) {
  const CLEARABLE_KEYS = new Set([
    "@activeRaceDay",
    "@raceDayActive_v1",
    "@raceDayEnded_v1",
    "@recentChanges_v1",
  ]);

  if (key === "@deleted_v1") {
    return JSON.stringify(
      mergeTombstones(
        safeJsonParse(localStr || "[]", []),
        safeJsonParse(cloudStr || "[]", [])
      )
    );
  }

  const localParsed = safeJsonParse(localStr, undefined);
  const cloudParsed = safeJsonParse(cloudStr, undefined);

  if (Array.isArray(localParsed) || Array.isArray(cloudParsed)) {
    return JSON.stringify(
      mergeArrayById(
        Array.isArray(localParsed) ? localParsed : [],
        Array.isArray(cloudParsed) ? cloudParsed : []
      )
    );
  }

  if (
    localParsed &&
    typeof localParsed === "object" &&
    cloudParsed &&
    typeof cloudParsed === "object"
  ) {
    return JSON.stringify(mergeJsonObjectsByUpdatedAt(localParsed, cloudParsed));
  }

  if (CLEARABLE_KEYS.has(key)) {
    return localStr === null || localStr === undefined
      ? String(cloudStr ?? "")
      : String(localStr ?? "");
  }

  const localText = String(localStr ?? "").trim();
  return localText ? String(localStr) : String(cloudStr ?? "");
}

function applyTombstonesToPayload(payload) {
  const next = { ...(payload || {}) };
  const tombs = normalizeTombstones(safeJsonParse(next["@deleted_v1"] || "[]", []));
  const lookup = buildTombstoneLookup(tombs);

  for (const key of Object.keys(next)) {
    if (!isSyncKey(key) || key === "@deleted_v1") continue;

    const arr = safeJsonParse(next[key], null);
    if (!Array.isArray(arr)) continue;

    const type = inferArrayTypeForKey(key);
    const filtered = arr.filter((item) => {
      const id = getAnyId(item);
      if (!id) return true;

      const tomb = getTombstoneForItem({ lookup, type, key, id });
      if (!tomb) return true;

      const itemUpdated = getItemUpdatedAt(item);
      const deletedAt = Number(tomb.deletedAt || 0) || 0;

      // Delete wins if it is newer than the item. If the item has no timestamp,
      // delete wins so an old device cannot resurrect it.
      return itemUpdated > deletedAt;
    });

    next[key] = JSON.stringify(filtered);
  }

  next["@deleted_v1"] = JSON.stringify(tombs);
  return next;
}

function pruneExpiredTombstones(payload) {
  const next = { ...(payload || {}) };
  const cutoff = Date.now() - TOMBSTONE_KEEP_MS;
  const tombs = normalizeTombstones(safeJsonParse(next["@deleted_v1"] || "[]", []));
  next["@deleted_v1"] = JSON.stringify(
    tombs.filter((t) => (Number(t.deletedAt || 0) || 0) >= cutoff)
  );
  return next;
}

function sanitizeRecentChangesArray(input) {
  const arr = Array.isArray(input) ? input : [];
  const cleaned = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const text = String(x.text ?? x.title ?? x.label ?? "").trim();
    const type = String(x.type ?? "").trim();
    const ts = Number(x.ts ?? x.atMs ?? x.timeMs ?? x.createdAtMs ?? 0) || 0;
    const raceDayId = String(x.raceDayId ?? x.sessionId ?? x.id ?? "").trim();
    if (!text && !type && !ts && !raceDayId) continue;
    cleaned.push({ ...x, text, type, ts, raceDayId });
  }
  cleaned.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
  return cleaned;
}

function isTruthyStoredFlag(value) {
  const t = String(value ?? "").trim().toLowerCase();
  return !!t && t !== "0" && t !== "false" && t !== "null" && t !== "undefined" && t !== "[]" && t !== "{}";
}

function parseActiveRaceDayPointer(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  // Some builds stored the complete pointer in @raceDayActive_v1; others stored
  // only the flag "1". Prefer @activeRaceDay and accept either object format.
  for (const raw of [source["@activeRaceDay"], source["@raceDayActive_v1"]]) {
    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
    const id = String(parsed.id || parsed.sessionId || parsed.raceDayId || "").trim();
    const trackId = String(parsed.trackId || parsed.track?.id || parsed.track?.trackId || "").trim();
    if (!id || !trackId) continue;
    return {
      ...parsed,
      id,
      raceDayId: id,
      sessionId: id,
      trackId,
      vehicleIds: Array.isArray(parsed.vehicleIds) ? parsed.vehicleIds.map(String).filter(Boolean) : [],
      status: "active",
    };
  }
  return null;
}

function raceDayPointerTime(pointer) {
  if (!pointer || typeof pointer !== "object") return 0;
  return Number(
    pointer.updatedAtMs ||
    pointer.syncUpdatedAt ||
    pointer.startedAtMs ||
    Date.parse(pointer.updatedAt || pointer.startedAt || "") ||
    0
  ) || 0;
}

function pickActiveRaceDayPointer(localPayload, cloudPayload) {
  const local = parseActiveRaceDayPointer(localPayload);
  const cloud = parseActiveRaceDayPointer(cloudPayload);
  if (!local) return cloud;
  if (!cloud) return local;

  const localTime = raceDayPointerTime(local);
  const cloudTime = raceDayPointerTime(cloud);
  if (cloudTime > localTime) return cloud;
  if (localTime > cloudTime) return local;
  if (local.id === cloud.id) return { ...cloud, ...local };
  return local;
}

function applyMergedActiveRaceDayState(payload, localPayload, cloudPayload) {
  const next = { ...(payload || {}) };
  const active = pickActiveRaceDayPointer(localPayload, cloudPayload);
  if (!active) return next;

  const sessions = safeJsonParse(next["@raceDaySessions_v1"] || "[]", []);
  const explicitlyEnded = (Array.isArray(sessions) ? sessions : []).some((session) => {
    const id = String(session?.id || session?.sessionId || session?.raceDayId || "").trim();
    return id === active.id && String(session?.status || "").toLowerCase() === "ended";
  });

  if (explicitlyEnded) {
    next["@activeRaceDay"] = "";
    next["@raceDayActive_v1"] = "";
    next["@raceDayStarted_v1"] = "";
    next["@raceDayReady_v1"] = "";
    next["@raceDay_trackId"] = "";
    next["@raceDay_vehicleIds"] = "";
    next["@raceDayEnded_v1"] = "1";
    return next;
  }

  const canon = JSON.stringify(active);
  next["@activeRaceDay"] = canon;
  next["@raceDayActive_v1"] = canon;
  next["@raceDayStarted_v1"] = "1";
  next["@raceDayEnded_v1"] = "";
  next["@raceDay_trackId"] = active.trackId;
  next["@raceDay_vehicleIds"] = JSON.stringify(active.vehicleIds || []);
  next["@raceDayReady_v1"] = active.trackId && active.vehicleIds?.length ? "1" : "";
  return next;
}

function normalizeRaceDayPayload(payload) {
  const next = { ...(payload || {}) };

  try {
    const changes = safeJsonParse(next["@recentChanges_v1"] || "[]", []);
    next["@recentChanges_v1"] = JSON.stringify(sanitizeRecentChangesArray(changes));
  } catch {
    next["@recentChanges_v1"] = "[]";
  }

  try {
    const sessions = safeJsonParse(next["@raceDaySessions_v1"] || "[]", []);
    const list = Array.isArray(sessions) ? sessions : [];
    const getSessionId = (s) => String(s?.id || s?.sessionId || s?.raceDayId || "").trim();
    const getTrackKey = (s) => String(s?.trackId || s?.track?.id || "__unknown__").trim() || "__unknown__";
    const getSortMs = (s) =>
      Number(s?.createdAtMs || s?.startedAtMs || s?.updatedAtMs || s?.syncUpdatedAt || s?.endedAtMs || 0);

    const activeObj = parseActiveRaceDayPointer(next);
    const activeId = String(activeObj?.id || activeObj?.sessionId || activeObj?.raceDayId || "").trim();

    // Important for multi-device sync:
    // If a device has already stored the ended flag, active pointers must never be
    // resurrected by an older cloud payload. Starting a new RaceDay must clear this
    // flag locally before writing a new active pointer.
    const endedFlagSet = isTruthyStoredFlag(next["@raceDayEnded_v1"]);

    const buckets = new Map();
    for (const s of list) {
      const trackKey = getTrackKey(s);
      if (!buckets.has(trackKey)) buckets.set(trackKey, []);
      buckets.get(trackKey).push(s);
    }

    const kept = [];
    for (const [, bucket] of buckets.entries()) {
      bucket.sort((a, b) => getSortMs(b) - getSortMs(a));
      kept.push(...bucket.slice(0, 3));
    }

    const byId = {};
    for (const s of kept) {
      const id = getSessionId(s);
      if (!id) continue;
      const status = String(s?.status || "").toLowerCase() || "active";
      if (!byId[id]) byId[id] = { ...s, id, status };
      else if (String(byId[id]?.status || "").toLowerCase() !== "ended" && status === "ended") {
        byId[id] = { ...byId[id], ...s, id, status: "ended" };
      } else {
        byId[id] = { ...byId[id], ...s, id, status: byId[id]?.status || status };
      }
    }

    let normalizedSessions = Object.values(byId).sort((a, b) => getSortMs(b) - getSortMs(a));

    if (activeId && endedFlagSet) {
      const endedAtMs = Date.now();
      let found = false;
      normalizedSessions = normalizedSessions.map((s) => {
        const sid = String(s?.id || s?.sessionId || s?.raceDayId || "").trim();
        if (sid !== activeId) return s;
        found = true;
        return {
          ...s,
          id: activeId,
          status: "ended",
          endedAtMs: Number(s?.endedAtMs || 0) || endedAtMs,
          updatedAtMs: Math.max(Number(s?.updatedAtMs || 0) || 0, endedAtMs),
          syncUpdatedAt: Math.max(Number(s?.syncUpdatedAt || 0) || 0, endedAtMs),
        };
      });

      if (!found) {
        normalizedSessions.unshift({
          ...(activeObj || {}),
          id: activeId,
          status: "ended",
          endedAtMs,
          updatedAtMs: endedAtMs,
          syncUpdatedAt: endedAtMs,
        });
      }

      next["@raceDayActive_v1"] = "";
      next["@activeRaceDay"] = "";
      next["@raceDayEnded_v1"] = "1";
    } else if (activeId) {
      const ended = normalizedSessions.some(
        (s) => String(s?.id || s?.sessionId || s?.raceDayId || "").trim() === activeId && String(s?.status).toLowerCase() === "ended"
      );

      if (ended) {
        next["@raceDayActive_v1"] = "";
        next["@activeRaceDay"] = "";
        next["@raceDayEnded_v1"] = "1";
      } else {
        next["@raceDayEnded_v1"] = "";
        const canon = JSON.stringify({ ...activeObj, id: activeId, raceDayId: activeId, sessionId: activeId });
        next["@raceDayActive_v1"] = canon;
        next["@activeRaceDay"] = canon;
        next["@raceDayStarted_v1"] = "1";
        next["@raceDay_trackId"] = String(activeObj?.trackId || "");
        next["@raceDay_vehicleIds"] = JSON.stringify(Array.isArray(activeObj?.vehicleIds) ? activeObj.vehicleIds : []);
        next["@raceDayReady_v1"] = activeObj?.trackId && activeObj?.vehicleIds?.length ? "1" : "";
      }
    }

    normalizedSessions.sort((a, b) => getSortMs(b) - getSortMs(a));
    const keepIds = new Set(normalizedSessions.map((s) => String(s?.id || "")).filter(Boolean));
    next["@raceDaySessions_v1"] = JSON.stringify(normalizedSessions);

    const runs = safeJsonParse(next["@raceDayRuns_v1"] || "[]", []);
    if (Array.isArray(runs)) {
      next["@raceDayRuns_v1"] = JSON.stringify(
        runs.filter((r) => {
          const sid = String(r?.raceDayId || r?.sessionId || "").trim();
          return !sid || keepIds.has(sid);
        })
      );
    }

    const changes = sanitizeRecentChangesArray(safeJsonParse(next["@recentChanges_v1"] || "[]", []));
    next["@recentChanges_v1"] = JSON.stringify(
      changes.filter((c) => {
        const sid = String(c?.raceDayId || c?.sessionId || "").trim();
        return !sid || keepIds.has(sid);
      })
    );
  } catch {
    next["@raceDaySessions_v1"] = next["@raceDaySessions_v1"] || "[]";
  }

  return next;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function firstNonEmpty(...values) {
  for (const v of values) {
    const t = cleanText(v);
    if (t) return t;
  }
  return "";
}

function makeStableId(prefix, item) {
  return `${prefix}_${fingerprint(item).slice(0, 12)}`;
}

function normalizeUrl(value) {
  return normalizeLiveRcOrigin(value);
}

function normalizeItemForV2(item, type, fallbackKey = "") {
  if (!item || typeof item !== "object") return item;
  const now = Date.now();
  const originalId = getAnyId(item);
  const id = originalId || makeStableId(type || "item", { ...item, fallbackKey });
  const updatedAtMs = getItemUpdatedAt(item) || now;
  const base = {
    ...item,
    id: String(id),
    updatedAtMs,
    syncUpdatedAt: getTimestampMs(item.syncUpdatedAt) || updatedAtMs,
  };

  if (type === "vehicle") {
    base.vehicleName = firstNonEmpty(base.vehicleName, base.name, base.title, base.label, "Vehicle");
    base.chassisStyle = firstNonEmpty(base.chassisStyle, base.chassis, base.style, base.className, base.class, base.type);
    base.manufacturer = firstNonEmpty(base.manufacturer, base.make, base.brand);
    base.model = firstNonEmpty(base.model, base.vehicleModel, base.modelName);
    base.transponder = firstNonEmpty(base.transponder, base.tx, base.txNumber, base.transponderNumber);
  }

  if (type === "track") {
    base.trackName = firstNonEmpty(base.trackName, base.name, base.title, base.label, "Track");
    base.trackType = firstNonEmpty(base.trackType, base.type, base.layoutType);
    base.surface = firstNonEmpty(base.surface, base.trackSurface);
    const liveRcUrl = normalizeUrl(firstNonEmpty(base.liveRcUrl, base.livercUrl, base.liveRCUrl, base.liverc, base.url));
    base.liveRcUrl = liveRcUrl;
    base.livercUrl = liveRcUrl;
  }

  if (type === "setup" || type === "setupVersion") {
    base.setupName = firstNonEmpty(base.setupName, base.name, base.title, base.label, type === "setupVersion" ? "Saved Setup" : "Setup");
    base.vehicleId = firstNonEmpty(base.vehicleId, base.carId, base.vehicleID, base.vehicle?.id);
    base.trackId = firstNonEmpty(base.trackId, base.trackID, base.track?.id);
    if (type === "setupVersion") {
      base.versionId = firstNonEmpty(base.versionId, base.id, base.setupVersionId, base.snapshotId, base.runId, base.uuid, String(id));
      base.id = String(base.versionId);
    }
  }

  return base;
}

function normalizeArrayForKey(arr, key) {
  const type = inferArrayTypeForKey(key);
  const list = Array.isArray(arr) ? arr : [];
  const byId = new Map();

  for (const raw of list) {
    const item = normalizeItemForV2(raw, type, key);
    if (!item || typeof item !== "object") continue;
    const id = getAnyId(item) || makeStableId(type, item);
    const mapKey = String(id);
    const existing = byId.get(mapKey);
    if (!existing) {
      byId.set(mapKey, item);
      continue;
    }
    byId.set(mapKey, getItemUpdatedAt(item) >= getItemUpdatedAt(existing) ? item : existing);
  }

  return Array.from(byId.values());
}

function getSetupComboKey(item) {
  const vehicleId = firstNonEmpty(
    item?.vehicleId,
    item?.vehicleID,
    item?.carId,
    item?.vehicle?.id,
    "unknownVehicle"
  );
  const trackId = firstNonEmpty(
    item?.trackId,
    item?.trackID,
    item?.track?.id,
    "unknownTrack"
  );
  return `${vehicleId}::${trackId}`;
}

function setupSortMs(item) {
  return (
    getItemUpdatedAt(item) ||
    getTimestampMs(item?.savedAtMs) ||
    getTimestampMs(item?.savedAt) ||
    getTimestampMs(item?.createdAtMs) ||
    getTimestampMs(item?.createdAt) ||
    0
  );
}

function limitSetupsByVehicleTrackCombo(arr, type, key, { addTombstones = true } = {}) {
  const list = Array.isArray(arr) ? arr.filter(Boolean) : [];
  const buckets = new Map();

  for (const item of list) {
    const comboKey = getSetupComboKey(item);
    if (!buckets.has(comboKey)) buckets.set(comboKey, []);
    buckets.get(comboKey).push(item);
  }

  const kept = [];
  const prunedTombstones = [];
  const now = Date.now();

  for (const [, bucket] of buckets.entries()) {
    bucket.sort((a, b) => {
      const byTime = setupSortMs(b) - setupSortMs(a);
      if (byTime) return byTime;
      return String(getAnyId(b) || "").localeCompare(String(getAnyId(a) || ""));
    });

    kept.push(...bucket.slice(0, MAX_SETUPS_PER_VEHICLE_TRACK));

    if (!addTombstones) continue;
    for (const item of bucket.slice(MAX_SETUPS_PER_VEHICLE_TRACK)) {
      const id = getAnyId(item);
      if (!id) continue;
      prunedTombstones.push({
        type,
        id: String(id),
        key: type === "setupVersion" ? String(key || "") : "",
        deletedAt: now,
        deviceId: String(item?.syncDeviceId || "system-prune"),
        reason: "max-setups-per-vehicle-track",
      });
    }
  }

  return { kept, prunedTombstones };
}

function enforceSetupComboLimits(payload, { addTombstones = true } = {}) {
  const next = { ...(payload || {}) };
  const tombstones = safeJsonParse(next["@deleted_v1"] || "[]", []);
  let nextTombs = Array.isArray(tombstones) ? [...tombstones] : [];

  for (const key of Object.keys(next)) {
    if (key !== "@setups" && !isDynamicSetupHistoryKey(key)) continue;

    const arr = safeJsonParse(next[key], null);
    if (!Array.isArray(arr)) continue;

    const type = inferArrayTypeForKey(key);
    const normalized = normalizeArrayForKey(arr, key);
    const { kept, prunedTombstones } = limitSetupsByVehicleTrackCombo(normalized, type, key, { addTombstones });
    next[key] = JSON.stringify(kept);
    nextTombs.push(...prunedTombstones);
  }

  next["@deleted_v1"] = JSON.stringify(normalizeTombstones(nextTombs));
  return next;
}

function setupHistoryKeyForItem(item, sourceKey = "") {
  const vehicleId = firstNonEmpty(item?.vehicleId, item?.vehicleID, item?.carId, item?.vehicle?.id, "unknownVehicle");
  const trackId = firstNonEmpty(item?.trackId, item?.trackID, item?.track?.id, "unknownTrack");
  if (sourceKey && isDynamicSetupHistoryKey(sourceKey)) return sourceKey;
  return `@setupHistory_${vehicleId}_${trackId}`;
}

function parseMaybeArray(value) {
  const parsed = safeJsonParse(value, undefined);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    // Some old versions stored setup history as an object keyed by vehicle/track.
    const out = [];
    for (const [bucketKey, bucketValue] of Object.entries(parsed)) {
      if (Array.isArray(bucketValue)) {
        for (const item of bucketValue) out.push({ ...(item || {}), _legacyBucketKey: bucketKey });
      } else if (bucketValue && typeof bucketValue === "object") {
        out.push({ ...bucketValue, _legacyBucketKey: bucketKey });
      }
    }
    return out;
  }
  return [];
}

function migratePayloadToV2(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const out = {};
  const migrationNotes = [];

  // Keep current sync keys only. Local-only drafts and old/graveyard keys are intentionally excluded.
  for (const [key, value] of Object.entries(source)) {
    if (!isSyncKey(key)) continue;
    if (key === "@deleted_v1") {
      out[key] = JSON.stringify(normalizeTombstones(safeJsonParse(value || "[]", [])));
    } else {
      const parsed = safeJsonParse(value, undefined);
      if (Array.isArray(parsed)) out[key] = JSON.stringify(normalizeArrayForKey(parsed, key));
      else out[key] = value == null ? null : String(value);
    }
  }

  // Convert exact legacy aliases into the active V2 keys.
  for (const [targetKey, aliases] of Object.entries(LEGACY_KEY_ALIASES)) {
    for (const alias of aliases) {
      if (!(alias in source)) continue;
      if (targetKey === "@deleted_v1") {
        out[targetKey] = mergePayloadValue(
          out[targetKey] || "[]",
          JSON.stringify(normalizeTombstones(safeJsonParse(source[alias] || "[]", []))),
          targetKey
        );
      } else {
        const arr = parseMaybeArray(source[alias]);
        if (arr.length) {
          out[targetKey] = mergePayloadValue(
            out[targetKey] || "[]",
            JSON.stringify(normalizeArrayForKey(arr, targetKey)),
            targetKey
          );
        }
      }
      migrationNotes.push(`converted:${alias}->${targetKey}`);
    }
  }

  // Convert old non-dynamic setup histories into vehicleId+trackId history keys.
  for (const legacyKey of LEGACY_SETUP_VERSION_KEYS) {
    if (!(legacyKey in source)) continue;
    const arr = parseMaybeArray(source[legacyKey]);
    for (const raw of arr) {
      const item = normalizeItemForV2(raw, "setupVersion", legacyKey);
      const targetKey = setupHistoryKeyForItem(item, legacyKey);
      const existing = safeJsonParse(out[targetKey] || "[]", []);
      out[targetKey] = JSON.stringify(normalizeArrayForKey([...existing, item], targetKey));
    }
    if (arr.length) migrationNotes.push(`converted:${legacyKey}->setupHistoryByVehicleTrack`);
  }

  // Normalize dynamic setup version/history keys that may have existed already.
  for (const [key, value] of Object.entries(source)) {
    if (!isDynamicSetupHistoryKey(key) || isLocalOnlyKey(key)) continue;
    const arr = parseMaybeArray(value);
    if (!arr.length) continue;
    out[key] = JSON.stringify(normalizeArrayForKey(arr, key));
  }

  let next = applyTombstonesToPayload(out);
  next = enforceSetupComboLimits(next, { addTombstones: true });
  next = applyTombstonesToPayload(next);
  next = pruneExpiredTombstones(next);
  next = normalizeRaceDayPayload(next);

  const beforeHash = hashString(JSON.stringify(source || {}));
  const afterHash = hashString(JSON.stringify(next || {}));
  return {
    payload: next,
    changed: beforeHash !== afterHash || migrationNotes.length > 0,
    notes: migrationNotes,
  };
}

function isGraveyardedLocalKey(key) {
  const k = String(key || "");
  if (!k) return false;
  if (k === DIRTY_LOCAL_KEY || k === DEVICE_ID_KEY || k === META_LOCAL_KEY || k === LOCAL_SCHEMA_KEY || k === LOCAL_MIGRATION_LOG_KEY) return false;
  if (GRAVEYARD_EXACT_KEYS.includes(k)) return true;
  if (GRAVEYARD_PREFIXES.some((p) => k.startsWith(p))) return true;
  if (BASE_SYNC_KEYS.includes(k) || isDynamicSetupHistoryKey(k)) return false;
  return false;
}

export async function runV2LocalMigration({ purgeLegacy = true, reason = "v2-local-migration" } = {}) {
  const previousSchema = await AsyncStorage.getItem(LOCAL_SCHEMA_KEY);
  const allKeys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(Array.isArray(allKeys) ? allKeys : []);
  const allPayload = {};
  for (const [k, v] of pairs) allPayload[k] = v;

  const beforeCurrent = await readLocalPayload(allPayload);
  const migrated = migratePayloadToV2({ ...allPayload, ...beforeCurrent });
  const changedKeys = computeChangedKeys(beforeCurrent, migrated.payload);

  if (changedKeys.length || previousSchema !== CLOUD_SCHEMA_VERSION) {
    await writeLocalPayload(migrated.payload);
  }

  let purgedKeys = [];
  if (purgeLegacy) {
    purgedKeys = (Array.isArray(allKeys) ? allKeys : []).filter(isGraveyardedLocalKey);
    if (purgedKeys.length) await AsyncStorage.multiRemove(purgedKeys);
  }

  const log = {
    schemaVersion: CLOUD_SCHEMA_VERSION,
    previousSchema: previousSchema || "",
    migratedAtMs: Date.now(),
    reason: String(reason || ""),
    changedKeys,
    purgedKeys,
    notes: migrated.notes,
  };

  await AsyncStorage.setItem(LOCAL_SCHEMA_KEY, CLOUD_SCHEMA_VERSION);
  await AsyncStorage.setItem(LOCAL_MIGRATION_LOG_KEY, JSON.stringify(log));

  if (changedKeys.length || purgedKeys.length || previousSchema !== CLOUD_SCHEMA_VERSION) {
    await markCloudDirty({ reason: "v2-migration", keys: changedKeys });
  }

  return {
    ok: true,
    didMigrate: changedKeys.length > 0 || purgedKeys.length > 0 || previousSchema !== CLOUD_SCHEMA_VERSION,
    ...log,
  };
}

async function ensureV2LocalMigrationDone(reason = "sync") {
  const current = await AsyncStorage.getItem(LOCAL_SCHEMA_KEY);
  if (current === CLOUD_SCHEMA_VERSION) return { ok: true, didMigrate: false, schemaVersion: current };
  return runV2LocalMigration({ reason });
}

export async function getLastV2MigrationLog() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_MIGRATION_LOG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function payloadStats(payload) {
  const counts = {
    vehicles: 0,
    tracks: 0,
    setups: 0,
    setupVersionKeys: 0,
    setupVersions: 0,
    runs: 0,
    sessions: 0,
    tombstones: 0,
  };

  const vehicles = safeJsonParse(payload?.["@vehicles"] || "[]", []);
  const tracks = safeJsonParse(payload?.["@tracks"] || "[]", []);
  const setups = safeJsonParse(payload?.["@setups"] || "[]", []);
  const runs = safeJsonParse(payload?.["@raceDayRuns_v1"] || "[]", []);
  const sessions = safeJsonParse(payload?.["@raceDaySessions_v1"] || "[]", []);
  const tombstones = safeJsonParse(payload?.["@deleted_v1"] || "[]", []);

  counts.vehicles = Array.isArray(vehicles) ? vehicles.length : 0;
  counts.tracks = Array.isArray(tracks) ? tracks.length : 0;
  counts.setups = Array.isArray(setups) ? setups.length : 0;
  counts.runs = Array.isArray(runs) ? runs.length : 0;
  counts.sessions = Array.isArray(sessions) ? sessions.length : 0;
  counts.tombstones = Array.isArray(tombstones) ? tombstones.length : 0;

  for (const key of Object.keys(payload || {})) {
    if (!isDynamicSetupHistoryKey(key)) continue;
    counts.setupVersionKeys += 1;
    const arr = safeJsonParse(payload[key] || "[]", []);
    if (Array.isArray(arr)) counts.setupVersions += arr.length;
  }

  let payloadBytes = 0;
  try {
    payloadBytes = JSON.stringify(payload || {}).length;
  } catch {}

  return { counts, payloadBytes };
}

async function readLocalPayload(extraPayload = null) {
  const keys = await discoverLocalSyncKeys(extraPayload);
  const pairs = await AsyncStorage.multiGet(keys);
  const payload = {};
  for (const [k, v] of pairs) {
    if (isSyncKey(k)) payload[k] = v ?? null;
  }
  return payload;
}

async function writeLocalPayload(payload) {
  const keys = await discoverLocalSyncKeys(payload);
  const ops = [];
  for (const k of keys) {
    if (!isSyncKey(k)) continue;
    const v = payload?.[k];
    ops.push([k, v == null ? "" : String(v)]);
  }
  if (ops.length) await AsyncStorage.multiSet(ops);
}

async function computeLocalPayloadHash(extraPayload = null) {
  const payload = extraPayload || (await readLocalPayload());
  const keys = Object.keys(payload || {}).filter(isSyncKey).sort();
  const joined = keys.map((k) => `${k}=${payload[k] == null ? "" : String(payload[k])}`).join("\n");
  return hashString(joined);
}

async function isLocalEmpty() {
  const payload = await readLocalPayload();
  for (const key of Object.keys(payload || {})) {
    if (key === "@deleted_v1") continue;
    const v = payload[key];
    if (v == null) continue;
    const t = String(v).trim();
    if (!t || t === "[]" || t === "{}") continue;
    return false;
  }
  return true;
}

function extractIdsAndFingerprints(payload) {
  const ids = {};
  const fps = {};

  for (const key of Object.keys(payload || {})) {
    if (!isSyncKey(key)) continue;
    const arr = safeJsonParse(payload[key], null);
    if (!Array.isArray(arr)) continue;

    const type = inferArrayTypeForKey(key);
    const bucketKey = `${type}:${key}`;
    ids[bucketKey] = [];
    fps[bucketKey] = {};

    for (const item of arr) {
      const id = getAnyId(item);
      if (!id) continue;
      const sid = String(id);
      ids[bucketKey].push(sid);
      fps[bucketKey][sid] = fingerprint(item);
    }
  }

  return { lastItemIds: ids, lastItemFingerprints: fps };
}

function addDetectedDeletesToPayload(payload, meta, deviceId) {
  const previousIds = meta?.lastItemIds || {};
  const { lastItemIds: currentIds } = extractIdsAndFingerprints(payload);
  const tombs = safeJsonParse(payload?.["@deleted_v1"] || "[]", []);
  const nextTombs = Array.isArray(tombs) ? [...tombs] : [];
  const now = Date.now();

  for (const bucketKey of Object.keys(previousIds || {})) {
    const [type, ...keyParts] = String(bucketKey).split(":");
    const key = keyParts.join(":");
    const prev = new Set((previousIds[bucketKey] || []).map(String));
    const curr = new Set((currentIds[bucketKey] || []).map(String));

    for (const id of prev) {
      if (!id || curr.has(id)) continue;
      nextTombs.push({ type, id, key, deletedAt: now, deviceId });
    }
  }

  payload["@deleted_v1"] = JSON.stringify(normalizeTombstones(nextTombs));
  return payload;
}

function stampChangedItemsInPayload(payload, meta, deviceId) {
  const now = Date.now();
  const prevFingerprints = meta?.lastItemFingerprints || {};

  for (const key of Object.keys(payload || {})) {
    if (!isSyncKey(key) || key === "@deleted_v1") continue;

    const arr = safeJsonParse(payload[key], null);
    if (!Array.isArray(arr)) continue;

    const type = inferArrayTypeForKey(key);
    const bucketKey = `${type}:${key}`;
    const stamped = arr.map((item) => {
      if (!item || typeof item !== "object") return item;
      const id = getAnyId(item);
      if (!id) return item;

      const fp = fingerprint(item);
      const prevFp = prevFingerprints?.[bucketKey]?.[String(id)] || "";
      const hasTimestamp = !!getItemUpdatedAt(item);

      if (!prevFp || prevFp !== fp || !hasTimestamp) {
        return {
          ...item,
          syncUpdatedAt: now,
          updatedAtMs: item.updatedAtMs || now,
          syncDeviceId: deviceId,
        };
      }

      return item;
    });

    payload[key] = JSON.stringify(stamped);
  }

  return payload;
}

async function prepareLocalPayloadForSync(payload, deviceId, meta) {
  let next = { ...(payload || {}) };
  next = addDetectedDeletesToPayload(next, meta, deviceId);
  next = stampChangedItemsInPayload(next, meta, deviceId);
  next = applyTombstonesToPayload(next);
  next = enforceSetupComboLimits(next, { addTombstones: true });
  next = applyTombstonesToPayload(next);
  next = pruneExpiredTombstones(next);
  next = normalizeRaceDayPayload(next);
  return next;
}

async function buildMergedPayload({ localPayload, cloudPayload }) {
  const localMigrated = migratePayloadToV2(localPayload || {}).payload;
  const cloudMigrated = migratePayloadToV2(cloudPayload || {}).payload;
  const keys = await discoverLocalSyncKeys({ ...localMigrated, ...cloudMigrated });
  const merged = {};

  for (const key of keys) {
    merged[key] = mergePayloadValue(localMigrated?.[key], cloudMigrated?.[key], key);
  }

  let next = applyTombstonesToPayload(merged);
  next = enforceSetupComboLimits(next, { addTombstones: true });
  next = applyTombstonesToPayload(next);
  next = pruneExpiredTombstones(next);
  // Active RaceDay is one logical record spread across several keys. Reconcile
  // it atomically so a blank pointer or stale ended flag on the receiving phone
  // cannot erase a valid active session from the cloud.
  next = applyMergedActiveRaceDayState(next, localMigrated, cloudMigrated);
  next = normalizeRaceDayPayload(next);
  return next;
}

function computeChangedKeys(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changed = [];
  for (const key of Array.from(keys).sort()) {
    if (!isSyncKey(key)) continue;
    if (String(before?.[key] ?? "") !== String(after?.[key] ?? "")) changed.push(key);
  }
  return changed;
}

async function commitBackupDoc({ ref, data }) {
  // Full overwrite is intentional for V2. It purges old/graveyarded nested payload keys
  // from users/{uid}/imrc/backup_main instead of leaving them behind via merge:true.
  const batch = writeBatch(db);
  batch.set(ref, data);
  await batch.commit();
}

async function _pushLocalToCloudInternal({
  uid,
  appVersion = "",
  reason = "",
  cloudPayload = null,
  mergeWithCloud = false,
  readCloudBeforePush = true,
}) {
  const deviceId = await getDeviceId();
  const ref = backupDocRef(uid);

  let incomingCloudPayload =
    mergeWithCloud && cloudPayload && typeof cloudPayload === "object" ? cloudPayload : {};

  if (readCloudBeforePush && !mergeWithCloud) {
    try {
      const snap = await getDoc(ref);
      logRead(`pushLocalToCloud:prewrite:${reason || "sync"}`);
      if (snap.exists()) {
        const data = snap.data() || {};
        incomingCloudPayload = decodePayloadFromCloudDoc(data).payload || {};
        mergeWithCloud = true;
      }
    } catch (e) {
      const meta = await getMeta();
      await setMeta({ ...meta, lastError: e?.message || String(e) });
      return {
        didSync: false,
        direction: null,
        reason: "cloud-unreachable-before-push",
        error: e?.message || String(e),
      };
    }
  }

  const cloudMigration = migratePayloadToV2(incomingCloudPayload || {});
  incomingCloudPayload = cloudMigration.payload;

  const metaBefore = await getMeta();
  let localPayload = await readLocalPayload(incomingCloudPayload);
  localPayload = await prepareLocalPayloadForSync(localPayload, deviceId, metaBefore);
  await writeLocalPayload(localPayload);

  const mergedPayload = await buildMergedPayload({
    localPayload,
    cloudPayload: incomingCloudPayload,
  });

  const changedKeys = computeChangedKeys(localPayload, mergedPayload);
  await writeLocalPayload(mergedPayload);

  const localHash = await computeLocalPayloadHash(mergedPayload);
  const cloudHash = mergeWithCloud ? hashString(JSON.stringify(incomingCloudPayload || {})) : "not-read";
  const mergedHash = hashString(JSON.stringify(mergedPayload || {}));
  const clientUpdatedAt = Date.now();
  const { counts, payloadBytes } = payloadStats(mergedPayload);
  const dirtyState = await getDirtyState();

  const cloudPayloadDoc = encodePayloadForCloudDoc(mergedPayload);

  const syncInfo = {
    lastDirection: "push",
    lastSyncAtMs: Date.now(),
    lastPushAtMs: Date.now(),
    deviceId,
    platform: Platform.OS,
    appVersion: String(appVersion || ""),
    reason: String(reason || ""),
    dirtyReasons: dirtyState?.reasons || [],
    dirtyKeys: dirtyState?.keys || [],
    localHash,
    cloudHash,
    mergedHash,
    cloudClientUpdatedAt: clientUpdatedAt,
    payloadBytes,
    payloadBytesRaw: cloudPayloadDoc.payloadBytesRaw,
    payloadBytesStored: cloudPayloadDoc.payloadBytesStored,
    payloadEncoding: cloudPayloadDoc.payloadEncoding,
    compressionReady: cloudPayloadDoc.compressionReady,
    compressionEnabled: cloudPayloadDoc.compressionEnabled,
    counts,
    changedKeys,
    schemaVersion: CLOUD_SCHEMA_VERSION,
    lastError: "",
  };

  await commitBackupDoc({
    ref,
    data: {
      ...cloudPayloadDoc,
      schemaVersion: CLOUD_SCHEMA_VERSION,
      clientUpdatedAt,
      appVersion: String(appVersion || ""),
      reason: String(reason || ""),
      deviceId,
      updatedAt: serverTimestamp(),
      sync: syncInfo,
    },
  });
  logWrite(`pushLocalToCloud:${reason || "sync"}`);

  const indexes = extractIdsAndFingerprints(mergedPayload);
  const meta = await getMeta();
  await setMeta({
    ...meta,
    lastSyncAt: Date.now(),
    lastPushAt: Date.now(),
    lastAutoPushAt: String(reason || "").startsWith("auto") ? Date.now() : meta?.lastAutoPushAt,
    lastDirection: "push",
    lastPushedHash: localHash,
    lastCloudClientUpdatedAt: clientUpdatedAt,
    lastDeviceId: deviceId,
    schemaVersion: CLOUD_SCHEMA_VERSION,
    lastCounts: counts,
    lastPayloadBytes: payloadBytes,
    lastChangedKeys: changedKeys,
    ...indexes,
    lastError: "",
  });

  await clearDirtyState({ lastSyncedAtMs: Date.now(), lastSyncedHash: localHash });

  console.log("[CloudSync] PUSH ok", { reason, hash: localHash, deviceId, changedKeys, counts });
  return { didSync: true, direction: "push", hash: localHash, changedKeys, counts, payloadBytes };
}

function isManualLikeReason(reason) {
  const r = String(reason || "").toLowerCase();
  return r.includes("manual") || r.includes("signin") || r.includes("initial") || r.includes("conversion") || r.includes("purge");
}

function isResourceExhaustedError(e) {
  const msg = String(e?.message || e || "").toLowerCase();
  const code = String(e?.code || "").toLowerCase();
  return (
    code.includes("resource-exhausted") ||
    msg.includes("resource-exhausted") ||
    msg.includes("maximum allowed queued writes") ||
    msg.includes("write stream exhausted") ||
    msg.includes("maximum backoff delay")
  );
}

async function pushLocalToCloud(args = {}) {
  const reason = String(args?.reason || "sync");
  const bypassWriteSpacing = args?.bypassWriteSpacing === true;

  // One cloud write at a time. This is the most important protection against
  // Firestore queued-write exhaustion on a single device.
  if (cloudPushInFlight) {
    return {
      didSync: false,
      direction: null,
      reason: "cloud-write-already-running",
      startedAt: cloudPushStartedAt,
    };
  }

  const now = Date.now();
  const meta = await getMeta();
  const backoffUntil = Number(meta?.cloudWriteBackoffUntilAt || 0) || 0;
  const lastAttemptAt = Number(meta?.lastCloudWriteAttemptAt || 0) || 0;
  const manualLike = isManualLikeReason(reason);

  // After Firebase says resource-exhausted, stop retrying for a while.
  if (backoffUntil && now < backoffUntil) {
    return {
      didSync: false,
      direction: null,
      reason: "cloud-write-backoff",
      retryAt: backoffUntil,
      retryInMs: Math.max(0, backoffUntil - now),
    };
  }

  // Even manual-like calls are spaced. If an effect loop is calling sign-in sync
  // or heartbeat-style sync repeatedly, this prevents a write storm.
  if (!bypassWriteSpacing && lastAttemptAt && now - lastAttemptAt < CLOUD_WRITE_MIN_SPACING_MS) {
    return {
      didSync: false,
      direction: null,
      reason: manualLike ? "cloud-write-spacing-guard" : "auto-write-spacing-guard",
      retryAt: lastAttemptAt + CLOUD_WRITE_MIN_SPACING_MS,
      retryInMs: Math.max(0, lastAttemptAt + CLOUD_WRITE_MIN_SPACING_MS - now),
    };
  }

  await setMeta({
    ...meta,
    lastCloudWriteAttemptAt: now,
    lastError: "",
  });

  cloudPushStartedAt = now;
  cloudPushInFlight = _pushLocalToCloudInternal(args)
    .then(async (result) => {
      if (result?.didSync) {
        const okMeta = await getMeta();
        await setMeta({ ...okMeta, cloudWriteBackoffUntilAt: 0, lastError: "" });
      }
      return result;
    })
    .catch(async (e) => {
      const msg = e?.message || String(e);
      const nextMeta = await getMeta();
      const patch = {
        ...nextMeta,
        lastError: msg,
        lastFailedCloudWriteAt: Date.now(),
      };
      if (isResourceExhaustedError(e)) {
        patch.cloudWriteBackoffUntilAt = Date.now() + CLOUD_WRITE_ERROR_BACKOFF_MS;
      }
      await setMeta(patch);
      return {
        didSync: false,
        direction: null,
        reason: isResourceExhaustedError(e) ? "resource-exhausted-backoff" : "cloud-write-failed",
        error: msg,
        retryAt: patch.cloudWriteBackoffUntilAt || 0,
      };
    })
    .finally(() => {
      cloudPushInFlight = null;
      cloudPushStartedAt = 0;
      notifySyncStatusListeners();
    });

  return cloudPushInFlight;
}

async function pullCloudToLocal({ uid, cloudSnap = null }) {
  const ref = backupDocRef(uid);
  const snap = cloudSnap || (await getDoc(ref));
  if (!cloudSnap) logRead("pullCloudToLocal");
  if (!snap.exists()) return { didSync: false, direction: null, mode: "no-cloud" };

  const data = snap.data() || {};
  const cloudPayloadRaw = migratePayloadToV2(decodePayloadFromCloudDoc(data).payload || {}).payload;
  const localPayload = await readLocalPayload(cloudPayloadRaw);

  const mergedPayload = await buildMergedPayload({ localPayload, cloudPayload: cloudPayloadRaw });
  const changedKeys = computeChangedKeys(localPayload, mergedPayload);

  await writeLocalPayload(mergedPayload);

  const localHash = await computeLocalPayloadHash(mergedPayload);
  const cloudHash = hashString(JSON.stringify(cloudPayloadRaw || {}));
  const cloudClientUpdatedAt = Number(data.clientUpdatedAt) || 0;
  const { counts, payloadBytes } = payloadStats(mergedPayload);
  const indexes = extractIdsAndFingerprints(mergedPayload);

  const meta = await getMeta();
  await setMeta({
    ...meta,
    lastSyncAt: Date.now(),
    lastPullAt: Date.now(),
    lastDirection: "pull",
    lastPushedHash: localHash,
    lastCloudClientUpdatedAt: cloudClientUpdatedAt,
    lastCounts: counts,
    lastPayloadBytes: payloadBytes,
    lastChangedKeys: changedKeys,
    ...indexes,
    lastError: "",
  });

  await clearDirtyState({ lastPulledAtMs: Date.now(), lastSyncedHash: localHash });

  console.log("[CloudSync] PULL ok", { hash: localHash, cloudClientUpdatedAt, changedKeys, counts });
  return { didSync: true, direction: "pull", hash: localHash, changedKeys, counts, cloudHash, payloadBytes };
}


// -----------------------------------------------------------------------------
// Dashboard sync light helpers (local-only, no Firestore reads)
// -----------------------------------------------------------------------------
export async function getCloudSyncStatus({ uid = "" } = {}) {
  const meta = await getMeta();
  const dirty = await getDirtyState();
  const now = Date.now();
  const lastError = String(meta?.lastError || "");
  const lastSyncAt = Number(meta?.lastSyncAt || 0) || 0;
  const lastPushAt = Number(meta?.lastPushAt || 0) || 0;
  const lastPullAt = Number(meta?.lastPullAt || 0) || 0;
  const isDirty = !!dirty?.dirty;
  const pending = !!pendingTimer;
  const syncRunning = !!syncInFlight;
  const cloudWriteRunning = !!cloudPushInFlight;
  const backoffUntil = Number(meta?.cloudWriteBackoffUntilAt || 0) || 0;
  const inBackoff = backoffUntil && now < backoffUntil;

  if (!uid) {
    return {
      state: "signed_out",
      color: "gray",
      label: "Sign In",
      message: "Sign in to sync between devices.",
      dirty: isDirty,
      pending,
      lastSyncAt,
      schemaVersion: CLOUD_SCHEMA_VERSION,
    };
  }

  if (syncRunning || cloudWriteRunning) {
    return {
      state: "syncing",
      color: "yellow",
      label: "Syncing",
      message: syncInFlightLabel
        ? `Cloud sync is running: ${syncInFlightLabel}.`
        : "Cloud sync is running.",
      dirty: true,
      pending: true,
      syncStartedAt: syncInFlightStartedAt || cloudPushStartedAt || 0,
      lastSyncAt,
      lastPushAt,
      lastPullAt,
      schemaVersion: CLOUD_SCHEMA_VERSION,
    };
  }

  if (inBackoff) {
    return {
      state: "backoff",
      color: "yellow",
      label: "Sync Paused",
      message: `Firebase asked us to slow down. Retry in ${Math.ceil((backoffUntil - now) / 1000)}s.`,
      dirty: isDirty,
      pending,
      retryAt: backoffUntil,
      lastSyncAt,
      lastPushAt,
      lastPullAt,
      schemaVersion: CLOUD_SCHEMA_VERSION,
    };
  }

  if (lastError) {
    return {
      state: "error",
      color: "red",
      label: "Sync Error",
      message: lastError,
      dirty: isDirty,
      pending,
      lastSyncAt,
      lastPushAt,
      lastPullAt,
      schemaVersion: CLOUD_SCHEMA_VERSION,
    };
  }

  if (pending) {
    return {
      state: "pending",
      color: "yellow",
      label: "Sync Pending",
      message: "Local changes are queued for cloud sync.",
      dirty: true,
      pending: true,
      lastSyncAt,
      lastPushAt,
      lastPullAt,
      schemaVersion: CLOUD_SCHEMA_VERSION,
    };
  }

  if (isDirty) {
    return {
      state: "dirty",
      color: "yellow",
      label: "Unsynced",
      message: "Local changes have not synced yet.",
      dirty: true,
      pending: false,
      dirtyReasons: dirty?.reasons || [],
      dirtyKeys: dirty?.keys || [],
      lastSyncAt,
      lastPushAt,
      lastPullAt,
      schemaVersion: CLOUD_SCHEMA_VERSION,
    };
  }

  if (lastSyncAt) {
    return {
      state: "synced",
      color: "green",
      label: "Synced",
      message: `Last synced ${Math.max(0, Math.round((now - lastSyncAt) / 1000))}s ago`,
      dirty: false,
      pending: false,
      lastSyncAt,
      lastPushAt,
      lastPullAt,
      lastDirection: meta?.lastDirection || "",
      counts: meta?.lastCounts || {},
      schemaVersion: CLOUD_SCHEMA_VERSION,
    };
  }

  return {
    state: "ready",
    color: "gray",
    label: "Ready",
    message: "No cloud sync has run on this device yet.",
    dirty: false,
    pending: false,
    lastSyncAt: 0,
    schemaVersion: CLOUD_SCHEMA_VERSION,
  };
}

export function subscribeCloudSyncStatus(cb, { uid = "", intervalMs = 2000 } = {}) {
  if (typeof cb !== "function") return () => {};
  const entry = { cb, uid };
  statusListeners.add(entry);

  let stopped = false;
  let timer = null;
  const tick = async () => {
    if (stopped) return;
    try {
      cb(await getCloudSyncStatus({ uid }));
    } catch {}
    timer = setTimeout(tick, Math.max(1000, Number(intervalMs || 2000)));
  };
  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    statusListeners.delete(entry);
  };
}

export async function clearCloudSyncError() {
  const meta = await getMeta();
  await setMeta({ ...meta, lastError: "", cloudWriteBackoffUntilAt: 0 });
  return { ok: true };
}

async function runExclusiveSyncOperation(label, fn) {
  if (syncInFlight) {
    return {
      didSync: false,
      direction: null,
      reason: "sync-already-running",
      label: syncInFlightLabel,
      startedAt: syncInFlightStartedAt,
    };
  }

  syncInFlightLabel = String(label || "sync");
  syncInFlightStartedAt = Date.now();

  syncInFlight = Promise.resolve()
    .then(fn)
    .catch(async (e) => {
      const msg = e?.message || String(e);
      const meta = await getMeta();
      await setMeta({ ...meta, lastError: msg, lastFailedSyncAt: Date.now() });
      return { didSync: false, direction: null, reason: "sync-failed", error: msg };
    })
    .finally(() => {
      syncInFlight = null;
      syncInFlightLabel = "";
      syncInFlightStartedAt = 0;
      notifySyncStatusListeners();
    });

  notifySyncStatusListeners();
  return syncInFlight;
}

async function runV2ConversionAndPurgeInternal({ uid, appVersion = "" } = {}) {
  if (!uid) return { didSync: false, mode: "missing-uid" };
  await runV2LocalMigration({ reason: "manual-v2-conversion-purge", purgeLegacy: true });

  const ref = backupDocRef(uid);
  let snap;
  try {
    snap = await getDoc(ref);
    logRead("runV2ConversionAndPurge");
  } catch (e) {
    const meta = await getMeta();
    await setMeta({ ...meta, lastError: e?.message || String(e) });
    return { didSync: false, reason: "cloud-unreachable", error: e?.message || String(e) };
  }

  const cloudData = snap.exists() ? snap.data() || {} : {};
  const cloudPayload = migratePayloadToV2(decodePayloadFromCloudDoc(cloudData).payload || {}).payload;
  return pushLocalToCloud({
    uid,
    appVersion,
    reason: "v2-conversion-purge",
    cloudPayload,
    mergeWithCloud: snap.exists(),
    readCloudBeforePush: false,
  });
}

// -----------------------------------------------------------------------------
// Public API for screens: local-only dirty helpers
// -----------------------------------------------------------------------------
export async function markCloudDirty({ reason = "local-change", key = "", keys = [], type = "", id = "" } = {}) {
  const deviceId = await getDeviceId();
  const now = Date.now();
  const prev = await getDirtyState();

  const reasonSet = new Set([...(prev?.reasons || []), String(reason || "local-change")]);
  const keySet = new Set([...(prev?.keys || [])]);
  if (key) keySet.add(String(key));
  for (const k of Array.isArray(keys) ? keys : []) if (k) keySet.add(String(k));

  const entities = Array.isArray(prev?.entities) ? [...prev.entities] : [];
  if (type || id) {
    const entity = { type: String(type || ""), id: String(id || ""), atMs: now };
    const entityKey = `${entity.type}:${entity.id}`;
    const existingKeys = new Set(entities.map((e) => `${String(e?.type || "")}:${String(e?.id || "")}`));
    if (!existingKeys.has(entityKey)) entities.push(entity);
  }

  const next = {
    dirty: true,
    firstDirtyAtMs: prev?.dirty ? prev?.firstDirtyAtMs || now : now,
    lastDirtyAtMs: now,
    deviceId,
    reasons: Array.from(reasonSet).filter(Boolean).slice(-25),
    keys: Array.from(keySet).filter(Boolean).slice(-50),
    entities: entities.slice(-50),
  };

  await setDirtyState(next);
  return { ok: true, dirty: true, state: next };
}

export const markLocalDirty = markCloudDirty;
export const markCloudSyncDirty = markCloudDirty;

export async function touchItemForCloud(item) {
  const deviceId = await getDeviceId();
  const now = Date.now();
  return {
    ...(item || {}),
    updatedAtMs: now,
    syncUpdatedAt: now,
    syncDeviceId: deviceId,
  };
}

export async function markItemDeletedForCloud({ type, id, key = "" }) {
  const cleanType = String(type || "").trim();
  const cleanId = String(id || "").trim();
  const cleanKey = String(key || "").trim();
  if (!cleanType || !cleanId) return { ok: false, reason: "missing-type-or-id" };

  const deviceId = await getDeviceId();
  const raw = await AsyncStorage.getItem("@deleted_v1");
  const tombs = safeJsonParse(raw || "[]", []);
  const deletedAt = Date.now();

  const next = normalizeTombstones([
    ...(Array.isArray(tombs) ? tombs : []),
    { type: cleanType, id: cleanId, key: cleanKey, deletedAt, deviceId },
  ]);

  await AsyncStorage.setItem("@deleted_v1", JSON.stringify(next));
  await markCloudDirty({
    reason: "delete",
    key: "@deleted_v1",
    type: cleanType,
    id: cleanId,
  });

  return { ok: true, type: cleanType, id: cleanId, key: cleanKey, deletedAt };
}

export async function getCloudDirtyState() {
  return getDirtyState();
}

// -----------------------------------------------------------------------------
// Public API for service/root sync only
// -----------------------------------------------------------------------------
async function autoCloudSyncOnSignInInternal({ uid, appVersion = "" }) {
  if (!uid) return { didSync: false, mode: "missing-uid" };

  await ensureV2LocalMigrationDone("signin");

  const ref = backupDocRef(uid);
  const snap = await getDoc(ref);
  logRead("autoCloudSyncOnSignIn");

  const cloudExists = snap.exists();
  const cloudData = cloudExists ? snap.data() || {} : {};
  const cloudMigration = migratePayloadToV2(decodePayloadFromCloudDoc(cloudData).payload || {});
  const cloudPayload = cloudMigration.payload;
  const cloudNeedsPurge = cloudExists && (cloudMigration.changed || cloudData.schemaVersion !== CLOUD_SCHEMA_VERSION);
  const localEmpty = await isLocalEmpty();

  if (localEmpty && cloudExists) {
    const pulled = await pullCloudToLocal({ uid, cloudSnap: snap });
    if (cloudNeedsPurge) {
      return pushLocalToCloud({
        uid,
        appVersion,
        reason: "signin-v2-cloud-purge-after-pull",
        cloudPayload,
        mergeWithCloud: true,
        readCloudBeforePush: false,
      });
    }
    return pulled;
  }

  if (!cloudExists) {
    const payload = await readLocalPayload();
    const anyLocal = Object.entries(payload || {}).some(([key, v]) => {
      if (key === "@deleted_v1") return false;
      const t = String(v ?? "").trim();
      return t && t !== "[]" && t !== "{}";
    });
    if (anyLocal) {
      await markCloudDirty({ reason: "initial-cloud-create" });
      return pushLocalToCloud({
        uid,
        appVersion,
        reason: "initial",
        readCloudBeforePush: false,
      });
    }
    return { didSync: false, direction: null, reason: "no-cloud-and-local-empty" };
  }

  const meta = await getMeta();
  const localHash = await computeLocalPayloadHash();
  const lastPushedHash = String(meta?.lastPushedHash || "");
  const dirtyState = await getDirtyState();
  const localDirty = !!dirtyState?.dirty || !lastPushedHash || lastPushedHash !== localHash;

  if (localDirty || cloudNeedsPurge) {
    return pushLocalToCloud({
      uid,
      appVersion,
      reason: localDirty ? "signin-local-changed" : "v2-cloud-purge",
      cloudPayload,
      mergeWithCloud: true,
      readCloudBeforePush: false,
    });
  }

  return { didSync: false, direction: null, reason: "signin-no-change" };
}

async function maybeAutoSyncTickInternal({ uid, appVersion = "", reason = "tick" }) {
  if (!uid) return { didSync: false, mode: "missing-uid" };

  await ensureV2LocalMigrationDone(`auto:${reason || "tick"}`);

  // No cloud read while clean. This is what protects the app from burning reads
  // while Dashboard or other screens re-render.
  syncCounters.blockedAutoReads += 1;

  const meta = await getMeta();
  const dirtyState = await getDirtyState();
  const localHash = await computeLocalPayloadHash();
  const lastPushedHash = String(meta?.lastPushedHash || "");
  const localDirty = !!dirtyState?.dirty || !lastPushedHash || lastPushedHash !== localHash;

  if (!localDirty) return { didSync: false, direction: null, reason: "no-change" };

  const now = Date.now();
  const lastAutoPushAt = Number(meta?.lastAutoPushAt || 0) || 0;
  if (now - lastAutoPushAt < AUTO_SYNC_MIN_INTERVAL_MS) {
    return {
      didSync: false,
      direction: null,
      reason: "auto-throttled",
      nextAllowedAt: lastAutoPushAt + AUTO_SYNC_MIN_INTERVAL_MS,
    };
  }

  return pushLocalToCloud({
    uid,
    appVersion,
    reason: `auto:${reason || "tick"}`,
    readCloudBeforePush: true,
  });
}

export async function scheduleCloudSync({
  uid,
  appVersion = "",
  reason = "debounced",
  delayMs = AUTO_SYNC_DEBOUNCE_MS,
} = {}) {
  if (!uid) return { didSync: false, mode: "missing-uid" };

  pendingRequest = { uid, appVersion, reason };

  if (pendingTimer) clearTimeout(pendingTimer);

  notifySyncStatusListeners();

  pendingTimer = setTimeout(() => {
    const req = pendingRequest;
    pendingTimer = null;
    pendingRequest = null;

    if (!req?.uid) return;
    maybeAutoSyncTick({
      uid: req.uid,
      appVersion: req.appVersion,
      reason: `debounced:${req.reason || "local-change"}`,
    }).catch((e) => console.log("[CloudSync] debounced sync failed", e?.message || String(e)));
  }, Math.max(1000, Number(delayMs || AUTO_SYNC_DEBOUNCE_MS)));

  return { didSync: false, direction: null, reason: "scheduled", delayMs };
}

export async function cancelScheduledCloudSync() {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = null;
  pendingRequest = null;
  notifySyncStatusListeners();
  return { ok: true };
}

// Backwards-compatible export name. It stays service-layer only and is safe to
// call repeatedly because it will not read Firestore unless dirty + throttle passes.
export async function maybeAutoBackupIfChanged({ uid, appVersion = "", reason = "auto" }) {
  return maybeAutoSyncTick({ uid, appVersion, reason });
}

async function runManualCloudSyncInternal({ uid, appVersion = "" }) {
  if (!uid) return { didSync: false, mode: "missing-uid" };

  await ensureV2LocalMigrationDone("manual");

  const ref = backupDocRef(uid);
  let snap;
  try {
    snap = await getDoc(ref);
    logRead("runManualCloudSync");
  } catch (e) {
    const meta = await getMeta();
    await setMeta({ ...meta, lastError: e?.message || String(e) });
    return {
      didSync: false,
      direction: null,
      reason: "cloud-unreachable",
      error: e?.message || String(e),
    };
  }

  const cloudExists = snap.exists();
  const cloudData = cloudExists ? snap.data() || {} : {};
  const cloudMigration = migratePayloadToV2(decodePayloadFromCloudDoc(cloudData).payload || {});
  const cloudPayload = cloudMigration.payload;
  const cloudNeedsPurge = cloudExists && (cloudMigration.changed || cloudData.schemaVersion !== CLOUD_SCHEMA_VERSION);

  const localEmpty = await isLocalEmpty();

  if (localEmpty && cloudExists) {
    const pulled = await pullCloudToLocal({ uid, cloudSnap: snap });
    if (cloudNeedsPurge) {
      return pushLocalToCloud({
        uid,
        appVersion,
        reason: "manual-v2-cloud-purge-after-pull",
        cloudPayload,
        mergeWithCloud: true,
        readCloudBeforePush: false,
        bypassWriteSpacing: true,
      });
    }
    return pulled;
  }

  // A user-requested sync must always reconcile both sides. The older decision
  // path could treat this device as locally dirty, skip the pull, or hit the
  // normal one-minute auto-write spacing guard. That made both Android devices
  // show green even though the second device never received the first device's
  // newest records. This path reads cloud once, merges by item timestamp, writes
  // the merged payload locally, then commits that same payload back to cloud.
  return pushLocalToCloud({
    uid,
    appVersion,
    reason: cloudNeedsPurge ? "manual-v2-cloud-purge" : "manual-reconcile",
    cloudPayload,
    mergeWithCloud: cloudExists,
    readCloudBeforePush: false,
    bypassWriteSpacing: true,
  });
}


// -----------------------------------------------------------------------------
// Public sync wrappers. These keep the Dashboard light yellow/syncing until the
// entire sync path completes (read, merge, local write, cloud write/backoff), and
// they prevent multiple Dashboard/app effects from running the same sync at once.
// -----------------------------------------------------------------------------
export function isCloudSyncInFlight() {
  return !!syncInFlight || !!cloudPushInFlight;
}

export async function autoCloudSyncOnSignIn(args = {}) {
  return runExclusiveSyncOperation("sign-in", () => autoCloudSyncOnSignInInternal(args));
}

export async function maybeAutoSyncTick(args = {}) {
  return runExclusiveSyncOperation(`auto:${args?.reason || "tick"}`, () => maybeAutoSyncTickInternal(args));
}

export async function runManualCloudSync(args = {}) {
  return runExclusiveSyncOperation("manual", () => runManualCloudSyncInternal(args));
}

export async function runV2ConversionAndPurge(args = {}) {
  return runExclusiveSyncOperation("v2-conversion-purge", () => runV2ConversionAndPurgeInternal(args));
}
