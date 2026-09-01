import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const resolver = readFileSync(new URL("../client/src/hooks/usePublicSection.ts", import.meta.url), "utf8");
const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const ownerEditor = readFileSync(new URL("../client/src/pages/OwnerPublicContent.tsx", import.meta.url), "utf8");
const defaults = readFileSync(new URL("../client/src/data/publicContentDefaults.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const structured = readFileSync(new URL("../client/src/data/publicContentStructured.ts", import.meta.url), "utf8");
const publicFiles = [
  "../client/src/pages/Home.tsx",
  "../client/src/pages/Shop.tsx",
  "../client/src/pages/Services.tsx",
  "../client/src/pages/Work.tsx",
  "../client/src/pages/About.tsx",
  "../client/src/pages/Contact.tsx",
    "../client/src/components/PublicLayout.tsx",
  "../client/src/pages/LegalPages.tsx",
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
    ["home", "shop", "services", "work", "about", "contact", "footer", "legal"].forEach(page => expect(publicFiles.some(source => source.includes(`usePublicSection(\"${page}\"`))).toBe(true));
    expect(ownerEditor).toContain('"story"');
  });

  it("provides a detailed card-based owner editing workspace with explicit save feedback", () => {
    ["Choose what you want to edit.", "Hero and public summary", "Public heading", "Public description", "Section image URL", "Button link", "Restore current default", "Visible", "Save changes"].forEach(copy => expect(ownerEditor).toContain(copy));
    expect(ownerEditor).toContain("Promise.all(changed.map");
    expect(ownerEditor).toContain("No changes to save on this page.");
    expect(ownerEditor).toContain("Owner-only editor");
    expect(ownerEditor).toContain("services-grid-cards");
    expect(ownerEditor).toContain('id: "form"');
  });

  it("supports structured repeated cards, links, and form copy without fake records", () => {
    expect(structured).toContain("parseEditableCards");
    expect(structured).toContain("parseEditableLinks");
    expect(structured).toContain("parseEditableKeyValues");
    expect(publicFiles.some(source => source.includes("parseEditableCards"))).toBe(true);
    expect(publicFiles.some(source => source.includes("parseEditableKeyValues"))).toBe(true);
  });

  it("preloads complete visitor-facing values and persists editable eyebrow labels", () => {
    ["Connecting Ideas. Building Digital Success.", "Digital solutions overview", "Explore products", "Start a conversation"].forEach(copy => expect(defaults).toContain(copy));
    expect(ownerEditor).toContain("getPublicSectionDefault");
    expect(ownerEditor).toContain("eyebrow: draft.eyebrow.trim() || null");
    expect(resolver).toContain("eyebrow: saved?.eyebrow ?? fallback.eyebrow");
    expect(schema).toContain('eyebrow: varchar("eyebrow", { length: 160 })');
  });
});
