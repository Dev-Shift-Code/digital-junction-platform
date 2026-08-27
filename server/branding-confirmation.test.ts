import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const confirmDialog = readFileSync(new URL("../client/src/components/ConfirmDialog.tsx", import.meta.url), "utf8");
const publicLayout = readFileSync(new URL("../client/src/components/PublicLayout.tsx", import.meta.url), "utf8");
const dashboardLayout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
const documentHead = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
const ownerProducts = readFileSync(new URL("../client/src/pages/OwnerProducts.tsx", import.meta.url), "utf8");
const ownerProjects = readFileSync(new URL("../client/src/pages/OwnerProjects.tsx", import.meta.url), "utf8");
const ownerSales = readFileSync(new URL("../client/src/pages/OwnerSalesManagement.tsx", import.meta.url), "utf8");

describe("DJDC branded confirmation and logo system", () => {
  it("uses the shared modern confirmation dialog instead of browser-native confirms", () => {
    expect(confirmDialog).toContain("AlertDialog");
    expect(confirmDialog).toContain("#FFF4E1");
    expect(confirmDialog).toContain("#1A312C");
    for (const source of [ownerProducts, ownerProjects, ownerSales]) {
      expect(source).toContain("ConfirmDialog");
      expect(source).not.toContain("window.confirm");
    }
  });

  it("uses the supplied DJDC asset for public, owner, and browser-tab branding", () => {
    const logoPath = "/manus-storage/djdc-logo_228b68ab.png";
    expect(publicLayout).toContain(logoPath);
    expect(dashboardLayout).toContain(logoPath);
    expect(documentHead).toContain(`<link rel="icon" type="image/png" href="${logoPath}"`);
    expect(documentHead).toContain(`<link rel="apple-touch-icon" href="${logoPath}"`);
  });
});
