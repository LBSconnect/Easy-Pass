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

/**
 * Failed auth attempts per IP per 15 minutes.
 *
 * Configurable for a different reason from the API cap, and a more
 * uncomfortable one: the suite contains a spec that deliberately exhausts
 * this limiter to prove it works, and every auth spec that runs afterwards
 * from the same IP then gets a 429 where it expected a 400. Twelve specs
 * failed that way the first time the suite was ever actually run.
 *
 * The answer is not to weaken the limit and lose the coverage. The specs
 * that assert 429 run against their own server, which keeps this default;
 * the functional specs run against one with the cap raised. Production is
 * the default either way.
 */
export const DEFAULT_AUTH_RATE_LIMIT = 5;

function resolvePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;

  const parsed = Number(raw.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;

  return parsed;
}

export function resolveApiRateLimit(raw: string | undefined): number {
  return resolvePositiveInt(raw, DEFAULT_API_RATE_LIMIT);
}

export function resolveAuthRateLimit(raw: string | undefined): number {
  return resolvePositiveInt(raw, DEFAULT_AUTH_RATE_LIMIT);
}

/**
 * Multiplier for the in-process per-IP limiters in server/rateLimit.ts.
 *
 * Those guard the public endpoints - guest articles, the diagnostic,
 * forgotten password - each with its own small cap. They have the same
 * problem as the others under test: the whole suite is one IP, so four
 * functional specs against one endpoint exhaust a cap of five and the fifth
 * fails on a 429.
 *
 * A single multiplier rather than a value per endpoint, because the caps
 * differ and their relative sizes are the deliberate part. Scaling them
 * together keeps those relationships intact.
 */
export const DEFAULT_RATE_LIMIT_SCALE = 1;

export function resolveRateLimitScale(raw: string | undefined): number {
  return resolvePositiveInt(raw, DEFAULT_RATE_LIMIT_SCALE);
}
