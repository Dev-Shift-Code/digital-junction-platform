import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const build = spawnSync(command, ["exec", "vite", "build"], {
  env: { ...process.env, VITE_D1_ONLY: "true" },
  stdio: "inherit",
});

process.exit(build.status ?? 1);
