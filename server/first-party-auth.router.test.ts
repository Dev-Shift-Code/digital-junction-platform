import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME, OWNER_SESSION_COOKIE } from "../shared/const";
import { hashPassword } from "./localAuth";
import { sdk } from "./_core/sdk";

const dbMock = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  createLocalUser: vi.fn(),
  hasAdminUser: vi.fn(),
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
      ownerUser: user?.role === "admin" ? user : null,
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

  it("issues a separate owner cookie without replacing the customer-session cookie contract", async () => {
    const owner = { ...localUser, id: 1, openId: "local-owner-1", email: "owner@example.com", role: "admin" as const, passwordHash: await hashPassword("Digital-Junction-Owner-2026") };
    const { ctx, cookies } = context();
    dbMock.getUserByEmail.mockResolvedValue(owner);
    dbMock.recordUserSignIn.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(ctx as any);

    await expect(caller.auth.ownerLogin({ email: "owner@example.com", password: "Digital-Junction-Owner-2026" })).resolves.toEqual({ success: true });
    expect(cookies[0]?.name).toBe(OWNER_SESSION_COOKIE);
    expect(cookies[0]?.name).not.toBe(COOKIE_NAME);
    await expect(sdk.verifySession(cookies[0]?.value)).resolves.toMatchObject({ openId: "local-owner-1" });
  });

  it("never exposes a password hash through customer or owner session responses", async () => {
    const owner = { ...localUser, id: 1, role: "admin" as const, passwordHash: "private-scrypt-hash" };
    const caller = appRouter.createCaller(context(owner).ctx as any);

    await expect(caller.auth.me()).resolves.not.toHaveProperty("passwordHash");
    await expect(caller.auth.ownerMe()).resolves.not.toHaveProperty("passwordHash");
  });

  it("explains when an existing owner must set a direct password before separate owner login", async () => {
    const { ctx } = context();
    dbMock.getUserByEmail.mockResolvedValue({ ...localUser, id: 1, role: "admin" as const, passwordHash: null });
    const caller = appRouter.createCaller(ctx as any);

    await expect(caller.auth.ownerLogin({ email: "owner@example.com", password: "Digital-Junction-Owner-2026" })).rejects.toThrow("Owner password has not been set yet");
  });

  it("uses the configured private owner setup token to create a direct owner password and isolated owner session", async () => {
    const setupToken = process.env.OWNER_SETUP_TOKEN;
    expect(setupToken).toBeTruthy();
    const { ctx, cookies } = context();
    const owner = { ...localUser, id: 1, openId: "local-owner-setup", email: "devshiftcode2025@gmail.com", role: "admin" as const, passwordHash: null };
    dbMock.getUserByEmail.mockResolvedValue(owner);
    dbMock.setUserPassword.mockResolvedValue(undefined);
    dbMock.recordUserSignIn.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(ctx as any);

    await expect(caller.auth.ownerSetup({ email: owner.email, setupToken: setupToken!, password: "Digital-Junction-Owner-2026" })).resolves.toEqual({ success: true });
    expect(dbMock.setUserPassword).toHaveBeenCalledWith(owner.id, expect.not.stringContaining("Digital-Junction-Owner-2026"));
    expect(cookies[0]?.name).toBe(OWNER_SESSION_COOKIE);
  });

  it("allows the configured private owner setup token to replace an existing owner password during recovery", async () => {
    const setupToken = process.env.OWNER_SETUP_TOKEN;
    expect(setupToken).toBeTruthy();
    const { ctx, cookies } = context();
    const owner = { ...localUser, id: 1, openId: "local-owner-recovery", email: "devshiftcode2025@gmail.com", role: "admin" as const, passwordHash: await hashPassword("Previous-Owner-Password-2026") };
    dbMock.getUserByEmail.mockResolvedValue(owner);
    dbMock.setUserPassword.mockResolvedValue(undefined);
    dbMock.recordUserSignIn.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(ctx as any);

    await expect(caller.auth.ownerSetup({ email: owner.email, setupToken: setupToken!, password: "Recovered-Owner-Password-2026" })).resolves.toEqual({ success: true });
    expect(dbMock.setUserPassword).toHaveBeenCalledWith(owner.id, expect.not.stringContaining("Recovered-Owner-Password-2026"));
    expect(dbMock.recordUserSignIn).toHaveBeenCalledWith(owner.openId);
    expect(cookies[0]?.name).toBe(OWNER_SESSION_COOKIE);
  });

  it("bootstraps the first owner only for the configured owner email and private setup token", async () => {
    const setupToken = process.env.OWNER_SETUP_TOKEN;
    process.env.OWNER_EMAIL = "devshiftcode2025@gmail.com";
    const { ctx, cookies } = context();
    dbMock.getUserByEmail.mockResolvedValue(undefined);
    dbMock.hasAdminUser.mockResolvedValue(false);
    dbMock.createLocalUser.mockImplementation(async (input: any) => ({ ...localUser, id: 1, ...input, role: "admin" }));
    const caller = appRouter.createCaller(ctx as any);

    await expect(caller.auth.ownerSetup({ email: "devshiftcode2025@gmail.com", setupToken: setupToken!, password: "Digital-Junction-Owner-2026" })).resolves.toEqual({ success: true });
    expect(dbMock.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ role: "admin", email: "devshiftcode2025@gmail.com" }));
    expect(cookies[0]?.name).toBe(OWNER_SESSION_COOKIE);
    delete process.env.OWNER_EMAIL;
  });

  it("clears only the owner session cookie when the owner signs out", async () => {
    const owner = { ...localUser, id: 1, role: "admin" as const };
    const clearCookie = vi.fn();
    const caller = appRouter.createCaller({ user: null, ownerUser: owner, req: { protocol: "https", headers: {} }, res: { clearCookie } } as any);

    await expect(caller.auth.ownerLogout()).resolves.toEqual({ success: true });
    expect(clearCookie).toHaveBeenCalledWith(OWNER_SESSION_COOKIE, expect.objectContaining({ maxAge: -1 }));
    expect(clearCookie).not.toHaveBeenCalledWith(COOKIE_NAME, expect.anything());
  });
});
