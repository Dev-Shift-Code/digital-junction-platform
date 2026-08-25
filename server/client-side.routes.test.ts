import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appRoutes = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const clientNavigation = readFileSync(new URL("../client/src/components/ClientAreaLayout.tsx", import.meta.url), "utf8");
const publicLayout = readFileSync(new URL("../client/src/components/PublicLayout.tsx", import.meta.url), "utf8");

describe("unified client side", () => {
  it("registers the client-side routes without exposing the old portal path", () => {
    expect(appRoutes).toContain('path={"/client"}');
    expect(appRoutes).toContain('path={"/client/purchases"}');
    expect(appRoutes).toContain('path={"/client/billing"}');
    expect(appRoutes).toContain('path={"/client/account"}');
    expect(appRoutes).not.toContain('path={"/portal"}');
  });

  it("offers client navigation for projects, purchases, billing, account, support, and resources", () => {
    ["My projects", "Purchases", "Billing", "Account", "Support", "Resources"].forEach(label => expect(clientNavigation).toContain(`label: "${label}"`));
    expect(publicLayout).toContain('window.location.assign("/client")');
  });
});
