/**
 * Spaced repetition scheduling for flashcards.
 *
 * A simplified SM-2: each card carries an ease factor and an interval, and a
 * review either lengthens the interval or sends the card back to the start.
 * Two buttons only - "I know this" and "Needs work" - because a five-point
 * self-grade is more precision than a student sitting an exam wants to give.
 *
 * Pure and clock-injected so scheduling is deterministic under test.
 */

export type CardRating = "known" | "needs_work";

export interface CardState {
  /** Consecutive "known" ratings. Reset to 0 by "needs work". */
  streak: number;
  /** Days until the next review. */
  intervalDays: number;
  /** SM-2 ease factor. Higher means intervals grow faster. */
  ease: number;
  dueAt: Date;
}

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 180;

/** First two intervals are fixed; after that the ease factor takes over. */
const FIRST_INTERVAL_DAYS = 1;
const SECOND_INTERVAL_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export function newCardState(now: Date): CardState {
  return {
    streak: 0,
    intervalDays: 0,
    ease: INITIAL_EASE,
    // A brand new card is due immediately.
    dueAt: now,
  };
}

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/**
 * Advance a card after a review.
 *
 * "Needs work" resets the streak and brings the card back tomorrow rather
 * than burying it - the whole point is to see it again soon. It also nudges
 * ease down, so a card the student repeatedly fumbles keeps returning more
 * often than one they only tripped on once.
 */
export function scheduleNext(state: CardState, rating: CardRating, now: Date): CardState {
  if (rating === "needs_work") {
    return {
      streak: 0,
      intervalDays: FIRST_INTERVAL_DAYS,
      ease: Math.max(MIN_EASE, state.ease - 0.2),
      dueAt: addDays(now, FIRST_INTERVAL_DAYS),
    };
  }

  const streak = state.streak + 1;
  let intervalDays: number;

  if (streak === 1) {
    intervalDays = FIRST_INTERVAL_DAYS;
  } else if (streak === 2) {
    intervalDays = SECOND_INTERVAL_DAYS;
  } else {
    intervalDays = Math.round(state.intervalDays * state.ease);
  }

  // Cap the interval: a licensing student is preparing over weeks, so a card
  // scheduled two years out has effectively been deleted.
  intervalDays = Math.min(Math.max(intervalDays, FIRST_INTERVAL_DAYS), MAX_INTERVAL_DAYS);

  return {
    streak,
    intervalDays,
    // Correct recall makes intervals grow slightly faster next time.
    ease: state.ease + 0.05,
    dueAt: addDays(now, intervalDays),
  };
}

export interface DueCandidate {
  questionId: string;
  topic: string;
  state: CardState | null;
  /** Current accuracy on this card's topic, 0-100. Null when unknown. */
  topicAccuracy: number | null;
  /** Whether the student's last answer on this question was wrong. */
  lastWasWrong: boolean;
  isBookmarked: boolean;
}

/**
 * Choose which cards to show now.
 *
 * Only due cards are eligible - showing a card early defeats the point of
 * spacing it. Among due cards, weak topics and previously-missed questions
 * come first, which is what makes these "smart" flashcards rather than a
 * shuffled deck.
 */
export function selectDueCards(
  candidates: DueCandidate[],
  now: Date,
  limit: number,
): DueCandidate[] {
  if (limit <= 0) return [];

  const due = candidates.filter((c) => c.state === null || c.state.dueAt <= now);

  const score = (c: DueCandidate) => {
    let s = 0;
    // Weakest topics first.
    s += c.topicAccuracy === null ? 25 : 100 - c.topicAccuracy;
    if (c.lastWasWrong) s += 80;
    if (c.isBookmarked) s += 40;
    // Never-reviewed cards ahead of ones already in rotation.
    if (c.state === null) s += 30;
    else {
      // The longer a card is overdue, the more it needs seeing.
      const overdueDays = (now.getTime() - c.state.dueAt.getTime()) / DAY_MS;
      s += Math.min(Math.max(overdueDays, 0) * 3, 45);
    }
    return s;
  };

  return [...due]
    .sort((a, b) => score(b) - score(a) || a.questionId.localeCompare(b.questionId))
    .slice(0, limit);
}
