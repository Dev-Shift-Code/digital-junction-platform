import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

describe("Digital Junction notification theme", () => {
  it("mounts globally themed Sonner toasts with success, error, warning, and info classes", () => {
    const app = read("client/src/App.tsx");
    const sonner = read("client/src/components/ui/sonner.tsx");
    const css = read("client/src/index.css");
    expect(app).toContain("<Toaster />");
    ["dj-toaster", "dj-toast--success", "dj-toast--error", "dj-toast--warning", "dj-toast--info"].forEach(name => {
      expect(sonner).toContain(name);
      expect(css).toContain(name);
    });
    expect(css).toContain("#FFF4E1");
    expect(css).toContain("#1A312C");
    expect(css).toContain("#428475");
  });

  it("provides on-brand shared Alert variants and normalizes remaining page-level error utilities", () => {
    const alert = read("client/src/components/ui/alert.tsx");
    const css = read("client/src/index.css");
    ["info:", "success:", "warning:", "destructive:"].forEach(variant => expect(alert).toContain(variant));
    [".notice", ".notice-success", ".notice-info", ".notice-warning", ".notice-error"].forEach(name => expect(css).toContain(name));
    expect(css).toContain(":where(.bg-red-50, .bg-red-100)");
    expect(css).toContain(":where(.border-red-300, .border-red-400)");
    expect(css).toContain(":where(.text-red-700, .text-red-800)");
  });
});
