import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { OWNER_SESSION_COOKIE } from "@shared/const";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  ownerUser?: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let ownerUser: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  try {
    ownerUser = await sdk.authenticateRequest(opts.req, OWNER_SESSION_COOKIE);
  } catch (error) {
    ownerUser = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    ownerUser,
  };
}
