import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("PayRex GCash payment workflow safeguards", () => {
  it("records separate D1 order, payment transaction, and idempotent webhook records", () => {
    const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
    const migration = readFileSync(resolve(root, "cloudflare/migrations/0002_payrex_payment_transactions.sql"), "utf8");
    expect(schema).toContain('export const paymentTransactions');
    expect(schema).toContain('export const paymentWebhookEvents');
    expect(schema).toContain('commerceStatus: text({ enum: ["pending_payment", "paid", "processing", "shipped", "completed", "cancelled"] })');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_provider_event_unique');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_checkout_session_unique');
  });

  it("creates a GCash-only PayRex session from a server-side D1 product price and quantity", () => {
    const router = readFileSync(resolve(root, "server/routers/portal.ts"), "utf8");
    const payrex = readFileSync(resolve(root, "server/payrex.ts"), "utf8");
    expect(router).toContain('createPayrexCheckout: publicProcedure');
    expect(router).toContain('const unitAmountCents = priceToCents(product.price)');
    expect(router).toContain('amountCents: unitAmountCents * input.quantity');
    expect(payrex).toContain('"payment_methods[]": "gcash"');
    expect(payrex).toContain('payment_methods');
    expect(payrex).not.toContain('"payment_methods[]": "maya"');
  });

  it("removes manual screenshot and frontend payment-reference confirmation from public checkout", () => {
    const checkout = readFileSync(resolve(root, "client/src/pages/GuestCheckout.tsx"), "utf8");
    expect(checkout).toContain('createPayrexCheckout.useMutation');
    expect(checkout).toContain('window.location.assign(checkout.checkoutUrl)');
    expect(checkout).toContain('No screenshot or “I paid” button is used');
    expect(checkout).not.toContain('paymentProofBase64');
    expect(checkout).not.toContain('paymentReference');
    expect(checkout).not.toMatch(/accountNumber|account_name|bankAccount|gcashNumber/i);
  });

  it("accepts a payment as paid only through a verified PayRex webhook", () => {
    const worker = readFileSync(resolve(root, "cloudflare/worker.ts"), "utf8");
    const payrex = readFileSync(resolve(root, "server/payrex.ts"), "utf8");
    expect(worker).toContain('pathname === "/api/payrex/webhook"');
    expect(worker).toContain('verifyPayrexWebhook(rawBody, request.headers.get("PayRex-Signature"))');
    expect(worker).toContain('event.type === "payment_intent.succeeded"');
    expect(worker).toContain('markPayrexPaymentPaid');
    expect(payrex).toContain('crypto.subtle.sign("HMAC"');
    expect(payrex).toContain('constantTimeEquals');
  });

  it("keeps the owner payment screen aligned with the PayRex GCash-only flow", () => {
    const paymentMethods = readFileSync(resolve(root, "client/src/pages/OwnerPaymentMethods.tsx"), "utf8");
    expect(paymentMethods).toContain("GCash with PayRex");
    expect(paymentMethods).toContain("No manual QR or proof review");
    expect(paymentMethods).toContain("payment_intent.succeeded");
    expect(paymentMethods).not.toContain("Upload QR code");
  });
});
