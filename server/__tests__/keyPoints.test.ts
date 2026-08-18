import { describe, it, expect } from "vitest";
import {
  deriveKeyPoints,
  firstSentence,
  keyPointsFor,
  MAX_KEY_POINTS,
  type KeyPointSource,
} from "../alexi/keyPoints";

const src = (topic: string, explanation: string | null): KeyPointSource => ({ topic, explanation });

describe("firstSentence", () => {
  it("takes only the first sentence", () => {
    expect(firstSentence("A BOP covers small business. It excludes refineries."))
      .toBe("A BOP covers small business.");
  });

  it("does not split on abbreviations common in this material", () => {
    expect(firstSentence("See Sec. 4102 for the rule. The rest follows."))
      .toBe("See Sec. 4102 for the rule.");
  });

  it("collapses whitespace so a wrapped explanation reads as one line", () => {
    expect(firstSentence("Coinsurance   penalises\n  underinsuring."))
      .toBe("Coinsurance penalises underinsuring.");
  });

  it("rejects a sentence long enough to be a paragraph", () => {
    expect(firstSentence("x".repeat(400))).toBe("");
  });

  it("handles an explanation with no sentence ender", () => {
    expect(firstSentence("Coinsurance penalises underinsuring"))
      .toBe("Coinsurance penalises underinsuring");
  });

  it("returns empty for empty input", () => {
    expect(firstSentence("   ")).toBe("");
  });
});

describe("deriveKeyPoints", () => {
  it("draws only from questions on the named concept", () => {
    const points = deriveKeyPoints(
      [
        src("BOP", "A BOP is built for small and medium commercial risks."),
        src("Texas Law", "The commissioner licenses adjusters in this state."),
      ],
      "BOP",
    );

    expect(points).toEqual(["A BOP is built for small and medium commercial risks."]);
  });

  it("uses everything available when no concept is named", () => {
    const points = deriveKeyPoints(
      [
        src("BOP", "A BOP is built for small and medium commercial risks."),
        src("Texas Law", "The commissioner licenses adjusters in this state."),
      ],
      null,
    );

    expect(points).toHaveLength(2);
  });

  it("matches topics regardless of case and surrounding space", () => {
    const points = deriveKeyPoints(
      [src("  BOP Eligibility ", "A BOP is built for small commercial risks.")],
      "bop eligibility",
    );

    expect(points).toHaveLength(1);
  });

  it("drops near-duplicates so the same fact is not listed twice", () => {
    const points = deriveKeyPoints(
      [
        src("BOP", "A BOP is built for small and medium commercial risks."),
        src("BOP", "A BOP is built for small and medium commercial risks!"),
        src("BOP", "Refineries fall well outside a BOP's hazard grade."),
      ],
      "BOP",
    );

    expect(points).toHaveLength(2);
  });

  it("skips fragments too short to be a point", () => {
    const points = deriveKeyPoints([src("BOP", "It varies."), src("BOP", "Yes.")], "BOP");

    expect(points).toEqual([]);
  });

  it("skips questions with no approved explanation", () => {
    const points = deriveKeyPoints(
      [src("BOP", null), src("BOP", "   "), src("BOP", "A BOP suits small commercial risks.")],
      "BOP",
    );

    expect(points).toEqual(["A BOP suits small commercial risks."]);
  });

  it("caps the list so a lead-in does not become a wall of text", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      src("BOP", `Approved statement number ${i} about eligibility rules.`),
    );

    expect(deriveKeyPoints(many, "BOP")).toHaveLength(MAX_KEY_POINTS);
  });

  it("returns nothing rather than padding when the bank has nothing to say", () => {
    expect(deriveKeyPoints([], "BOP")).toEqual([]);
  });
});

describe("keyPointsFor", () => {
  const sources = [src("BOP", "A BOP is built for small and medium commercial risks.")];

  it("prefers human-authored points outright", () => {
    const out = keyPointsFor(["Authored point about eligibility."], sources, "BOP");

    expect(out.source).toBe("authored");
    expect(out.points).toEqual(["Authored point about eligibility."]);
  });

  it("does not append derived points to an authored list", () => {
    // An editor who wrote one point chose one point; quietly adding machine
    // output to their list would undo that choice.
    const out = keyPointsFor(["Only this."], sources, "BOP");

    expect(out.points).toHaveLength(1);
  });

  it("falls back to derived points when nothing is authored", () => {
    const out = keyPointsFor(undefined, sources, "BOP");

    expect(out.source).toBe("derived");
    expect(out.points).toHaveLength(1);
  });

  it("ignores an authored list that is only blank strings", () => {
    const out = keyPointsFor(["  ", ""], sources, "BOP");

    expect(out.source).toBe("derived");
  });

  it("reports none when there is nothing from either source", () => {
    const out = keyPointsFor(undefined, [], "BOP");

    expect(out.source).toBe("none");
    expect(out.points).toEqual([]);
  });
});
