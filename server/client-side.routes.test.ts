import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appRoutes = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const ownerNavigation = readFileSync(new URL("../client/src/data/ownerNavigation.ts", import.meta.url), "utf8");
const ownerDashboard = readFileSync(new URL("../client/src/pages/OwnerDashboard.tsx", import.meta.url), "utf8");
const inventory = readFileSync(new URL("../client/src/pages/OwnerProducts.tsx", import.meta.url), "utf8");

describe("DJDC owner inventory and public commerce routes", () => {
  it("removes the Client Side route group while preserving the requested owner operations navigation", () => {
    expect(appRoutes).toContain('path={"/checkout/:handle"}');
    expect(appRoutes).not.toContain('path={"/client"}');
    ["Dashboard", "Inventory", "Sales", "Customers", "Content", "Vouchers", "Settings", "Support"].forEach(label => expect(ownerNavigation).toContain(`label: "${label}"`));
  });

  it("keeps inventory owner-only and provides the requested table-management controls", () => {
    ["Inventory management", "Current listings", "Active", "Drafts", "Archived", "More filters", "Product name", "Product details", "Add new product", "Sample inventory preview"].forEach(copy => expect(inventory).toContain(copy));
    expect(ownerDashboard).toContain("No real sales recorded");
  });
});
