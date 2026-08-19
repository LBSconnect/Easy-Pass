/**
 * What the sign-up limiter counts.
 *
 * This is a security control, so the tests say in both directions what it is
 * for: it must still stop a script creating accounts in bulk, and it must
 * stop punishing a student who cannot type their password.
 *
 * The bug being fixed here blocked registration entirely. Five rejected
 * sign-up forms from one address - a short password is enough - locked that
 * address out for fifteen minutes, told the person "Too many login attempts",
 * and took every other student behind the same office or school NAT with it.
 */
import { describe, it, expect } from "vitest";
import { countsTowardSignupLimit, SIGNUP_ABUSE_FLAG } from "@shared/signupLimit";

describe("countsTowardSignupLimit", () => {
  it("counts an account that was actually created", () => {
    // The only real abuse of this endpoint is bulk signup, so this is the
    // thing the cap exists to bound.
    expect(countsTowardSignupLimit(200, false)).toBe(true);
    expect(countsTowardSignupLimit(201, false)).toBe(true);
  });

  it("counts an address that came back already registered", () => {
    // Repeated from one IP this is enumeration - finding out who has an
    // account here. Someone who forgot they signed up does it once.
    expect(countsTowardSignupLimit(400, true)).toBe(true);
  });

  it("does not count a password that was too short", () => {
    // The bug. This is a person mistyping, not an attack, and it must not
    // spend anyone's budget - least of all the budget of everyone else on
    // the same network.
    expect(countsTowardSignupLimit(400, false)).toBe(false);
  });

  it("does not count a malformed email or a missing field", () => {
    expect(countsTowardSignupLimit(400, false)).toBe(false);
    expect(countsTowardSignupLimit(422, false)).toBe(false);
  });

  it("does not count a server fault against the person who hit it", () => {
    // A 500 is our failure. Charging it to the student would mean an outage
    // locks people out of signing up for a further fifteen minutes after it
    // is fixed.
    expect(countsTowardSignupLimit(500, false)).toBe(false);
    expect(countsTowardSignupLimit(503, false)).toBe(false);
  });

  it("does not let its own rejection extend the lockout", () => {
    // Otherwise a client that retries keeps the window rolling forward and
    // the block never expires.
    expect(countsTowardSignupLimit(429, false)).toBe(false);
  });

  it("names the flag once, so route and limiter cannot drift apart", () => {
    expect(SIGNUP_ABUSE_FLAG).toBe("signupAbuseSignal");
  });
});
