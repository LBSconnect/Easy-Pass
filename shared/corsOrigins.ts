/**
 * Which origins may read cross-origin responses.
 *
 * Two problems this replaces.
 *
 * First, the localhost entry was gated on NODE_ENV === "development", so a
 * production build served over http://localhost - which is exactly what an
 * end-to-end job runs - had its own origin rejected. Every stylesheet and
 * script request came back as an error and every page rendered blank. The
 * allowlist could describe the deployed hostnames and nothing else, so there
 * was no way to say "and this one, for this run".
 *
 * Second, and worse in production: a preview deploy, a renamed Render
 * service, or any hostname not written into the array takes the whole site
 * down rather than merely failing a cross-origin read.
 *
 * So additional origins can be supplied by configuration. Production defaults
 * are unchanged: without CORS_ALLOWED_ORIGINS set, the list is exactly what
 * it was.
 */

/** Origins the deployed app is served from. */
export const DEPLOYED_ORIGINS = [
  "https://www.myeasypass.net",
  "https://myeasypass.net",
  "https://easy-pass-ht1x.onrender.com",
];

/** Where a dev server runs. */
export const LOCAL_ORIGIN = "http://localhost:5000";

export interface OriginsInput {
  /** Usually process.env.NODE_ENV. */
  nodeEnv: string | undefined;
  /** Usually process.env.CORS_ALLOWED_ORIGINS - comma separated. */
  extra: string | undefined;
}

export function buildAllowedOrigins({ nodeEnv, extra }: OriginsInput): string[] {
  const origins = [...DEPLOYED_ORIGINS];

  if (nodeEnv !== "production") origins.push(LOCAL_ORIGIN);

  for (const raw of (extra ?? "").split(",")) {
    const candidate = raw.trim();
    if (!candidate) continue;
    // Only well-formed absolute origins. A stray path or a bare hostname
    // would never match the Origin header anyway, and silently adding one
    // gives false confidence that a host has been allowed.
    if (!/^https?:\/\/[^/\s]+$/.test(candidate)) continue;
    if (!origins.includes(candidate)) origins.push(candidate);
  }

  return origins;
}
