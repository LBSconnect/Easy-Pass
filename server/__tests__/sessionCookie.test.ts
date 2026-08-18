/**
 * The Secure flag on the session cookie.
 *
 * This one is worth being fussy about: the cookie it describes is the thing
 * that authenticates a student, so an accidental "off" in production is a
 * real exposure. Everything except the exact opt-out string keeps it on.
 */
import { describe, it, expect } from "vitest";
import { resolveSecureCookie } from "@shared/sessionCookie";

describe("resolveSecureCookie", () => {
  it("is on in production by default", () => {
    expect(resolveSecureCookie({ nodeEnv: "production", override: undefined })).toBe(true);
  });

  it("is off outside production by default", () => {
    expect(resolveSecureCookie({ nodeEnv: "development", override: undefined })).toBe(false);
    expect(resolveSecureCookie({ nodeEnv: undefined, override: undefined })).toBe(false);
  });

  it("can be turned off deliberately, which is what CI over HTTP needs", () => {
    expect(resolveSecureCookie({ nodeEnv: "production", override: "false" })).toBe(false);
  });

  it("can be turned on deliberately outside production", () => {
    expect(resolveSecureCookie({ nodeEnv: "development", override: "true" })).toBe(true);
  });

  it("ignores every other value rather than guessing", () => {
    // The failure that matters is a typo'd setting silently disabling Secure
    // in production, so anything unrecognised keeps the production default.
    for (const override of ["0", "no", "off", "FALSE", "False", "", " ", "1", "yes"]) {
      expect(resolveSecureCookie({ nodeEnv: "production", override })).toBe(true);
    }
  });
});
