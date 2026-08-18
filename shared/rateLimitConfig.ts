/**
 * The general per-IP API cap.
 *
 * 100 requests per 15 minutes per IP is a sensible DoS guard for real
 * traffic, where an IP is roughly a person. It is meaningless for an
 * end-to-end run, where every request in the suite comes from 127.0.0.1 by
 * construction - so the suite exhausts the budget partway through and every
 * spec after that fails on 429s that have nothing to do with what they test.
 *
 * Only this general cap is configurable. The auth, forgotten-password and
 * reset limiters stay exactly as they are: several specs assert that those
 * return 429 after N attempts, and they are testing a real control. Relaxing
 * them would delete that coverage, which is the opposite of the point.
 *
 * Fails safe. An unset, unparseable, zero or negative value gives the
 * default, so a typo cannot quietly remove the guard in production.
 */

export const DEFAULT_API_RATE_LIMIT = 100;

export function resolveApiRateLimit(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_API_RATE_LIMIT;

  const parsed = Number(raw.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_API_RATE_LIMIT;

  return parsed;
}
