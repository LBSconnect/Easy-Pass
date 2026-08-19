/**
 * What a sign-up rate limiter should actually count.
 *
 * THE PROBLEM THIS EXISTS TO FIX
 *
 * Registration and login shared one limiter: five failed requests per IP per
 * fifteen minutes. On login that is a real brute-force control and it stays.
 * On registration it was blocking students from signing up at all.
 *
 * It counted every rejection, including ones that are not attacks and never
 * could be - a password under eight characters, a mistyped email address, a
 * form submitted with a field missing. Five typos and the address was locked
 * out for fifteen minutes, and told "Too many login attempts", which is not
 * even what the person was doing.
 *
 * The address, not the person. Everyone behind one office, school, training
 * centre, household or mobile carrier NAT shares it. For a product sold to
 * classes of students that is not a hypothetical - one person fumbling the
 * form could stop the rest of the room from registering.
 *
 * WHAT IS WORTH COUNTING
 *
 * Two things, and neither is a typo:
 *
 * An account was actually created. Counting these caps scripted mass signup,
 * which is the only real abuse of this endpoint - an account here carries no
 * entitlement until it is paid for, so the ceiling on what it is worth to an
 * abuser is low.
 *
 * An email came back as already registered. Repeated from one address, that
 * is someone probing which addresses have accounts. A person who forgot they
 * had signed up does it once or twice, not forty times.
 *
 * THE CAP IS DELIBERATELY GENEROUS
 *
 * The two failure modes are not symmetric. A limit set too high lets someone
 * create some junk accounts. A limit set too low stops a paying customer's
 * students from signing up, and does it silently, from the app's own front
 * door. The second is much worse, so the cap is set where a real classroom
 * cannot reach it and a script still can.
 */

/**
 * Response flag set by the register route when it rejects an address as
 * already registered, so the limiter can tell that apart from a typo without
 * inspecting the response body.
 */
export const SIGNUP_ABUSE_FLAG = "signupAbuseSignal";

/**
 * Whether this response should count against the sign-up cap.
 *
 * @param status the response status.
 * @param duplicateEmail whether the route flagged an already-registered
 *   address.
 */
export function countsTowardSignupLimit(status: number, duplicateEmail: boolean): boolean {
  // An account was created. Counted, so a script cannot make thousands.
  if (status >= 200 && status < 300) return true;

  // Probing for registered addresses.
  if (duplicateEmail) return true;

  // Everything else is the form being filled in wrongly, a server fault, or
  // the limiter's own 429. None of those is a reason to lock anyone out.
  return false;
}
