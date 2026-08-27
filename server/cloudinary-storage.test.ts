import { afterEach, describe, expect, it, vi } from "vitest";
import { configureCloudinaryStorage, configureD1OnlyFileMode, storagePut } from "./storage";

describe("Cloudinary media adapter", () => {
  afterEach(() => {
    configureCloudinaryStorage(null);
    vi.restoreAllMocks();
  });

  it("uploads D1-only project and buyer file bytes to Cloudinary and returns a secure URL for D1 metadata", async () => {
    configureD1OnlyFileMode();
    configureCloudinaryStorage({ cloudName: "digital-junction", apiKey: "test-key", apiSecret: "test-secret" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ secure_url: "https://res.cloudinary.com/digital-junction/raw/upload/v1/buyer-file.zip" }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const stored = await storagePut("product-files/8/buyer-file.zip", new Uint8Array([1, 2, 3]), "application/zip");

    expect(stored.key).toMatch(/^product-files\/8\/buyer-file_[a-f0-9]{8}\.zip$/);
    expect(stored.url).toBe("https://res.cloudinary.com/digital-junction/raw/upload/v1/buyer-file.zip");
    expect(fetchMock).toHaveBeenCalledWith("https://api.cloudinary.com/v1_1/digital-junction/auto/upload", expect.objectContaining({ method: "POST" }));
  });

  it("reports configuration errors instead of silently saving unsupported D1 file bytes", async () => {
    configureD1OnlyFileMode();
    await expect(storagePut("project-covers/4/cover.png", new Uint8Array([1]), "image/png")).rejects.toThrow("File storage is not configured");
  });
});
