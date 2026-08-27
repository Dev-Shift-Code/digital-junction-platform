import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");

describe("dashboard session recovery", () => {
  it("bounds auth loading and provides an owner-safe recovery path without exposing session tokens", () => {
    ["SESSION_LOADING_GRACE_MS", "sessionCheckTimedOut", "Retry session check", "direct Owner sign-in page", "void refresh()"].forEach(copy => expect(layout).toContain(copy));
    expect(layout).not.toContain("djdc_owner_session=");
  });
});
