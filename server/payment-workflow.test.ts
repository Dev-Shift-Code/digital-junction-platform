import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("manual payment workflow safeguards", () => {
  it("stores a selected payment method as an immutable order snapshot", () => {
    const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
    const router = readFileSync(resolve(root, "server/routers/portal.ts"), "utf8");
    expect(schema).toContain('paymentMethodName: text()');
    expect(schema).toContain('paymentInstructionsSnapshot: text()');
    expect(schema).toContain('paymentQrCodeUrlSnapshot: text()');
    expect(router).toContain("paymentMethodName: paymentMethod.displayName");
    expect(router).toContain("paymentQrCodeUrlSnapshot: paymentMethod.qrCodeUrl");
    expect(router).toContain("!paymentMethod || !paymentMethod.isActive");
  });

  it("does not place seller account fields in the public checkout source", () => {
    const checkout = readFileSync(resolve(root, "client/src/pages/GuestCheckout.tsx"), "utf8");
    expect(checkout).toContain("listActive.useQuery");
    expect(checkout).toContain("paymentReference");
    expect(checkout).toContain('accept="image/*"');
    expect(checkout).not.toMatch(/accountNumber|account_name|bankAccount|gcashNumber/i);
  });

  it("keeps proof links inside the owner-only sales route", () => {
    const publicRouter = readFileSync(resolve(root, "server/routers/portal.ts"), "utf8");
    const ownerSales = readFileSync(resolve(root, "client/src/pages/OwnerWorkspaceViews.tsx"), "utf8");
    expect(publicRouter).toContain("adminProcedure.query(async () => {");
    expect(ownerSales).toContain("View proof");
    expect(ownerSales).toContain("reviewPayment");
  });

  it("limits owner payment-method selection to the requested configured providers", () => {
    const paymentMethods = readFileSync(resolve(root, "client/src/pages/OwnerPaymentMethods.tsx"), "utf8");
    const portalRouter = readFileSync(resolve(root, "server/routers/portal.ts"), "utf8");
    expect(paymentMethods).toContain('const paymentMethodTypes = ["GoTyme", "PayPal", "GCash", "MariBank"] as const;');
    expect(paymentMethods).toContain("<select required");
    expect(portalRouter).toContain('const paymentMethodType = z.enum(["GoTyme", "PayPal", "GCash", "MariBank"]);');
  });

  it("uses a D1-compatible external QR image URL without payment-logo controls or a binary upload route", () => {
    const paymentMethods = readFileSync(resolve(root, "client/src/pages/OwnerPaymentMethods.tsx"), "utf8");
    const checkout = readFileSync(resolve(root, "client/src/pages/GuestCheckout.tsx"), "utf8");
    const portalRouter = readFileSync(resolve(root, "server/routers/portal.ts"), "utf8");
    expect(paymentMethods).toContain("QR code image URL");
    expect(paymentMethods).toContain("not image bytes");
    expect(paymentMethods).not.toContain("Upload QR code");
    expect(paymentMethods).not.toContain("file.size > 5_000_000");
    expect(checkout).not.toContain("method.logoUrl");
    expect(portalRouter).not.toContain("uploadAsset:");
  });
});
