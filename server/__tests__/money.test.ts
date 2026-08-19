/**
 * Money conversion.
 *
 * These are trivial functions guarding a bug that shipped: revenue converted
 * from cents on the server and converted again in the admin card, so Total
 * Revenue read $0.60 against $60.00 of real payments. The tests are less about
 * the arithmetic than about the unit each function takes - that is what stops
 * the second conversion coming back.
 */
import { describe, it, expect } from "vitest";
import { centsToUsd, formatUsd } from "@shared/money";

describe("centsToUsd", () => {
  it("converts a Stripe amount to dollars", () => {
    expect(centsToUsd(6000)).toBe(60);
    expect(centsToUsd(2999)).toBe(29.99);
  });

  it("handles no payments at all", () => {
    expect(centsToUsd(0)).toBe(0);
  });

  it("treats a missing amount as nothing rather than NaN", () => {
    // A NaN here renders as "$NaN" on the admin dashboard.
    expect(centsToUsd(Number.NaN)).toBe(0);
    expect(centsToUsd(undefined as unknown as number)).toBe(0);
  });
});

describe("formatUsd", () => {
  it("formats dollars, and does not convert", () => {
    // The bug in one line: the value arriving here is already dollars, so
    // 60 must read as $60.00. Any division would make it $0.60 again.
    expect(formatUsd(60)).toBe("$60.00");
  });

  it("keeps cents visible", () => {
    expect(formatUsd(29.99)).toBe("$29.99");
    expect(formatUsd(0.6)).toBe("$0.60");
  });

  it("rounds to two places rather than trailing a float", () => {
    expect(formatUsd(0.1 + 0.2)).toBe("$0.30");
  });

  it("shows zero when there is nothing to show", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(null)).toBe("$0.00");
    expect(formatUsd(undefined)).toBe("$0.00");
    expect(formatUsd(Number.NaN)).toBe("$0.00");
  });

  it("survives a whole conversion round trip", () => {
    // What the admin card actually does, end to end: cents from Stripe,
    // one conversion, then formatting.
    expect(formatUsd(centsToUsd(6000))).toBe("$60.00");
  });
});
