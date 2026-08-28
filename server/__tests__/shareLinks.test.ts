import { describe, expect, it } from "vitest";
import { buildReadinessShareUrl } from "../../client/src/lib/shareLinks";

describe("buildReadinessShareUrl", () => {
  it("builds a tracked public readiness link", () => {
    const url = new URL(buildReadinessShareUrl());

    expect(url.origin).toBe("https://www.myeasypass.net");
    expect(url.pathname).toBe("/readiness-check");
    expect(url.searchParams.get("utm_source")).toBe("student_share");
    expect(url.searchParams.get("utm_medium")).toBe("referral");
    expect(url.searchParams.get("utm_campaign")).toBe("readiness_share");
  });

  it("contains no student-specific fields", () => {
    const url = buildReadinessShareUrl();
    const lower = url.toLowerCase();

    for (const forbidden of ["email", "score", "answer", "user", "student", "subscription", "stripe"]) {
      expect(lower).not.toContain(`${forbidden}=`);
    }
  });
});
