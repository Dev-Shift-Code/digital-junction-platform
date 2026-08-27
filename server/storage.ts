// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.

import { ENV } from "./_core/env";

let d1OnlyFileMode = false;
type CloudinaryQrConfig = { cloudName: string; apiKey: string; apiSecret: string };
let cloudinaryQrConfig: CloudinaryQrConfig | null = null;

/** Prevents file bytes from being treated as database content in a D1-only deployment. */
export function configureD1OnlyFileMode() {
  d1OnlyFileMode = true;
}

export function isD1OnlyFileMode() {
  return d1OnlyFileMode;
}

/** Configures only the owner payment-QR media path; D1 continues to store its URL/key metadata. */
export function configureCloudinaryQrStorage(config: CloudinaryQrConfig | null) {
  cloudinaryQrConfig = config;
}

async function sha1(value: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

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

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  if (d1OnlyFileMode) {
    throw new Error("File uploads are unavailable in the D1-only Cloudflare deployment. Use text and approved external HTTPS media URLs instead.");
  }

  const { forgeUrl, forgeKey } = getForgeConfig();

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

/** Uploads an owner payment QR image to Cloudinary; the returned URL/key are saved in D1, never the bytes. */
export async function storagePutPaymentQr(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  if (!cloudinaryQrConfig) {
    throw new Error("QR image storage is not configured. Set the Cloudinary Worker secrets before uploading a QR code.");
  }

  const key = appendHashSuffix(normalizeKey(relKey));
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sha1(`timestamp=${timestamp}${cloudinaryQrConfig.apiSecret}`);
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const form = new FormData();
  form.append("file", new Blob([bytes.buffer as ArrayBuffer], { type: contentType }), key.split("/").pop() || "payment-qr");
  form.append("api_key", cloudinaryQrConfig.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);

  const upload = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryQrConfig.cloudName)}/auto/upload`, {
    method: "POST",
    body: form,
  });
  if (!upload.ok) throw new Error(`Cloudinary QR upload failed (${upload.status}): ${await upload.text()}`);
  const result = await upload.json() as { secure_url?: string };
  if (!result.secure_url) throw new Error("Cloudinary did not return a secure QR delivery URL.");
  return { key, url: result.secure_url };
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

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
