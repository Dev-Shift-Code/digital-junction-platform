import { createOwnerOneTimeDeliveryEntitlement, claimPaymentDeliveryEmail, markPaymentDeliveryEmailFailed, markPaymentDeliveryEmailSent, markPaymentDeliveryEmailSkipped } from "./db";
import { ENV } from "./_core/env";

const deliveryLinkLifetimeMs = 15 * 60 * 1000;
const gmailSendScope = "https://www.googleapis.com/auth/gmail.send";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

function safeHeaderValue(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized || /[\r\n]/.test(normalized)) throw new Error(`${field} must be configured without line breaks.`);
  return normalized;
}

function safeEmail(value: string, field: string) {
  const email = safeHeaderValue(value, field);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`${field} must be a valid email address.`);
  return email;
}

function base64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64Mime(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/.{1,76}/g, "$&\r\n").trim();
}

function mimeHeader(value: string) {
  const safe = safeHeaderValue(value, "Email subject");
  return /^[\x20-\x7E]*$/.test(safe) ? safe : `=?UTF-8?B?${base64Mime(safe).replace(/[\r\n]/g, "")}?=`;
}

async function hashDeliveryToken(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function paymentDeliveryEmailIdempotencyKey(orderId: number) {
  return `djdc-payment-delivery-order-${orderId}`;
}

export function buildPaymentDeliveryEmail(input: { buyerName: string; productTitle: string; links: Array<{ fileName: string; url: string }>; orderId: number }) {
  const buyerName = escapeHtml(input.buyerName || "Buyer");
  const productTitle = escapeHtml(input.productTitle);
  const fileItems = input.links.map(link => `<li style="margin:0 0 12px"><a href="${escapeHtml(link.url)}" style="color:#0f766e;font-weight:600">Download ${escapeHtml(link.fileName)}</a></li>`).join("");
  const textLinks = input.links.map(link => `Download ${link.fileName}: ${link.url}`).join("\n");
  return {
    subject: `Your Digital Junction download links: ${input.productTitle}`,
    html: `<!doctype html><html><body style="margin:0;background:#f7faf8;color:#18332d;font-family:Arial,sans-serif"><main style="max-width:620px;margin:24px auto;background:#ffffff;padding:32px;border-radius:18px"><p style="margin:0 0 16px">Hello ${buyerName},</p><p style="margin:0 0 16px">Your payment for <strong>${productTitle}</strong> has been verified. Use each secure link below to download your purchased file.</p><ul style="padding-left:20px">${fileItems}</ul><p style="margin:24px 0 0;color:#54655f">Each link expires in 15 minutes and can be used once. Do not forward this email or its links.</p><p style="margin:16px 0 0;color:#54655f;font-size:13px">Order #${input.orderId} · Digital Junction Development Co.</p></main></body></html>`,
    text: `Hello ${input.buyerName || "Buyer"},\n\nYour payment for ${input.productTitle} has been verified. Use each secure link below to download your purchased file.\n\n${textLinks}\n\nEach link expires in 15 minutes and can be used once. Do not forward this email or its links.\n\nOrder #${input.orderId} · Digital Junction Development Co.`,
  };
}

export function buildGmailRawMessage(input: { from: string; to: string; replyTo?: string; subject: string; text: string; html: string; orderId: number }) {
  const boundary = `djdc-${paymentDeliveryEmailIdempotencyKey(input.orderId)}`;
  return [
    `From: ${safeEmail(input.from, "GMAIL_SENDER_EMAIL")}`,
    `To: ${safeEmail(input.to, "buyer email")}`,
    ...(input.replyTo ? [`Reply-To: ${safeEmail(input.replyTo, "GMAIL_REPLY_TO")}`] : []),
    `Subject: ${mimeHeader(input.subject)}`,
    `Message-ID: <${paymentDeliveryEmailIdempotencyKey(input.orderId)}@digital-junction-platform.local>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Mime(input.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Mime(input.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function getGmailAccessToken() {
  const clientId = safeHeaderValue(ENV.gmailClientId, "GMAIL_CLIENT_ID");
  const clientSecret = safeHeaderValue(ENV.gmailClientSecret, "GMAIL_CLIENT_SECRET");
  const refreshToken = safeHeaderValue(ENV.gmailRefreshToken, "GMAIL_REFRESH_TOKEN");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const text = await response.text();
  let payload: { access_token?: string; error?: string; error_description?: string } | null = null;
  try { payload = text ? JSON.parse(text) : null; } catch { /* Do not expose untrusted response body in audit records. */ }
  if (!response.ok || !payload?.access_token) throw new Error(`Google OAuth token refresh failed (${response.status}): ${payload?.error_description || payload?.error || "no access token returned"}`);
  return payload.access_token;
}

export async function sendPaymentDeliveryEmail(orderId: number) {
  const claimed = await claimPaymentDeliveryEmail(orderId);
  if (!claimed) return { status: "not_due" as const };
  try {
    if (!claimed.files.length) {
      await markPaymentDeliveryEmailSkipped(claimed.email.id, "No eligible private delivery files were available for this paid order.");
      return { status: "skipped" as const };
    }
    const appOrigin = safeHeaderValue(ENV.publicAppOrigin.replace(/\/+$/, ""), "PUBLIC_APP_ORIGIN");
    const links = await Promise.all(claimed.files.map(async file => {
      const token = crypto.randomUUID();
      const entitlement = await createOwnerOneTimeDeliveryEntitlement({ orderId: claimed.order.id, productFileId: file.id, tokenHash: await hashDeliveryToken(token), expiresAt: new Date(Date.now() + deliveryLinkLifetimeMs) });
      if (!entitlement) throw new Error(`Could not create a secure delivery link for ${file.fileName}.`);
      return { fileName: file.fileName, url: `${appOrigin}/api/delivery/${token}` };
    }));
    const content = buildPaymentDeliveryEmail({ buyerName: claimed.order.name, productTitle: claimed.product.title, links, orderId: claimed.order.id });
    const raw = buildGmailRawMessage({ from: ENV.gmailSenderEmail, to: claimed.email.recipientEmail, replyTo: ENV.gmailReplyToEmail || undefined, subject: content.subject, text: content.text, html: content.html, orderId: claimed.order.id });
    const accessToken = await getGmailAccessToken();
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: base64Url(raw) }) });
    const responseText = await response.text();
    let payload: { id?: string; error?: { message?: string } } | null = null;
    try { payload = responseText ? JSON.parse(responseText) : null; } catch { /* Preserve only a generic response error below. */ }
    if (!response.ok || !payload?.id) throw new Error(`Gmail delivery request failed (${response.status}): ${payload?.error?.message || "no message ID returned"}`);
    await markPaymentDeliveryEmailSent(claimed.email.id, payload.id);
    return { status: "sent" as const, gmailMessageId: payload.id, scope: gmailSendScope };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected transactional email failure.";
    await markPaymentDeliveryEmailFailed(claimed.email.id, message);
    console.error("[payment-delivery-email] failed", { orderId, emailAuditId: claimed.email.id, message });
    return { status: "failed" as const };
  }
}
