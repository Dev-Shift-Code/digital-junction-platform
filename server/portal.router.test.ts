import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type ContextUser = NonNullable<TrpcContext["user"]>;

function createContext(role?: ContextUser["role"]): TrpcContext {
  const user: ContextUser | null = role
    ? {
        id: role === "admin" ? 1 : 2,
        openId: role === "admin" ? "owner" : "client",
        name: role === "admin" ? "Owner" : "Client",
        email: `${role}@example.com`,
        loginMethod: "manus",
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("portal router access control", () => {
  it("requires authentication before exposing a client's projects", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.portal.projects.listMine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects owner dashboard data requests from a non-admin client", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.portal.admin.projects()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates public inquiry inputs before any database operation", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.portal.inquiries.create({ name: "A", email: "not-an-email", message: "too short" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("protects native product management from non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.portal.admin.products.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates a product enquiry before any database operation", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.portal.products.inquire({ productId: 0, name: "A", email: "bad-email", message: "short" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
