const DEFAULT_ORIGIN = "https://www.myeasypass.net";

/**
 * Public acquisition link a student can safely share with another candidate.
 *
 * It deliberately contains no score, account id, email, answer data, or other
 * student-specific information. The UTM fields exist only so shared traffic can
 * be separated from paid, partner, search, and direct acquisition.
 */
export function buildReadinessShareUrl(origin: string = DEFAULT_ORIGIN): string {
  const url = new URL("/readiness-check", origin);
  url.searchParams.set("utm_source", "student_share");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "readiness_share");
  return url.toString();
}

export const __testing = { DEFAULT_ORIGIN };
