import { ENV } from "./_core/env";

const payrexApiBaseUrl = "https://api.payrexhq.com";

export type PayrexCheckoutSession = { id: string; url: string; status: string; expires_at?: number; payment_intent?: { id?: string; status?: string; latest_payment?: string | null } };

function formEncode(input: Record<string, string | number>) {
  const body = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => body.set(key, String(value)));
  return body;
}

function payrexAuthHeader() {
  const secret = ENV.payrexSecretApiKey;
  if (!secret) throw new Error("PayRex is not configured. Set PAYREX_SECRET_API_KEY in the Cloudflare Worker before creating checkout sessions.");
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

async function payrexRequest<T>(path: string, options: { method?: "GET" | "POST"; body?: URLSearchParams } = {}) {
  const response = await fetch(`${payrexApiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { Authorization: payrexAuthHeader(), ...(options.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: options.body,
  });
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) throw new Error(`PayRex request failed (${response.status}): ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  return payload as T;
}

export async function createPayrexGcashCheckout(input: { orderReference: string; productTitle: string; productDescription?: string | null; coverImageUrl?: string | null; unitAmountCents: number; quantity: number; successUrl: string; cancelUrl: string; expiresAt: Date }) {
  const form = formEncode({
    currency: "PHP",
    customer_reference_id: input.orderReference,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    expires_at: Math.floor(input.expiresAt.getTime() / 1000),
    "payment_methods[]": "gcash",
    "line_items[0][name]": input.productTitle,
    "line_items[0][amount]": input.unitAmountCents,
    "line_items[0][quantity]": input.quantity,
    "line_items[0][description]": input.productDescription || "Digital Junction digital product",
    ...(input.coverImageUrl ? { "line_items[0][image]": input.coverImageUrl } : {}),
    "metadata[order_reference]": input.orderReference,
  });
  const session = await payrexRequest<PayrexCheckoutSession>("/checkout_sessions", { method: "POST", body: form });
  if (!session.id || !session.url) throw new Error("PayRex did not return a checkout session URL.");
  return session;
}

export async function retrievePayrexCheckoutSession(checkoutSessionId: string) {
  return payrexRequest<PayrexCheckoutSession>(`/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`);
}

function hex(bytes: ArrayBuffer) { return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, "0")).join(""); }

export async function sha256(value: string) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); }

function constantTimeEquals(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export async function verifyPayrexWebhook(rawBody: string, signatureHeader: string | null) {
  const secret = ENV.payrexWebhookSecret;
  if (!secret) throw new Error("PayRex webhook verification is not configured. Set PAYREX_WEBHOOK_SECRET in the Cloudflare Worker.");
  if (!signatureHeader) throw new Error("PayRex-Signature header is required.");
  const parts = Object.fromEntries(signatureHeader.split(",").map(part => part.trim().split("=", 2)).filter(([key, value]) => key && value));
  const timestamp = parts.t;
  const expected = ENV.payrexEnvironment === "production" ? parts.li : parts.te;
  if (!timestamp || !expected) throw new Error("PayRex webhook signature is incomplete.");
  const signingKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = hex(await crypto.subtle.sign("HMAC", signingKey, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
  if (!constantTimeEquals(signature, expected)) throw new Error("PayRex webhook signature is invalid.");
  return JSON.parse(rawBody) as { id: string; type: string; livemode?: boolean; data?: { resource?: { id?: string; latest_payment?: string | null } } };
}
