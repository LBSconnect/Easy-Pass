import { describe, it, expect } from "vitest";
import { EXAM_FACTS, getExamFacts, hasPublishableFacts } from "@shared/examFacts";

const CATEGORIES = ["real_estate", "property_casualty", "life_insurance", "general_lines"];

describe("exam facts integrity", () => {
  it("covers every exam category", () => {
    for (const c of CATEGORIES) expect(getExamFacts(c)).toBeDefined();
  });

  it("publishes nothing for an unknown category", () => {
    expect(getExamFacts("texas_plumbing")).toBeUndefined();
    expect(hasPublishableFacts("texas_plumbing")).toBe(false);
  });

  it("only publishes facts that are both verified and populated", () => {
    // The gate that keeps guessed figures off the site.
    for (const c of CATEGORIES) {
      const facts = EXAM_FACTS[c];
      expect(hasPublishableFacts(c)).toBe(facts.verified && facts.portions.length > 0);
    }
  });

  it("requires a real source and verification date on anything published", () => {
    for (const c of CATEGORIES) {
      if (!hasPublishableFacts(c)) continue;
      const facts = EXAM_FACTS[c];
      expect(facts.source.url).toMatch(/^https:\/\//);
      expect(facts.source.label.length).toBeGreaterThan(10);
      expect(facts.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("never claims affiliation with a regulator or provider", () => {
    for (const c of CATEGORIES) {
      const facts = EXAM_FACTS[c];
      const blob = JSON.stringify(facts).toLowerCase();
      expect(blob).not.toMatch(/official (trec|tdi|pearson)/);
      expect(blob).not.toMatch(/endorsed by/);
      expect(blob).not.toMatch(/guarantee/);
    }
  });

  it("keeps portion arithmetic self-consistent", () => {
    // scored + pretest must equal the total presented, or one of the three
    // numbers was mistyped.
    for (const c of CATEGORIES) {
      for (const p of EXAM_FACTS[c].portions) {
        if (p.scoredItems !== undefined && p.pretestItems !== undefined) {
          expect(p.scoredItems + p.pretestItems).toBe(p.totalItems);
        }
      }
    }
  });

  it("never lets an unverified exam carry figures", () => {
    // An exam still awaiting verification must hold no numbers at all, so a
    // half-filled record cannot leak onto a page by flipping one flag.
    for (const c of CATEGORIES) {
      const facts = EXAM_FACTS[c];
      if (facts.verified) continue;
      expect(facts.portions).toEqual([]);
      expect(facts.totalTimeMinutes).toBeUndefined();
      expect(facts.passingScaledScore).toBeUndefined();
    }
  });

  it("never claims more correct answers to pass than there are scored items", () => {
    for (const c of CATEGORIES) {
      for (const p of EXAM_FACTS[c].portions) {
        if (p.correctToPass !== undefined && p.scoredItems !== undefined) {
          expect(p.correctToPass).toBeLessThanOrEqual(p.scoredItems);
        }
      }
    }
  });

  it("times every published exam exactly one way", () => {
    // Either each portion is separately timed, or the exam is one sitting.
    // Both or neither means the page would render a blank or duplicated time.
    for (const c of CATEGORIES) {
      if (!hasPublishableFacts(c)) continue;
      const facts = EXAM_FACTS[c];
      const perPortion = facts.portions.every((p) => p.timeMinutes !== undefined);
      const whole = facts.totalTimeMinutes !== undefined;
      expect(perPortion || whole).toBe(true);
      expect(perPortion && whole).toBe(false);
    }
  });
});

describe("real estate (Pearson VUE handbook 094400)", () => {
  const facts = EXAM_FACTS.real_estate;

  it("is published", () => {
    expect(hasPublishableFacts("real_estate")).toBe(true);
  });

  it("matches the handbook's two separately timed portions", () => {
    const [national, state] = facts.portions;

    expect(national.totalItems).toBe(85);
    expect(national.scoredItems).toBe(80);
    expect(national.timeMinutes).toBe(150);
    expect(national.correctToPass).toBe(56);

    expect(state.totalItems).toBe(50);
    expect(state.scoredItems).toBe(40);
    expect(state.timeMinutes).toBe(90);
    expect(state.correctToPass).toBe(28);
  });

  it("reports a raw passing count, not a scaled score", () => {
    expect(facts.passingScaledScore).toBeUndefined();
  });
});

/**
 * Insurance figures, locked to the source.
 *
 * Question counts: Pearson VUE Texas Insurance Examination Content Outlines
 * (124401), effective 1 December 2025. Session times: Texas Insurance
 * Licensing Candidate Handbook (124400).
 *
 * These assertions exist so a well-meaning edit cannot quietly change a
 * published regulatory figure without a test failing and forcing whoever
 * changed it to re-check the source.
 */
describe("insurance exams (Pearson VUE outlines 124401 + handbook 124400)", () => {
  const EXPECTED = {
    property_casualty: { general: [100, 10], state: [30, 5], minutes: 150 },
    general_lines: { general: [100, 10], state: [30, 5], minutes: 150 },
    life_insurance: { general: [50, 5], state: [30, 5], minutes: 120 },
  } as const;

  for (const [category, want] of Object.entries(EXPECTED)) {
    describe(category, () => {
      const facts = EXAM_FACTS[category];

      it("is published", () => {
        expect(hasPublishableFacts(category)).toBe(true);
      });

      it("matches the published general-knowledge counts", () => {
        const [scored, pretest] = want.general;
        expect(facts.portions[0].scoredItems).toBe(scored);
        expect(facts.portions[0].pretestItems).toBe(pretest);
        expect(facts.portions[0].totalItems).toBe(scored + pretest);
      });

      it("matches the published Texas state-specific counts", () => {
        const [scored, pretest] = want.state;
        expect(facts.portions[1].scoredItems).toBe(scored);
        expect(facts.portions[1].pretestItems).toBe(pretest);
        expect(facts.portions[1].totalItems).toBe(scored + pretest);
      });

      it("is one timed sitting, not per-portion timing", () => {
        expect(facts.totalTimeMinutes).toBe(want.minutes);
        for (const p of facts.portions) expect(p.timeMinutes).toBeUndefined();
      });

      it("reports a scaled passing score of 70", () => {
        expect(facts.passingScaledScore).toBe(70);
      });

      it("never states a raw number of questions needed to pass", () => {
        // The handbook is explicit that the scaled score is "neither the
        // number of questions you answered correctly nor the percentage".
        // Publishing a raw threshold would misdescribe how the exam is graded.
        for (const p of facts.portions) expect(p.correctToPass).toBeUndefined();
      });

      it("explains that the scaled score is not a percentage", () => {
        expect(facts.note).toMatch(/not a percentage/i);
        expect(facts.noteEs).toBeTruthy();
      });

      it("cites the content outlines with their effective date", () => {
        expect(facts.source.documentId).toMatch(/124401/);
        expect(facts.source.documentId).toMatch(/2025/);
      });
    });
  }
});
