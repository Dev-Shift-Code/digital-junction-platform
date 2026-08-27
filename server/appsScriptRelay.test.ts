import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAppsScriptRelayPayload, buildManualPaymentRejectedEmail, buildPaymentDeliveryEmail, paymentDeliveryEmailIdempotencyKey } from "./appsScriptRelay";

describe("transactional payment delivery email", () => {
  it("uses a deterministic order-scoped idempotency key", () => {
    expect(paymentDeliveryEmailIdempotencyKey(42)).toBe("djdc-payment-delivery-order-42");
    expect(paymentDeliveryEmailIdempotencyKey(42)).toBe(paymentDeliveryEmailIdempotencyKey(42));
    expect(paymentDeliveryEmailIdempotencyKey(43)).not.toBe(paymentDeliveryEmailIdempotencyKey(42));
  });

  it("renders escaped purchase content and individual secure links without attachments", () => {
    const email = buildPaymentDeliveryEmail({
      buyerName: '<img src=x onerror=alert(1)>',
      productTitle: 'Guide & Toolkit',
      orderId: 12,
      links: [
        { fileName: 'guide.pdf', url: 'https://digital-junction-platform.pages.dev/api/delivery/one-time-token-a' },
        { fileName: 'assets.zip', url: 'https://digital-junction-platform.pages.dev/api/delivery/one-time-token-b' },
      ],
    });
    expect(email.subject).toBe("Your purchase is ready — Digital Junction");
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(email.html).not.toContain("<img src=x onerror=alert(1)>");
    expect(email.html).toContain("/api/delivery/one-time-token-a");
    expect(email.html).toContain("/api/delivery/one-time-token-b");
    expect(email.html).toContain("Digital Junction Development Co.");
    expect(email.html).toContain("Your files are ready.");
    expect(email.html).toContain("Download file");
    expect(email.html).toContain("Each button works once and expires in 15 minutes");
    expect(email.html).toContain("Thank you for your patience and for purchasing from Digital Junction Development Co.");
    expect(email.text).toContain("Download guide.pdf:");
    expect(email.text).toContain("Download assets.zip:");

    const source = readFileSync(resolve(import.meta.dirname, "appsScriptRelay.ts"), "utf8");
    expect(source).toContain('const appsScriptRelayHost = "script.google.com"');
    expect(source).toContain("APPS_SCRIPT_RELAY_SECRET");
    expect(source).toContain("hmacHex");
    expect(source).not.toContain("api.brevo.com");
    expect(source).not.toMatch(/attachments\s*:/);
  });

  it("builds a signed relay payload with a deterministic request ID and no attachments", () => {
    const payload = buildAppsScriptRelayPayload({ to: "buyer@example.com", replyTo: "devshiftcode2025@gmail.com", subject: "Your downloads", text: "Plain delivery message", html: "<p>HTML delivery message</p>", orderId: 12, messageType: "delivery", buyerName: "Buyer" });
    expect(payload.requestId).toBe("djdc-payment-delivery-order-12-delivery");
    expect(payload.to).toBe("buyer@example.com");
    expect(payload.replyTo).toBe("devshiftcode2025@gmail.com");
    expect(payload.messageType).toBe("delivery");
    expect(JSON.stringify(payload)).not.toContain("attachment");
  });

  it("builds a branded manual-payment rejection notice without buyer files or download links", () => {
    const email = buildManualPaymentRejectedEmail({ buyerName: '<img src=x onerror=alert(1)>', productTitle: "Design package", orderId: 9 });
    expect(email.subject).toBe("Payment review update — Digital Junction");
    expect(email.html).toContain("UriSGgVGQZmuEDZB.png");
    expect(email.html).toContain("Payment discrepancy policy");
    expect(email.html).toContain("50% of the recorded payment");
    expect(email.html).toContain("does not confirm that a refund has already been completed");
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(email.html).not.toContain("/api/delivery/");
    expect(email.text).not.toContain("Download");
  });
});
