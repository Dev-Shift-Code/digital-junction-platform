import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const inventory = readFileSync(new URL("../client/src/pages/OwnerProducts.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../client/src/pages/OwnerWorkspaceViews.tsx", import.meta.url), "utf8");
const portalRouter = readFileSync(new URL("../server/routers/portal.ts", import.meta.url), "utf8");
const serverEntry = readFileSync(new URL("../server/_core/application.ts", import.meta.url), "utf8");

describe("owner product form delivery-file workflow", () => {
  it("keeps local buyer-file upload and removal inside the Add/Edit Product form", () => {
    ["Buyer delivery files", "Files the buyer receives", "multiple", "Queued for upload", "Saved buyer files", "productFiles.upload", "productFiles.remove"].forEach(copy => expect(inventory).toContain(copy));
    expect(inventory).not.toContain("Manage buyer files");
  });

  it("uploads selected files immediately for a saved product and queues them only for a new listing", () => {
    expect(inventory).toContain('if (editor && editor !== "new")');
    expect(inventory).toContain("await uploadBuyerFile.mutateAsync");
    expect(inventory).toContain("buyer file");
    expect(inventory).toContain("queued. Save the new product");
  });

  it("accepts PDF, ZIP, and other buyer files without the former 8 MB application limit", () => {
    expect(inventory).toContain('accept="*/*"');
    expect(inventory).toContain('mimeType: file.type || "application/octet-stream"');
    expect(inventory).not.toContain("file.size <= 8_000_000");
    expect(portalRouter).toContain('sizeBytes: z.number().int().min(0), base64: z.string().min(1)');
    expect(portalRouter).not.toContain("Product files must be smaller than 8 MB.");
    expect(serverEntry).toContain('express.json({ limit: "2gb" })');
    expect(portalRouter).not.toContain('productFiles: router({\n      upload: adminProcedure.input(z.object({ productId: z.number().int().positive(), fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().max(160).optional().refine');
  });

  it("removes the standalone buyer-file route", () => {
    expect(app).not.toContain("OwnerProductFiles");
    expect(app).not.toContain("/owner/product-files");
    expect(workspace).not.toContain("/owner/product-files");
    expect(workspace).toContain("Manage files in Inventory");
  });

  it("keeps buyer files owner-only while public details render text-only inclusions", () => {
    expect(detail).toContain("productQuery.data?.deliveryNotes?.trim()");
    expect(detail).not.toContain("Included files");
    expect(detail).not.toContain("productFiles.inclusions");
    expect(detail).not.toContain("fileUrl");
  });
});
