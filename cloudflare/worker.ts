import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/routers";
import { configureD1 } from "../server/db";
import { configureCloudinaryStorage, configureD1OnlyFileMode, storageGetPrivateDeliveryUrl } from "../server/storage";
import { createWorkerContext } from "../server/_core/workerContext";
import { consumeOneTimeDeliveryEntitlement, markPaypalPaymentPaid, markPayrexPaymentPaid, registerPaypalWebhookEvent, registerPayrexWebhookEvent } from "../server/db";
import { sha256, verifyPayrexWebhook } from "../server/payrex";
import { verifyPaypalWebhook } from "../server/paypal";
import { sendPaymentDeliveryEmail } from "../server/brevo";

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

function configuredCloudinaryStorage(bindings: WorkerBindings) {
  const cloudName = typeof bindings.CLOUDINARY_CLOUD_NAME === "string" ? bindings.CLOUDINARY_CLOUD_NAME : "";
  const apiKey = typeof bindings.CLOUDINARY_API_KEY === "string" ? bindings.CLOUDINARY_API_KEY : "";
  const apiSecret = typeof bindings.CLOUDINARY_API_SECRET === "string" ? bindings.CLOUDINARY_API_SECRET : "";
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

function webhookResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function handlePayrexWebhook(request: Request, ctx: ExecutionContext) {
  try {
    if (request.method !== "POST") return webhookResponse({ error: "Method not allowed" }, 405);
    const rawBody = await request.text();
    const event = await verifyPayrexWebhook(rawBody, request.headers.get("PayRex-Signature"));
    if (!event.id || !event.type) return webhookResponse({ error: "Invalid PayRex event" }, 400);
    const paymentIntentId = event.data?.resource?.id || null;
    const isNew = await registerPayrexWebhookEvent({ providerEventId: event.id, eventType: event.type, providerPaymentIntentId: paymentIntentId, payloadHash: await sha256(rawBody) });
    if (!isNew) return webhookResponse({ received: true, duplicate: true });
    if (event.type === "payment_intent.succeeded" && paymentIntentId) {
      const transaction = await markPayrexPaymentPaid(paymentIntentId, event.data?.resource?.latest_payment || null);
      if (transaction) ctx.waitUntil(sendPaymentDeliveryEmail(transaction.orderId));
    }
    return webhookResponse({ received: true });
  } catch (error) {
    console.error("[payrex-webhook] rejected", error);
    return webhookResponse({ error: "Webhook verification failed" }, 400);
  }
}

async function handlePaypalWebhook(request: Request, ctx: ExecutionContext) {
  try {
    if (request.method !== "POST") return webhookResponse({ error: "Method not allowed" }, 405);
    const rawBody = await request.text();
    const event = await verifyPaypalWebhook(rawBody, request.headers);
    if (!event.id || !event.event_type) return webhookResponse({ error: "Invalid PayPal event" }, 400);
    const providerOrderId = event.resource?.supplementary_data?.related_ids?.order_id || null;
    const isNew = await registerPaypalWebhookEvent({ providerEventId: event.id, eventType: event.event_type, providerOrderId, payloadHash: await sha256(rawBody) });
    if (!isNew) return webhookResponse({ received: true, duplicate: true });
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" && providerOrderId) {
      const transaction = await markPaypalPaymentPaid(providerOrderId, event.resource?.id || null);
      if (transaction) ctx.waitUntil(sendPaymentDeliveryEmail(transaction.orderId));
    }
    return webhookResponse({ received: true });
  } catch (error) {
    console.error("[paypal-webhook] rejected", error);
    return webhookResponse({ error: "Webhook verification failed" }, 400);
  }
}

async function handleOneTimeDelivery(token: string) {
  const tokenHash = await sha256(token);
  const entitlement = await consumeOneTimeDeliveryEntitlement(tokenHash);
  if (!entitlement) return new Response("This download link has expired, was used, or was revoked.", { status: 410, headers: { "Cache-Control": "no-store" } });
  try {
    const extension = entitlement.fileName.includes(".") ? entitlement.fileName.split(".").pop() || null : null;
    const cloudinaryUrl = await storageGetPrivateDeliveryUrl({ publicId: entitlement.fileKey, resourceType: "raw", format: extension, expiresAt: new Date(Date.now() + 60_000) });
    const source = await fetch(cloudinaryUrl, { headers: { "Accept": entitlement.fileMimeType || "application/octet-stream" } });
    if (!source.ok || !source.body) return new Response("The purchased file could not be delivered. Please contact Digital Junction with your order details.", { status: 502, headers: { "Cache-Control": "no-store" } });
    const filename = entitlement.fileName.replace(/[\\"\r\n]/g, "_");
    return new Response(source.body, { headers: { "Content-Type": source.headers.get("Content-Type") || entitlement.fileMimeType || "application/octet-stream", "Content-Length": source.headers.get("Content-Length") || "", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("[one-time-delivery] failed", error);
    return new Response("The purchased file could not be delivered. Please contact Digital Junction with your order details.", { status: 502, headers: { "Cache-Control": "no-store" } });
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
    configureCloudinaryStorage(configuredCloudinaryStorage(bindings));

    const pathname = new URL(request.url).pathname;
    if (pathname === "/api/payrex/webhook") return handlePayrexWebhook(request, ctx);
    if (pathname === "/api/paypal/webhook") return handlePaypalWebhook(request, ctx);
    if (request.method === "GET" && pathname.startsWith("/api/delivery/")) {
      const token = pathname.slice("/api/delivery/".length);
      if (/^[0-9a-f-]{36}$/i.test(token)) return handleOneTimeDelivery(token);
      return new Response("Invalid download link.", { status: 400, headers: { "Cache-Control": "no-store" } });
    }
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
