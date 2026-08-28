import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/routers";
import { configureD1 } from "../server/db";
import { configureCloudinaryStorage, configureD1OnlyFileMode, storageGetPrivateDeliveryUrl } from "../server/storage";
import { createWorkerContext } from "../server/_core/workerContext";
import { consumeOneTimeDeliveryEntitlement, markPaypalPaymentPaid, markPayrexPaymentPaid, registerPaypalWebhookEvent, registerPayrexWebhookEvent } from "../server/db";
import { sha256, verifyPayrexWebhook } from "../server/payrex";
import { verifyPaypalWebhook } from "../server/paypal";
import { sendPaymentDeliveryEmail } from "../server/appsScriptRelay";

type WorkerBindings = Record<string, unknown> & {
  digital_junction_db?: unknown;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
};

const DJDC_LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663920827301/UriSGgVGQZmuEDZB.png";

function deliveryStatusPage(title: string, message: string, status: number) {
  const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] || character);
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} · Digital Junction Development Co.</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#f8efdf;color:#18352f;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:center;padding:24px;background-image:linear-gradient(rgba(24,53,47,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(24,53,47,.06) 1px,transparent 1px);background-size:28px 28px}.card{width:min(100%,560px);overflow:hidden;border:1px solid rgba(24,53,47,.14);border-radius:28px;background:#fffaf1;box-shadow:0 24px 70px rgba(24,53,47,.14)}.top{padding:34px 34px 30px;background:#18352f;color:#fffaf1}.brand{display:flex;align-items:center;gap:12px}.brand img{width:48px;height:48px;object-fit:contain;border-radius:14px;background:#9be4c4}.brand strong{display:block;font-family:Georgia,serif;font-size:20px;letter-spacing:-.02em}.brand span{display:block;margin-top:3px;color:#9be4c4;font-size:10px;letter-spacing:.18em;text-transform:uppercase}.body{padding:38px 34px 40px}.eyebrow{color:#4f9480;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}.body h1{margin:12px 0 14px;font-family:Georgia,serif;font-size:clamp(30px,6vw,44px);line-height:1.04;letter-spacing:-.04em}.body p{margin:0;color:rgba(24,53,47,.7);font-size:16px;line-height:1.7}.note{margin-top:26px;padding:16px 18px;border-radius:16px;background:#edf5ed;color:#315f52;font-size:13px;line-height:1.6}.footer{padding:18px 34px;border-top:1px solid rgba(24,53,47,.1);color:rgba(24,53,47,.55);font-size:12px}.footer a{color:#347966;font-weight:700;text-decoration:none}@media(max-width:480px){body{padding:14px}.top,.body,.footer{padding-left:24px;padding-right:24px}.body{padding-top:30px;padding-bottom:32px}} </style></head><body><main class="card"><header class="top"><div class="brand"><img src="${DJDC_LOGO_URL}" alt="DJDC logo"><div><strong>Digital Junction</strong><span>Development Co.</span></div></div></header><section class="body"><div class="eyebrow">Secure delivery status</div><h1>${safeTitle}</h1><p>${safeMessage}</p><div class="note">For your security, each download link is private, single-use, and time-limited. If you still need access, please contact Digital Junction with your order email.</div></section><footer class="footer">Digital Junction Development Co. · <a href="/">Return to website</a></footer></main></body></html>`, { status, headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; img-src https://files.manuscdn.com; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" } });
}

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
  if (!entitlement) return deliveryStatusPage("Download link unavailable", "This download link has expired, was already used, or was revoked. Please request a new link from Digital Junction if you still need access.", 410);
  try {
    const extension = entitlement.fileName.includes(".") ? entitlement.fileName.split(".").pop() || null : null;
    const cloudinaryUrl = await storageGetPrivateDeliveryUrl({ publicId: entitlement.fileKey, resourceType: "raw", format: extension, expiresAt: new Date(Date.now() + 60_000) });
    const source = await fetch(cloudinaryUrl, { headers: { "Accept": entitlement.fileMimeType || "application/octet-stream" } });
    if (!source.ok || !source.body) return deliveryStatusPage("We could not deliver this file", "The purchased file is temporarily unavailable. Please contact Digital Junction with your order details so we can help.", 502);
    const filename = entitlement.fileName.replace(/[\\"\r\n]/g, "_");
    return new Response(source.body, { headers: { "Content-Type": source.headers.get("Content-Type") || entitlement.fileMimeType || "application/octet-stream", "Content-Length": source.headers.get("Content-Length") || "", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("[one-time-delivery] failed", error);
    return deliveryStatusPage("We could not deliver this file", "The purchased file is temporarily unavailable. Please contact Digital Junction with your order details so we can help.", 502);
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
      return deliveryStatusPage("Invalid download link", "This link is not valid. Please use the complete link from your Digital Junction email or contact us for help.", 400);
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
