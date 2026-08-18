/**
 * Whether the session cookie is marked Secure.
 *
 * Production must keep it: a session cookie without Secure can be sent over
 * plain HTTP, and that is the cookie that authenticates a student.
 *
 * But `secure: NODE_ENV === "production"` and nothing else makes the
 * production build untestable over HTTP. express-session does not merely
 * flag such a cookie — it declines to set one at all on an insecure
 * connection. So a production build behind plain HTTP issues no session
 * cookie whatsoever, and every authenticated flow silently fails to
 * establish. That is exactly the configuration a CI end-to-end job runs, and
 * it is why authenticated journeys could not be covered there.
 *
 * So the flag can be turned off deliberately, and only deliberately: an
 * explicit SESSION_COOKIE_SECURE=false. Production behaviour is unchanged
 * unless someone sets that, and the intended reader of the setting is a CI
 * workflow talking to localhost.
 */

export interface SessionCookieInput {
  /** Usually process.env.NODE_ENV. */
  nodeEnv: string | undefined;
  /** Usually process.env.SESSION_COOKIE_SECURE. */
  override: string | undefined;
}

export function resolveSecureCookie({ nodeEnv, override }: SessionCookieInput): boolean {
  // Only the exact string turns it off. "0", "no" and an empty value are the
  // kind of half-remembered settings that should fail safe rather than
  // quietly disabling a security flag in production.
  if (override === "false") return false;
  if (override === "true") return true;
  return nodeEnv === "production";
}
