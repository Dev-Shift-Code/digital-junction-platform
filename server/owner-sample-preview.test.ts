import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(new URL("../client/src/pages/OwnerDashboard.tsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../client/src/pages/OwnerWorkspaceViews.tsx", import.meta.url), "utf8");
const sampleData = readFileSync(new URL("../client/src/data/ownerSamplePreview.ts", import.meta.url), "utf8");

describe("owner sample preview safeguards", () => {
  it("uses clearly labelled visual previews without creating fictional commercial records", () => {
    ["Sample listing layouts", "Preview only", "Awaiting real sales"].forEach(copy => expect(dashboard).toContain(copy));
    ["Sample preview", "Data-safe by design"].forEach(copy => expect(workspace).toContain(copy));
    ["Preview only", "No live data", "No fictional redemptions"].forEach(copy => expect(sampleData).toContain(copy));
  });
});
