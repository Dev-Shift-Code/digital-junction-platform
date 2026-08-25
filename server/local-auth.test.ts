import { describe, expect, it } from "vitest";
import { hashPassword, normalizeEmail, verifyPassword } from "./localAuth";

describe("first-party customer credentials", () => {
  it("normalizes email addresses and verifies a matching password without storing plaintext", async () => {
    const password = "DJDC-test-password-2026";
    const hash = await hashPassword(password);
    expect(normalizeEmail(" Client@Example.COM ")).toBe("client@example.com");
    expect(hash).not.toContain(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("incorrect-password", hash)).resolves.toBe(false);
  });
});
