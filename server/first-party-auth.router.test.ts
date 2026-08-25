import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";
import { hashPassword } from "./localAuth";
import { sdk } from "./_core/sdk";

const dbMock = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  createLocalUser: vi.fn(),
  recordUserSignIn: vi.fn(),
  setUserPassword: vi.fn(),
  getClientProjects: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";

type CookieRecord = { name: string; value: string; options: Record<string, unknown> };

function context(user: any = null) {
  const cookies: CookieRecord[] = [];
  return {
    cookies,
    ctx: {
      user,
      req: { protocol: "https", headers: {} },
      res: {
        cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }),
        clearCookie: vi.fn(),
      },
    },
  };
}

const localUser = {
  id: 91,
  openId: "local-customer-91",
  name: "Customer",
  email: "customer@example.com",
  passwordHash: "",
  loginMethod: "digital-junction",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("first-party Digital Junction account router", () => {
  beforeEach(() => vi.resetAllMocks());

  it("registers a direct customer account with a hashed password and issues the existing session cookie", async () => {
    const { ctx, cookies } = context();
    dbMock.getUserByEmail.mockResolvedValue(undefined);
    dbMock.createLocalUser.mockImplementation(async (input: any) => ({ ...localUser, openId: input.openId, email: input.email, passwordHash: input.passwordHash }));
    const caller = appRouter.createCaller(ctx as any);

    await expect(caller.auth.register({ email: "Customer@Example.com", password: "Digital-Junction-2026" })).resolves.toEqual({ success: true });

    expect(dbMock.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ email: "customer@example.com" }));
    expect(dbMock.createLocalUser.mock.calls[0]?.[0]?.passwordHash).not.toContain("Digital-Junction-2026");
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    await expect(sdk.verifySession(cookies[0]?.value)).resolves.toMatchObject({ openId: expect.stringMatching(/^local-/) });
  });

  it("logs in a direct customer, refreshes the session, and permits protected client project access", async () => {
    const { ctx, cookies } = context();
    dbMock.getUserByEmail.mockResolvedValue({ ...localUser, passwordHash: await hashPassword("Digital-Junction-2026") });
    dbMock.recordUserSignIn.mockResolvedValue(undefined);
    dbMock.getClientProjects.mockResolvedValue([]);
    const caller = appRouter.createCaller(ctx as any);

    await expect(caller.auth.login({ email: "customer@example.com", password: "Digital-Junction-2026" })).resolves.toEqual({ success: true });
    expect(dbMock.recordUserSignIn).toHaveBeenCalledWith(localUser.openId);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);

    const protectedCaller = appRouter.createCaller(context(localUser).ctx as any);
    await expect(protectedCaller.portal.projects.listMine()).resolves.toEqual([]);
  });

  it("allows the authenticated existing administrator to set a direct DJDC password", async () => {
    const admin = { ...localUser, id: 1, role: "admin" as const, passwordHash: null };
    const caller = appRouter.createCaller(context(admin).ctx as any);

    await expect(caller.auth.setPassword({ password: "Digital-Junction-Owner-2026" })).resolves.toEqual({ success: true });
    expect(dbMock.setUserPassword).toHaveBeenCalledWith(1, expect.not.stringContaining("Digital-Junction-Owner-2026"));
  });
});
