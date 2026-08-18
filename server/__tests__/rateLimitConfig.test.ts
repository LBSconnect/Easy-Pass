/**
 * The configurable API cap.
 *
 * It exists so an end-to-end run - where every request comes from one IP -
 * is not cut off partway through. That is a narrow reason to make a security
 * limit configurable, so the rules for reading the value are strict and every
 * unusable input falls back to the default rather than to "no limit".
 */
import { describe, it, expect } from "vitest";
import { resolveApiRateLimit, DEFAULT_API_RATE_LIMIT } from "@shared/rateLimitConfig";

describe("resolveApiRateLimit", () => {
  it("uses the default when unset", () => {
    expect(resolveApiRateLimit(undefined)).toBe(DEFAULT_API_RATE_LIMIT);
  });

  it("accepts a deliberate value", () => {
    expect(resolveApiRateLimit("100000")).toBe(100000);
    expect(resolveApiRateLimit(" 250 ")).toBe(250);
  });

  it("refuses values that would remove the limit", () => {
    // "0" is the dangerous one: read naively it means unlimited.
    expect(resolveApiRateLimit("0")).toBe(DEFAULT_API_RATE_LIMIT);
    expect(resolveApiRateLimit("-1")).toBe(DEFAULT_API_RATE_LIMIT);
  });

  it("refuses anything that is not a whole number", () => {
    for (const raw of ["", " ", "lots", "1e6a", "12.5", "NaN", "Infinity"]) {
      expect(resolveApiRateLimit(raw)).toBe(DEFAULT_API_RATE_LIMIT);
    }
  });
});
