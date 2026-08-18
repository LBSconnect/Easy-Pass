/**
 * Where a sign-in is allowed to send someone afterwards.
 *
 * The pricing page sends a signed-out visitor to /login carrying the thing
 * they were trying to do, so they land back on their choice instead of on a
 * dashboard that has forgotten it. That means a URL from the query string
 * decides where the app navigates after authentication - which is the exact
 * shape of an open redirect if it is taken at face value.
 *
 * So it is not taken at face value. Only a path inside this app is allowed:
 * one leading slash, no scheme, no host. `//evil.example` is a
 * protocol-relative URL that browsers happily treat as another origin, and
 * `/\evil.example` is the same trick with the slash a backslash - both are
 * rejected, along with anything that isn't a plain path.
 *
 * Lives in shared/ rather than the client so the rule is one function with
 * tests, not a regex repeated in two forms on the auth page.
 */

/** Where people go when there's no valid destination to return to. */
export const DEFAULT_POST_LOGIN_PATH = "/dashboard";

/**
 * Returns `next` if it is a safe in-app path, otherwise the dashboard.
 *
 * @param next raw value from the query string - untrusted.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_POST_LOGIN_PATH;

  const trimmed = next.trim();
  // A single leading slash, and the next character must not turn it into
  // another origin. Backslash counts: browsers normalise it to a slash.
  if (!trimmed.startsWith("/")) return DEFAULT_POST_LOGIN_PATH;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return DEFAULT_POST_LOGIN_PATH;

  // Control characters can be used to smuggle a scheme past naive checks.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return DEFAULT_POST_LOGIN_PATH;

  return trimmed;
}
