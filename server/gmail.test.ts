import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGmailRawMessage, buildPaymentDeliveryEmail, paymentDeliveryEmailIdempotencyKey } from "./gmail";

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

    const source = readFileSync(resolve(import.meta.dirname, "gmail.ts"), "utf8");
    expect(source).toContain('fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send"');
    expect(source).toContain('fetch("https://oauth2.googleapis.com/token"');
    expect(source).toContain("https://www.googleapis.com/auth/gmail.send");
    expect(source).not.toMatch(/attachments\s*:/);
  });

  it("builds a base64url Gmail API message with HTML and text alternatives but no attachments", () => {
    const raw = buildGmailRawMessage({ from: "devshiftcode2025@gmail.com", to: "buyer@example.com", replyTo: "devshiftcode2025@gmail.com", subject: "Your downloads", text: "Plain delivery message", html: "<p>HTML delivery message</p>", orderId: 12 });
    expect(raw).toContain("From: devshiftcode2025@gmail.com");
    expect(raw).toContain("To: buyer@example.com");
    expect(raw).toContain("Reply-To: devshiftcode2025@gmail.com");
    expect(raw).toContain("Content-Type: multipart/alternative");
    expect(raw).toContain("Content-Transfer-Encoding: base64");
    expect(raw).not.toContain("Content-Disposition: attachment");
  });
});
