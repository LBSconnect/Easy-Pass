import { describe, it, expect } from "vitest";
import { EXAM_FACTS, getExamFacts, hasPublishableFacts } from "@shared/examFacts";

describe("examFacts", () => {
  it("covers every exam category", () => {
    expect(Object.keys(EXAM_FACTS).sort()).toEqual([
      "general_lines",
      "life_insurance",
      "property_casualty",
      "real_estate",
    ]);
  });

  it("only allows publishing for verified exams that have portions", () => {
    expect(hasPublishableFacts("real_estate")).toBe(true);
    expect(hasPublishableFacts("property_casualty")).toBe(false);
    expect(hasPublishableFacts("life_insurance")).toBe(false);
    expect(hasPublishableFacts("general_lines")).toBe(false);
  });

  it("refuses to publish for an unknown category", () => {
    expect(hasPublishableFacts("nope")).toBe(false);
    expect(getExamFacts("nope")).toBeUndefined();
  });

  it("requires a source and verification date on anything publishable", () => {
    for (const [category, facts] of Object.entries(EXAM_FACTS)) {
      if (!hasPublishableFacts(category)) continue;
      expect(facts.source.url, `${category} needs a source url`).toMatch(/^https:\/\//);
      expect(facts.verifiedOn, `${category} needs a verified date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("never lets an unverified exam carry figures", () => {
    // Guards the failure mode this module exists to prevent: figures added to
    // an exam that was never checked against an official source.
    for (const [category, facts] of Object.entries(EXAM_FACTS)) {
      if (facts.verified) continue;
      expect(facts.portions, `${category} is unverified and must have no portions`).toHaveLength(0);
    }
  });

  it("matches the Pearson VUE handbook for the real estate sales agent exam", () => {
    // Source: Texas Real Estate Candidate Handbook 094400 v2.1 (May 2026).
    // National 85 items / 150 min, 56 correct to pass.
    // State law 50 items / 90 min, 28 correct to pass.
    const facts = getExamFacts("real_estate")!;
    const [national, state] = facts.portions;

    expect(national.totalItems).toBe(85);
    expect(national.scoredItems).toBe(80);
    expect(national.pretestItems).toBe(5);
    expect(national.timeMinutes).toBe(150);
    expect(national.correctToPass).toBe(56);

    expect(state.totalItems).toBe(50);
    expect(state.scoredItems).toBe(40);
    expect(state.pretestItems).toBe(10);
    expect(state.timeMinutes).toBe(90);
    expect(state.correctToPass).toBe(28);

    expect(facts.examProvider).toBe("Pearson VUE");
    expect(facts.regulator).toContain("TREC");
  });

  it("keeps scored plus pretest consistent with the total presented", () => {
    for (const facts of Object.values(EXAM_FACTS)) {
      for (const p of facts.portions) {
        if (p.scoredItems === undefined || p.pretestItems === undefined) continue;
        expect(p.scoredItems + p.pretestItems).toBe(p.totalItems);
      }
    }
  });

  it("never claims more correct answers to pass than there are scored items", () => {
    for (const facts of Object.values(EXAM_FACTS)) {
      for (const p of facts.portions) {
        if (p.correctToPass === undefined || p.scoredItems === undefined) continue;
        expect(p.correctToPass).toBeLessThanOrEqual(p.scoredItems);
      }
    }
  });
});
