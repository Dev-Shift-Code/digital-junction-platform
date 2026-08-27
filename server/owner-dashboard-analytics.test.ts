import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(new URL("../client/src/pages/OwnerDashboard.tsx", import.meta.url), "utf8");

describe("owner dashboard analytics layout", () => {
  it("contains every requested analytics section with explicit real-data safeguards", () => {
    ["Total Revenue", "Total Projects", "Total Customers", "Avg. Order Value", "Sales Overview", "Recent Activities", "Weekly Sales", "Top Products", "Monthly Revenue", "Recent Transactions"].forEach(label => expect(dashboard).toContain(label));
    ["Awaiting real sales", "Awaiting real orders", "No recorded data yet.", "No real transactions yet."].forEach(copy => expect(dashboard).toContain(copy));
  });

  it("uses honest empty analytics states rather than fabricated chart values", () => {
    expect(dashboard).toContain("EmptyAnalytics");
    ["PreviewBar", "PreviewPoint", "Sample value", "formatPreviewPeso"].forEach(copy => expect(dashboard).not.toContain(copy));
  });
});
