import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// Force schema to be included in the production bundle
import "@shared/schema";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("[DB] ERROR: DATABASE_URL is missing in production");
  throw new Error("DATABASE_URL must be set.");
}

const isProduction =
  process.env.REPLIT_DEPLOYMENT === "1" ||
  process.env.NODE_ENV === "production";

console.log(`[DB] Environment: ${isProduction ? "PRODUCTION" : "DEVELOPMENT"}`);
console.log(`[DB] DATABASE_URL Loaded: ${!!process.env.DATABASE_URL}`);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true
});

// Required for Neon + PgBouncer: disable prepared statements
export const db = drizzle(pool, {
  schema,
  prepare: false
});
