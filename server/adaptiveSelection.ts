/**
 * Adaptive question selection.
 *
 * Practice stops being a random draw from the bank and starts targeting what
 * the student is actually weak at. Ranks candidate questions by how much
 * answering them is likely to move readiness, then takes the top N.
 *
 * Pure and clock-injected so it is deterministic under test.
 */

export interface CandidateQuestion {
  id: string;
  topic: string | null;
}

export interface QuestionHistory {
  /** Times this student has answered this question. */
  timesSeen: number;
  /** Whether their most recent answer was wrong. */
  lastWasWrong: boolean;
  /** When they last answered it. */
  lastAnsweredAt: Date;
}

export interface SelectionInput {
  candidates: CandidateQuestion[];
  /** Per-topic accuracy, 0-100. Topics absent here are treated as unseen. */
  topicAccuracy: Map<string, number>;
  /** History keyed by question id. Absent means never seen. */
  history: Map<string, QuestionHistory>;
  now: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Weight applied per point of topic weakness. */
const WEAK_TOPIC_WEIGHT = 1.0;

/** Bonus for a question whose last answer was wrong. */
const MISSED_BONUS = 120;

/** Bonus for a question the student has never seen. */
const UNSEEN_BONUS = 60;

/** Penalty per prior exposure, to rotate the bank instead of repeating. */
const EXPOSURE_PENALTY = 35;

/** Spacing: a question answered long ago is worth revisiting. */
const SPACING_BONUS_PER_DAY = 2;
const MAX_SPACING_BONUS = 60;

/**
 * Score a single candidate. Higher means more worth asking now.
 *
 * Exported for testing the ranking rationale directly rather than only
 * through the ordering it produces.
 */
export function scoreCandidate(
  candidate: CandidateQuestion,
  input: SelectionInput,
): number {
  const topic = candidate.topic || "General";
  const accuracy = input.topicAccuracy.get(topic);
  const hist = input.history.get(candidate.id);

  let score = 0;

  // Weak topics first. An unseen topic is treated as neutral rather than
  // maximally weak, so a student is not flooded with one untouched topic.
  if (accuracy !== undefined) {
    score += (100 - accuracy) * WEAK_TOPIC_WEIGHT;
  } else {
    score += 25;
  }

  if (!hist) {
    score += UNSEEN_BONUS;
    return score;
  }

  if (hist.lastWasWrong) score += MISSED_BONUS;

  // Rotation: each prior exposure makes this question less informative.
  score -= hist.timesSeen * EXPOSURE_PENALTY;

  // ...but spacing partly restores it, so a question missed months ago is
  // still a good candidate despite having been seen.
  const idleDays = Math.max(0, (input.now.getTime() - hist.lastAnsweredAt.getTime()) / DAY_MS);
  score += Math.min(idleDays * SPACING_BONUS_PER_DAY, MAX_SPACING_BONUS);

  return score;
}

/**
 * Pick the questions worth asking next.
 *
 * Ties break by question id so the ordering is stable and reproducible
 * rather than depending on input order.
 */
export function selectAdaptiveQuestions(
  input: SelectionInput,
  limit: number,
): CandidateQuestion[] {
  if (limit <= 0) return [];

  return input.candidates
    .map((c) => ({ candidate: c, score: scoreCandidate(c, input) }))
    .sort((a, b) =>
      b.score - a.score || a.candidate.id.localeCompare(b.candidate.id),
    )
    .slice(0, limit)
    .map((s) => s.candidate);
}

/**
 * Build the history map the selector needs from a raw response log.
 * Responses may arrive in any order; the latest answer per question wins.
 */
export function buildHistory(
  responses: Array<{ questionId: string; isCorrect: boolean; answeredAt: Date }>,
): Map<string, QuestionHistory> {
  const history = new Map<string, QuestionHistory>();

  for (const r of responses) {
    const existing = history.get(r.questionId);
    if (!existing) {
      history.set(r.questionId, {
        timesSeen: 1,
        lastWasWrong: !r.isCorrect,
        lastAnsweredAt: r.answeredAt,
      });
      continue;
    }
    existing.timesSeen++;
    // Only the most recent answer defines "currently missed".
    if (r.answeredAt >= existing.lastAnsweredAt) {
      existing.lastWasWrong = !r.isCorrect;
      existing.lastAnsweredAt = r.answeredAt;
    }
  }

  return history;
}
