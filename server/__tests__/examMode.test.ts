/**
 * Reading the exam mode out of a URL.
 *
 * The failure this guards against is quiet: an unrecognised value used to
 * become "practice" by accident rather than by decision, so adding a third
 * mode would have downgraded it everywhere the old ternary was copied.
 */
import { describe, it, expect } from "vitest";
import {
  parseExamMode,
  isRepresentativeSitting,
  questionCountFor,
  timeLimitFor,
  DEFAULT_EXAM_MODE,
  EXAM_MODES,
} from "@shared/examMode";

describe("parseExamMode", () => {
  it("recognises every mode it claims to support", () => {
    for (const mode of EXAM_MODES) {
      expect(parseExamMode(mode)).toBe(mode);
    }
  });

  it("keeps targeted distinct from practice", () => {
    // The whole point: the old ternary collapsed these two.
    expect(parseExamMode("targeted")).toBe("targeted");
    expect(parseExamMode("targeted")).not.toBe(parseExamMode("practice"));
  });

  it("falls back to practice for anything it does not know", () => {
    for (const raw of [null, undefined, "", "  ", "mock", "FULL-EXAM", "1"]) {
      expect(parseExamMode(raw)).toBe(DEFAULT_EXAM_MODE);
    }
  });

  it("is forgiving about case and padding", () => {
    expect(parseExamMode(" Full ")).toBe("full");
    expect(parseExamMode("TARGETED")).toBe("targeted");
  });
});

describe("paper size", () => {
  it("gives the full mock its 150 questions and two hours", () => {
    expect(questionCountFor("full")).toBe(150);
    expect(timeLimitFor("full")).toBe(7200);
  });

  it("makes targeted practice a practice-length sitting", () => {
    // A targeted paper is practice, not a mock, so it must not inherit the
    // mock's length - or its weight in a student's mind.
    expect(questionCountFor("targeted")).toBe(questionCountFor("practice"));
    expect(timeLimitFor("targeted")).toBe(timeLimitFor("practice"));
    expect(questionCountFor("targeted")).toBe(50);
    expect(timeLimitFor("targeted")).toBe(5400);
  });
});

describe("isRepresentativeSitting", () => {
  it("counts practice and full mock", () => {
    expect(isRepresentativeSitting("practice")).toBe(true);
    expect(isRepresentativeSitting("full")).toBe(true);
  });

  it("excludes targeted practice", () => {
    // Otherwise the students doing the most remedial work would watch their
    // readiness fall for doing it.
    expect(isRepresentativeSitting("targeted")).toBe(false);
  });

  it("counts a sitting whose mode could not be read", () => {
    // Everything predating targeted practice parses as "practice", and those
    // sittings are real history that must not vanish from the score.
    expect(isRepresentativeSitting(parseExamMode(null))).toBe(true);
  });
});
