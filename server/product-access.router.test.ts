import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  grantProductAccess: vi.fn(),
  getUserProductAccess: vi.fn(),
  getAuthorizedProductDownload: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: role,
      name: role,
      email: `${role}@example.com`,
      passwordHash: null,
      loginMethod: "digital-junction",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const accessRow = {
  access: {
    id: 44,
    productId: 9,
    userId: 2,
    deliveryUrl: "https://downloads.example.com/authorized-product.zip",
    deliveryFileName: "authorized-product.zip",
    grantedByUserId: 1,
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-01-20"),
  },
  product: {
    id: 9,
    title: "Authorized Digital Product",
    category: "Template",
    summary: "A product with owner-granted download access.",
    updatedAt: new Date("2026-01-19"),
  },
};

describe("owner-granted product access", () => {
  beforeEach(() => vi.resetAllMocks());

  it("allows an owner to grant access, returns safe metadata to the customer, and exposes the delivery URL only through the authorized download action", async () => {
    dbMock.grantProductAccess.mockResolvedValue(accessRow.access);
    dbMock.getUserProductAccess.mockResolvedValue([accessRow]);
    dbMock.getAuthorizedProductDownload.mockResolvedValue(accessRow);

    const owner = appRouter.createCaller(context("admin"));
    await expect(owner.portal.admin.productAccess.grant({ productId: 9, userId: 2, deliveryUrl: accessRow.access.deliveryUrl, deliveryFileName: accessRow.access.deliveryFileName })).resolves.toEqual(accessRow.access);
    expect(dbMock.grantProductAccess).toHaveBeenCalledWith(expect.objectContaining({ productId: 9, userId: 2, grantedByUserId: 1 }));

    const customer = appRouter.createCaller(context("user"));
    const library = await customer.portal.productAccess.listMine();
    expect(library).toEqual([expect.objectContaining({ accessId: 44, deliveryFileName: "authorized-product.zip" })]);
    expect(library[0]).not.toHaveProperty("deliveryUrl");

    await expect(customer.portal.productAccess.download({ accessId: 44 })).resolves.toEqual({ fileUrl: accessRow.access.deliveryUrl, fileName: "authorized-product.zip", productTitle: "Authorized Digital Product" });
  });
});
