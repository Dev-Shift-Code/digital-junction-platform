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

  it("keeps Purchase Method owner-only and supports QR upload/removal without touching buyer delivery records", () => {
    expect(router).toContain("productPurchaseMethods: router({");
    expect(router).toContain("uploadGcashQr: adminProcedure");
    expect(router).toContain("removeGcashQr: adminProcedure");
    expect(router).toContain("updateDigitalProductPurchaseMethods");
    expect(ownerProducts).toContain("Purchase method");
    expect(ownerProducts).toContain('name="gumroadUrl"');
    expect(ownerProducts).toContain('name="payhipUrl"');
    expect(ownerProducts).toContain("onQrChange={selectGcashQr}");
  });

  it("renders only configured buyer actions and uses a QR modal or new-tab external links", () => {
    ["Purchase Here", "Gumroad", "Payhip", "role=\"dialog\"", 'target="_blank"', "product.gcashQrCodeUrl", "product.gumroadUrl", "product.payhipUrl"].forEach(copy => expect(actions).toContain(copy));
    expect(shop).toContain("<ProductPurchaseActions product={product} />");
    expect(detail).toContain("<ProductPurchaseActions product={product} />");
  });
});
