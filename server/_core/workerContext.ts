import type { User } from "../../drizzle/schema";
import { OWNER_SESSION_COOKIE } from "@shared/const";
import { sdk } from "./sdk";

type WorkerResponse = {
  cookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
};

function workerRequest(request: Request) {
  const url = new URL(request.url);
  return {
    protocol: url.protocol.replace(":", ""),
    headers: {
      cookie: request.headers.get("cookie") ?? undefined,
      authorization: request.headers.get("authorization") ?? undefined,
      "x-forwarded-proto": request.headers.get("x-forwarded-proto") ?? undefined,
    },
  } as any;
}

function workerResponse(resHeaders: Headers): WorkerResponse {
  const writeCookie = (name: string, value: string, options: Record<string, unknown>, clear = false) => {
    const maxAgeMs = typeof options.maxAge === "number" ? options.maxAge : undefined;
    const attributes = [
      `${name}=${encodeURIComponent(value)}`,
      `Path=${typeof options.path === "string" ? options.path : "/"}`,
      options.httpOnly !== false ? "HttpOnly" : "",
      options.secure === true ? "Secure" : "",
      `SameSite=${options.sameSite === "none" ? "None" : "Lax"}`,
      clear ? "Max-Age=0" : maxAgeMs === undefined ? "" : `Max-Age=${Math.max(0, Math.floor(maxAgeMs / 1000))}`,
      clear ? "Expires=Thu, 01 Jan 1970 00:00:00 GMT" : "",
    ].filter(Boolean).join("; ");
    resHeaders.append("Set-Cookie", attributes);
  };

  return {
    cookie: (name, value, options) => writeCookie(name, value, options),
    clearCookie: (name, options) => writeCookie(name, "", options, true),
  };
}

/** Cloudflare Fetch adapter context preserving the existing owner/customer session contract. */
export async function createWorkerContext({ req, resHeaders }: { req: Request; resHeaders: Headers }) {
  const request = workerRequest(req);
  const response = workerResponse(resHeaders);
  let user: User | null = null;
  let ownerUser: User | null = null;

  try { user = await sdk.authenticateRequest(request); } catch { user = null; }
  try { ownerUser = await sdk.authenticateRequest(request, OWNER_SESSION_COOKIE); } catch { ownerUser = null; }
  if (!ownerUser && user?.role === "admin") ownerUser = user;

  return { req: request, res: response, user, ownerUser } as any;
}
