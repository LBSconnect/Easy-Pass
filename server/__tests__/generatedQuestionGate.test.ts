/**
 * The approval gate.
 *
 * These check the property the whole generation feature rests on: a generated
 * question cannot reach a student without a person approving it. The storage
 * layer needs a database, so this exercises the pure decision logic that
 * governs it - what publishes, what is blocked, and what a double-click does.
 */
import { describe, it, expect } from "vitest";

/**
 * Mirrors the route's approve guard. Kept here as a pure function so the rule
 * is testable and stated in one place rather than implied by an UPDATE clause.
 */
export function canPublish(draft: { status: string } | undefined): boolean {
  return draft?.status === "pending";
}

/**
 * Mirrors the review screen's publish gate.
 *
 * Both languages must be complete. Publishing an English-only question into a
 * bilingual bank leaves Spanish-speaking students with blanks where the
 * question should be.
 */
export function readyToPublish(e: {
  questionTextEn: string;
  questionTextEs: string;
  optionsEn: string[];
  optionsEs: string[];
}): boolean {
  return (
    e.questionTextEn.trim().length >= 20 &&
    e.questionTextEs.trim().length > 0 &&
    e.optionsEn.every((o) => o.trim().length > 0) &&
    e.optionsEs.every((o) => o.trim().length > 0)
  );
}

const complete = {
  questionTextEn: "Which risk is ineligible for a Businessowners Policy?",
  questionTextEs: "¿Cuál riesgo no es elegible para una póliza de negocio?",
  optionsEn: ["A store", "A refinery", "An office", "Flats"],
  optionsEs: ["Una tienda", "Una refinería", "Una oficina", "Pisos"],
};

describe("canPublish", () => {
  it("allows a pending draft", () => {
    expect(canPublish({ status: "pending" })).toBe(true);
  });

  it("blocks a draft that was already approved", () => {
    // Two admins acting at once, or one double-click, must not publish twice.
    expect(canPublish({ status: "approved" })).toBe(false);
  });

  it("blocks a rejected draft", () => {
    expect(canPublish({ status: "rejected" })).toBe(false);
  });

  it("blocks a draft that does not exist", () => {
    expect(canPublish(undefined)).toBe(false);
  });

  it("blocks any status it does not recognise", () => {
    // Fails closed: an unexpected value is not treated as permission.
    expect(canPublish({ status: "" })).toBe(false);
    expect(canPublish({ status: "PENDING" })).toBe(false);
  });
});

describe("readyToPublish", () => {
  it("accepts a fully translated question", () => {
    expect(readyToPublish(complete)).toBe(true);
  });

  it("refuses a question with no Spanish text", () => {
    expect(readyToPublish({ ...complete, questionTextEs: "" })).toBe(false);
  });

  it("refuses whitespace passed off as a translation", () => {
    expect(readyToPublish({ ...complete, questionTextEs: "   " })).toBe(false);
  });

  it("refuses when any Spanish option is missing", () => {
    expect(
      readyToPublish({ ...complete, optionsEs: ["Una tienda", "", "Una oficina", "Pisos"] }),
    ).toBe(false);
  });

  it("refuses when any English option is missing", () => {
    expect(
      readyToPublish({ ...complete, optionsEn: ["A store", "A refinery", "  ", "Flats"] }),
    ).toBe(false);
  });

  it("refuses a question too short to be one", () => {
    expect(readyToPublish({ ...complete, questionTextEn: "Why?" })).toBe(false);
  });
});
