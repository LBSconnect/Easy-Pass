/**
 * A mock paper aimed at what a student is weakest on.
 *
 * NOT A SIMULATOR, AND THE DIFFERENCE MATTERS
 *
 * server/simulatorPaper.ts builds an exam-day simulator: topics appear in
 * proportion to the bank, because the point is to reproduce the shape of the
 * real paper. Biasing that toward a student's weak topics would quietly make
 * it unrepresentative - their score would stop being an estimate of exam-day
 * performance, which is the one thing a simulator is for.
 *
 * So this is a separate thing with a separate name. A targeted paper is
 * practice: deliberately over-weighted toward what the student keeps getting
 * wrong, and honest about being harder than the real exam. Both exist; they
 * are not interchangeable, and the interface should never call this one a
 * mock exam score.
 *
 * The allocation itself is delegated to buildSimulatorPaper, which already
 * handles largest-remainder rounding and topics that run short. This only
 * decides the weights and the order questions are drawn in.
 */

import { buildSimulatorPaper, groupByTopic, type PaperQuestion } from "../simulatorPaper";

export interface TopicAccuracy {
  topic: string;
  /** 0-100. */
  accuracy: number;
}

export interface TargetedPaperInput {
  pool: PaperQuestion[];
  targetCount: number;
  /** Per-topic accuracy for this student. Topics absent are treated as unknown. */
  topicAccuracy: TopicAccuracy[];
  /** Questions the student has seen recently; drawn last, never excluded. */
  recentlySeenIds?: string[];
  seed: number;
  /**
   * How hard to lean on weak topics.
   *
   * 1 leaves the bank's own distribution untouched; higher values push more
   * of the paper toward low-accuracy topics. Capped so a paper never becomes
   * a single topic repeated - a student revising one thing to the exclusion
   * of everything else is not what a mock is for.
   */
  weakBias?: number;
}

export const DEFAULT_WEAK_BIAS = 2.5;
export const MAX_WEAK_BIAS = 4;

/**
 * Weight a topic gets relative to its share of the bank.
 *
 * Accuracy 0 gets the full bias, accuracy 100 gets none, and anything in
 * between scales linearly. A topic with no data sits in the middle: unknown
 * is not the same as strong, and a student should not be steered away from a
 * topic simply because they have never attempted it.
 */
export function topicMultiplier(accuracy: number | null, bias: number): number {
  const clampedBias = Math.min(Math.max(bias, 1), MAX_WEAK_BIAS);
  if (accuracy === null || !Number.isFinite(accuracy)) {
    return 1 + (clampedBias - 1) / 2;
  }
  const clamped = Math.min(Math.max(accuracy, 0), 100);
  return 1 + (clampedBias - 1) * (1 - clamped / 100);
}

export function buildTargetedPaper(input: TargetedPaperInput): PaperQuestion[] {
  const bias = input.weakBias ?? DEFAULT_WEAK_BIAS;
  const accuracyByTopic = new Map(input.topicAccuracy.map((t) => [t.topic, t.accuracy]));
  const seen = new Set(input.recentlySeenIds ?? []);

  // Weight = the topic's share of the bank, scaled by how weak the student is
  // on it. Starting from the bank's own distribution means a topic with three
  // questions cannot dominate a 100-question paper however weak the student
  // is on it - there simply are not the questions to fill it.
  const byTopic = groupByTopic(input.pool);
  const weights = new Map<string, number>();
  for (const [topic, questions] of Array.from(byTopic.entries())) {
    const accuracy = accuracyByTopic.has(topic) ? accuracyByTopic.get(topic)! : null;
    weights.set(topic, questions.length * topicMultiplier(accuracy, bias));
  }

  // Recently-seen questions are drawn only when the unseen bank runs out.
  //
  // Ordering the pool would not do this: buildSimulatorPaper shuffles each
  // topic before drawing, so any order handed to it is discarded. The two
  // pools have to be drawn separately. Excluding seen questions outright is
  // also wrong - it would shorten the paper for exactly the students who
  // practise most - so what is short after the first draw is topped up from
  // the second.
  const unseen = input.pool.filter((q) => !seen.has(q.id));
  const alreadySeen = input.pool.filter((q) => seen.has(q.id));

  const fresh = buildSimulatorPaper({
    pool: unseen,
    targetCount: input.targetCount,
    topicWeights: weights,
    seed: input.seed,
  });

  const shortfall = input.targetCount - fresh.length;
  if (shortfall <= 0 || alreadySeen.length === 0) return fresh;

  // A different seed so the top-up is not a re-run of the same shuffle.
  const repeats = buildSimulatorPaper({
    pool: alreadySeen,
    targetCount: shortfall,
    topicWeights: weights,
    seed: input.seed + 1,
  });

  return [...fresh, ...repeats];
}
