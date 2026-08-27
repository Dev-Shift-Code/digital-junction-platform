import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";

function workerJsonBody(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || !req.is("application/json")) {
    next();
    return;
  }

  let payload = "";
  req.setEncoding("utf8");
  req.on("data", chunk => { payload += chunk; });
  req.on("end", () => {
    try {
      req.body = payload ? JSON.parse(payload) : {};
      next();
    } catch {
      res.status(400).json({ error: "Invalid JSON request body" });
    }
  });
  req.on("error", () => res.status(400).json({ error: "Unable to read request body" }));
}

/** Shared API application for local Node development and Cloudflare Workers. */
export function createApplication(options: { worker?: boolean } = {}) {
  const app = express();
  // Buyer delivery files are accepted through the protected owner workflow.
  if (options.worker) {
    app.use(workerJsonBody);
  } else {
    app.use(express.json({ limit: "2gb" }));
    app.use(express.urlencoded({ limit: "2gb", extended: true }));
  }
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}
