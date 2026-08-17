/**
 * Student dashboard state.
 *
 * The dashboard shows different things to a brand-new student than to one
 * sitting an exam in three days. Deriving that state here - purely, from data -
 * keeps the decision testable and stops it being re-litigated inline in JSX
 * across a dozen conditionals.
 *
 * The ordering each state returns is the real output: the mission's whole
 * point is that cards must NOT have equal visual weight, and "which section
 * leads" is exactly that judgement.
 */

export type DashboardState =
  /** No exam chosen or no history at all. Onboarding only. */
  | "new"
  /** Has a readiness score but little study history yet. */
  | "diagnostic_complete"
  /** Normal studying. */
  | "active"
  /** Exam within the urgent window - consolidate, don't start new material. */
  | "exam_approaching"
  /** Has sat this exam before. Rescue framing leads. */
  | "retaker"
  /** Broadly ready - confirm under exam conditions rather than drill. */
  | "high_readiness";

export type DashboardSection =
  | "onboarding"
  | "welcome"
  | "alexi"
  | "score"
  | "plan"
  | "mastery"
  | "quick_actions"
  | "current_exam"
  | "resources"
  | "upgrade"
  | "summary";

export interface DashboardInput {
  hasSelectedExam: boolean;
  /** Total questions answered, all time. */
  totalAttempts: number;
  /** Null until enough evidence exists - a provisional score is not a score. */
  easyPassScore: number | null;
  daysUntilExam: number | null;
  hasPreviousAttempt: boolean | null;
  hasActiveSubscription: boolean;
  examsTaken: number;
}

/** Days out at which the dashboard switches to consolidation framing. */
export const EXAM_APPROACHING_DAYS = 7;
/** Attempts below which performance analytics are noise, not information. */
export const MIN_ATTEMPTS_FOR_ANALYTICS = 10;
/** Score at or above which drilling basics is the wrong advice. */
export const HIGH_READINESS_SCORE = 85;

/**
 * Which state is this student in?
 *
 * Order matters: the first match wins, and the sequence encodes priority.
 * Exam-approaching outranks retaker because three days out, what to do next is
 * the same for both, and the countdown is the more urgent fact.
 */
export function deriveDashboardState(input: DashboardInput): DashboardState {
  // Nothing to personalise from. Showing zeroed analytics here is the specific
  // failure the redesign exists to fix.
  if (!input.hasSelectedExam || input.totalAttempts === 0) return "new";

  if (input.daysUntilExam !== null && input.daysUntilExam <= EXAM_APPROACHING_DAYS) {
    return "exam_approaching";
  }

  if (input.hasPreviousAttempt === true) return "retaker";

  if (input.easyPassScore !== null && input.easyPassScore >= HIGH_READINESS_SCORE) {
    return "high_readiness";
  }

  // Has a score but hasn't done enough work for a plan to mean much yet.
  if (input.easyPassScore !== null && input.totalAttempts < MIN_ATTEMPTS_FOR_ANALYTICS) {
    return "diagnostic_complete";
  }

  return "active";
}

/**
 * Section order for a state.
 *
 * Read these top-to-bottom as the page. Two rules hold across every state:
 * upgrade messaging never appears above study tools, and the section that
 * answers "what do I do next" is always in the first screenful.
 */
export function sectionsFor(state: DashboardState, input: DashboardInput): DashboardSection[] {
  if (state === "new") {
    // Deliberately sparse. A new student gets one job: pick an exam and find
    // out where they stand.
    return ["onboarding", "resources"];
  }

  const base: DashboardSection[] = ["welcome"];

  switch (state) {
    case "exam_approaching":
      // Countdown and readiness lead; mastery moves up because the remaining
      // decision is which weak area to spend the last days on.
      base.push("score", "alexi", "plan", "mastery", "quick_actions");
      break;
    case "retaker":
      // Rescue framing first - a retaker's question is "what went wrong", and
      // Alexi answers it before the score restates the problem.
      base.push("alexi", "score", "plan", "mastery", "quick_actions");
      break;
    case "high_readiness":
      // Drilling basics is the wrong advice here; confirmation under exam
      // conditions is the useful next step, so quick actions rise above the
      // daily plan.
      base.push("score", "alexi", "quick_actions", "plan", "mastery");
      break;
    case "diagnostic_complete":
      // Score is the new information; the plan is what to do about it.
      base.push("score", "alexi", "plan", "mastery", "quick_actions");
      break;
    default:
      base.push("alexi", "score", "plan", "mastery", "quick_actions");
  }

  base.push("current_exam", "resources");

  // Analytics only once they carry information. An empty summary card is
  // worse than no card.
  if (input.totalAttempts >= MIN_ATTEMPTS_FOR_ANALYTICS) {
    base.splice(base.indexOf("current_exam"), 0, "summary");
  }

  // Conversion messaging lives at the bottom and only for those who could act
  // on it. Paid students have nothing to buy.
  if (!input.hasActiveSubscription) base.push("upgrade");

  return base;
}

/** The one dominant CTA for this state. Everything else is subordinate. */
export function primaryActionFor(state: DashboardState): "diagnostic" | "alexi_session" | "plan" | "mock_exam" {
  switch (state) {
    case "new":
    case "diagnostic_complete":
      return "diagnostic";
    case "high_readiness":
      return "mock_exam";
    case "exam_approaching":
    case "retaker":
      return "alexi_session";
    default:
      return "plan";
  }
}

/**
 * Should performance analytics render at all?
 *
 * Guards every zero-state statistic. "0 exams, 0%, 0 minutes" tells a student
 * nothing they did not already know and makes the product look empty.
 */
export function shouldShowAnalytics(input: DashboardInput): boolean {
  return input.totalAttempts >= MIN_ATTEMPTS_FOR_ANALYTICS;
}
