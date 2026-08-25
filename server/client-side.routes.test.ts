import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appRoutes = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const clientNavigation = readFileSync(new URL("../client/src/components/ClientAreaLayout.tsx", import.meta.url), "utf8");
const dashboardLayout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
const clientOverview = readFileSync(new URL("../client/src/components/ClientOverviewDashboard.tsx", import.meta.url), "utf8");
const purchases = readFileSync(new URL("../client/src/pages/ClientPurchases.tsx", import.meta.url), "utf8");
const billing = readFileSync(new URL("../client/src/pages/ClientBilling.tsx", import.meta.url), "utf8");
const invoiceDetail = readFileSync(new URL("../client/src/pages/ClientInvoiceDetail.tsx", import.meta.url), "utf8");
const ownerProductAccess = readFileSync(new URL("../client/src/pages/OwnerProductAccess.tsx", import.meta.url), "utf8");
const ownerNavigation = readFileSync(new URL("../client/src/data/ownerNavigation.ts", import.meta.url), "utf8");
const ownerDashboard = readFileSync(new URL("../client/src/pages/OwnerDashboard.tsx", import.meta.url), "utf8");

describe("unified client side", () => {
  it("registers the client-side routes without exposing the old portal path", () => {
    expect(appRoutes).toContain('path={"/client"}');
    expect(appRoutes).toContain('path={"/client/purchases"}');
    expect(appRoutes).toContain('path={"/client/billing"}');
    expect(appRoutes).toContain('path={"/client/billing/:invoiceId"}');
    expect(appRoutes).toContain('path={"/client/account"}');
    expect(appRoutes).not.toContain('path={"/portal"}');
  });

  it("limits navigation to Overview in the sidebar and Dashboard, My Purchases, and Billing & Invoices in customer tabs", () => {
    expect(clientNavigation).toContain('label: "Overview"');
    ["Service projects", "Orders & downloads", "Account", "Support", "Resources"].forEach(label => expect(clientNavigation).not.toContain(`label: "${label}"`));
    ["Dashboard", "My Purchases", "Billing & Invoices"].forEach(label => expect(clientNavigation).toContain(label));
  });

  it("returns signed-out customers to the public site and retains the requested customer dashboard functions", () => {
    expect(dashboardLayout).toContain('window.location.assign("/")');
    ["Purchased products", "Recent activity", "Product help", "Search product library"].forEach(copy => expect(clientOverview).toContain(copy));
    expect(clientOverview).not.toContain("Your service projects");
    ["Your Product Library", "Selected product", "Preview access details", "Search your product library", "Download access", "setTagFilter", "tagFilter === \"All\""].forEach(copy => expect(purchases).toContain(copy));
    ["Billing & Invoices", "Sample billing records", "View sample invoice detail", "Sample invoice document unavailable", "Preview only", "setRecordType", "recordType === \"All\""].forEach(copy => expect(billing).toContain(copy));
    ["Sample invoice detail", "not an issued invoice", "Preview total"].forEach(copy => expect(invoiceDetail).toContain(copy));
    ["Grant download access", "Grant Download", "Granted downloads"].forEach(copy => expect(ownerProductAccess).toContain(copy));
  });

  it("registers the requested DJDC owner operations navigation without fabricated financial results", () => {
    ["Dashboard", "Inventory", "Sales", "Customers", "Content", "Vouchers", "Settings", "Support"].forEach(label => expect(ownerNavigation).toContain(`label: "${label}"`));
    ["/owner/inventory", "/owner/sales", "/owner/customers", "/owner/content", "/owner/vouchers", "/owner/settings", "/owner/support"].forEach(path => expect(appRoutes).toContain(`path={"${path}"}`));
    expect(ownerDashboard).toContain("No real sales recorded");
  });
});
