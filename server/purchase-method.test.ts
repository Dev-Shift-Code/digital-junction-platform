import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../cloudflare/migrations/0008_product_purchase_methods.sql", import.meta.url), "utf8");
const router = readFileSync(new URL("./routers/portal.ts", import.meta.url), "utf8");
const ownerProducts = readFileSync(new URL("../client/src/pages/OwnerProducts.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../client/src/components/ProductPurchaseActions.tsx", import.meta.url), "utf8");
const shop = readFileSync(new URL("../client/src/pages/Shop.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

describe("product Purchase Method", () => {
  it("defines nullable product-specific purchase fields and a non-destructive D1 migration", () => {
    ["gcashQrCodeUrl: text()", "gcashQrCodeKey: text()", "gumroadUrl: text()", "payhipUrl: text()"].forEach(copy => expect(schema).toContain(copy));
    ["ALTER TABLE digitalProducts ADD COLUMN gcashQrCodeUrl TEXT", "ALTER TABLE digitalProducts ADD COLUMN gcashQrCodeKey TEXT", "ALTER TABLE digitalProducts ADD COLUMN gumroadUrl TEXT", "ALTER TABLE digitalProducts ADD COLUMN payhipUrl TEXT"].forEach(copy => expect(migration).toContain(copy));
  });

  it("exposes only Gumroad and Payhip in the owner Purchase Method panel", () => {
    expect(router).toContain("updateDigitalProductPurchaseMethods");
    expect(ownerProducts).toContain("Purchase method");
    expect(ownerProducts).toContain('name="gumroadUrl"');
    expect(ownerProducts).toContain('name="payhipUrl"');
    expect(ownerProducts).not.toContain("GCash QR Code");
    expect(ownerProducts).not.toContain("onQrChange={selectGcashQr}");
  });

  it("renders only Gumroad and Payhip purchase links and removes website checkout", () => {
    ["Gumroad", "Payhip", "product.gumroadUrl", "product.payhipUrl"].forEach(copy => expect(actions).toContain(copy));
    expect(shop).toContain("<ProductPurchaseActions product={product} />");
    expect(shop).not.toContain("Purchase Here");
    expect(actions).toContain("flex w-full flex-nowrap");
    expect(actions).toContain("min-w-0 flex-1");
    expect(shop).toContain("grid-cols-[auto_minmax(0,1fr)]");
    expect(detail).not.toContain("Buy now");
    expect(detail).not.toContain("/checkout/");
    expect(detail).toContain("<ProductPurchaseActions product={product} showMarketplaceNote />");
    expect(actions).toContain("showMarketplaceNote = false");
    expect(actions).toContain("If you don't want to wait for manual checking of your payment");
    expect(actions).toContain('<a href={product.gumroadUrl!} target="_blank" rel="noopener noreferrer"');
    expect(actions).toContain('<a href={product.payhipUrl!} target="_blank" rel="noopener noreferrer"');
    expect(actions).not.toContain("gcashQrCode");
    expect(actions).not.toContain("showGcash");
    expect(actions).not.toContain("iframe");
    expect(actions).not.toContain("createPortal");
  });
});
