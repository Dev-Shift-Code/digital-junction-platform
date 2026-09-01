import { ENV } from "./_core/env";

const paypalBaseUrl = () => ENV.paypalEnvironment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

type PaypalToken = { access_token?: string; expires_in?: number };
export type PaypalOrder = { id: string; status: string; links?: { href: string; rel: string; method?: string }[]; purchase_units?: { payments?: { captures?: { id?: string; status?: string }[] } }[] };
type PaypalWebhookVerification = { verification_status?: string };

function paypalCredentials() {
  if (!ENV.paypalClientId || !ENV.paypalClientSecret) throw new Error("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in the Cloudflare Worker.");
  return `Basic ${Buffer.from(`${ENV.paypalClientId}:${ENV.paypalClientSecret}`).toString("base64")}`;
}

async function paypalAccessToken() {
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, { method: "POST", headers: { Authorization: paypalCredentials(), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  const body = await response.text();
  if (!response.ok) throw new Error(`PayPal access token request failed (${response.status}).`);
  const token = JSON.parse(body) as PaypalToken;
  if (!token.access_token) throw new Error("PayPal did not return an access token.");
  return token.access_token;
}

async function paypalRequest<T>(path: string, options: { method?: "GET" | "POST"; body?: unknown; headers?: Record<string, string> } = {}) {
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}${path}`, { method: options.method || "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation", ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined });
  const text = await response.text();
  let payload: unknown;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = text; }
  if (!response.ok) throw new Error(`PayPal request failed (${response.status}): ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  return payload as T;
}

export async function createPaypalOrder(input: { orderReference: string; productTitle: string; productDescription?: string | null; amountCents: number; successUrl: string; cancelUrl: string }) {
  const order = await paypalRequest<PaypalOrder>("/v2/checkout/orders", { method: "POST", headers: { "PayPal-Request-Id": input.orderReference }, body: { intent: "CAPTURE", purchase_units: [{ reference_id: input.orderReference, description: input.productDescription || input.productTitle, custom_id: input.orderReference, amount: { currency_code: "PHP", value: (input.amountCents / 100).toFixed(2) }, items: [{ name: input.productTitle, quantity: "1", unit_amount: { currency_code: "PHP", value: (input.amountCents / 100).toFixed(2) }, category: "DIGITAL_GOODS" }] }], application_context: { return_url: input.successUrl, cancel_url: input.cancelUrl, user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" } } });
  const approvalUrl = order.links?.find(link => link.rel === "payer-action" || link.rel === "approve")?.href;
  if (!order.id || !approvalUrl) throw new Error("PayPal did not return an approval URL.");
  return { order, approvalUrl };
}

export async function capturePaypalOrder(orderId: string) {
  return paypalRequest<PaypalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", headers: { "PayPal-Request-Id": `capture-${orderId}` } });
}

export async function verifyPaypalWebhook(rawBody: string, headers: Headers) {
  if (!ENV.paypalWebhookId) throw new Error("PayPal webhook verification is not configured. Set PAYPAL_WEBHOOK_ID in the Cloudflare Worker.");
  const event = JSON.parse(rawBody) as { id?: string; event_type?: string; resource?: { id?: string; supplementary_data?: { related_ids?: { order_id?: string } } } };
  const signatureHeaders = { auth_algo: headers.get("paypal-auth-algo"), cert_url: headers.get("paypal-cert-url"), transmission_id: headers.get("paypal-transmission-id"), transmission_sig: headers.get("paypal-transmission-sig"), transmission_time: headers.get("paypal-transmission-time") };
  if (Object.values(signatureHeaders).some(value => !value)) throw new Error("PayPal webhook signature headers are incomplete.");
  const verification = await paypalRequest<PaypalWebhookVerification>("/v1/notifications/verify-webhook-signature", { method: "POST", body: { ...signatureHeaders, webhook_id: ENV.paypalWebhookId, webhook_event: event } });
  if (verification.verification_status !== "SUCCESS") throw new Error("PayPal webhook signature is invalid.");
  return event;
}
