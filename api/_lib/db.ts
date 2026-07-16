import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "./env.js";
import * as schema from "./schema.js";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | null = null;

// Lazy so importing a route without DATABASE_URL configured doesn't crash the
// function — requests fail at the point of use (after auth) with a clear error.
export function getDb(): Db {
  if (!instance) {
    instance = drizzle(neon(env.DATABASE_URL), { schema });
  }
  return instance;
}
