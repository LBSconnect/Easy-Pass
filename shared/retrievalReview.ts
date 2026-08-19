/**
 * Choosing what a student should try to recall, and in what order.
 *
 * WHAT WAS WRONG WITH "REVIEW"
 *
 * A review session used to be one block, built from the list of questions the
 * student had previously got wrong, rendered with the correct answer and the
 * explanation already visible. The student read their mistakes back.
 *
 * That is the same content as the notebook page, presented slightly
 * differently - which is exactly what it felt like to use - and it is the
 * weakest way to study. Re-reading a worked answer produces a strong feeling
 * of knowing it and very little ability to produce it later. Recall has to be
 * attempted before it can be strengthened, so a review block now ASKS.
 *
 * THREE THINGS THIS MODULE DECIDES
 *
 * What is worth recalling. Priority comes from the student's own history:
 * what they got wrong, how often, and - the part nothing here used to
 * consider - how long ago they last saw it. An item answered yesterday is
 * nearly free to answer again and teaches almost nothing; the same item three
 * weeks later is where the work happens.
 *
 * What to leave alone. Anything seen within the last few hours is excluded
 * outright. Asking again inside the same sitting measures whether the answer
 * is still on screen, not whether it was learned, and it pads a session with
 * items that were never in doubt.
 *
 * What order to ask in. Consecutive questions on one concept let a student
 * coast on the pattern of the previous answer rather than retrieving the
 * concept fresh. Mixing concepts feels harder and is the point: the exam does
 * not group its questions by topic either.
 *
 * WHY THE SCORE IS ARITHMETIC AND NOT A MODEL
 *
 * Same reason as the recommendation engine it serves: a student reloading the
 * page must get the same session, an admin asking "why this question?" must
 * get an answer, and it has to keep working when the AI provider is down.
 * Every term below is a number someone can add up by hand.
 */

/** One time a student answered one question. */
export interface Exposure {
  questionId: string;
  topic: string;
  isCorrect: boolean;
  answeredAt: Date | string;
}

/** What the caller gets back, in the order it should be asked. */
export interface RetrievalPick {
  questionId: string;
  topic: string;
  /** Why this was chosen, for admin explanation and tests. */
  score: number;
}

/**
 * Seen this recently and it is skipped.
 *
 * Six hours covers "earlier in the same study session" and "this morning"
 * without reaching back to yesterday, which is genuinely worth re-testing.
 */
export const TOO_RECENT_MS = 6 * 60 * 60 * 1000;

/**
 * Where the spacing bonus stops growing.
 *
 * Past a month, "longer ago" stops discriminating usefully - everything is
 * equally cold - and letting it grow without limit would let one ancient
 * easy question outrank a concept the student got wrong last week.
 */
export const MAX_SPACING_DAYS = 30;

/** Priority for an item whose most recent answer was wrong. */
const LAST_ANSWER_WRONG = 100;
/** Priority for an item wrong at some point but right most recently. */
const PREVIOUSLY_WRONG = 55;
/** Priority for an item never answered wrongly. Still worth re-testing, last. */
const ALWAYS_RIGHT = 15;

/** Extra weight per past mistake, capped so one item cannot dominate. */
const PER_MISTAKE = 10;
const MAX_MISTAKES_COUNTED = 3;

/** Most a cold item can gain from spacing alone. */
const MAX_SPACING_WEIGHT = 30;
/** Most an item can gain from sitting in a weak concept. */
const MAX_WEAKNESS_WEIGHT = 25;

const DAY_MS = 24 * 60 * 60 * 1000;

interface Aggregate {
  questionId: string;
  topic: string;
  timesWrong: number;
  lastWasWrong: boolean;
  lastSeen: number;
}

function timeOf(value: Date | string): number {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Collapse a response log into one row per question.
 *
 * Ordering within the log is not trusted - rows arrive from the database in
 * whatever order the query gave them - so "most recent" is decided by
 * timestamp rather than by position.
 */
function aggregate(exposures: Exposure[]): Map<string, Aggregate> {
  const byQuestion = new Map<string, Aggregate>();

  for (const exposure of exposures) {
    if (!exposure.questionId) continue;
    const at = timeOf(exposure.answeredAt);
    const existing = byQuestion.get(exposure.questionId);

    if (!existing) {
      byQuestion.set(exposure.questionId, {
        questionId: exposure.questionId,
        topic: exposure.topic || "General",
        timesWrong: exposure.isCorrect ? 0 : 1,
        lastWasWrong: !exposure.isCorrect,
        lastSeen: at,
      });
      continue;
    }

    if (!exposure.isCorrect) existing.timesWrong += 1;
    if (at >= existing.lastSeen) {
      existing.lastSeen = at;
      existing.lastWasWrong = !exposure.isCorrect;
      if (exposure.topic) existing.topic = exposure.topic;
    }
  }

  return byQuestion;
}

/** Accuracy per topic, used to lift items sitting in a student's weak areas. */
export function topicAccuracy(exposures: Exposure[]): Map<string, number> {
  const tally = new Map<string, { right: number; total: number }>();

  for (const exposure of exposures) {
    const topic = exposure.topic || "General";
    const row = tally.get(topic) ?? { right: 0, total: 0 };
    row.total += 1;
    if (exposure.isCorrect) row.right += 1;
    tally.set(topic, row);
  }

  const accuracy = new Map<string, number>();
  for (const [topic, { right, total }] of Array.from(tally.entries())) {
    accuracy.set(topic, total === 0 ? 1 : right / total);
  }
  return accuracy;
}

/** How overdue this item is, 0 when just seen and capped at MAX_SPACING_DAYS. */
function spacingWeight(lastSeen: number, now: number): number {
  const days = Math.max(0, (now - lastSeen) / DAY_MS);
  return (Math.min(days, MAX_SPACING_DAYS) / MAX_SPACING_DAYS) * MAX_SPACING_WEIGHT;
}

function outcomeWeight(row: Aggregate): number {
  const base = row.lastWasWrong
    ? LAST_ANSWER_WRONG
    : row.timesWrong > 0
      ? PREVIOUSLY_WRONG
      : ALWAYS_RIGHT;
  return base + Math.min(row.timesWrong, MAX_MISTAKES_COUNTED) * PER_MISTAKE;
}

/**
 * Score every question the student has seen, highest priority first.
 *
 * Ties break on question id so the same history always produces the same
 * session - a student who reloads must not get a different set.
 */
export function scoreRetrieval(
  exposures: Exposure[],
  now: Date,
  options: { tooRecentMs?: number } = {},
): RetrievalPick[] {
  const tooRecent = options.tooRecentMs ?? TOO_RECENT_MS;
  const nowMs = now.getTime();
  const accuracy = topicAccuracy(exposures);

  const picks: RetrievalPick[] = [];
  for (const row of Array.from(aggregate(exposures).values())) {
    // Just answered. Asking again now tests short-term memory, nothing more.
    if (nowMs - row.lastSeen < tooRecent) continue;

    const weakness = (1 - (accuracy.get(row.topic) ?? 1)) * MAX_WEAKNESS_WEIGHT;
    picks.push({
      questionId: row.questionId,
      topic: row.topic,
      score: outcomeWeight(row) + spacingWeight(row.lastSeen, nowMs) + weakness,
    });
  }

  return picks.sort(
    (a, b) => b.score - a.score || a.questionId.localeCompare(b.questionId),
  );
}

/**
 * Reorder so consecutive questions come from different concepts where possible.
 *
 * Each step takes the highest-scoring item available from a topic other than
 * the one just asked, so priority is given up only where it has to be. When
 * one topic is all that remains, it repeats rather than dropping questions.
 *
 * Bucketed by topic rather than scanning the list each time, so this stays
 * cheap on a student who has answered thousands of questions.
 */
export function interleaveByTopic(picks: RetrievalPick[]): RetrievalPick[] {
  const buckets = new Map<string, RetrievalPick[]>();
  for (const pick of picks) {
    const bucket = buckets.get(pick.topic);
    if (bucket) bucket.push(pick);
    else buckets.set(pick.topic, [pick]);
  }
  // Input arrives sorted, so each bucket is already highest-priority first.

  const ordered: RetrievalPick[] = [];
  let previousTopic: string | null = null;

  while (ordered.length < picks.length) {
    let chosen: string | null = null;
    let best = -Infinity;

    for (const [topic, bucket] of Array.from(buckets.entries())) {
      if (bucket.length === 0 || topic === previousTopic) continue;
      if (bucket[0].score > best) {
        best = bucket[0].score;
        chosen = topic;
      }
    }

    // Only the topic just asked has anything left. Repeating it beats
    // silently returning fewer questions than were selected.
    if (chosen === null) chosen = previousTopic;

    const bucket = buckets.get(chosen as string);
    if (!bucket || bucket.length === 0) break;

    ordered.push(bucket.shift() as RetrievalPick);
    previousTopic = chosen;
  }

  return ordered;
}

/**
 * The questions to ask in a review block.
 *
 * Mixed BEFORE the list is cut down, which is the whole point and was wrong
 * the first time: taking the top nine by score and then interleaving them
 * produced seven questions on one concept in a row, because the nine highest
 * scorers were nearly all from the student's weakest topic and there was
 * nothing left to interleave with.
 *
 * Alternating first and cutting second keeps both properties - every question
 * is still drawn from the top of the priority order, and consecutive questions
 * come from different concepts.
 */
export function selectRetrieval(
  exposures: Exposure[],
  count: number,
  now: Date,
  options: { tooRecentMs?: number } = {},
): RetrievalPick[] {
  if (count <= 0) return [];
  return interleaveByTopic(scoreRetrieval(exposures, now, options)).slice(0, count);
}
