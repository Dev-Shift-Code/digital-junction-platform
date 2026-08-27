import { createOwnerOneTimeDeliveryEntitlement, claimManualPaymentRejectionEmail, claimPaymentDeliveryEmail, markManualPaymentRejectionEmailFailed, markManualPaymentRejectionEmailSent, markPaymentDeliveryEmailFailed, markPaymentDeliveryEmailSent, markPaymentDeliveryEmailSkipped } from "./db";
import { ENV } from "./_core/env";

const deliveryLinkLifetimeMs = 15 * 60 * 1000;
const gmailSendScope = "https://www.googleapis.com/auth/gmail.send";
const brandLogoUrl = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663920827301/UriSGgVGQZmuEDZB.png";

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
  const fileItems = input.links.map(link => `<tr><td style="padding:0 0 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #d8e6df;border-radius:12px;background:#f7fbf8"><tr><td style="padding:14px 16px;font-family:Arial,sans-serif;color:#19362f;font-size:14px;font-weight:700;line-height:20px">${escapeHtml(link.fileName)}<br><span style="font-size:12px;font-weight:400;color:#60766d">Single-use secure download</span></td><td align="right" style="padding:14px 16px"><a href="${escapeHtml(link.url)}" style="display:inline-block;border-radius:8px;background:#428475;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;line-height:18px;padding:10px 14px;text-decoration:none;white-space:nowrap">Download file</a></td></tr></table></td></tr>`).join("");
  const textLinks = input.links.map(link => `Download ${link.fileName}: ${link.url}`).join("\n");
  return {
    subject: `Your purchase is ready — Digital Junction`,
    html: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:#e9e7ff;color:#19362f"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#e9e7ff"><tr><td align="center" style="padding:30px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(26,49,44,.14)"><tr><td style="padding:30px 36px 28px;background:#1a312c;text-align:center"><table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><img src="${brandLogoUrl}" width="42" height="42" alt="Digital Junction Development Co." style="display:block;border:0;border-radius:12px;object-fit:contain"></td><td style="padding-left:11px;text-align:left;font-family:Arial,sans-serif"><div style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:.2px">Digital Junction</div><div style="margin-top:3px;color:#89d7b7;font-size:10px;letter-spacing:1.7px;text-transform:uppercase">Development Co.</div></td></tr></table><p style="margin:24px 0 0;color:#89d7b7;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase">Payment verified</p><h1 style="margin:9px 0 0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:31px;font-weight:700;line-height:38px">Your files are ready.</h1></td></tr><tr><td style="padding:34px 36px 18px;font-family:Arial,sans-serif"><p style="margin:0;color:#19362f;font-size:16px;line-height:24px">Hello ${buyerName},</p><p style="margin:16px 0 0;color:#4c625a;font-size:15px;line-height:24px">Thank you for choosing Digital Junction Development Co. Your payment for <strong style="color:#19362f">${productTitle}</strong> has been confirmed, and your secure purchase links are ready below.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:25px 0 20px;border-radius:12px;background:#fff7e9"><tr><td style="padding:15px 17px"><div style="color:#688076;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Order reference</div><div style="margin-top:5px;color:#19362f;font-family:Arial,sans-serif;font-size:15px;font-weight:700">Order #${input.orderId}</div></td><td align="right" style="padding:15px 17px"><div style="display:inline-block;border-radius:999px;background:#dff4e8;color:#1a312c;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:6px 10px">Secure delivery</div></td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${fileItems}</table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:13px 0 4px;border-top:1px solid #dce8e1"><tr><td style="padding-top:19px"><p style="margin:0;color:#19362f;font-family:Arial,sans-serif;font-size:13px;font-weight:700;line-height:20px">For your purchase security</p><p style="margin:5px 0 0;color:#60766d;font-family:Arial,sans-serif;font-size:12px;line-height:19px">Each button works once and expires in 15 minutes. Please download your files on a trusted device and do not forward this email or its links.</p></td></tr></table></td></tr><tr><td style="padding:24px 36px 28px;background:#f7fbf8;text-align:center"><p style="margin:0;color:#597067;font-family:Arial,sans-serif;font-size:12px;line-height:18px">Thank you for your patience and for purchasing from Digital Junction Development Co.</p><p style="margin:8px 0 0;color:#81958c;font-family:Arial,sans-serif;font-size:11px;line-height:16px">Questions about your order? Reply directly to this email.</p></td></tr></table><p style="margin:17px 0 0;color:#72758b;font-family:Arial,sans-serif;font-size:11px;line-height:16px;text-align:center">Digital Junction Development Co. · Secure digital delivery</p></td></tr></table></body></html>`,
    text: `Digital Junction Development Co.\n\nHello ${input.buyerName || "Buyer"},\n\nThank you for choosing Digital Junction Development Co. Your payment for ${input.productTitle} has been confirmed and your secure purchase links are ready.\n\n${textLinks}\n\nFor your purchase security, each link works once and expires in 15 minutes. Please download on a trusted device and do not forward this email or its links.\n\nThank you for your patience and for purchasing from Digital Junction Development Co.\n\nOrder #${input.orderId}`,
  };
}

export function buildManualPaymentRejectedEmail(input: { buyerName: string; productTitle: string; orderId: number }) {
  const buyerName = escapeHtml(input.buyerName || "Buyer");
  const productTitle = escapeHtml(input.productTitle);
  return {
    subject: "Payment review update — Digital Junction",
    html: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:#e9e7ff;color:#19362f"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#e9e7ff"><tr><td align="center" style="padding:30px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(26,49,44,.14)"><tr><td style="padding:30px 36px 28px;background:#1a312c;text-align:center"><table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><img src="${brandLogoUrl}" width="42" height="42" alt="Digital Junction Development Co." style="display:block;border:0;border-radius:12px;object-fit:contain"></td><td style="padding-left:11px;text-align:left;font-family:Arial,sans-serif"><div style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:.2px">Digital Junction</div><div style="margin-top:3px;color:#89d7b7;font-size:10px;letter-spacing:1.7px;text-transform:uppercase">Development Co.</div></td></tr></table><p style="margin:24px 0 0;color:#f7c97c;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase">Payment review update</p><h1 style="margin:9px 0 0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:31px;font-weight:700;line-height:38px">Your payment was not approved.</h1></td></tr><tr><td style="padding:34px 36px 20px;font-family:Arial,sans-serif"><p style="margin:0;color:#19362f;font-size:16px;line-height:24px">Hello ${buyerName},</p><p style="margin:16px 0 0;color:#4c625a;font-size:15px;line-height:24px">Thank you for your patience and for choosing Digital Junction Development Co. After review, the payment submitted for <strong style="color:#19362f">${productTitle}</strong> was not approved because it did not match the verified order amount.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;border-left:4px solid #c8923f;background:#fff7e9"><tr><td style="padding:16px 18px"><p style="margin:0;color:#19362f;font-family:Arial,sans-serif;font-size:14px;font-weight:700;line-height:21px">Payment discrepancy policy</p><p style="margin:7px 0 0;color:#5d6056;font-family:Arial,sans-serif;font-size:13px;line-height:20px">Digital Junction Development Co. will review and arrange a refund equal to 50% of the recorded payment for this order. The remaining 50% is retained as a compensation fee for the payment discrepancy.</p></td></tr></table><p style="margin:0;color:#60766d;font-family:Arial,sans-serif;font-size:12px;line-height:19px">No purchased files or download links have been released. This notice does not confirm that a refund has already been completed; our team will confirm the refund separately after review.</p><p style="margin:21px 0 0;color:#60766d;font-family:Arial,sans-serif;font-size:12px;line-height:19px">Order reference: #${input.orderId}. If you have questions, reply directly to this email.</p></td></tr><tr><td style="padding:24px 36px 28px;background:#f7fbf8;text-align:center"><p style="margin:0;color:#597067;font-family:Arial,sans-serif;font-size:12px;line-height:18px">Thank you for your understanding.</p><p style="margin:8px 0 0;color:#81958c;font-family:Arial,sans-serif;font-size:11px;line-height:16px">Digital Junction Development Co. · Payment review notice</p></td></tr></table></td></tr></table></body></html>`,
    text: `Digital Junction Development Co.\n\nHello ${input.buyerName || "Buyer"},\n\nThank you for your patience and for choosing Digital Junction Development Co. After review, the payment submitted for ${input.productTitle} was not approved because it did not match the verified order amount.\n\nPayment discrepancy policy: Digital Junction Development Co. will review and arrange a refund equal to 50% of the recorded payment for this order. The remaining 50% is retained as a compensation fee for the payment discrepancy.\n\nNo purchased files or download links have been released. This notice does not confirm that a refund has already been completed; our team will confirm the refund separately after review.\n\nOrder reference: #${input.orderId}. If you have questions, reply directly to this email.`,
  };
}

export function buildGmailRawMessage(input: { from: string; to: string; replyTo?: string; subject: string; text: string; html: string; orderId: number; messageType?: "delivery" | "rejection" }) {
  const messageKey = `${paymentDeliveryEmailIdempotencyKey(input.orderId)}-${input.messageType || "delivery"}`;
  const boundary = `djdc-${messageKey}`;
  return [
    `From: ${safeEmail(input.from, "GMAIL_SENDER_EMAIL")}`,
    `To: ${safeEmail(input.to, "buyer email")}`,
    ...(input.replyTo ? [`Reply-To: ${safeEmail(input.replyTo, "GMAIL_REPLY_TO")}`] : []),
    `Subject: ${mimeHeader(input.subject)}`,
    `Message-ID: <${messageKey}@digital-junction-platform.local>`,
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

export async function sendManualPaymentRejectedEmail(orderId: number) {
  const claimed = await claimManualPaymentRejectionEmail(orderId);
  if (!claimed) return { status: "not_due" as const };
  try {
    const content = buildManualPaymentRejectedEmail({ buyerName: claimed.order.name, productTitle: claimed.product.title, orderId: claimed.order.id });
    const raw = buildGmailRawMessage({ from: ENV.gmailSenderEmail, to: claimed.email.recipientEmail, replyTo: ENV.gmailReplyToEmail || undefined, subject: content.subject, text: content.text, html: content.html, orderId: claimed.order.id, messageType: "rejection" });
    const accessToken = await getGmailAccessToken();
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: base64Url(raw) }) });
    const responseText = await response.text();
    let payload: { id?: string; error?: { message?: string } } | null = null;
    try { payload = responseText ? JSON.parse(responseText) : null; } catch { /* Preserve only a generic response error below. */ }
    if (!response.ok || !payload?.id) throw new Error(`Gmail rejection notice failed (${response.status}): ${payload?.error?.message || "no message ID returned"}`);
    await markManualPaymentRejectionEmailSent(claimed.email.id, payload.id);
    return { status: "sent" as const, gmailMessageId: payload.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected rejection-email failure.";
    await markManualPaymentRejectionEmailFailed(claimed.email.id, message);
    console.error("[payment-rejection-email] failed", { orderId, emailAuditId: claimed.email.id, message });
    return { status: "failed" as const };
  }
}
