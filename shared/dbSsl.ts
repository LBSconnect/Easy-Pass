/**
 * Whether to open the database connection over SSL.
 *
 * This used to be `NODE_ENV === "production"` and nothing else, which
 * conflates two unrelated things: how the app serves its client, and whether
 * the database it is talking to speaks TLS.
 *
 * That conflation had a real cost. Running the production build against a
 * plain local or CI Postgres made every migration step fail with "The server
 * does not support SSL connections" - and fail quietly, because the runner
 * logs each failure and carries on by design. The end-to-end suite still
 * passed, against a schema that `drizzle-kit push` had created, so a broken
 * migration would have sailed through the one job meant to catch it.
 *
 * So the decision now follows the connection string, which is the thing that
 * actually knows. Postgres already has a standard way to say this and both
 * libpq and node-postgres understand it: `sslmode` in the URL.
 *
 * Production is unaffected: a managed Postgres URL without an explicit
 * sslmode still gets SSL under NODE_ENV=production. Turning it off takes
 * saying so.
 */

export type SslSetting = false | { rejectUnauthorized: boolean };

export interface SslInput {
  connectionString: string | undefined;
  /** Usually process.env.NODE_ENV. */
  nodeEnv: string | undefined;
}

/** Reads `sslmode` out of a connection string, if it has one. */
export function sslModeOf(connectionString: string | undefined): string | null {
  if (!connectionString) return null;
  try {
    return new URL(connectionString).searchParams.get("sslmode");
  } catch {
    // A connection string we cannot parse is not one to draw conclusions
    // from; fall back to the environment.
    return null;
  }
}

export function resolveDbSsl({ connectionString, nodeEnv }: SslInput): SslSetting {
  const mode = sslModeOf(connectionString);

  // An explicit sslmode wins over anything inferred, in both directions.
  if (mode === "disable") return false;
  if (mode !== null) {
    // require / prefer / verify-ca / verify-full all mean "use TLS". The
    // certificate is not verified because managed providers routinely present
    // one signed by their own CA - which is what production already did, kept
    // deliberately rather than tightened as a side effect of this change.
    return { rejectUnauthorized: false };
  }

  return nodeEnv === "production" ? { rejectUnauthorized: false } : false;
}
