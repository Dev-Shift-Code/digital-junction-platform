import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectsPage = readFileSync(new URL("../client/src/pages/OwnerProjects.tsx", import.meta.url), "utf8");
const navigation = readFileSync(new URL("../client/src/data/ownerNavigation.ts", import.meta.url), "utf8");
const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const router = readFileSync(new URL("../server/routers/portal.ts", import.meta.url), "utf8");

describe("owner project management", () => {
  it("adds a protected Projects sidebar route and workspace", () => {
    expect(navigation).toContain('label: "Projects", path: "/owner/projects"');
    expect(app).toContain('path={"/owner/projects"} component={OwnerProjects}');
    expect(projectsPage).toContain('useAuth({ scope: "owner" })');
    expect(projectsPage).toContain("Add project");
  });

  it("provides the requested project form fields and local removable cover control", () => {
    ["Project Cover", "Project Title", "Project Description", "Problem Addressed", "Key Features", "My Contribution", "Tech Stack"].forEach(copy => expect(projectsPage).toContain(copy));
    expect(projectsPage).toContain('type="file" accept="image/*"');
    expect(projectsPage).toContain("Replace cover");
    expect(projectsPage).toContain("Project cover removed.");
    expect(projectsPage).not.toContain("file.size >");
  });

  it("keeps project cover uploads owner-only and removes the application size cap", () => {
    expect(router).toContain("caseStudies: router({");
    expect(router).toContain("uploadCover: adminProcedure");
    expect(router).toContain("removeCover: adminProcedure");
    expect(router).toContain("sizeBytes: z.number().int().min(1), base64: z.string().min(1)");
    expect(router).not.toContain("Project covers must be smaller");
  });
});
