import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const worker = readFileSync(new URL("../cloudflare/worker.ts", import.meta.url), "utf8");
const workerContext = readFileSync(new URL("./_core/workerContext.ts", import.meta.url), "utf8");
const pagesProxy = readFileSync(new URL("../functions/api/[[path]].ts", import.meta.url), "utf8");

describe("Cloudflare Worker deployment wiring", () => {
  it("uses the native tRPC fetch adapter and binds primary D1 before handling API requests", () => {
    expect(worker).toContain('from "@trpc/server/adapters/fetch"');
    expect(worker).toContain("configureD1(bindings.digital_junction_db)");
    expect(worker).toContain("configureD1OnlyFileMode()");
    expect(worker).toContain("configureCloudinaryStorage(configuredCloudinaryStorage(bindings))");
    expect(worker).toContain("CLOUDINARY_CLOUD_NAME");
    expect(worker).toContain("CLOUDINARY_API_KEY");
    expect(worker).toContain("CLOUDINARY_API_SECRET");
    expect(worker).toContain('endpoint: "/api/trpc"');
    expect(worker).not.toContain("httpServerHandler");
    expect(worker).not.toContain("DJDC_UPLOADS");
    expect(worker).toContain('pathname === "/manus-storage/djdc-logo_bb40eabf.png"');
    expect(worker).toContain('"Content-Type": "image/svg+xml"');
    expect(worker).toContain("Binary file storage is disabled in this D1-only deployment.");
  });

  it("preserves isolated owner/customer sessions and translates response cookies for Workers", () => {
    expect(workerContext).toContain("OWNER_SESSION_COOKIE");
    expect(workerContext).toContain('resHeaders.append("Set-Cookie"');
    expect(workerContext).toContain("sdk.authenticateRequest(request, OWNER_SESSION_COOKIE)");
  });

  it("connects the requested Pages hostname to the D1-backed Worker API", () => {
    expect(pagesProxy).toContain("WORKER_ORIGIN");
    expect(pagesProxy).toContain("new Request(targetUrl, context.request)");
    expect(pagesProxy).toContain("getSetCookie?.()");
    expect(pagesProxy).toContain('headers.append("Set-Cookie", cookie)');
    expect(pagesProxy).toContain("Pages API proxy is not configured.");
  });

  it("registers separate raw-body verified PayRex and PayPal webhook endpoints", () => {
    expect(worker).toContain('pathname === "/api/payrex/webhook"');
    expect(worker).toContain('pathname === "/api/paypal/webhook"');
    expect(worker).toContain("verifyPaypalWebhook(rawBody, request.headers)");
    expect(worker).toContain("registerPaypalWebhookEvent");
  });
});
