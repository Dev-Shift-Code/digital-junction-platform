import { afterEach, describe, expect, it, vi } from "vitest";
import { createPayrexGcashCheckout, sha256, verifyPayrexWebhook } from "./payrex";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("PayRex service", () => {
  it("creates a hosted GCash-only checkout session with server supplied line item data", async () => {
    process.env.PAYREX_SECRET_API_KEY = "sk_test_example";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "cs_example", url: "https://checkout.payrexhq.com/c/cs_example", expires_at: 1_800_000_000, payment_intent: { id: "pi_example" } }), { status: 200 }));
    const checkout = await createPayrexGcashCheckout({ orderReference: "DJ-test", productTitle: "Digital product", productDescription: "Description", unitAmountCents: 2_500, quantity: 2, successUrl: "https://digital-junction-platform.pages.dev/success", cancelUrl: "https://digital-junction-platform.pages.dev/cancel", expiresAt: new Date("2027-01-01T00:00:00Z") });
    const [, options] = fetchMock.mock.calls[0]!;
    expect(String((options as RequestInit).body)).toContain("payment_methods%5B%5D=gcash");
    expect(String((options as RequestInit).body)).toContain("line_items%5B0%5D%5Bamount%5D=2500");
    expect(checkout.url).toContain("checkout.payrexhq.com");
  });

  it("accepts only a valid sandbox signed PayRex event", async () => {
    process.env.PAYREX_WEBHOOK_SECRET = "whsec_example";
    process.env.PAYREX_ENVIRONMENT = "sandbox";
    const body = JSON.stringify({ id: "evt_example", type: "payment_intent.succeeded", data: { resource: { id: "pi_example" } } });
    const timestamp = "1700000000";
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("whsec_example"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
    const signature = Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, "0")).join("");
    await expect(verifyPayrexWebhook(body, `t=${timestamp},te=${signature}`)).resolves.toMatchObject({ id: "evt_example" });
    await expect(verifyPayrexWebhook(body, `t=${timestamp},te=not-valid`)).rejects.toThrow("invalid");
    await expect(sha256(body)).resolves.toMatch(/^[a-f0-9]{64}$/);
  });
});
