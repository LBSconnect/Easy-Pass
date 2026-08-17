/**
 * Student learning profile.
 *
 * The compact, structured picture of one student on one exam that everything
 * else in the assistant reads from. Built by a pure function so the whole
 * adaptive engine is testable without a database.
 *
 * PRIVACY: this type contains no name, email, address, phone or payment data,
 * and it is the ONLY thing permitted to reach an AI provider. The exclusion is
 * structural rather than a review rule - a field that does not exist on the
 * type cannot be leaked by a future careless prompt edit.
 */

import {
  conceptIdFor,
  conceptLabel,
  type ConceptId,
} from "@shared/concepts";

export type MasteryBand = "critical" | "needs_work" | "improving" | "strong";

/** Recent direction of travel on a concept. */
export type Trend = "improving" | "declining" | "flat" | "unknown";

export interface ConceptStanding {
  conceptId: ConceptId;
  label: string;
  /** Mastery 0-100. Recency-weighted, not lifetime percent correct. */
  mastery: number;
  band: MasteryBand;
  attempts: number;
  /** Distinct questions seen on this concept - low means mastery is thin. */
  uniqueQuestions: number;
  missedInWindow: number;
  trend: Trend;
  lastSeenAt: Date | null;
}

export interface ProfileResponse {
  questionId: string;
  topic: string | null;
  conceptId?: string | null;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface ProfileInput {
  category: string;
  responses: ProfileResponse[];
  /** Mock/practice exam percentages, most recent first. */
  mockExamScores: number[];
  /** Total active questions in this category's bank. */
  questionBankSize: number;
  examDate: Date | null;
  hasPreviousAttempt: boolean | null;
  language: "en" | "es";
  easyPassScore: number | null;
  now: Date;
}

export interface LearningProfile {
  category: string;
  language: "en" | "es";
  easyPassScore: number | null;
  examDate: Date | null;
  daysRemaining: number | null;
  isRetaker: boolean;
  totalAttempts: number;
  uniqueQuestionsSeen: number;
  /** Share of the bank the student has actually met, 0-1. */
  coverage: number;
  recentAccuracy: number | null;
  overallMastery: number | null;
  concepts: ConceptStanding[];
  weakestConcepts: ConceptStanding[];
  /** Concepts missed more than once in the recent window - the real problems. */
  repeatedlyMissedConcepts: ConceptStanding[];
  mockExamScores: number[];
  lastActivityAt: Date | null;
  trend: Trend;
}

/** Window for "recent" throughout the profile. */
export const RECENT_WINDOW_DAYS = 14;
/** Below this many attempts on a concept, mastery is not yet meaningful. */
export const MIN_ATTEMPTS_FOR_CONFIDENCE = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

export const MASTERY_BANDS: Array<{ band: MasteryBand; min: number }> = [
  { band: "strong", min: 85 },
  { band: "improving", min: 70 },
  { band: "needs_work", min: 55 },
  { band: "critical", min: 0 },
];

export function bandFor(mastery: number): MasteryBand {
  return MASTERY_BANDS.find((b) => mastery >= b.min)?.band ?? "critical";
}

export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / DAY_MS);
}

/**
 * Recency-weighted mastery for one concept.
 *
 * Lifetime percent-correct is the wrong model for exam prep in both
 * directions: a mistake from three weeks ago should not still be depressing a
 * concept the student has since learned, and one lucky answer today should not
 * mark it mastered. Weighting by recency with a half-life fixes the first;
 * shrinking sparse evidence toward a neutral 50 fixes the second.
 */
export function conceptMastery(responses: ProfileResponse[], now: Date): number {
  if (responses.length === 0) return 0;

  const HALF_LIFE_DAYS = 21;
  let weighted = 0;
  let totalWeight = 0;

  for (const r of responses) {
    const ageDays = Math.max(0, (now.getTime() - r.answeredAt.getTime()) / DAY_MS);
    const weight = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    weighted += (r.isCorrect ? 1 : 0) * weight;
    totalWeight += weight;
  }

  const raw = totalWeight > 0 ? (weighted / totalWeight) * 100 : 0;

  // Shrink toward 50 when evidence is thin, so two correct answers reads as
  // "probably okay" rather than "mastered" and cannot outrank a concept with
  // twenty attempts at 80%.
  const confidence = Math.min(1, responses.length / MIN_ATTEMPTS_FOR_CONFIDENCE);
  return Math.round(raw * confidence + 50 * (1 - confidence));
}

/**
 * Direction of travel: recent half vs earlier half.
 *
 * Needs at least three attempts on each side before it will call a direction -
 * below that the "trend" is noise, and telling a student they are declining on
 * the strength of two answers is both wrong and demoralising.
 */
export function conceptTrend(responses: ProfileResponse[]): Trend {
  if (responses.length < 6) return "unknown";

  const sorted = [...responses].sort((a, b) => a.answeredAt.getTime() - b.answeredAt.getTime());
  const mid = Math.floor(sorted.length / 2);
  const rate = (list: ProfileResponse[]) =>
    list.filter((r) => r.isCorrect).length / list.length;

  const delta = rate(sorted.slice(mid)) - rate(sorted.slice(0, mid));
  if (delta > 0.12) return "improving";
  if (delta < -0.12) return "declining";
  return "flat";
}

export function buildLearningProfile(input: ProfileInput): LearningProfile {
  const { responses, now } = input;
  const windowStart = new Date(now.getTime() - RECENT_WINDOW_DAYS * DAY_MS);

  const byConcept = new Map<ConceptId, { label: string; responses: ProfileResponse[] }>();
  for (const r of responses) {
    const id = conceptIdFor(r.topic, r.conceptId);
    const existing = byConcept.get(id);
    if (existing) {
      existing.responses.push(r);
    } else {
      byConcept.set(id, { label: conceptLabel(id, r.topic), responses: [r] });
    }
  }

  const concepts: ConceptStanding[] = Array.from(byConcept.entries()).map(([conceptId, data]) => {
    const mastery = conceptMastery(data.responses, now);
    const recent = data.responses.filter((r) => r.answeredAt >= windowStart);
    const lastSeen = data.responses.reduce<Date | null>(
      (latest, r) => (!latest || r.answeredAt > latest ? r.answeredAt : latest),
      null,
    );

    return {
      conceptId,
      label: data.label,
      mastery,
      band: bandFor(mastery),
      attempts: data.responses.length,
      uniqueQuestions: new Set(data.responses.map((r) => r.questionId)).size,
      missedInWindow: recent.filter((r) => !r.isCorrect).length,
      trend: conceptTrend(data.responses),
      lastSeenAt: lastSeen,
    };
  });

  // Weakest first, and among equals prefer the concept with more evidence -
  // a 40% built on twelve attempts is a more actionable target than a 40%
  // built on two.
  const byWeakness = [...concepts].sort(
    (a, b) => a.mastery - b.mastery || b.attempts - a.attempts || a.conceptId.localeCompare(b.conceptId),
  );

  const recentResponses = responses.filter((r) => r.answeredAt >= windowStart);
  const recentAccuracy =
    recentResponses.length > 0
      ? Math.round(
          (recentResponses.filter((r) => r.isCorrect).length / recentResponses.length) * 100,
        )
      : null;

  const uniqueQuestionsSeen = new Set(responses.map((r) => r.questionId)).size;

  const lastActivityAt = responses.reduce<Date | null>(
    (latest, r) => (!latest || r.answeredAt > latest ? r.answeredAt : latest),
    null,
  );

  return {
    category: input.category,
    language: input.language,
    easyPassScore: input.easyPassScore,
    examDate: input.examDate,
    daysRemaining: input.examDate ? Math.max(0, daysBetween(now, input.examDate)) : null,
    isRetaker: input.hasPreviousAttempt === true,
    totalAttempts: responses.length,
    uniqueQuestionsSeen,
    coverage:
      input.questionBankSize > 0
        ? Math.min(1, uniqueQuestionsSeen / input.questionBankSize)
        : 0,
    recentAccuracy,
    overallMastery:
      concepts.length > 0
        ? Math.round(concepts.reduce((sum, c) => sum + c.mastery, 0) / concepts.length)
        : null,
    concepts: byWeakness,
    weakestConcepts: byWeakness.slice(0, 3),
    // Two or more misses in the window is the signal that separates "had an
    // off day" from "does not understand this".
    repeatedlyMissedConcepts: byWeakness.filter((c) => c.missedInWindow >= 2),
    mockExamScores: input.mockExamScores,
    lastActivityAt,
    trend: conceptTrend(responses),
  };
}

/**
 * The redacted view sent to an AI provider.
 *
 * Concept labels and numbers only - no question text, no answer keys, no ids
 * that mean anything outside our database. Even the student id is dropped:
 * the model has no use for it, so it does not travel.
 */
export function toProviderSummary(profile: LearningProfile): string {
  const lines = [
    `Exam: ${profile.category}`,
    `Readiness score: ${profile.easyPassScore ?? "not yet established"}`,
    profile.daysRemaining === null
      ? "Exam date: not scheduled"
      : `Days until exam: ${profile.daysRemaining}`,
    `Previously attempted this exam: ${profile.isRetaker ? "yes" : "no"}`,
    `Recent accuracy: ${profile.recentAccuracy ?? "insufficient data"}%`,
  ];

  if (profile.weakestConcepts.length > 0) {
    lines.push(
      `Weakest concepts: ${profile.weakestConcepts
        .map((c) => `${c.label} (${c.mastery}%)`)
        .join(", ")}`,
    );
  }

  return lines.join("\n");
}
