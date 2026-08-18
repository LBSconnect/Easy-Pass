/**
 * The two answers to "when is your exam?", and how they interact.
 *
 * The failure this guards against is subtle: a student skips the question,
 * books an exam a fortnight later, and the stale "skipped" flag keeps
 * describing an answer they have replaced.
 */
import { describe, it, expect } from "vitest";
import { examDatePatch, hasAnsweredExamDate } from "@shared/examDatePatch";

describe("examDatePatch", () => {
  it("leaves both fields alone when neither is sent", () => {
    // undefined must mean "don't touch", or a patch that only changes the
    // phone number would wipe the exam date.
    expect(examDatePatch({})).toEqual({});
  });

  it("sets a date", () => {
    const patch = examDatePatch({ examDate: "2026-09-01T00:00:00.000Z" });
    expect(patch.examDate).toBeInstanceOf(Date);
    expect((patch.examDate as Date).toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("clears the skip when a real date arrives", () => {
    // The student has now scheduled it; "not scheduled yet" is no longer true.
    const patch = examDatePatch({ examDate: "2026-09-01T00:00:00.000Z" });
    expect(patch.examDateSkipped).toBe(false);
  });

  it("clears the skip even when the request said otherwise", () => {
    const patch = examDatePatch({
      examDate: "2026-09-01T00:00:00.000Z",
      examDateSkipped: true,
    });
    expect(patch.examDateSkipped).toBe(false);
  });

  it("records a skip on its own", () => {
    expect(examDatePatch({ examDateSkipped: true })).toEqual({ examDateSkipped: true });
  });

  it("does not invent a skip when the date is cleared", () => {
    // Clearing a date is not the same statement as "I haven't scheduled it";
    // it might be a correction. Leave the other field untouched.
    const patch = examDatePatch({ examDate: null });
    expect(patch).toEqual({ examDate: null });
    expect(patch.examDateSkipped).toBeUndefined();
  });

  it("passes a null skip through as a clear", () => {
    expect(examDatePatch({ examDateSkipped: null })).toEqual({ examDateSkipped: null });
  });
});

describe("hasAnsweredExamDate", () => {
  it("counts a scheduled date", () => {
    expect(hasAnsweredExamDate({ examDate: new Date() })).toBe(true);
    expect(hasAnsweredExamDate({ examDate: "2026-09-01T00:00:00.000Z" })).toBe(true);
  });

  it("counts an explicit 'not yet'", () => {
    expect(hasAnsweredExamDate({ examDate: null, examDateSkipped: true })).toBe(true);
  });

  it("does not count silence", () => {
    expect(hasAnsweredExamDate({})).toBe(false);
    expect(hasAnsweredExamDate({ examDate: null, examDateSkipped: null })).toBe(false);
    expect(hasAnsweredExamDate({ examDate: null, examDateSkipped: false })).toBe(false);
  });
});
