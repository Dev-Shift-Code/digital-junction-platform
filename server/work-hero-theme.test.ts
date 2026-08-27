import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("Selected Work hero theme", () => {
  it("uses the established dark-green surface with mint and cream readable contrast", () => {
    const workPage = readFileSync(resolve(root, "client/src/pages/Work.tsx"), "utf8");
    expect(workPage).toContain('bg-[#1A312C] py-20 text-[#FFF4E1]');
    expect(workPage).toContain('eyebrow text-[#89D7B7]');
    expect(workPage).toContain('text-[#FFF4E1] sm:text-6xl');
    expect(workPage).toContain('text-[#FFF4E1]/72');
  });
});
