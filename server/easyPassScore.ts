/**
 * The EasyPass Score: a 0-100 readiness measurement.
 *
 * This is an INTERNAL READINESS MEASUREMENT, not a prediction of an official
 * licensing exam result. We have no validated outcome data linking these
 * inputs to real pass/fail outcomes, so nothing here should ever be presented
 * as a pass probability. The band labels are deliberately about study state
 * ("Nearly Ready") rather than outcomes ("87% likely to pass").
 *
 * Every component is computed from data we actually store. Two factors named
 * in the product brief are deliberately NOT implemented yet:
 *
 *   - question difficulty: the questions table has no difficulty column, so
 *     weighting by it would be invented.
 *   - study-plan completion: study plans do not exist yet.
 *
 * They are absent rather than stubbed at a fake value, so the score never
 * reports confidence it has not earned. When those features land, add them as
 * components here and the weights renormalize automatically.
 */

export type ReadinessBand =
  | "exam_ready"
  | "nearly_ready"
  | "improving"
  | "needs_review"
  | "intensive_study";

export interface ScoreBandThreshold {
  band: ReadinessBand;
  min: number;
}

/** Admin-configurable. Evaluated highest-first; the last entry is the floor. */
export const DEFAULT_BANDS: ScoreBandThreshold[] = [
  { band: "exam_ready", min: 90 },
  { band: "nearly_ready", min: 80 },
  { band: "improving", min: 70 },
  { band: "needs_review", min: 60 },
  { band: "intensive_study", min: 0 },
];

export interface ScoreComponent {
  key: string;
  /** 0-100 for this dimension. */
  value: number;
  /** Relative weight. Weights of contributing components are renormalized. */
  weight: number;
  /**
   * False when there is not enough data for this component to mean anything.
   * Excluded components contribute nothing and their weight is redistributed.
   */
  applicable: boolean;
}

export interface ScoreInput {
  /** Every response for this user+category, oldest first. */
  responses: Array<{
    questionId: string;
    topic: string;
    isCorrect: boolean;
    answeredAt: Date;
    /**
     * Where the answer came from. Only "drill" is treated specially - see
     * recentAccuracy. Optional so existing callers keep working; an absent
     * source is a plain sitting.
     */
    source?: string;
  }>;
  /** Completed mock/full exam scores (0-100), most recent first. */
  mockExamScores: number[];
  /** Distinct questions available in this category, for coverage. */
  questionBankSize: number;
  /** Evaluation time, injected so scoring is deterministic under test. */
  now: Date;
}

export interface EasyPassScore {
  score: number;
  band: ReadinessBand;
  components: ScoreComponent[];
  /** True when there is too little history for the score to be meaningful. */
  provisional: boolean;
  questionsAttempted: number;
  strongestTopic: string | null;
  weakestTopic: string | null;
}

/** Below this many answered questions the score is labelled provisional. */
export const PROVISIONAL_THRESHOLD = 25;

/** Recent-performance window. */
const RECENT_WINDOW_DAYS = 14;

/** Coverage saturates here: seeing this share of the bank is "full" coverage. */
const COVERAGE_TARGET_RATIO = 0.5;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / DAY_MS;
}

function pct(correct: number, total: number): number {
  return total === 0 ? 0 : (correct / total) * 100;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Accuracy over the recent window, falling back to all history when the user
 * has not been active recently. Answering well six months ago should not read
 * as being ready today - that is what the recency component handles - but it
 * is still better evidence than nothing.
 *
 * Drills are left out, and this is the only component that leaves anything
 * out. A drill deliberately over-samples the topics a student is weakest on,
 * so its answers are not a fair sample of how they are doing overall - the
 * more remedial work someone does, the further this component would drift
 * below their actual standing. Every other component is unaffected: per-topic
 * mastery is measured within a topic, coverage counts questions seen, and
 * recency counts activity, all of which a drill contributes to honestly.
 */
function recentAccuracy(input: ScoreInput): ScoreComponent {
  const cutoff = new Date(input.now.getTime() - RECENT_WINDOW_DAYS * DAY_MS);
  const representative = input.responses.filter((r) => r.source !== "drill");
  const recent = representative.filter((r) => r.answeredAt >= cutoff);
  const pool = recent.length >= 10 ? recent : representative;

  return {
    key: "recent_accuracy",
    value: pct(pool.filter((r) => r.isCorrect).length, pool.length),
    weight: 30,
    applicable: pool.length > 0,
  };
}

/**
 * Breadth of topic mastery.
 *
 * The mean of per-topic accuracy alone is not enough: a student at 100% on Law
 * and 50% on Property has the same mean as one at 80%/70%, but is materially
 * less ready - a whole domain is failing. So the weakest topic is blended in
 * alongside the mean, which is what lets the product honestly say "Texas Law
 * is holding you back" rather than hiding it behind a flattering average.
 */
const WEAKEST_TOPIC_DRAG = 0.4;

function topicMastery(input: ScoreInput): ScoreComponent {
  const byTopic = new Map<string, { correct: number; total: number }>();
  for (const r of input.responses) {
    const t = byTopic.get(r.topic) ?? { correct: 0, total: 0 };
    t.total++;
    if (r.isCorrect) t.correct++;
    byTopic.set(r.topic, t);
  }

  const accuracies = Array.from(byTopic.values(), (t) => pct(t.correct, t.total));
  const mean =
    accuracies.length === 0
      ? 0
      : accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

  // With a single topic there is no spread to penalise.
  const value =
    accuracies.length < 2
      ? mean
      : mean * (1 - WEAKEST_TOPIC_DRAG) + Math.min(...accuracies) * WEAKEST_TOPIC_DRAG;

  return {
    key: "topic_mastery",
    value,
    weight: 25,
    applicable: byTopic.size > 0,
  };
}

/**
 * Mock exam performance, weighted toward recent attempts. Full mocks are the
 * closest proxy we have for exam conditions, so they carry real weight - but
 * only when the student has actually sat one.
 */
function mockPerformance(input: ScoreInput): ScoreComponent {
  const scores = input.mockExamScores.slice(0, 3);
  // Most recent attempt counts most: weights 3, 2, 1.
  let weighted = 0;
  let weightSum = 0;
  scores.forEach((s, i) => {
    const w = scores.length - i;
    weighted += s * w;
    weightSum += w;
  });

  return {
    key: "mock_performance",
    value: weightSum === 0 ? 0 : weighted / weightSum,
    weight: 20,
    applicable: scores.length > 0,
  };
}

/**
 * How much of the bank the student has actually seen. Guards against a high
 * score from 20 lucky questions.
 */
function coverage(input: ScoreInput): ScoreComponent {
  const seen = new Set(input.responses.map((r) => r.questionId)).size;
  const target = Math.max(1, input.questionBankSize * COVERAGE_TARGET_RATIO);

  return {
    key: "coverage",
    value: clamp((seen / target) * 100),
    weight: 10,
    applicable: input.questionBankSize > 0,
  };
}

/**
 * Recency of study. Decays from full marks at 0 days since last activity to
 * zero at 21 days, because readiness genuinely goes stale.
 */
function recency(input: ScoreInput): ScoreComponent {
  const last = input.responses[input.responses.length - 1];
  const idleDays = last ? daysBetween(input.now, last.answeredAt) : Infinity;

  return {
    key: "recency",
    value: clamp(100 - (idleDays / 21) * 100),
    weight: 5,
    applicable: Boolean(last),
  };
}

/**
 * Recovery on previously-missed questions: of the questions this student has
 * answered more than once after getting them wrong, how many did they later
 * get right? This is the single clearest signal that studying is working.
 */
function recovery(input: ScoreInput): ScoreComponent {
  const byQuestion = new Map<string, boolean[]>();
  for (const r of input.responses) {
    const seq = byQuestion.get(r.questionId) ?? [];
    seq.push(r.isCorrect);
    byQuestion.set(r.questionId, seq);
  }

  let recovered = 0;
  let missedThenRetried = 0;
  for (const seq of Array.from(byQuestion.values())) {
    const firstMiss = seq.indexOf(false);
    if (firstMiss === -1 || firstMiss === seq.length - 1) continue;
    missedThenRetried++;
    if (seq[seq.length - 1]) recovered++;
  }

  return {
    key: "recovery",
    value: pct(recovered, missedThenRetried),
    weight: 10,
    applicable: missedThenRetried > 0,
  };
}

export function bandFor(
  score: number,
  bands: ScoreBandThreshold[] = DEFAULT_BANDS,
): ReadinessBand {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => score >= b.min)?.band ?? "intensive_study";
}

export function calculateEasyPassScore(
  input: ScoreInput,
  bands: ScoreBandThreshold[] = DEFAULT_BANDS,
): EasyPassScore {
  const components = [
    recentAccuracy(input),
    topicMastery(input),
    mockPerformance(input),
    coverage(input),
    recency(input),
    recovery(input),
  ];

  const contributing = components.filter((c) => c.applicable);
  const totalWeight = contributing.reduce((sum, c) => sum + c.weight, 0);

  // Weights renormalize over contributing components, so a student who has
  // not sat a mock is not silently penalised for the missing 20 points.
  const score =
    totalWeight === 0
      ? 0
      : Math.round(
          contributing.reduce((sum, c) => sum + c.value * c.weight, 0) / totalWeight,
        );

  const byTopic = new Map<string, { correct: number; total: number }>();
  for (const r of input.responses) {
    const t = byTopic.get(r.topic) ?? { correct: 0, total: 0 };
    t.total++;
    if (r.isCorrect) t.correct++;
    byTopic.set(r.topic, t);
  }

  // Only rank topics with enough attempts to be meaningful.
  const ranked = Array.from(byTopic.entries())
    .filter(([, t]) => t.total >= 3)
    .map(([topic, t]) => ({ topic, accuracy: pct(t.correct, t.total) }))
    .sort((a, b) => b.accuracy - a.accuracy);

  return {
    score: clamp(score),
    band: bandFor(clamp(score), bands),
    components,
    provisional: input.responses.length < PROVISIONAL_THRESHOLD,
    questionsAttempted: input.responses.length,
    strongestTopic: ranked.length > 0 ? ranked[0].topic : null,
    weakestTopic: ranked.length > 1 ? ranked[ranked.length - 1].topic : null,
  };
}
