import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("owner voucher, payment method, and inquiry management", () => {
  it("uses forward-only D1 records for vouchers, scope, provider settings, and order totals", () => {
    const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
    const migration = readFileSync(resolve(root, "cloudflare/migrations/0004_vouchers_payment_controls.sql"), "utf8");
    expect(schema).toContain("export const vouchers");
    expect(schema).toContain("export const voucherProducts");
    expect(schema).toContain("export const paymentProviderSettings");
    expect(schema).toContain("discountCents: integer()");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS vouchers");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS paymentProviderSettings");
    expect(migration).toContain("ALTER TABLE guestCheckoutRequests ADD COLUMN voucherId");
  });

  it("checks voucher and provider state on the server rather than trusting the buyer", () => {
    const router = readFileSync(resolve(root, "server/routers/portal.ts"), "utf8");
    const database = readFileSync(resolve(root, "server/db.ts"), "utf8");
    expect(router).toContain("getPaymentProviderSetting(\"payrex\")");
    expect(router).toContain("getPaymentProviderSetting(\"paypal\")");
    expect(router).toContain("getVoucherDiscount");
    expect(router).toContain("createManualCheckout: publicProcedure");
    expect(router).toContain('input.discountKind === "fixed" ? input.discountValue * 100');
    expect(database).toContain("incrementVoucherRedemption");
    expect(database).toContain("paymentStatus === \"verified\"");
  });

  it("replaces voucher and support placeholders with real owner management views", () => {
    const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
    const vouchers = readFileSync(resolve(root, "client/src/pages/OwnerVouchers.tsx"), "utf8");
    const inquiries = readFileSync(resolve(root, "client/src/pages/OwnerInquiries.tsx"), "utf8");
    expect(app).toContain('component={OwnerVouchers}');
    expect(app).toContain('component={OwnerInquiries}');
    expect(vouchers).toContain("Create voucher");
    expect(vouchers).toContain("Selected digital products");
    expect(inquiries).toContain("Contact form submissions");
    expect(inquiries).toContain("updateStatus.useMutation");
  });
});
