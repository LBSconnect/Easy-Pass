/**
 * The configurable API cap.
 *
 * It exists so an end-to-end run - where every request comes from one IP -
 * is not cut off partway through. That is a narrow reason to make a security
 * limit configurable, so the rules for reading the value are strict and every
 * unusable input falls back to the default rather than to "no limit".
 */
import { describe, it, expect } from "vitest";
import {
  resolveApiRateLimit,
  resolveAuthRateLimit,
  resolveRateLimitScale,
  DEFAULT_API_RATE_LIMIT,
  DEFAULT_AUTH_RATE_LIMIT,
  DEFAULT_RATE_LIMIT_SCALE,
} from "@shared/rateLimitConfig";

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

describe("resolveAuthRateLimit", () => {
  it("keeps the real limit by default", () => {
    // Five failed attempts per IP is a security control, not a preference.
    expect(resolveAuthRateLimit(undefined)).toBe(DEFAULT_AUTH_RATE_LIMIT);
    expect(DEFAULT_AUTH_RATE_LIMIT).toBe(5);
  });

  it("can be raised deliberately", () => {
    expect(resolveAuthRateLimit("100000")).toBe(100000);
  });

  it("falls back rather than removing the limit", () => {
    for (const raw of ["0", "-5", "", "off", "none"]) {
      expect(resolveAuthRateLimit(raw)).toBe(DEFAULT_AUTH_RATE_LIMIT);
    }
  });
});

describe("resolveRateLimitScale", () => {
  it("does not scale anything by default", () => {
    expect(resolveRateLimitScale(undefined)).toBe(1);
    expect(DEFAULT_RATE_LIMIT_SCALE).toBe(1);
  });

  it("scales when asked", () => {
    expect(resolveRateLimitScale("1000")).toBe(1000);
  });

  it("refuses a scale that would disable the limiters", () => {
    // A scale of 0 multiplies every cap to zero, which would block everything
    // rather than allow it - and a negative one is nonsense. Both fall back.
    for (const raw of ["0", "-1", "0.5", "many"]) {
      expect(resolveRateLimitScale(raw)).toBe(DEFAULT_RATE_LIMIT_SCALE);
    }
  });
});
