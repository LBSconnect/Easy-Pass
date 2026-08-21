import { describe, it, expect } from "vitest";
import { resolveLandingVariant, approvedVariantKeys } from "@shared/landingIntent";

describe("resolveLandingVariant", () => {
  it("matches an approved key", () => {
    const variant = resolveLandingVariant("life_insurance", "practice_test");

    expect(variant?.headingEn).toBe("Texas Life Insurance Practice Test");
  });

  it("accepts the hyphenated spelling ad platforms sometimes emit", () => {
    expect(resolveLandingVariant("life_insurance", "practice-test")?.key).toBe("practice_test");
  });

  it("ignores case and surrounding whitespace", () => {
    expect(resolveLandingVariant("life_insurance", "  Exam_Questions ")?.key).toBe("exam_questions");
  });

  it("keeps the page's own heading when nothing is supplied", () => {
    expect(resolveLandingVariant("life_insurance", null)).toBeNull();
    expect(resolveLandingVariant("life_insurance", undefined)).toBeNull();
    expect(resolveLandingVariant("life_insurance", "")).toBeNull();
    expect(resolveLandingVariant("life_insurance", "   ")).toBeNull();
  });

  it("keeps the page's own heading for an unrecognised key", () => {
    expect(resolveLandingVariant("life_insurance", "cheapest_course")).toBeNull();
  });

  // The point of the allowlist. Each of these is a real thing an ad network,
  // a competitor or an attacker can put in a query string, and none of them
  // may reach a heading.
  it.each([
    ["<script>alert(1)</script>", "markup"],
    ["Guaranteed Pass First Try", "a promise we do not make"],
    ["Official Texas Department of Insurance", "a claimed affiliation"],
    ["Pearson VUE Official Practice", "a claimed affiliation"],
    ["texas life insurance exam prep", "an unkeyed phrase, however plausible"],
    ["{{constructor}}", "a template payload"],
  ])("refuses %s (%s)", (input) => {
    expect(resolveLandingVariant("life_insurance", input)).toBeNull();
  });

  it("drops an overlong value without inspecting it", () => {
    expect(resolveLandingVariant("life_insurance", "a".repeat(500))).toBeNull();
  });

  it("has no variants for a category nobody has written copy for", () => {
    // Silence is correct here: a missing entry must fall back to the page's
    // own H1, never borrow another exam's heading.
    expect(resolveLandingVariant("real_estate", "practice_test")).toBeNull();
    expect(approvedVariantKeys("real_estate")).toEqual([]);
  });

  it("never returns a heading that is not one of the approved four", () => {
    const approved = new Set([
      "Texas Life Insurance Exam Prep",
      "Texas Life Insurance Practice Test",
      "Texas Life Insurance Exam Questions",
      "Texas Life Insurance Test Prep",
    ]);

    for (const key of approvedVariantKeys("life_insurance")) {
      const variant = resolveLandingVariant("life_insurance", key);
      expect(variant).not.toBeNull();
      expect(approved.has(variant!.headingEn)).toBe(true);
    }
  });

  it("makes no unsupported claim in any approved heading", () => {
    const forbidden = /guarantee|guaranteed|pass first|official|TDI|Pearson|100%/i;

    for (const key of approvedVariantKeys("life_insurance")) {
      const variant = resolveLandingVariant("life_insurance", key)!;
      expect(variant.headingEn).not.toMatch(forbidden);
      expect(variant.headingEs).not.toMatch(forbidden);
    }
  });
});
