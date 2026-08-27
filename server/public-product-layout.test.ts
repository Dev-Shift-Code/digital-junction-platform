import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shop = readFileSync(new URL("../client/src/pages/Shop.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../client/src/pages/ProductDetail.tsx", import.meta.url), "utf8");

describe("public product layout", () => {
  it("does not render the removed standalone guest-checkout promotion in Shop", () => {
    expect(shop).not.toContain("Browse and checkout as a guest.");
    expect(shop).not.toContain("Guest checkout requests do not collect payment");
    expect(shop).not.toContain('usePublicSection("shop", "call-to-action"');
  });

  it("uses a compact 1:1 square product cover on public product details", () => {
    expect(detail).toContain("aspect-square");
    expect(detail).toContain("max-w-[24rem]");
    expect(detail).not.toContain("aspect-[1.18]");
  });

  it("keeps the Shop inside the established DJDC cream, dark-green, teal, and mint visual system", () => {
    ["hero-grid", "bg-[#1A312C]", "bg-[#FFF4E1]", "bg-[#89D7B7]", "bg-[#428475]"].forEach(token => expect(shop).toContain(token));
    expect(shop).not.toContain("bg-white");
  });
});
