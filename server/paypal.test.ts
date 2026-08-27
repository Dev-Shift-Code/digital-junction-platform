import { afterEach, describe, expect, it, vi } from "vitest";
import { createPaypalOrder, verifyPaypalWebhook } from "./paypal";

const originalEnv = { clientId: process.env.PAYPAL_CLIENT_ID, clientSecret: process.env.PAYPAL_CLIENT_SECRET, webhookId: process.env.PAYPAL_WEBHOOK_ID, environment: process.env.PAYPAL_ENVIRONMENT };

function configureSandbox() {
  process.env.PAYPAL_CLIENT_ID = "sandbox-client-id";
  process.env.PAYPAL_CLIENT_SECRET = "sandbox-client-secret";
  process.env.PAYPAL_WEBHOOK_ID = "sandbox-webhook-id";
  process.env.PAYPAL_ENVIRONMENT = "sandbox";
}

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.PAYPAL_CLIENT_ID = originalEnv.clientId;
  process.env.PAYPAL_CLIENT_SECRET = originalEnv.clientSecret;
  process.env.PAYPAL_WEBHOOK_ID = originalEnv.webhookId;
  process.env.PAYPAL_ENVIRONMENT = originalEnv.environment;
});

describe("PayPal Orders service", () => {
  it("uses OAuth and creates a PHP capture order with the server-specified total", async () => {
    configureSandbox();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "PAYPAL-ORDER-1", status: "CREATED", links: [{ rel: "payer-action", href: "https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-1" }] }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createPaypalOrder({ orderReference: "DJ-PP-test", productTitle: "Digital template × 3", productDescription: "A private buyer file", amountCents: 12_345, successUrl: "https://digital-junction-platform.pages.dev/checkout/template?payment=test", cancelUrl: "https://digital-junction-platform.pages.dev/checkout/template?payment=test&result=cancelled" });

    expect(result.order.id).toBe("PAYPAL-ORDER-1");
    expect(result.approvalUrl).toContain("PAYPAL-ORDER-1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body.intent).toBe("CAPTURE");
    expect(body.purchase_units[0].amount).toEqual({ currency_code: "PHP", value: "123.45" });
    expect(body.purchase_units[0].items[0].category).toBe("DIGITAL_GOODS");
  });

  it("rejects a webhook that PayPal's verification API does not validate", async () => {
    configureSandbox();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ verification_status: "FAILURE" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const headers = new Headers({ "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": "https://api.sandbox.paypal.com/certs/test", "paypal-transmission-id": "event-id", "paypal-transmission-sig": "invalid", "paypal-transmission-time": "2026-08-27T00:00:00Z" });
    await expect(verifyPaypalWebhook(JSON.stringify({ id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED" }), headers)).rejects.toThrow("signature is invalid");
  });
});
