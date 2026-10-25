import { describe, expect, it } from "vitest";
import { analyticsUserId } from "../analyticsIdentity";

describe("analyticsUserId", () => {
  it("attributes an event for a student with a server-side login session", () => {
    expect(analyticsUserId({ session: { userId: "session-user-1" } }))
      .toBe("session-user-1");
  });

  it("prefers the authenticated session over a conflicting Passport identity", () => {
    expect(analyticsUserId({
      session: { userId: "session-user-1" },
      user: { claims: { sub: "other-user" } },
    })).toBe("session-user-1");
  });

  it("never attributes a signed-out visitor, even if metadata submits a fake user id", () => {
    const untrustedRequest = {
      session: {},
      body: { userId: "imposter", metadata: { user_id: "imposter" } },
    };
    expect(analyticsUserId(untrustedRequest)).toBeUndefined();
  });

  it("keeps the legacy server-populated Passport identity available", () => {
    expect(analyticsUserId({ user: { claims: { sub: "passport-user-1" } } }))
      .toBe("passport-user-1");
  });

  it("does not count empty session or claims values as signed-in users", () => {
    expect(analyticsUserId({ session: { userId: "" }, user: { claims: { sub: "" } } }))
      .toBeUndefined();
  });
});
