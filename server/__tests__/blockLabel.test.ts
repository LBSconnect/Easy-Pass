/**
 * Naming the steps of a session.
 *
 * A practice session is two practice blocks: the practice, then a short check
 * at the end. Labelling a block from its mode alone told the student
 * "Targeted practice: Questions on the topics you get wrong most" twice, in
 * the summary and again as two identical chips on the progress rail - so the
 * step that was actually a measurement read as a repeat of the one before it.
 */
import { describe, it, expect } from "vitest";
import { blockLabel, blockHint, modeLabel } from "../../client/src/lib/studyAssistant";

describe("blockLabel", () => {
  it("calls the closing block a check, not more practice", () => {
    expect(blockLabel("practice", "check", false)).toBe("Mastery check");
    expect(blockLabel("practice", "main", false)).toBe("Targeted practice");
  });

  it("gives two practice blocks two different names", () => {
    // The bug, stated directly.
    expect(blockLabel("practice", "main", false)).not.toBe(
      blockLabel("practice", "check", false),
    );
  });

  it("calls the opening block a warm-up, not a flashcard session", () => {
    expect(blockLabel("flashcards", "warm_up", false)).toBe("Warm-up");
    expect(blockLabel("flashcards", "main", false)).toBe("Flashcards");
  });

  it("falls through to the mode name for the substance of a session", () => {
    for (const mode of ["teach", "flashcards", "practice", "scenarios", "review", "mock_exam"] as const) {
      expect(blockLabel(mode, "main", false)).toBe(modeLabel(mode, false));
    }
  });

  it("says all of it in Spanish too", () => {
    expect(blockLabel("practice", "check", true)).toBe("Comprobación");
    expect(blockLabel("flashcards", "warm_up", true)).toBe("Calentamiento");
    expect(blockLabel("review", "main", true)).toBe("Práctica de memoria");
  });
});

describe("blockHint", () => {
  it("describes the check as a measurement, not as more questions", () => {
    const hint = blockHint("practice", "check", false);
    expect(hint).toMatch(/measure/i);
    expect(hint).not.toBe(blockHint("practice", "main", false));
  });

  it("describes the warm-up as easing in", () => {
    expect(blockHint("flashcards", "warm_up", false)).toMatch(/back into/i);
  });

  it("never leaves a step without a description", () => {
    for (const mode of ["teach", "flashcards", "practice", "scenarios", "review", "mock_exam"] as const) {
      for (const purpose of ["main", "warm_up", "check"] as const) {
        expect(blockHint(mode, purpose, false).length).toBeGreaterThan(10);
        expect(blockHint(mode, purpose, true).length).toBeGreaterThan(10);
      }
    }
  });
});
