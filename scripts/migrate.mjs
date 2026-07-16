// Runs database migrations before the Vercel build. Skips gracefully when no
// DATABASE_URL is configured (GitHub Pages / keyless local-only builds).
import { spawnSync } from "node:child_process";

for (const file of [".env.local", ".env.dev", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // File doesn't exist — fine.
  }
}

if (!process.env.DATABASE_URL) {
  console.log("[migrate] DATABASE_URL not set — skipping migrations (local-only build).");
  process.exit(0);
}

console.log("[migrate] Applying database migrations…");
const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
