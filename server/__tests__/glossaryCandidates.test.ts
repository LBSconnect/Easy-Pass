/**
 * The glossary worklist.
 *
 * The property that matters most is what this does NOT do: it surfaces terms
 * and where they appear, and never produces a definition. Definitions of
 * Texas insurance and real-estate terms are statements of law, and inventing
 * one would put a confident falsehood in front of a student revising for a
 * licensing exam.
 *
 * The rest is about signal: a candidate list that is mostly noise gets
 * ignored, which is worse than a short list.
 */
import { describe, it, expect } from "vitest";
import {
  extractTerms,
  glossaryCandidates,
  type GlossarySource,
} from "../alexi/glossaryCandidates";

const q = (
  id: string,
  questionTextEn: string,
  explanationEn: string | null = null,
  topic: string | null = "General",
): GlossarySource => ({ id, topic, questionTextEn, explanationEn });

describe("extractTerms", () => {
  it("finds a multi-word capitalised phrase", () => {
    expect(extractTerms("A Businessowners Policy bundles cover.")).toContain(
      "Businessowners Policy",
    );
  });

  it("strips a leading sentence opener from a phrase", () => {
    // "The Businessowners Policy" is the same term as "Businessowners Policy".
    expect(extractTerms("The Businessowners Policy is rated for small risks.")).toContain(
      "Businessowners Policy",
    );
  });

  it("finds single words whose form marks them as terminology", () => {
    const terms = extractTerms("The insured must pay the deductible before indemnity applies.");
    expect(terms).toContain("insured");
    expect(terms).toContain("deductible");
    expect(terms).toContain("indemnity");
  });

  it("does not treat a run of ordinary words as a term", () => {
    // Sentence openers capitalised mid-text are the main source of noise.
    expect(extractTerms("When The Answer Is Correct")).not.toContain("When The");
  });

  it("skips a bare acronym", () => {
    // "BOP" alone is useless in a glossary without the phrase behind it.
    expect(extractTerms("A BOP excludes professional liability.")).not.toContain("BOP");
  });

  it("ignores trailing punctuation so one term is not two", () => {
    const terms = extractTerms("Consider the Businessowners Policy, then decide.");
    expect(terms).toContain("Businessowners Policy");
  });
});

describe("glossaryCandidates", () => {
  it("never returns a definition field of any kind", () => {
    // The whole safety argument in one assertion: this produces a worklist,
    // not content. If a definition key ever appears here, something has
    // started authoring law from a model or from a regex.
    const candidates = glossaryCandidates([
      q("1", "What is a Businessowners Policy?", "It bundles cover for small business."),
      q("2", "Which risk suits a Businessowners Policy?", "Small commercial risks."),
    ]);
    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(Object.keys(candidate).sort()).toEqual([
        "questionCount",
        "sourceQuestionIds",
        "term",
        "topics",
      ]);
    }
  });

  it("counts distinct questions, not occurrences", () => {
    const candidates = glossaryCandidates([
      q(
        "1",
        "Which risk suits a Businessowners Policy?",
        "A Businessowners Policy bundles cover, and a Businessowners Policy is rated for small risks.",
      ),
      q("2", "When is a Businessowners Policy unsuitable?", "For heavy manufacturing."),
    ]);
    const bop = candidates.find((c) => c.term === "Businessowners Policy");
    expect(bop?.questionCount).toBe(2);
  });

  it("drops a term that appears in only one question", () => {
    // One appearance is usually incidental phrasing rather than vocabulary.
    const candidates = glossaryCandidates([q("1", "A Named Insured appears once.")]);
    expect(candidates.find((c) => c.term === "Named Insured")).toBeUndefined();
  });

  it("ranks the terms the bank leans on first", () => {
    const sources = [
      q("1", "About a Businessowners Policy.", "The Businessowners Policy bundles cover."),
      q("2", "More on a Businessowners Policy.", "A Businessowners Policy suits small risks."),
      q("3", "A Businessowners Policy names the Named Insured.", "Yes."),
      q("4", "Who is the Named Insured?", "The person named on it."),
    ];
    const candidates = glossaryCandidates(sources);
    expect(candidates[0].term).toBe("Businessowners Policy");
    expect(candidates.map((c) => c.term)).toContain("Named Insured");
  });

  it("skips terms the glossary already defines", () => {
    const sources = [
      q("1", "About a Businessowners Policy.", "It bundles cover."),
      q("2", "More on a Businessowners Policy.", "It suits small risks."),
    ];
    expect(glossaryCandidates(sources, ["businessowners policy"])).toHaveLength(0);
  });

  it("matches an already-defined term whatever its capitalisation", () => {
    const sources = [
      q("1", "About a Businessowners Policy.", "It bundles cover."),
      q("2", "More on a Businessowners Policy.", "It suits small risks."),
    ];
    expect(glossaryCandidates(sources, ["BUSINESSOWNERS POLICY"])).toHaveLength(0);
  });

  it("drops an over-long capitalised run rather than guessing where it splits", () => {
    // Two terms sitting next to each other are indistinguishable from one
    // long one. A wrong candidate costs a reviewer's trust in the list; a
    // missing one costs them typing it in.
    const runOfSix = "Texas Real Estate Commission Named Insured";
    const multiWord = extractTerms(runOfSix).filter((t) => t.includes(" "));
    expect(multiWord).toEqual([]);
    // The single-word pass is unaffected and still finds real terminology in
    // the same text - dropping the ambiguous phrase is not dropping the line.
    expect(extractTerms(runOfSix)).toContain("insured");
  });

  it("gathers the topics a term appears under", () => {
    const candidates = glossaryCandidates([
      q("1", "About a Businessowners Policy.", null, "BOP Eligibility"),
      q("2", "More on a Businessowners Policy.", null, "Commercial Property"),
    ]);
    expect(candidates[0].topics).toEqual(["BOP Eligibility", "Commercial Property"]);
  });

  it("caps how many source questions it lists", () => {
    const sources = Array.from({ length: 12 }, (_, i) =>
      q(String(i), "About a Businessowners Policy.", "It bundles cover."),
    );
    expect(glossaryCandidates(sources)[0].sourceQuestionIds.length).toBeLessThanOrEqual(5);
  });

  it("returns nothing for an empty bank rather than failing", () => {
    expect(glossaryCandidates([])).toEqual([]);
  });

  it("copes with questions that have no explanation", () => {
    const candidates = glossaryCandidates([
      q("1", "About a Businessowners Policy.", null),
      q("2", "More on a Businessowners Policy.", null),
    ]);
    expect(candidates[0].term).toBe("Businessowners Policy");
  });
});
