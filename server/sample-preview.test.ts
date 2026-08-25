import { describe, expect, it } from "vitest";
import { sampleCustomerInvoices, sampleCustomerOrders, sampleCustomerServiceProjects } from "../client/src/data/sampleClientJourney";
import { sampleBillingRecords, sampleClientProjects, sampleProducts, sampleProjects, sampleResources } from "../client/src/data/samplePreview";

describe("sample preview data", () => {
  it("provides at least ten labelled product and project concepts for design review", () => {
    expect(sampleProducts).toHaveLength(10);
    expect(sampleProjects).toHaveLength(10);
    expect(sampleProducts.every(product => product.isSample && product.slug.startsWith("sample-"))).toBe(true);
    expect(sampleProjects.every(project => project.isSample)).toBe(true);
  });

  it("resolves product-detail sample slugs and exposes supporting preview records", () => {
    expect(sampleProducts.find(product => product.slug === "sample-creator-portfolio-launch-kit")?.title).toBe("Creator Portfolio Launch Kit");
    expect(sampleClientProjects.length).toBeGreaterThan(0);
    expect(sampleBillingRecords.length).toBeGreaterThan(0);
    expect(sampleResources.length).toBeGreaterThan(0);
  });

  it("keeps customer-facing service, order, and billing samples explicitly labelled as previews", () => {
    expect(sampleCustomerServiceProjects).toHaveLength(3);
    expect(sampleCustomerOrders).toHaveLength(4);
    expect(sampleCustomerInvoices).toHaveLength(3);
    expect(sampleCustomerOrders.every(order => order.reference.startsWith("SAMPLE-ORDER"))).toBe(true);
    expect(sampleCustomerInvoices.every(invoice => invoice.status === "Preview only")).toBe(true);
  });
});
