/**
 * The recommendation engine - what should this student do next?
 *
 * This is the product. Everything else supports it.
 *
 * The decision is DETERMINISTIC and made from structured performance data. No
 * language model is consulted, for three reasons: the answer must be the same
 * every time a student reloads the page, it must be explainable to an admin
 * asking "why did it say that?", and it must keep working when the AI provider
 * is down. A model is used afterwards, and only to phrase the already-decided
 * recommendation in a sentence.
 *
 * Pure and clock-injected, so every branch is testable.
 */

import type { ConceptStanding, LearningProfile } from "./learningProfile";

/**
 * How the student should engage next.
 *
 * Mode switching matters more than content generation: answering the same
 * missed concept with more questions is the single most common way adaptive
 * products waste a struggling student's time.
 */
export type LearningMode =
  /** Explain the concept. For repeated misses - more questions will not help. */
  | "teach"
  /** Rapid recall on facts the student half-knows. */
  | "flashcards"
  /** Targeted questions on a weak concept. */
  | "practice"
  /** Applied scenarios for a concept the student knows in the abstract. */
  | "scenarios"
  /** Mixed light review across concepts already strong. */
  | "review"
  /** Full-length timed paper. */
  | "mock_exam";

/** Difficulty ladder. Students climb it; they are not thrown at the top. */
export type DifficultyLevel = "foundation" | "standard" | "exam_level" | "challenge";

/** Machine-readable justification. Rendered for admins, logged for audit. */
export type ReasonCode =
  | "no_activity_yet"
  | "insufficient_data"
  | "repeated_concept_misses"
  | "weak_concept"
  | "declining_trend"
  | "low_coverage"
  | "exam_imminent"
  | "retaker_rescue"
  | "mock_exam_due"
  | "broadly_ready"
  | "stalled_despite_practice";

export interface SessionBlock {
  mode: LearningMode;
  /** Questions, cards, or minutes of reading depending on mode. */
  itemCount: number;
  estimatedMinutes: number;
  label: string;
}

export interface Recommendation {
  /** Primary learning mode for the session. */
  mode: LearningMode;
  /** Concept to work on. Null for whole-exam actions like a mock. */
  concept: ConceptStanding | null;
  difficulty: DifficultyLevel;
  reasonCodes: ReasonCode[];
  /** Ordered, explainable facts behind the decision. Never model-generated. */
  evidence: string[];
  /** The concrete session to run. */
  blocks: SessionBlock[];
  estimatedMinutes: number;
  /** Deterministic fallback copy. Used verbatim when AI is unavailable. */
  headline: string;
  detail: string;
  /** True when repeated practice has not moved the needle - offer live help. */
  suggestHumanHelp: boolean;
  /** Highest-priority proactive insight, if one is worth surfacing. */
  insight: string | null;
}

/** Minutes a student is asked to commit by default. */
export const DEFAULT_SESSION_MINUTES = 15;

/** Below this mastery a concept is treated as actively holding the score down. */
const WEAK_THRESHOLD = 70;
/** Practice attempts after which a still-weak concept means practice is not working. */
const STALLED_ATTEMPT_THRESHOLD = 18;
const STALLED_MASTERY_CEILING = 60;
/** Bank coverage below which readiness signals are not yet trustworthy. */
const LOW_COVERAGE = 0.25;

/**
 * Pick difficulty from demonstrated mastery.
 *
 * A student at 45% on a concept gets foundation questions, not exam-level
 * ones. Repeatedly serving hard questions to someone who is failing is how
 * adaptive systems demoralise the students they are meant to help.
 */
export function difficultyFor(mastery: number | null): DifficultyLevel {
  if (mastery === null) return "standard";
  if (mastery < 55) return "foundation";
  if (mastery < 75) return "standard";
  if (mastery < 90) return "exam_level";
  return "challenge";
}

/**
 * Choose the learning mode for a target concept.
 *
 * The important branch is the first one: a concept missed repeatedly in the
 * recent window switches to TEACH. That is Feature 14 - when someone keeps
 * getting a concept wrong, the problem is comprehension, and the answer is an
 * explanation, not a fourth quiz.
 */
export function modeFor(concept: ConceptStanding | null, profile: LearningProfile): LearningMode {
  if (!concept) return "review";

  if (concept.missedInWindow >= 3) return "teach";
  if (concept.missedInWindow >= 2 && concept.mastery < WEAK_THRESHOLD) return "teach";

  // Thin evidence means the student has barely met this concept; cards build
  // the vocabulary faster than questions do.
  if (concept.attempts < 6) return "flashcards";

  if (concept.mastery < 55) return "flashcards";
  if (concept.mastery < 80) return "practice";

  // Knows the facts. The gap left is applying them, which is what the real
  // exam tests, so move to scenarios rather than more recall.
  if (profile.daysRemaining !== null && profile.daysRemaining <= 14) return "scenarios";
  return "practice";
}

/**
 * Compose the session from a mode and a minute budget.
 *
 * Every session ends with a short mastery check. Without one there is no
 * measurement, and without measurement the loop this whole product is built
 * on - study, re-measure, re-adapt - never closes.
 */
export function composeSession(
  mode: LearningMode,
  minutes: number,
  conceptLabel: string | null,
): SessionBlock[] {
  const target = conceptLabel ?? "mixed topics";

  switch (mode) {
    case "teach": {
      // Explanation-led, deliberately few questions: the point is to rebuild
      // understanding before testing it again.
      const review = Math.max(2, Math.round(minutes * 0.25));
      const cards = Math.max(4, Math.round(minutes * 0.5));
      const check = Math.max(3, Math.round(minutes * 0.3));
      return [
        { mode: "teach", itemCount: 1, estimatedMinutes: review, label: `${target} explained simply` },
        { mode: "flashcards", itemCount: cards, estimatedMinutes: Math.round(minutes * 0.3), label: `${cards} smart flashcards` },
        { mode: "practice", itemCount: check, estimatedMinutes: minutes - review - Math.round(minutes * 0.3), label: `${check}-question mastery check` },
      ];
    }
    case "flashcards": {
      const cards = Math.max(6, Math.round(minutes * 1.2));
      const check = Math.max(3, Math.round(minutes * 0.25));
      return [
        { mode: "flashcards", itemCount: cards, estimatedMinutes: Math.round(minutes * 0.6), label: `${cards} flashcards on ${target}` },
        { mode: "practice", itemCount: check, estimatedMinutes: minutes - Math.round(minutes * 0.6), label: `${check}-question mastery check` },
      ];
    }
    case "scenarios":
    case "practice": {
      const questions = Math.max(5, Math.round(minutes * 0.9));
      const check = Math.max(2, Math.round(minutes * 0.2));
      const label = mode === "scenarios" ? "applied scenario questions" : "targeted questions";
      return [
        { mode, itemCount: questions, estimatedMinutes: Math.round(minutes * 0.8), label: `${questions} ${label} on ${target}` },
        { mode: "practice", itemCount: check, estimatedMinutes: minutes - Math.round(minutes * 0.8), label: `${check}-question mastery check` },
      ];
    }
    case "review": {
      // Review used to be a single block, and the only mode that skipped the
      // mastery check this module says every session ends with. It was also
      // the mode chosen for a student with no weak concept and for the final
      // days before an exam - so the sessions that mattered most had no
      // measurement in them at all, and consisted of reading old mistakes
      // back with the answers already showing. That is the notebook page.
      //
      // The shape now is warm up, recall, check. The middle block asks rather
      // than tells (see shared/retrievalReview.ts); the cards ahead of it are
      // a low-stakes way back into the material, and the check at the end is
      // what lets the next recommendation know whether any of it worked.
      const warmUp = Math.max(4, Math.round(minutes * 0.35));
      const recall = Math.max(5, Math.round(minutes * 0.6));
      const check = Math.max(3, Math.round(minutes * 0.2));

      const warmUpMinutes = Math.round(minutes * 0.25);
      const checkMinutes = Math.round(minutes * 0.25);
      return [
        { mode: "flashcards", itemCount: warmUp, estimatedMinutes: warmUpMinutes, label: `${warmUp}-card warm-up` },
        {
          mode: "review",
          itemCount: recall,
          // Whatever is left after the two shorter blocks, so the three still
          // add up to the time the student was promised.
          estimatedMinutes: minutes - warmUpMinutes - checkMinutes,
          label: `${recall} questions from memory`,
        },
        { mode: "practice", itemCount: check, estimatedMinutes: checkMinutes, label: `${check}-question mastery check` },
      ];
    }
    case "mock_exam":
      return [
        { mode: "mock_exam", itemCount: 100, estimatedMinutes: minutes, label: "Full-length timed mock exam" },
      ];
  }
}

export interface RecommendationInput {
  profile: LearningProfile;
  /** Minutes the student has. Defaults to the standard session. */
  availableMinutes?: number;
  now: Date;
}

/**
 * Decide the single next action.
 *
 * Ordered by urgency: no data at all, then exam-imminent, then a concept that
 * is actively stuck, then the weakest concept, then readiness confirmation.
 * The first matching branch wins - a student should be told one thing to do,
 * not shown a menu.
 */
export function recommendNextAction(input: RecommendationInput): Recommendation {
  const { profile, now } = input;
  const minutes = input.availableMinutes ?? DEFAULT_SESSION_MINUTES;
  const reasonCodes: ReasonCode[] = [];
  const evidence: string[] = [];

  // --- Nothing to go on yet ------------------------------------------------
  if (profile.totalAttempts === 0) {
    reasonCodes.push("no_activity_yet");
    return {
      mode: "practice",
      concept: null,
      difficulty: "standard",
      reasonCodes,
      evidence: ["No practice history recorded yet"],
      blocks: composeSession("practice", minutes, null),
      estimatedMinutes: minutes,
      headline: "Start with a readiness check",
      detail:
        "A short diagnostic gives your first EasyPass Score and shows which topics need the most attention.",
      suggestHumanHelp: false,
      insight: null,
    };
  }

  // Retaker status describes the student, not the branch, so it is recorded
  // on every recommendation. Attaching it only inside the dedicated retaker
  // branch would hide it whenever a more urgent branch won, and analytics
  // could no longer tell retaker sessions apart from first-timer ones.
  if (profile.isRetaker) reasonCodes.push("retaker_rescue");

  const weakest = profile.weakestConcepts[0] ?? null;
  const stuck = profile.repeatedlyMissedConcepts[0] ?? null;

  // --- Practice has stopped working ---------------------------------------
  // A concept with heavy practice and stubbornly low mastery is the signal to
  // change approach and offer a human, rather than serve a nineteenth question.
  const stalled = profile.concepts.find(
    (c) => c.attempts >= STALLED_ATTEMPT_THRESHOLD && c.mastery < STALLED_MASTERY_CEILING,
  );

  // --- Exam is imminent ----------------------------------------------------
  const daysLeft = profile.daysRemaining;
  if (daysLeft !== null && daysLeft <= 2) {
    reasonCodes.push("exam_imminent");
    evidence.push(`Exam in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`);

    // Final days are for consolidation. Opening a brand-new weak topic two
    // days out costs confidence and gains almost nothing.
    const target = weakest && weakest.mastery < WEAK_THRESHOLD ? weakest : null;
    if (target) evidence.push(`${target.label} still at ${target.mastery}% mastery`);

    return {
      mode: "review",
      concept: target,
      difficulty: difficultyFor(target?.mastery ?? profile.overallMastery),
      reasonCodes,
      evidence,
      blocks: composeSession("review", minutes, target?.label ?? null),
      estimatedMinutes: minutes,
      headline: daysLeft === 0 ? "Light review only today" : "Consolidate what you know",
      detail: target
        ? `With ${daysLeft} day${daysLeft === 1 ? "" : "s"} left, review ${target.label} rather than starting anything new.`
        : `With ${daysLeft} day${daysLeft === 1 ? "" : "s"} left, keep it to light mixed review.`,
      suggestHumanHelp: false,
      insight: buildInsight(profile),
    };
  }

  // --- A concept the student keeps missing ---------------------------------
  if (stuck) {
    reasonCodes.push("repeated_concept_misses");
    evidence.push(
      `${stuck.label} missed ${stuck.missedInWindow} times in the last two weeks`,
      `Mastery ${stuck.mastery}%`,
    );
    if (stuck.trend === "declining") {
      reasonCodes.push("declining_trend");
      evidence.push("Recent results on this concept are getting worse, not better");
    }

    const isStalled = Boolean(stalled && stalled.conceptId === stuck.conceptId);
    if (isStalled) {
      reasonCodes.push("stalled_despite_practice");
      evidence.push(`${stuck.attempts} attempts on this concept without mastery improving`);
    }

    const mode = modeFor(stuck, profile);
    return {
      mode,
      concept: stuck,
      difficulty: difficultyFor(stuck.mastery),
      reasonCodes,
      evidence,
      blocks: composeSession(mode, minutes, stuck.label),
      estimatedMinutes: minutes,
      headline: `${minutes}-minute ${stuck.label} rescue session`,
      detail:
        mode === "teach"
          ? `You've missed ${stuck.label} several times recently, so this starts with an explanation rather than more questions.`
          : `${stuck.label} is costing you the most points right now. This session targets it directly.`,
      suggestHumanHelp: isStalled,
      insight: buildInsight(profile),
    };
  }

  // --- Retaker with no specific stuck concept ------------------------------
  if (profile.isRetaker && weakest && weakest.mastery < WEAK_THRESHOLD) {
    reasonCodes.push("weak_concept");
    evidence.push(
      "Student has attempted this exam before",
      `Weakest concept ${weakest.label} at ${weakest.mastery}%`,
    );
    const mode = modeFor(weakest, profile);
    return {
      mode,
      concept: weakest,
      difficulty: difficultyFor(weakest.mastery),
      reasonCodes,
      evidence,
      blocks: composeSession(mode, minutes, weakest.label),
      estimatedMinutes: minutes,
      headline: `Retaker rescue: ${weakest.label}`,
      detail: `On a retake, closing your weakest area matters more than broad revision. ${weakest.label} is it.`,
      suggestHumanHelp: Boolean(stalled),
      insight: buildInsight(profile),
    };
  }

  // --- Ordinary weak concept ------------------------------------------------
  if (weakest && weakest.mastery < WEAK_THRESHOLD) {
    reasonCodes.push("weak_concept");
    evidence.push(`${weakest.label} mastery ${weakest.mastery}%`, `${weakest.attempts} attempts recorded`);
    if (weakest.trend === "declining") {
      reasonCodes.push("declining_trend");
      evidence.push("Trend on this concept is declining");
    }

    const mode = modeFor(weakest, profile);
    return {
      mode,
      concept: weakest,
      difficulty: difficultyFor(weakest.mastery),
      reasonCodes,
      evidence,
      blocks: composeSession(mode, minutes, weakest.label),
      estimatedMinutes: minutes,
      headline: `${minutes}-minute ${weakest.label} session`,
      detail: `${weakest.label} is currently your weakest area, so let's spend about ${minutes} minutes there.`,
      suggestHumanHelp: Boolean(stalled),
      insight: buildInsight(profile),
    };
  }

  // --- Strong everywhere, but has barely seen the bank ----------------------
  // Guarding on coverage stops a student who answered thirty easy questions
  // well from being told they are ready.
  if (profile.coverage < LOW_COVERAGE) {
    reasonCodes.push("low_coverage", "insufficient_data");
    evidence.push(
      `Seen ${profile.uniqueQuestionsSeen} of the question bank (${Math.round(profile.coverage * 100)}%)`,
      "Scores look good but rest on limited coverage",
    );
    return {
      mode: "practice",
      concept: null,
      difficulty: difficultyFor(profile.overallMastery),
      reasonCodes,
      evidence,
      blocks: composeSession("practice", minutes, null),
      estimatedMinutes: minutes,
      headline: "Widen your coverage",
      detail:
        "Your accuracy is good, but you haven't seen enough of the bank yet for that to mean you're ready. More breadth next.",
      suggestHumanHelp: false,
      insight: buildInsight(profile),
    };
  }

  // --- Broadly ready: confirm it under exam conditions -----------------------
  reasonCodes.push("broadly_ready", "mock_exam_due");
  evidence.push(
    `No concept below ${WEAK_THRESHOLD}% mastery`,
    `Bank coverage ${Math.round(profile.coverage * 100)}%`,
  );

  const mockMinutes = Math.max(minutes, 60);
  return {
    mode: "mock_exam",
    concept: null,
    difficulty: "exam_level",
    reasonCodes,
    evidence,
    blocks: composeSession("mock_exam", mockMinutes, null),
    estimatedMinutes: mockMinutes,
    headline: "Take a full mock exam",
    detail:
      "No single topic is holding you back now. A full timed paper is the best way to confirm you're ready.",
    suggestHumanHelp: false,
    insight: buildInsight(profile),
  };
}

/**
 * One proactive observation, or nothing.
 *
 * Returns at most a single finding on purpose. An insights panel that fires on
 * every visit stops being read; "Alexi found something" is only worth saying
 * when something was actually found.
 */
export function buildInsight(profile: LearningProfile): string | null {
  const improving = profile.concepts.filter((c) => c.trend === "improving" && c.attempts >= 6);
  const declining = profile.concepts.filter((c) => c.trend === "declining" && c.attempts >= 6);

  // A decline is the most actionable thing we can notice, so it leads.
  if (declining.length > 0) {
    const worst = declining[0];
    return `Your recent results on ${worst.label} are slipping compared with earlier attempts.`;
  }

  // Pairing a gain with a remaining gap keeps the message honest and useful.
  if (improving.length > 0 && profile.weakestConcepts.length > 0) {
    const gained = improving[0];
    const weak = profile.weakestConcepts[0];
    if (gained.conceptId !== weak.conceptId) {
      return `You've improved in ${gained.label}, but ${weak.label} is still your weakest area.`;
    }
  }

  if (profile.mockExamScores.length >= 3) {
    const [latest, previous, older] = profile.mockExamScores;
    if (latest < previous && previous < older) {
      return "Your last three mock exam scores have each been lower than the one before.";
    }
  }

  return null;
}
