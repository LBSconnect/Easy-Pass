/**
 * Item difficulty calibration.
 *
 * The adaptive engine computes a target difficulty for every student, but the
 * question bank carries no difficulty, so nothing could act on it - a feature
 * that looked implemented and did nothing.
 *
 * Hand-labelling a thousand questions would be slow, subjective, and wrong:
 * authors are famously bad at predicting which questions students find hard.
 * We already hold the better signal. `question_responses` records who answered
 * what and whether they got it right, so difficulty can be MEASURED.
 *
 * This is the classical test-theory p-value: the proportion of students who
 * answer an item correctly. Low p means hard. It is the standard item
 * statistic and needs no model fitting.
 *
 * Pure, so calibration is testable without a database.
 */

export type Difficulty = "foundation" | "standard" | "exam_level" | "challenge";

export interface ItemStat {
  questionId: string;
  /** Distinct students who attempted it. */
  respondents: number;
  correct: number;
}

export interface CalibratedItem {
  questionId: string;
  difficulty: Difficulty;
  /** Proportion correct, 0-1. */
  pValue: number;
  respondents: number;
}

/**
 * Minimum distinct respondents before a p-value means anything.
 *
 * Below this the estimate swings wildly - three students, two wrong, reads as
 * a brutally hard item on no evidence. Uncalibrated is an honest state; a
 * confident wrong label is not, because it would actively misroute students.
 */
export const MIN_RESPONDENTS = 12;

/**
 * p-value cut points, hardest first.
 *
 * Deliberately NOT evenly spaced. Real banks skew easy, so even quartiles
 * would file genuinely straightforward questions as "challenge". These bands
 * are set so "challenge" means most students miss it.
 */
export const DIFFICULTY_BANDS: Array<{ difficulty: Difficulty; maxP: number }> = [
  { difficulty: "challenge", maxP: 0.45 },
  { difficulty: "exam_level", maxP: 0.65 },
  { difficulty: "standard", maxP: 0.85 },
  { difficulty: "foundation", maxP: 1.0 },
];

export function difficultyForPValue(pValue: number): Difficulty {
  return (
    DIFFICULTY_BANDS.find((b) => pValue <= b.maxP)?.difficulty ?? "foundation"
  );
}

/**
 * Calibrate a batch of items.
 *
 * Items with too little evidence are omitted rather than guessed at, so the
 * caller can leave their stored difficulty null.
 */
export function calibrate(stats: ItemStat[]): CalibratedItem[] {
  const out: CalibratedItem[] = [];

  for (const s of stats) {
    if (s.respondents < MIN_RESPONDENTS) continue;
    // Defensive: a corrupt row claiming more correct than respondents would
    // otherwise produce a p-value above 1 and silently band as foundation.
    const correct = Math.min(Math.max(s.correct, 0), s.respondents);
    const pValue = correct / s.respondents;

    out.push({
      questionId: s.questionId,
      difficulty: difficultyForPValue(pValue),
      pValue,
      respondents: s.respondents,
    });
  }

  return out;
}

/**
 * How many items of each difficulty a session should contain.
 *
 * Centred on the student's target level with a deliberate spread: an all-hard
 * set demoralises, an all-easy set teaches nothing. The neighbouring band gets
 * real weight so a student meets the next level up before being moved to it.
 */
export function difficultyMix(
  target: Difficulty,
  count: number,
): Record<Difficulty, number> {
  const LADDER: Difficulty[] = ["foundation", "standard", "exam_level", "challenge"];
  const i = LADDER.indexOf(target);

  // 60% at level, 25% one step easier, 15% one step harder. At the ends of
  // the ladder the missing share folds back into the target level.
  const weights = new Map<Difficulty, number>();
  const add = (d: Difficulty | undefined, w: number) => {
    if (!d) return false;
    weights.set(d, (weights.get(d) ?? 0) + w);
    return true;
  };

  let leftover = 0;
  if (!add(LADDER[i - 1], 0.25)) leftover += 0.25;
  if (!add(LADDER[i + 1], 0.15)) leftover += 0.15;
  add(target, 0.6 + leftover);

  // Largest-remainder so the parts sum exactly to `count`.
  const entries = Array.from(weights.entries());
  const exact = entries.map(([d, w]) => ({ d, ideal: w * count }));
  const mix = Object.fromEntries(
    LADDER.map((d) => [d, 0]),
  ) as Record<Difficulty, number>;

  for (const e of exact) mix[e.d] = Math.floor(e.ideal);
  let assigned = Object.values(mix).reduce((a, b) => a + b, 0);

  const byRemainder = [...exact].sort(
    (a, b) => (b.ideal % 1) - (a.ideal % 1) || a.d.localeCompare(b.d),
  );
  let k = 0;
  while (assigned < count && byRemainder.length > 0) {
    mix[byRemainder[k % byRemainder.length].d]++;
    assigned++;
    k++;
  }

  return mix;
}
