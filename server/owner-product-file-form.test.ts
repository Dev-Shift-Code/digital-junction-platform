import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const inventory = readFileSync(new URL("../client/src/pages/OwnerProducts.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

describe("owner product form", () => {
  it("keeps Add/Edit Product focused on the requested public fields", () => {
    ["Product Cover", "Title", "Category", "Short Public Summary", "Publish publicly", "Feature on catalogue", "Purchase method", 'name="gumroadUrl"', 'name="payhipUrl"'].forEach(copy => expect(inventory).toContain(copy));
    ["Buyer delivery files", "Files the buyer receives", "Add buyer files", "Queued for upload", "Saved buyer files", 'name="description"', 'name="deliveryNotes"', 'name="price"', 'name="sortOrder"'].forEach(copy => expect(inventory).not.toContain(copy));
  });

  it("keeps the public product page focused on product information and external purchase options", () => {
    expect(detail).toContain("productQuery.data?.deliveryNotes?.trim()");
    expect(detail).toContain("ProductPurchaseActions");
    expect(detail).not.toContain("/checkout/");
    expect(detail).not.toContain("Buy now");
  });
});
