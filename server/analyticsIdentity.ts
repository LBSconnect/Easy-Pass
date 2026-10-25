/**
 * Associate first-party analytics with a signed-in student, when available.
 * The app's authentication source of truth is the server-side session
 * (simpleAuth.ts), not client-submitted event metadata.
 * Keep anonymous traffic anonymous and support the existing Passport-style
 * identity as a fallback for compatibility.
 */
type AnalyticsIdentityRequest = {
  session?: { userId?: string | null };
  user?: { claims?: { sub?: string | null } };
};

export function analyticsUserId(req: AnalyticsIdentityRequest): string | undefined {
  const sessionId = req.session?.userId;
  if (typeof sessionId === "string" && sessionId.length > 0) return sessionId;

  const claimsId = req.user?.claims?.sub;
  if (typeof claimsId === "string" && claimsId.length > 0) return claimsId;

  return undefined;
}
