import pako from "pako";

export const GZIP_BACKUP_ENCODING = "gzip-json-v1";
export const MAX_GZIP_BACKUP_BYTES = 920 * 1024;
const MAX_EXPANDED_BACKUP_BYTES = 16 * 1024 * 1024;

export function packCloudBackup(json) {
  const bytes = pako.gzip(json, { level: 9 });
  // The gzip trailer stores the original UTF-8 byte count modulo 2^32.
  const rawBytes = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .getUint32(bytes.byteLength - 4, true);

  if (rawBytes > MAX_EXPANDED_BACKUP_BYTES || bytes.byteLength > MAX_GZIP_BACKUP_BYTES) {
    throw new Error("This cloud backup is too large even after compression.");
  }

  return { bytes, rawBytes };
}

export function unpackCloudBackup(bytes, rawBytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 18 || bytes.length > MAX_GZIP_BACKUP_BYTES ||
      !Number.isInteger(rawBytes) || rawBytes < 2 || rawBytes > MAX_EXPANDED_BACKUP_BYTES) {
    throw new Error("The compressed cloud backup has an invalid size.");
  }

  // Gzip-only and bounded output. End the stream naturally so a missing
  // checksum or trailer cannot be mistaken for a successfully decoded backup.
  const inflater = new pako.Inflate({ windowBits: 31, to: "string" });
  const chunks = [];
  inflater.onData = (chunk) => {
    if (inflater.strm.total_out > rawBytes) {
      throw new Error("The compressed cloud backup exceeded its stated size.");
    }
    chunks.push(chunk);
  };

  if (!inflater.push(bytes, false) || !inflater.ended || inflater.err ||
      inflater.strm.avail_in !== 0 || inflater.strm.total_out !== rawBytes) {
    throw new Error("The compressed cloud backup is incomplete or damaged.");
  }

  let payload;
  try {
    payload = JSON.parse(chunks.join(""));
  } catch {
    throw new Error("The compressed cloud backup does not contain valid JSON.");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      Object.values(payload).some((value) => value !== null && typeof value !== "string")) {
    throw new Error("The compressed cloud backup has an invalid record format.");
  }

  return payload;
}
