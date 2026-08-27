import { createOwnerOneTimeDeliveryEntitlement, claimPaymentDeliveryEmail, markPaymentDeliveryEmailFailed, markPaymentDeliveryEmailSent, markPaymentDeliveryEmailSkipped } from "./db";
import { ENV } from "./_core/env";

const deliveryLinkLifetimeMs = 15 * 60 * 1000;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

function safeHeaderValue(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized || /[\r\n]/.test(normalized)) throw new Error(`${field} must be configured without line breaks.`);
  return normalized;
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
    const apiKey = safeHeaderValue(ENV.resendApiKey, "RESEND_API_KEY");
    const from = safeHeaderValue(ENV.resendFromEmail, "RESEND_FROM_EMAIL");
    const to = safeHeaderValue(claimed.email.recipientEmail, "buyer email");
    const content = buildPaymentDeliveryEmail({ buyerName: claimed.order.name, productTitle: claimed.product.title, links, orderId: claimed.order.id });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": paymentDeliveryEmailIdempotencyKey(orderId) },
      body: JSON.stringify({ from, to: [to], ...(ENV.resendReplyToEmail ? { reply_to: safeHeaderValue(ENV.resendReplyToEmail, "RESEND_REPLY_TO") } : {}), subject: content.subject, html: content.html, text: content.text }),
    });
    const responseText = await response.text();
    let payload: { id?: string; message?: string } | null = null;
    try { payload = responseText ? JSON.parse(responseText) : null; } catch { /* Preserve only a generic response error below. */ }
    if (!response.ok || !payload?.id) throw new Error(`Resend delivery request failed (${response.status}): ${payload?.message || "no message ID returned"}`);
    await markPaymentDeliveryEmailSent(claimed.email.id, payload.id);
    return { status: "sent" as const, resendEmailId: payload.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected transactional email failure.";
    await markPaymentDeliveryEmailFailed(claimed.email.id, message);
    console.error("[payment-delivery-email] failed", { orderId, emailAuditId: claimed.email.id, message });
    return { status: "failed" as const };
  }
}
