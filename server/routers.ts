import { randomUUID } from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS, OWNER_SESSION_COOKIE } from "@shared/const";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { hashPassword, normalizeEmail, verifyPassword } from "./localAuth";
import { portalRouter } from "./routers/portal";

const credentialsInput = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});
const ownerSetupInput = credentialsInput.extend({ setupToken: z.string().min(1).max(256) });

async function issueLocalSession(ctx: { req: any; res: any }, user: { openId: string; name: string | null; email: string | null }, scope: "customer" | "owner" = "customer") {
  const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || user.email || "Digital Junction customer" });
  ctx.res.cookie(scope === "owner" ? OWNER_SESSION_COOKIE : COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
}

function publicAccount(user: Awaited<ReturnType<typeof db.getUserByOpenId>> | null | undefined) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => publicAccount(opts.ctx.user)),
    ownerMe: publicProcedure.query(opts => publicAccount(opts.ctx.ownerUser)),
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
      if (!user.passwordHash) throw new Error("Owner password has not been set yet. Open /owner/setup with your private setup token first.");
      if (!await verifyPassword(input.password, user.passwordHash)) throw new Error("Incorrect owner email or password.");
      await db.recordUserSignIn(user.openId);
      await issueLocalSession(ctx, user, "owner");
      return { success: true } as const;
    }),
    ownerSetup: publicProcedure.input(ownerSetupInput).mutation(async ({ ctx, input }) => {
      if (!ENV.ownerSetupToken || input.setupToken !== ENV.ownerSetupToken) throw new Error("Invalid owner setup token.");
      const email = normalizeEmail(input.email);
      if (ENV.ownerEmail && email !== normalizeEmail(ENV.ownerEmail)) throw new Error("This email is not the configured owner account.");
      let user = await db.getUserByEmail(email);
      if (!user) {
        if (!ENV.ownerEmail) throw new Error("Set OWNER_EMAIL before creating the first owner account.");
        if (await db.hasAdminUser()) throw new Error("An owner account already exists. Use Owner sign in.");
        user = await db.createLocalUser({
          openId: `local-owner-${randomUUID()}`,
          email,
          name: "Digital Junction Owner",
          passwordHash: await hashPassword(input.password),
          role: "admin",
        });
        await issueLocalSession(ctx, user, "owner");
        return { success: true } as const;
      }
      if (user.role !== "admin") throw new Error("This email is not the configured owner account.");
      if (user.passwordHash) throw new Error("A direct owner password is already configured. Use Owner sign in.");
      await db.setUserPassword(user.id, await hashPassword(input.password));
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
