import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("provider-backed payment workflow safeguards", () => {
  it("records separate D1 order, payment transaction, and idempotent webhook records", () => {
    const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
    const migration = readFileSync(resolve(root, "cloudflare/migrations/0002_payrex_payment_transactions.sql"), "utf8");
    expect(schema).toContain("export const paymentTransactions");
    expect(schema).toContain("export const paymentWebhookEvents");
    expect(schema).toContain('commerceStatus: text({ enum: ["pending_payment", "paid", "processing", "shipped", "completed", "cancelled"] })');
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_provider_event_unique");
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_checkout_session_unique");
  });

  it("creates PayRex GCash and PayPal orders from a server-side D1 product price and quantity", () => {
    const router = readFileSync(resolve(root, "server/routers/portal.ts"), "utf8");
    const payrex = readFileSync(resolve(root, "server/payrex.ts"), "utf8");
    const paypal = readFileSync(resolve(root, "server/paypal.ts"), "utf8");
    expect(router).toContain("createPayrexCheckout: publicProcedure");
    expect(router).toContain("createPaypalCheckout: publicProcedure");
    expect(router).toContain("resolveCheckoutTotal");
    expect(router).toContain("subtotalCents = priceToCents(product.price) * input.quantity");
    expect(router).toContain("amountCents: total.totalCents");
    expect(router).toContain("createPaypalOrder({ orderReference");
    expect(payrex).toContain('"payment_methods[]": "gcash"');
    expect(payrex).toContain("payment_methods");
    expect(payrex).not.toContain('"payment_methods[]": "maya"');
    expect(paypal).toContain('currency_code: "PHP"');
    expect(paypal).toContain('category: "DIGITAL_GOODS"');
  });

  it("keeps provider checkout separate from an owner-reviewed manual QR alternative", () => {
    const checkout = readFileSync(resolve(root, "client/src/pages/GuestCheckout.tsx"), "utf8");
    expect(checkout).toContain("createPayrexCheckout.useMutation");
    expect(checkout).toContain("createPaypalCheckout.useMutation");
    expect(checkout).toContain("createManualCheckout.useMutation");
    expect(checkout).toContain("capturePaypalCheckout.useMutation");
    expect(checkout).toContain("window.location.assign(result.checkoutUrl)");
    expect(checkout).toContain("manual QR payment needs owner review");
    expect(checkout).toContain("Files are not released until the payment is manually verified");
    expect(checkout).not.toContain("paymentProofBase64");
    expect(checkout).not.toContain("paymentReference");
    expect(checkout).not.toMatch(/accountNumber|account_name|bankAccount|gcashNumber/i);
  });

  it("accepts a payment as paid only through a verified PayRex webhook", () => {
    const worker = readFileSync(resolve(root, "cloudflare/worker.ts"), "utf8");
    const payrex = readFileSync(resolve(root, "server/payrex.ts"), "utf8");
    expect(worker).toContain('pathname === "/api/payrex/webhook"');
    expect(worker).toContain('verifyPayrexWebhook(rawBody, request.headers.get("PayRex-Signature"))');
    expect(worker).toContain('event.type === "payment_intent.succeeded"');
    expect(worker).toContain("markPayrexPaymentPaid");
    expect(payrex).toContain('crypto.subtle.sign("HMAC"');
    expect(payrex).toContain("constantTimeEquals");
  });

  it("does not trust PayPal browser return and marks a PayPal payment paid only after remote webhook verification", () => {
    const worker = readFileSync(resolve(root, "cloudflare/worker.ts"), "utf8");
    const router = readFileSync(resolve(root, "server/routers/portal.ts"), "utf8");
    const paypal = readFileSync(resolve(root, "server/paypal.ts"), "utf8");
    const database = readFileSync(resolve(root, "server/db.ts"), "utf8");
    expect(worker).toContain('pathname === "/api/paypal/webhook"');
    expect(worker).toContain("verifyPaypalWebhook(rawBody, request.headers)");
    expect(worker).toContain('event.event_type === "PAYMENT.CAPTURE.COMPLETED"');
    expect(worker).toContain("registerPaypalWebhookEvent");
    expect(worker).toContain("markPaypalPaymentPaid");
    expect(paypal).toContain('"/v1/notifications/verify-webhook-signature"');
    expect(paypal).toContain('verification_status !== "SUCCESS"');
    expect(router).toContain("capturePaypalCheckout: publicProcedure");
    expect(router).not.toMatch(/capturePaypalCheckout[\s\S]{0,1000}markPaypalPaymentPaid/);
    expect(database).toContain('provider: "paypal"');
  });

  it("releases only private buyer files through a one-time D1 entitlement after any verified provider payment", () => {
    const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
    const router = readFileSync(resolve(root, "server/routers/portal.ts"), "utf8");
    const worker = readFileSync(resolve(root, "cloudflare/worker.ts"), "utf8");
    const database = readFileSync(resolve(root, "server/db.ts"), "utf8");
    const checkout = readFileSync(resolve(root, "client/src/pages/GuestCheckout.tsx"), "utf8");
    expect(schema).toContain("paymentDeliveryEntitlements");
    expect(router).toContain("paidDeliveryFiles: publicProcedure");
    expect(router).toContain("createOneTimeDeliveryLink: publicProcedure");
    expect(worker).toContain('pathname.startsWith("/api/delivery/")');
    expect(worker).toContain("consumeOneTimeDeliveryEntitlement");
    expect(worker).toContain("storageGetPrivateDeliveryUrl");
    expect(database).toContain('file.fileUrl.includes("/raw/private/")');
    expect(checkout).toContain("Download once");
    expect(checkout).toContain("single-use download link");
  });

  it("prepares a D1-audited Resend delivery only after a verified provider webhook or manual owner approval", () => {
    const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
    const migration = readFileSync(resolve(root, "cloudflare/migrations/0005_transactional_delivery_email.sql"), "utf8");
    const database = readFileSync(resolve(root, "server/db.ts"), "utf8");
    const router = readFileSync(resolve(root, "server/routers/portal.ts"), "utf8");
    const worker = readFileSync(resolve(root, "cloudflare/worker.ts"), "utf8");
    const resend = readFileSync(resolve(root, "server/resend.ts"), "utf8");
    expect(schema).toContain("export const paymentDeliveryEmails");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS paymentDeliveryEmails");
    expect(migration).toContain("paymentDeliveryEmails (orderId)");
    expect(database).toContain("claimPaymentDeliveryEmail");
    expect(database).toContain('audit.status !== "failed"');
    expect(database).toContain('provider: "manual"');
    expect(database).toContain("createManualApprovedPaymentTransaction");
    expect(worker).toContain("ctx.waitUntil(sendPaymentDeliveryEmail(transaction.orderId))");
    expect(worker).toContain('event.type === "payment_intent.succeeded"');
    expect(worker).toContain('event.event_type === "PAYMENT.CAPTURE.COMPLETED"');
    expect(router).toContain('if (input.paymentStatus === "verified" && reviewed) await sendPaymentDeliveryEmail(reviewed.id)');
    expect(router).toContain("retryDeliveryEmail: adminProcedure");
    expect(router).not.toMatch(/capturePaypalCheckout[\s\S]{0,1000}sendPaymentDeliveryEmail/);
    expect(resend).toContain("createOwnerOneTimeDeliveryEntitlement");
    expect(resend).toContain("tokenHash: await hashDeliveryToken(token)");
    expect(resend).toContain('status: "failed"');
    expect(resend).toContain("markPaymentDeliveryEmailFailed");
  });

  it("gives the owner payment toggles and manual QR method controls", () => {
    const paymentMethods = readFileSync(resolve(root, "client/src/pages/OwnerPaymentMethods.tsx"), "utf8");
    expect(paymentMethods).toContain("Payment methods");
    expect(paymentMethods).toContain("GCash via PayRex");
    expect(paymentMethods).toContain("PayPal Sandbox");
    expect(paymentMethods).toContain("Disable for buyers");
    expect(paymentMethods).toContain("Manual QR payment");
    expect(paymentMethods).toContain("uploadQrCode.useMutation");
  });
});
