import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const inventory = readFileSync(new URL("../client/src/pages/OwnerProducts.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");

describe("owner product form delivery-file workflow", () => {
  it("keeps local buyer-file upload and removal inside the Add/Edit Product form", () => {
    ["Buyer delivery files", "Files the buyer receives", "multiple", "Queued for upload", "Saved buyer files", "productFiles.upload", "productFiles.remove"].forEach(copy => expect(inventory).toContain(copy));
    expect(inventory).not.toContain("Manage buyer files");
  });

  it("removes the standalone buyer-file route", () => {
    expect(app).not.toContain("OwnerProductFiles");
    expect(app).not.toContain("/owner/product-files");
  });

  it("keeps text inclusions and file metadata separate without rendering stored file links", () => {
    expect(detail).toContain("productQuery.data?.deliveryNotes?.trim()");
    expect(detail).toContain("Included files");
    expect(detail).not.toContain("fileUrl");
  });
});
