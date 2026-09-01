import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const viteCli = resolve(projectRoot, "node_modules", "vite", "bin", "vite.js");
const build = spawnSync(process.execPath, [viteCli, "build"], {
  env: { ...process.env, VITE_D1_ONLY: "true" },
  stdio: "inherit",
});

if (build.error) throw build.error;
process.exit(build.status ?? 1);
