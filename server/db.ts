import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// Force schema to be included in the production bundle
import "@shared/schema";
import * as schema from "@shared/schema";
import { resolveDbSsl } from "@shared/dbSsl";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("[DB] ERROR: DATABASE_URL is missing in production");
  throw new Error("DATABASE_URL must be set.");
}

const isProduction = process.env.NODE_ENV === "production";

// SSL follows the connection string's own sslmode when it has one, and only
// falls back to NODE_ENV otherwise. Keying it off NODE_ENV alone meant the
// production build could not talk to a plain Postgres at all - so CI ran with
// every migration step failing, quietly, while the suite still passed.
const ssl = resolveDbSsl({
  connectionString: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
});

console.log(`[DB] Environment: ${isProduction ? "PRODUCTION" : "DEVELOPMENT"}`);
console.log(`[DB] DATABASE_URL Loaded: ${!!process.env.DATABASE_URL}`);
console.log(`[DB] SSL: ${ssl ? "on" : "off"}`);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true
});

export const db = drizzle(pool, {
  schema,
});
