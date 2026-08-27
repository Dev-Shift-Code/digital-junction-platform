import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("Owner Sales management workspace", () => {
  it("uses real D1 order records for metrics, filters, CSV export, and payment or fulfilment actions", () => {
    const sales = readFileSync(resolve(root, "client/src/pages/OwnerSalesManagement.tsx"), "utf8");
    const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
    expect(sales).toContain("trpc.portal.admin.orders.list.useQuery");
    expect(sales).toContain("Gross order value");
    expect(sales).toContain("Verified payment value");
    expect(sales).toContain("Export CSV");
    expect(sales).toContain("paymentStatus");
    expect(sales).toContain("reviewPayment.mutate");
    expect(sales).toContain("updateOrder.mutate");
    expect(sales).toContain("revokeDeliveryLinks.useMutation");
    expect(sales).toContain("createReplacementDeliveryLink.useMutation");
    expect(sales).toContain("retryDeliveryEmail.useMutation");
    expect(sales).toContain("retryRejectionEmail.useMutation");
    expect(sales).toContain("Payment review email:");
    expect(sales).toContain("Retry payment email");
    expect(sales).toContain("Email:");
    expect(sales).toContain("Revoke unused links");
    expect(sales).toContain("New link");
    expect(sales).toContain("does not create sample sales");
    expect(app).toContain('path={"/owner/sales"} component={OwnerSalesManagement}');
  });
});
