import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appRoutes = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const entryPage = readFileSync(new URL("../client/src/pages/AuthEntry.tsx", import.meta.url), "utf8");
const publicLayout = readFileSync(new URL("../client/src/components/PublicLayout.tsx", import.meta.url), "utf8");
const shopPage = readFileSync(new URL("../client/src/pages/Shop.tsx", import.meta.url), "utf8");
const checkoutPage = readFileSync(new URL("../client/src/pages/GuestCheckout.tsx", import.meta.url), "utf8");
const productDetail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
const publicDefaults = readFileSync(new URL("../client/src/data/publicContentDefaults.ts", import.meta.url), "utf8");
const portalRouter = readFileSync(new URL("../server/routers/portal.ts", import.meta.url), "utf8");

describe("owner authentication and guest product access", () => {
  it("keeps only direct owner sign-in routes in the public route map", () => {
    expect(appRoutes).toContain('path={"/owner/login"}');
    expect(appRoutes).toContain('path={"/owner/setup"}');
    expect(appRoutes).not.toContain('path={"/login"}');
    expect(appRoutes).not.toContain('path={"/signup"}');
    expect(entryPage).toContain("Owner sign in");
  });

  it("uses guest checkout without a Client Side account or frontend payment claim", () => {
    expect(publicLayout).not.toContain('href="/login"');
    expect(publicLayout).not.toContain('Client side');
    ["Secure digital checkout", "Place your order", "GCash via PayRex", "PayPal", "manual QR payment needs owner review"].forEach(copy => expect(checkoutPage).toContain(copy));
    ["Direct purchase", "Buy now"].forEach(copy => expect(productDetail).toContain(copy));
    expect(shopPage).toContain('getPublicSectionDefault("shop", "hero")');
    ["No account is required to browse or start checkout.", "Guest checkout"].forEach(copy => expect(publicDefaults).toContain(copy));
    expect(portalRouter).toContain("createPayrexCheckout: publicProcedure");
    expect(portalRouter).toContain("createPaypalCheckout: publicProcedure");
  });
});
