import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const resolver = readFileSync(new URL("../client/src/hooks/usePublicSection.ts", import.meta.url), "utf8");
const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const ownerEditor = readFileSync(new URL("../client/src/pages/OwnerPublicContent.tsx", import.meta.url), "utf8");
const publicFiles = [
  "../client/src/pages/Home.tsx",
  "../client/src/pages/Shop.tsx",
  "../client/src/pages/Services.tsx",
  "../client/src/pages/Work.tsx",
  "../client/src/pages/About.tsx",
  "../client/src/pages/Contact.tsx",
  "../client/src/components/PublicLayout.tsx",
].map(path => readFileSync(new URL(path, import.meta.url), "utf8"));

describe("public content override wiring", () => {
  it("resolves owner content through one typed public-page query and preserves fallback values", () => {
    expect(resolver).toContain("trpc.portal.publicContent.list.useQuery");
    expect(resolver).toContain("saved?.title ?? fallback.title");
    expect(resolver).toContain("saved?.isPublished ?? fallback.isVisible ?? true");
  });

  it("redacts unpublished public content fields while retaining only the hidden-section state", () => {
    expect(db).toContain("return rows.map(row => row.isPublished ? row");
    ["title: null", "body: null", "imageUrl: null", "ctaLabel: null", "ctaHref: null"].forEach(copy => expect(db).toContain(copy));
  });

  it("connects every editor page to visitor-facing content overrides", () => {
    ["home", "shop", "services", "work", "about", "contact", "footer"].forEach(page => expect(publicFiles.some(source => source.includes(`usePublicSection(\"${page}\"`))).toBe(true));
    expect(ownerEditor).toContain('"story"');
  });
});
