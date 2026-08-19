/**
 * The month boundary for revenue.
 *
 * The server runs in UTC and the business banks in Texas, so for the last five
 * or six hours of every local day the two disagree about the date. A boundary
 * that got this wrong would not throw - it would quietly move a renewal from
 * one month's total to another's, and both figures would look fine.
 *
 * The tests that matter here are the ones on either side of midnight, and the
 * ones across a daylight-saving change.
 */
import { describe, it, expect } from "vitest";
import {
  startOfMonth,
  monthLabel,
  revenuePeriodNote,
  BILLING_TIME_ZONE,
} from "@shared/revenuePeriod";

describe("startOfMonth", () => {
  it("starts the month at local midnight, not UTC midnight", () => {
    // 1 August 2026 00:00 CDT is 05:00 UTC.
    const start = startOfMonth(new Date("2026-08-19T15:00:00Z"));
    expect(start.toISOString()).toBe("2026-08-01T05:00:00.000Z");
  });

  it("keeps a late-evening payment in the month it was made", () => {
    // 20:00 on 31 January in Fort Worth is already 02:00 on 1 February in UTC.
    // The payer, and the person reading the dashboard, both call it January.
    const lateJan = new Date("2026-02-01T02:00:00Z");
    const februaryStart = startOfMonth(new Date("2026-02-15T12:00:00Z"));

    expect(lateJan.getTime()).toBeLessThan(februaryStart.getTime());
  });

  it("counts a payment made just after local midnight", () => {
    // 00:30 on 1 February locally - the first payment of the new month.
    const justAfter = new Date("2026-02-01T06:30:00Z");
    expect(justAfter.getTime()).toBeGreaterThanOrEqual(
      startOfMonth(justAfter).getTime(),
    );
  });

  it("uses the offset in force on the first, not the one in force today", () => {
    // Asked at the end of March, when CDT is in effect. March began in CST,
    // an hour further from UTC - using today's offset would be an hour out.
    const start = startOfMonth(new Date("2026-03-30T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-03-01T06:00:00.000Z");
  });

  it("handles being asked on the day the clocks change", () => {
    // 8 March 2026 is the US spring-forward date.
    const start = startOfMonth(new Date("2026-03-08T18:00:00Z"));
    expect(start.toISOString()).toBe("2026-03-01T06:00:00.000Z");
  });

  it("handles the autumn change too", () => {
    // 1 November 2026 is itself the fall-back date; midnight is still CDT
    // because the change happens at 02:00.
    const start = startOfMonth(new Date("2026-11-15T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-11-01T05:00:00.000Z");
  });

  it("rolls over the year in December", () => {
    const start = startOfMonth(new Date("2026-12-20T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-12-01T06:00:00.000Z");
  });

  it("puts a January payment in January, not the previous December", () => {
    // The UTC year has already ticked over here; the local one has not.
    const newYearsEveLocal = new Date("2027-01-01T04:00:00Z");
    const start = startOfMonth(newYearsEveLocal);
    expect(start.toISOString()).toBe("2026-12-01T06:00:00.000Z");
  });

  it("is idempotent - the start of the month is in its own month", () => {
    const start = startOfMonth(new Date("2026-08-19T15:00:00Z"));
    expect(startOfMonth(start).toISOString()).toBe(start.toISOString());
  });

  it("never lands after the instant it was asked about", () => {
    for (const iso of [
      "2026-01-01T00:00:00Z",
      "2026-03-08T08:00:00Z",
      "2026-07-04T23:59:59Z",
      "2026-11-01T06:00:00Z",
      "2026-12-31T23:59:59Z",
    ]) {
      const now = new Date(iso);
      expect(startOfMonth(now).getTime()).toBeLessThanOrEqual(now.getTime());
    }
  });

  it("honours an explicit zone", () => {
    // Same instant, a zone ahead of UTC: the month has already started there.
    const start = startOfMonth(new Date("2026-08-19T15:00:00Z"), "UTC");
    expect(start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
});

describe("monthLabel", () => {
  it("names the month so a screenshot still makes sense later", () => {
    expect(monthLabel(new Date("2026-08-19T15:00:00Z"))).toBe("August 2026");
  });

  it("names the local month, not the UTC one", () => {
    // Still 31 July in Texas.
    expect(monthLabel(new Date("2026-08-01T03:00:00Z"))).toBe("July 2026");
  });
});

describe("revenuePeriodNote", () => {
  const AUGUST_START = "2026-08-01T05:00:00.000Z";

  it("names the month the figure covers", () => {
    expect(revenuePeriodNote(AUGUST_START, "en")).toBe("August 2026 subscriptions");
  });

  it("names it in Spanish too", () => {
    expect(revenuePeriodNote(AUGUST_START, "es")).toBe("Suscripciones de agosto de 2026");
  });

  it("names the month the period started, not the UTC one", () => {
    // Local midnight on 1 August is 05:00 UTC on 1 August - but local midnight
    // on 1 January is 06:00 UTC, still 31 December to a naive reading.
    expect(revenuePeriodNote("2027-01-01T06:00:00.000Z", "en")).toBe(
      "January 2027 subscriptions",
    );
  });

  it("still says a period when the server sent none", () => {
    // A bare figure with no period reads as all-time, which is the misreading
    // this label exists to prevent - so it degrades to vaguer, not to silent.
    expect(revenuePeriodNote(undefined, "en")).toBe("This month's subscriptions");
    expect(revenuePeriodNote(null, "es")).toBe("Suscripciones de este mes");
    expect(revenuePeriodNote("not a date", "en")).toBe("This month's subscriptions");
  });
});

describe("BILLING_TIME_ZONE", () => {
  it("is the zone the business actually operates in", () => {
    expect(BILLING_TIME_ZONE).toBe("America/Chicago");
  });
});
