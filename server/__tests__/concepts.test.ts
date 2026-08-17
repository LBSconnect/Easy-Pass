import { describe, it, expect } from "vitest";
import {
  conceptIdFor,
  conceptLabel,
  normalizeConcept,
  UNCLASSIFIED_CONCEPT,
} from "@shared/concepts";

describe("normalizeConcept", () => {
  it("slugifies a topic", () => {
    expect(normalizeConcept("Commercial Property")).toBe("commercial-property");
  });

  it("treats & and 'and' as the same word", () => {
    expect(normalizeConcept("Life & Health")).toBe(normalizeConcept("Life and Health"));
  });

  it("ignores case and punctuation", () => {
    expect(normalizeConcept("  BOP  Eligibility!! ")).toBe("bop-eligibility");
  });
});

describe("conceptIdFor", () => {
  it("collapses differently punctuated names onto one concept", () => {
    // The reason the concept layer exists: three questions worded three ways
    // about the same rule are one weakness, not three.
    const a = conceptIdFor("Texas Law & Regulations");
    const b = conceptIdFor("Texas Laws and Regulations");
    const c = conceptIdFor("texas laws & regulations");

    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("prefers an explicitly stored concept id over the derived one", () => {
    // The seam for a future questions.concept_id column.
    expect(conceptIdFor("Commercial Property", "bop-eligibility")).toBe("bop-eligibility");
  });

  it("buckets a missing topic as unclassified", () => {
    expect(conceptIdFor(null)).toBe(UNCLASSIFIED_CONCEPT);
    expect(conceptIdFor("")).toBe(UNCLASSIFIED_CONCEPT);
    expect(conceptIdFor("   ")).toBe(UNCLASSIFIED_CONCEPT);
  });

  it("does not merge genuinely different topics", () => {
    expect(conceptIdFor("Annuities")).not.toBe(conceptIdFor("Agency"));
  });

  it("handles a topic that normalises to nothing", () => {
    expect(conceptIdFor("!!!")).toBe(UNCLASSIFIED_CONCEPT);
  });
});

describe("conceptLabel", () => {
  it("shows the bank's own wording when available", () => {
    expect(conceptLabel("commercial-property", "Commercial Property")).toBe("Commercial Property");
  });

  it("title-cases the id when no source topic is to hand", () => {
    expect(conceptLabel("commercial-property")).toBe("Commercial Property");
  });

  it("keeps joining words lowercase", () => {
    expect(conceptLabel("texas-laws-and-regulations")).toBe("Texas Laws and Regulations");
  });

  it("labels the unclassified bucket readably", () => {
    expect(conceptLabel(UNCLASSIFIED_CONCEPT)).toBe("General");
  });
});
