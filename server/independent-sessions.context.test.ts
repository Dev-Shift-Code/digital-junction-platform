import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME, OWNER_SESSION_COOKIE } from "../shared/const";

const dbMock = vi.hoisted(() => ({
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { createContext } from "./_core/context";
import { sdk } from "./_core/sdk";

const customer = { id: 2, openId: "local-customer", name: "Customer", email: "customer@example.com", passwordHash: "hash", loginMethod: "digital-junction", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const owner = { id: 1, openId: "local-owner", name: "Owner", email: "owner@example.com", passwordHash: "hash", loginMethod: "digital-junction", role: "admin" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("independent customer and owner sessions", () => {
  beforeEach(() => vi.resetAllMocks());

  it("resolves customer and owner identities from their distinct cookies in the same browser request", async () => {
    const customerToken = await sdk.createSessionToken(customer.openId, { name: customer.name });
    const ownerToken = await sdk.createSessionToken(owner.openId, { name: owner.name });
    dbMock.getUserByOpenId.mockImplementation(async (openId: string) => openId === customer.openId ? customer : openId === owner.openId ? owner : undefined);
    dbMock.upsertUser.mockResolvedValue(undefined);
    const req = { protocol: "https", headers: { cookie: `${COOKIE_NAME}=${customerToken}; ${OWNER_SESSION_COOKIE}=${ownerToken}` } } as any;
    const ctx = await createContext({ req, res: {} as any } as any);

    expect(ctx.user).toMatchObject({ id: customer.id, role: "user" });
    expect(ctx.ownerUser).toMatchObject({ id: owner.id, role: "admin" });
    expect(dbMock.getUserByOpenId).toHaveBeenCalledWith(customer.openId);
    expect(dbMock.getUserByOpenId).toHaveBeenCalledWith(owner.openId);
  });

  it("allows the existing administrator to bootstrap owner access from a legacy admin session", async () => {
    const adminToken = await sdk.createSessionToken(owner.openId, { name: owner.name });
    dbMock.getUserByOpenId.mockResolvedValue(owner);
    dbMock.upsertUser.mockResolvedValue(undefined);
    const ctx = await createContext({ req: { protocol: "https", headers: { cookie: `${COOKIE_NAME}=${adminToken}` } } as any, res: {} as any } as any);

    expect(ctx.user).toMatchObject({ id: owner.id, role: "admin" });
    expect(ctx.ownerUser).toMatchObject({ id: owner.id, role: "admin" });
  });
});
