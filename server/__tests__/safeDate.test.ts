import { describe, it, expect } from "vitest";
import { parseDate, isValidDate } from "@shared/safeDate";

describe("parseDate", () => {
  it("parses an ISO string", () => {
    expect(parseDate("2026-08-17T12:00:00Z")?.toISOString()).toBe("2026-08-17T12:00:00.000Z");
  });

  it("passes through a valid Date", () => {
    const d = new Date("2026-08-17T12:00:00Z");
    expect(parseDate(d)).toBe(d);
  });

  it("parses an epoch number", () => {
    expect(parseDate(0)?.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });

  it("returns null for nullish input", () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });

  it("returns null rather than an Invalid Date", () => {
    // The whole point: date-fns format() throws a RangeError on an Invalid
    // Date, and in a render that blanks the entire page.
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate(new Date("nonsense"))).toBeNull();
    expect(parseDate(NaN)).toBeNull();
  });

  it("returns null for types that are not date-like", () => {
    expect(parseDate({})).toBeNull();
    expect(parseDate([])).toBeNull();
    expect(parseDate(true)).toBeNull();
  });

  it("never returns a Date that would throw when formatted", () => {
    const inputs = ["", "x", null, undefined, NaN, {}, [], "2026-13-45", new Date("bad")];
    for (const input of inputs) {
      const result = parseDate(input);
      if (result !== null) expect(Number.isNaN(result.getTime())).toBe(false);
    }
  });
});

describe("isValidDate", () => {
  it("agrees with parseDate", () => {
    expect(isValidDate("2026-08-17")).toBe(true);
    expect(isValidDate("rubbish")).toBe(false);
    expect(isValidDate(null)).toBe(false);
  });
});
