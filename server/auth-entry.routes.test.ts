import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appRoutes = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const entryPage = readFileSync(new URL("../client/src/pages/AuthEntry.tsx", import.meta.url), "utf8");
const publicLayout = readFileSync(new URL("../client/src/components/PublicLayout.tsx", import.meta.url), "utf8");
const shopPage = readFileSync(new URL("../client/src/pages/Shop.tsx", import.meta.url), "utf8");
const authHook = readFileSync(new URL("../client/src/_core/hooks/useAuth.ts", import.meta.url), "utf8");
const authRouter = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");

describe("authentication entry styling", () => {
  it("registers public login and signup routes with first-party authentication procedures", () => {
    expect(appRoutes).toContain('path={"/login"}');
    expect(appRoutes).toContain('path={"/signup"}');
    expect(entryPage).toContain("trpc.auth.login.useMutation");
    expect(entryPage).toContain("trpc.auth.register.useMutation");
    expect(authRouter).toContain("auth: router({");
    expect(authRouter).toContain("register: publicProcedure");
    expect(authRouter).toContain("login: publicProcedure");
  });

  it("uses the requested local email and password form structure", () => {
    expect(entryPage).toContain("Email address");
    expect(entryPage).toContain('label="Password"');
    expect(entryPage).toContain('label="Confirm password"');
    expect(entryPage).toContain("Terms & conditions");
    expect(publicLayout).toContain('href="/login"');
    expect(publicLayout).toContain('href="/signup"');
    expect(shopPage).not.toContain("startLogin(");
    expect(authHook).toContain('window.location.href = "/login"');
  });
});
