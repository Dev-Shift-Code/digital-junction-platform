import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appRoutes = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const entryPage = readFileSync(new URL("../client/src/pages/AuthEntry.tsx", import.meta.url), "utf8");
const publicLayout = readFileSync(new URL("../client/src/components/PublicLayout.tsx", import.meta.url), "utf8");

describe("authentication entry styling", () => {
  it("registers public login and signup routes while retaining the managed authentication trigger", () => {
    expect(appRoutes).toContain('path={"/login"}');
    expect(appRoutes).toContain('path={"/signup"}');
    expect(entryPage).toContain("startLogin()");
  });

  it("uses an honest managed-account handoff instead of a non-functional local credential form", () => {
    expect(entryPage).toContain("Your existing form stays protected.");
    expect(entryPage).toContain("managed account service");
    expect(entryPage).toContain("managed provider determines available registration and sign-in options");
    expect(entryPage).not.toContain("confirmPassword");
    expect(entryPage).not.toContain("type=\"password\"");
    expect(publicLayout).toContain('href="/login"');
    expect(publicLayout).toContain('href="/signup"');
  });
});
