import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const publicLayout = readFileSync(new URL("../client/src/components/PublicLayout.tsx", import.meta.url), "utf8");
const contactPage = readFileSync(new URL("../client/src/pages/Contact.tsx", import.meta.url), "utf8");

describe("public interaction accessibility safeguards", () => {
  it("defines a visible keyboard focus treatment and reduced-motion fallback", () => {
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("outline: 3px solid #89D7B7");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });

  it("defines hover affordances for buttons, navigation, and interactive cards", () => {
    expect(styles).toContain(".button-primary:hover");
    expect(styles).toContain(".button-quiet:hover");
    expect(styles).toContain(".nav-link:hover");
    expect(styles).toContain(".service-card:hover");
  });

  it("uses an accessible, labelled mobile navigation control", () => {
    expect(publicLayout).toContain('aria-controls="mobile-site-navigation"');
    expect(publicLayout).toContain('id="mobile-site-navigation"');
    expect(publicLayout).toContain('aria-label="Mobile navigation"');
  });

  it("styles public form focus and keeps footer destinations visible and routed", () => {
    expect(styles).toContain(".form-field:focus");
    expect(contactPage).toContain('className="form-field');
    expect(publicLayout).toContain("const legalLinks = parseEditableLinks");
    expect(publicLayout).toContain("legalLinks.map");
    expect(publicLayout).toContain("footerLegal");
    expect(publicLayout).toContain("hover:text-[#89D7B7]");
  });
});
