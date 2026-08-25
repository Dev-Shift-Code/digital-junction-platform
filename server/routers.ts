import { randomUUID } from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS, OWNER_SESSION_COOKIE } from "@shared/const";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { hashPassword, normalizeEmail, verifyPassword } from "./localAuth";
import { portalRouter } from "./routers/portal";

const credentialsInput = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

async function issueLocalSession(ctx: { req: any; res: any }, user: { openId: string; name: string | null; email: string | null }, scope: "customer" | "owner" = "customer") {
  const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || user.email || "Digital Junction customer" });
  ctx.res.cookie(scope === "owner" ? OWNER_SESSION_COOKIE : COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    ownerMe: publicProcedure.query(opts => opts.ctx.ownerUser ?? null),
    register: publicProcedure.input(credentialsInput).mutation(async ({ ctx, input }) => {
      const email = normalizeEmail(input.email);
      const existing = await db.getUserByEmail(email);
      if (existing) throw new Error("An account with this email already exists.");
      const user = await db.createLocalUser({ openId: `local-${randomUUID()}`, email, passwordHash: await hashPassword(input.password) });
      await issueLocalSession(ctx, user);
      return { success: true } as const;
    }),
    login: publicProcedure.input(credentialsInput).mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmail(normalizeEmail(input.email));
      if (!user || !await verifyPassword(input.password, user.passwordHash)) throw new Error("Incorrect email or password.");
      await db.recordUserSignIn(user.openId);
      await issueLocalSession(ctx, user);
      return { success: true } as const;
    }),
    ownerLogin: publicProcedure.input(credentialsInput).mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmail(normalizeEmail(input.email));
      if (!user || user.role !== "admin") throw new Error("Incorrect owner email or password.");
      if (!user.passwordHash) throw new Error("Owner password has not been set yet. Open /owner/setup from your existing administrator access first.");
      if (!await verifyPassword(input.password, user.passwordHash)) throw new Error("Incorrect owner email or password.");
      await db.recordUserSignIn(user.openId);
      await issueLocalSession(ctx, user, "owner");
      return { success: true } as const;
    }),
    setPassword: adminProcedure.input(z.object({ password: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      await db.setUserPassword(ctx.user.id, await hashPassword(input.password));
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    ownerLogout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(OWNER_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  portal: portalRouter,
});

export type AppRouter = typeof appRouter;
