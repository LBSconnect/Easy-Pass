/**
 * The bilingual publish gate.
 *
 * This is the rule that stops half a glossary reaching students. It matters
 * most for the Spanish side, because an English-speaking reviewer can publish
 * an English-only entry without ever seeing what is missing.
 */
import { describe, it, expect } from "vitest";
import { checkGlossaryDraft, MIN_DEFINITION_LENGTH } from "@shared/glossaryGate";

const complete = {
  termEn: "Businessowners Policy",
  termEs: "Póliza de negocio",
  definitionEn: "A package policy combining property and liability cover for small business.",
  definitionEs: "Una póliza que combina cobertura de propiedad y responsabilidad civil.",
};

describe("checkGlossaryDraft", () => {
  it("passes a complete bilingual entry", () => {
    expect(checkGlossaryDraft(complete)).toEqual({ ready: true, missing: [] });
  });

  it("refuses a missing Spanish term", () => {
    const result = checkGlossaryDraft({ ...complete, termEs: "" });
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("Spanish term");
  });

  it("refuses a missing Spanish definition", () => {
    const result = checkGlossaryDraft({ ...complete, definitionEs: "" });
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("Spanish definition");
  });

  it("refuses whitespace passed off as a translation", () => {
    expect(checkGlossaryDraft({ ...complete, termEs: "   " }).ready).toBe(false);
    expect(checkGlossaryDraft({ ...complete, definitionEs: "        " }).ready).toBe(false);
  });

  it("refuses a placeholder definition", () => {
    // "See policy" is both languages and helps nobody.
    const result = checkGlossaryDraft({ ...complete, definitionEn: "See policy" });
    expect(result.ready).toBe(false);
    expect(result.missing).toContain("English definition");
  });

  it("accepts a genuinely short definition at the floor", () => {
    const atFloor = "x".repeat(MIN_DEFINITION_LENGTH);
    expect(checkGlossaryDraft({ ...complete, definitionEn: atFloor }).ready).toBe(true);
  });

  it("lists everything missing, not just the first thing", () => {
    // A reviewer fixing one field at a time, told only about that field, is
    // how a half-finished entry gets three round trips.
    const result = checkGlossaryDraft({
      termEn: "",
      termEs: "",
      definitionEn: "",
      definitionEs: "",
    });
    expect(result.missing).toEqual([
      "English term",
      "Spanish term",
      "English definition",
      "Spanish definition",
    ]);
  });

  it("survives fields that are absent rather than empty", () => {
    // Comes straight off a request body, so undefined is a real possibility.
    const result = checkGlossaryDraft({} as never);
    expect(result.ready).toBe(false);
    expect(result.missing).toHaveLength(4);
  });
});
