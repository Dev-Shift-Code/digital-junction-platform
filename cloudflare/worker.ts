import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/routers";
import { configureD1 } from "../server/db";
import { configureD1OnlyFileMode } from "../server/storage";
import { createWorkerContext } from "../server/_core/workerContext";

type WorkerBindings = Record<string, unknown> & {
  digital_junction_db?: unknown;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
};

function hydrateEnvironment(bindings: WorkerBindings) {
  process.env.CLOUDFLARE_WORKER = "1";
  for (const [key, value] of Object.entries(bindings)) {
    if (typeof value === "string") process.env[key] = value;
  }
}

export default {
  async fetch(request: Request, bindings: WorkerBindings, ctx: ExecutionContext) {
    hydrateEnvironment(bindings);
    if (!bindings.digital_junction_db) {
      return new Response("Cloudflare D1 binding digital_junction_db is not configured.", { status: 500 });
    }

    configureD1(bindings.digital_junction_db);
    configureD1OnlyFileMode();

    const pathname = new URL(request.url).pathname;
    if (pathname.startsWith("/api/trpc")) {
      return fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: createWorkerContext,
      });
    }

    if (pathname.startsWith("/manus-storage/")) {
      return new Response("Binary file storage is disabled in this D1-only deployment.", { status: 410 });
    }

    return bindings.ASSETS?.fetch(request) ?? new Response("Asset binding unavailable", { status: 404 });
  },
} satisfies ExportedHandler<WorkerBindings>;
