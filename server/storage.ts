// Preconfigured storage helpers for local development and Cloudflare production.
// In Cloudflare mode, media bytes live in Cloudinary; D1 persists only URLs and keys.

import { ENV } from "./_core/env";

let d1OnlyFileMode = false;
type CloudinaryStorageConfig = { cloudName: string; apiKey: string; apiSecret: string };
let cloudinaryStorageConfig: CloudinaryStorageConfig | null = null;

/** Enables Cloudflare media storage. D1 continues to hold references only, never file bytes. */
export function configureD1OnlyFileMode() {
  d1OnlyFileMode = true;
}

export function isD1OnlyFileMode() {
  return d1OnlyFileMode;
}

/** Configures the private server-side Cloudinary credentials for production media uploads. */
export function configureCloudinaryStorage(config: CloudinaryStorageConfig | null) {
  cloudinaryStorageConfig = config;
}

async function sha1(value: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function signCloudinaryParams(params: Record<string, string | number>) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return sha1(`${payload}${cloudinaryStorageConfig?.apiSecret || ""}`);
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) throw new Error("Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY");
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

async function cloudinaryPut(relKey: string, data: Buffer | Uint8Array | string, contentType: string): Promise<{ key: string; url: string }> {
  if (!cloudinaryStorageConfig) throw new Error("File storage is not configured. Set the Cloudinary Worker secrets before uploading images or buyer files.");
  const key = appendHashSuffix(normalizeKey(relKey));
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sha1(`timestamp=${timestamp}${cloudinaryStorageConfig.apiSecret}`);
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const form = new FormData();
  form.append("file", new Blob([bytes.buffer as ArrayBuffer], { type: contentType }), key.split("/").pop() || "digital-junction-upload");
  form.append("api_key", cloudinaryStorageConfig.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  const upload = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryStorageConfig.cloudName)}/auto/upload`, { method: "POST", body: form });
  if (!upload.ok) throw new Error(`Cloudinary upload failed (${upload.status}): ${await upload.text()}`);
  const result = await upload.json() as { secure_url?: string };
  if (!result.secure_url) throw new Error("Cloudinary did not return a secure delivery URL.");
  return { key, url: result.secure_url };
}

export type PrivateCloudinaryFile = { key: string; url: string; publicId: string; resourceType: "raw"; format: string | null };

/** Stores buyer delivery files as Cloudinary private raw assets; their delivery URL is never exposed directly. */
export async function storagePutPrivateDeliveryFile(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<PrivateCloudinaryFile> {
  if (!cloudinaryStorageConfig) throw new Error("Buyer file storage is not configured. Set the Cloudinary Worker secrets before uploading files.");
  const key = appendHashSuffix(normalizeKey(relKey));
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await signCloudinaryParams({ public_id: key, timestamp, type: "private" });
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const form = new FormData();
  form.append("file", new Blob([bytes.buffer as ArrayBuffer], { type: contentType }), key.split("/").pop() || "buyer-file");
  form.append("api_key", cloudinaryStorageConfig.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("public_id", key);
  form.append("type", "private");
  form.append("signature", signature);
  const upload = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryStorageConfig.cloudName)}/raw/upload`, { method: "POST", body: form });
  if (!upload.ok) throw new Error(`Cloudinary buyer-file upload failed (${upload.status}): ${await upload.text()}`);
  const result = await upload.json() as { secure_url?: string; public_id?: string; format?: string };
  if (!result.secure_url || !result.public_id) throw new Error("Cloudinary did not return private buyer-file metadata.");
  return { key: result.public_id, url: result.secure_url, publicId: result.public_id, resourceType: "raw", format: result.format || null };
}

/** Creates a short-lived Cloudinary private-download URL for the Worker after a one-time entitlement is consumed. */
export async function storageGetPrivateDeliveryUrl(input: { publicId: string; resourceType: "raw"; format: string | null; expiresAt: Date }) {
  if (!cloudinaryStorageConfig) throw new Error("Buyer file storage is not configured.");
  const timestamp = Math.floor(Date.now() / 1000);
  const expiresAt = Math.floor(input.expiresAt.getTime() / 1000);
  const params = { attachment: "true", expires_at: expiresAt, format: input.format || "", public_id: input.publicId, timestamp, type: "private" };
  const signature = await signCloudinaryParams(params);
  const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "")), signature, api_key: cloudinaryStorageConfig.apiKey });
  return `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryStorageConfig.cloudName)}/${input.resourceType}/download?${query.toString()}`;
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<{ key: string; url: string }> {
  if (d1OnlyFileMode) return cloudinaryPut(relKey, data, contentType);
  const key = appendHashSuffix(normalizeKey(relKey));
  const { forgeUrl, forgeKey } = getForgeConfig();
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!presignResp.ok) throw new Error(`Storage presign failed (${presignResp.status}): ${await presignResp.text().catch(() => presignResp.statusText)}`);
  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
  if (!uploadResp.ok) throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  return { key, url: `/manus-storage/${key}` };
}

/** Compatibility alias for the QR payment procedure; this uses the same Cloudinary adapter. */
export async function storagePutPaymentQr(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  return cloudinaryPut(relKey, data, contentType);
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!resp.ok) throw new Error(`Storage signed URL failed (${resp.status}): ${await resp.text().catch(() => resp.statusText)}`);
  const { url } = (await resp.json()) as { url: string };
  return url;
}
