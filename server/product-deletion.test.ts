import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const database = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const ownerProducts = readFileSync(new URL("../client/src/pages/OwnerProducts.tsx", import.meta.url), "utf8");
const ownerProjects = readFileSync(new URL("../client/src/pages/OwnerProjects.tsx", import.meta.url), "utf8");

describe("owner deletion behavior", () => {
  it("removes history-linked products from public catalogue without breaking buyer records", () => {
    expect(database).toContain("export async function deleteDigitalProduct(productId: number)");
    expect(database).toContain("isPublished: false, isFeatured: false, isArchived: true");
    expect(database).toContain("preservedHistory: true as const");
    expect(database).toContain("await db.delete(digitalProducts).where(eq(digitalProducts.id, productId))");
    expect(database).toContain("preservedHistory: false as const");
  });

  it("gives the owner a clear listing-removal flow instead of blocking purchased products", () => {
    expect(ownerProducts).toContain("Existing buyer history and delivery records were kept.");
    expect(ownerProducts).toContain("row.status !== \"Archived\"");
    expect(ownerProducts).toContain("Remove listing");
    expect(ownerProducts).not.toContain("cannot be deleted and must be archived instead");
    expect(ownerProjects).toContain("permanently deleted and cannot be recovered");
  });
});
