import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPaymentDeliveryEmail, paymentDeliveryEmailIdempotencyKey } from "./resend";

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
    expect(email.subject).toBe("Your Digital Junction download links: Guide & Toolkit");
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(email.html).not.toContain("<img src=x onerror=alert(1)>");
    expect(email.html).toContain("/api/delivery/one-time-token-a");
    expect(email.html).toContain("/api/delivery/one-time-token-b");
    expect(email.html).toContain("expires in 15 minutes and can be used once");
    expect(email.text).toContain("Download guide.pdf:");
    expect(email.text).toContain("Download assets.zip:");

    const source = readFileSync(resolve(import.meta.dirname, "resend.ts"), "utf8");
    expect(source).toContain('fetch("https://api.resend.com/emails"');
    expect(source).toContain('"Idempotency-Key": paymentDeliveryEmailIdempotencyKey(orderId)');
    expect(source).not.toMatch(/attachments\s*:/);
  });
});
