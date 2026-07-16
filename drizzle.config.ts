import { defineConfig } from "drizzle-kit";

// Load env for local CLI runs (Vercel/CI set real env vars instead).
// .env.local / .env.dev come from `vercel env pull`. To run a migration
// against production deliberately: DATABASE_URL=$(grep '^DATABASE_URL=' .env.prd | cut -d= -f2-) pnpm db:migrate
for (const file of [".env.local", ".env.dev", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // File doesn't exist — fine.
  }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./api/_lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
