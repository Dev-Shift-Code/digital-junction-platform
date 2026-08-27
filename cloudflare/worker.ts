import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/routers";
import { configureD1 } from "../server/db";
import { configureCloudinaryQrStorage, configureD1OnlyFileMode } from "../server/storage";
import { createWorkerContext } from "../server/_core/workerContext";

type WorkerBindings = Record<string, unknown> & {
  digital_junction_db?: unknown;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
};

const brandMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Digital Junction"><rect width="64" height="64" rx="14" fill="#FFF4E1"/><path d="M17 18h10c10 0 17 5 17 14s-7 14-17 14h-3v8H17V18Zm7 7v14h3c6 0 10-2 10-7s-4-7-10-7h-3Z" fill="#1A312C"/><path d="M38 40h9v14h-9z" fill="#428475"/></svg>`;

function hydrateEnvironment(bindings: WorkerBindings) {
  process.env.CLOUDFLARE_WORKER = "1";
  for (const [key, value] of Object.entries(bindings)) {
    if (typeof value === "string") process.env[key] = value;
  }
}

function configuredCloudinaryQrStorage(bindings: WorkerBindings) {
  const cloudName = typeof bindings.CLOUDINARY_CLOUD_NAME === "string" ? bindings.CLOUDINARY_CLOUD_NAME : "";
  const apiKey = typeof bindings.CLOUDINARY_API_KEY === "string" ? bindings.CLOUDINARY_API_KEY : "";
  const apiSecret = typeof bindings.CLOUDINARY_API_SECRET === "string" ? bindings.CLOUDINARY_API_SECRET : "";
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

export default {
  async fetch(request: Request, bindings: WorkerBindings, ctx: ExecutionContext) {
    hydrateEnvironment(bindings);
    if (!bindings.digital_junction_db) {
      return new Response("Cloudflare D1 binding digital_junction_db is not configured.", { status: 500 });
    }

    configureD1(bindings.digital_junction_db);
    configureD1OnlyFileMode();
    configureCloudinaryQrStorage(configuredCloudinaryQrStorage(bindings));

    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith("/api/trpc")) {
      return fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: createWorkerContext,
      });
    }

    if (pathname === "/manus-storage/djdc-logo_bb40eabf.png") {
      return new Response(brandMarkSvg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
    }

    if (pathname.startsWith("/manus-storage/")) {
      return new Response("Binary file storage is disabled in this D1-only deployment.", { status: 410 });
    }

    return bindings.ASSETS?.fetch(request) ?? new Response("Asset binding unavailable", { status: 404 });
  },
} satisfies ExportedHandler<WorkerBindings>;
