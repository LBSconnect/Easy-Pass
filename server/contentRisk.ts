/**
 * Content risk scoring and automatic quarantine.
 *
 * Students can already report a question, but a report did nothing until an
 * admin happened to look. On a licensing exam that gap matters: a question
 * with a wrong answer key teaches something false to every student who sees
 * it, and it keeps doing so until someone notices.
 *
 * So reports now accumulate a risk score, and a question that crosses the
 * threshold is pulled from circulation pending review rather than waiting.
 *
 * Not all reports are equal. "The answer key is wrong" is a correctness
 * failure; "the wording is unclear" is a quality nit. Treating them the same
 * would either quarantine on cosmetic complaints or ignore real defects, so
 * they are weighted separately.
 *
 * Pure, so the thresholds are testable without a database.
 */

export type FeedbackType =
  | "error"
  | "unclear"
  | "wrong_answer"
  | "translation"
  | "suggestion"
  | "other";

export interface FeedbackSignal {
  feedbackType: FeedbackType;
  /** Reports already dismissed by an admin carry no weight. */
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  createdAt: Date;
}

/**
 * Severity per report type.
 *
 * `wrong_answer` is weighted so that TWO independent reports quarantine a
 * question on their own. Two students both saying the answer key is wrong is
 * strong evidence, and the cost of being wrong in that direction (one
 * question offline for a day) is far lower than the cost of the other
 * direction (every student learning a false fact before an exam).
 */
export const RISK_WEIGHTS: Record<FeedbackType, number> = {
  wrong_answer: 50,
  error: 35,
  translation: 20,
  unclear: 10,
  other: 8,
  suggestion: 0,
};

/** Score at or above which a question leaves circulation pending review. */
export const QUARANTINE_THRESHOLD = 100;

/** Reports older than this stop counting toward quarantine. */
export const RISK_WINDOW_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RiskAssessment {
  score: number;
  shouldQuarantine: boolean;
  /** Report types that drove the score, heaviest first. */
  drivers: FeedbackType[];
  countedReports: number;
}

/**
 * Score the open reports against one question.
 *
 * Dismissed reports are excluded entirely: an admin who looked and decided
 * the question is fine has overruled that signal, and continuing to count it
 * would re-quarantine the question the moment one more report arrived.
 */
export function assessRisk(signals: FeedbackSignal[], now: Date): RiskAssessment {
  const cutoff = new Date(now.getTime() - RISK_WINDOW_DAYS * DAY_MS);

  const counted = signals.filter(
    (s) => s.status !== "dismissed" && s.status !== "resolved" && s.createdAt >= cutoff,
  );

  const byType = new Map<FeedbackType, number>();
  let score = 0;
  for (const s of counted) {
    const weight = RISK_WEIGHTS[s.feedbackType] ?? 0;
    score += weight;
    if (weight > 0) byType.set(s.feedbackType, (byType.get(s.feedbackType) ?? 0) + weight);
  }

  const drivers = Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type]) => type);

  return {
    score,
    shouldQuarantine: score >= QUARANTINE_THRESHOLD,
    drivers,
    countedReports: counted.length,
  };
}

/**
 * Human-readable reason, recorded on the question when it is pulled.
 *
 * An admin arriving at a quarantined question needs to know why without
 * reading the raw report table.
 */
export function quarantineReason(assessment: RiskAssessment): string {
  return (
    `Auto-quarantined: risk score ${assessment.score} from ` +
    `${assessment.countedReports} open report${assessment.countedReports === 1 ? "" : "s"}` +
    (assessment.drivers.length > 0 ? ` (${assessment.drivers.join(", ")})` : "")
  );
}
