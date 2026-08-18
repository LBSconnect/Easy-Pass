/**
 * Which kind of paper a student asked for.
 *
 * The mode arrives in a query string, so it is whatever anyone types. It was
 * being read in two places with a hand-written ternary, which was fine while
 * there were two modes and stopped being fine the moment there were three:
 * `mode === "full" ? "full" : "practice"` silently turns a targeted paper
 * into a practice one.
 *
 * Anything unrecognised falls back to practice - the shortest, cheapest,
 * always-available paper - rather than erroring at a student who mistyped a
 * URL.
 */

export const EXAM_MODES = ["practice", "full", "targeted"] as const;

export type ExamMode = (typeof EXAM_MODES)[number];

export const DEFAULT_EXAM_MODE: ExamMode = "practice";

export function parseExamMode(raw: string | null | undefined): ExamMode {
  const value = (raw ?? "").trim().toLowerCase();
  return (EXAM_MODES as readonly string[]).includes(value)
    ? (value as ExamMode)
    : DEFAULT_EXAM_MODE;
}

/** Questions in the paper. Targeted practice is a practice-length sitting. */
export function questionCountFor(mode: ExamMode): number {
  return mode === "full" ? 150 : 50;
}

/** Seconds allowed. Kept next to the count so the two cannot drift apart. */
export function timeLimitFor(mode: ExamMode): number {
  return mode === "full" ? 7200 : 5400;
}

/**
 * Whether a sitting's score belongs in the readiness signal.
 *
 * Practice and full mock both draw a paper that represents the bank - one at
 * random, one weighted by topic share - so their scores are comparable and
 * both say something about how ready a student is.
 *
 * A targeted paper does not. It is deliberately loaded with the topics the
 * student keeps failing, so it scores lower than their actual standing by
 * construction. Feeding it into the EasyPass Score would mean the students
 * doing the most remedial work watched their readiness fall for doing it.
 * Their individual answers still count toward topic mastery - those are real
 * answers to real questions - but the paper's percentage does not.
 */
export function isRepresentativeSitting(mode: ExamMode): boolean {
  return mode !== "targeted";
}
