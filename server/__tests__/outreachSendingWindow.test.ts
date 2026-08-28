import { describe, expect, it } from "vitest";
import { isBusinessDay } from "@shared/outreachCampaign";
import { isOutreachSendingWindow } from "../outreach/sendingWindow";

describe("outreach sending window", () => {
  it("allows Saturday delivery from 8am through 5:59pm Central", () => {
    // Aug 29, 2026 is Saturday and Central is on daylight time (UTC-5).
    expect(isOutreachSendingWindow(new Date("2026-08-29T13:00:00Z"))).toBe(true); // 8am
    expect(isOutreachSendingWindow(new Date("2026-08-29T22:59:00Z"))).toBe(true); // 5:59pm
    expect(isOutreachSendingWindow(new Date("2026-08-29T23:00:00Z"))).toBe(false); // 6pm
  });

  it("still blocks Sunday and times before 8am", () => {
    expect(isOutreachSendingWindow(new Date("2026-08-30T15:00:00Z"))).toBe(false);
    expect(isOutreachSendingWindow(new Date("2026-08-28T12:59:00Z"))).toBe(false); // Fri 7:59am CDT
  });

  it("does not redefine Saturday as a business day for follow-up cadence", () => {
    expect(isBusinessDay(new Date("2026-08-29T15:00:00Z"))).toBe(false);
  });

  it("uses America/Chicago across standard time too", () => {
    // Jan 10, 2026 is Saturday and Central is UTC-6.
    expect(isOutreachSendingWindow(new Date("2026-01-10T14:00:00Z"))).toBe(true); // 8am CST
    expect(isOutreachSendingWindow(new Date("2026-01-11T00:00:00Z"))).toBe(false); // 6pm CST
  });
});
