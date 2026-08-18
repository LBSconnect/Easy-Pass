/**
 * What is worth telling a student, and what is not.
 *
 * EVERY REMINDER IS A FACT
 *
 * Each rule below fires on something we actually store: a date they gave us,
 * an answer they recorded, a subscription period Stripe told us about. None
 * of them says how likely they are to pass, how they compare to anyone else,
 * or how many days they have "left to succeed". A reminder that invents
 * urgency is a reminder that lies, and this product's whole claim is that its
 * numbers are real.
 *
 * ORDERED, AND CAPPED
 *
 * Reminders are ranked by how time-bound they are - an exam in three days
 * cannot wait, a full notebook can - and only the top few are shown. A list
 * of eight nudges is a list nobody reads, and the least useful ones would
 * crowd out the one that mattered.
 *
 * The rendering is deliberately not here: this module decides *what* is true
 * and the surface decides how to say it, so the same decision drives the
 * dashboard strip and the weekly email without them drifting apart.
 */

export type ReminderCode =
  | "exam_imminent"
  | "exam_approaching"
  | "subscription_ending"
  | "inactive"
  | "notebook_waiting"
  | "no_attempts_yet";

export interface Reminder {
  code: ReminderCode;
  /** Higher is more time-bound. Used for ordering, not shown. */
  priority: number;
  /** The numbers behind it, for the surface to put into a sentence. */
  data: Record<string, number | string>;
}

export interface ReminderInput {
  now: Date;
  /** Scheduled exam date, or null when they have not set one. */
  examDate: Date | null;
  /** When the subscription's current period ends, if we know. */
  subscriptionEndDate: Date | null;
  hasActiveSubscription: boolean;
  /** Most recent recorded answer, or null if they have never answered one. */
  lastAnsweredAt: Date | null;
  /** Questions whose latest answer was wrong. */
  missedQuestionCount: number;
  /** Completed sittings. */
  totalAttempts: number;
}

/** An exam this close is the only thing worth leading with. */
export const IMMINENT_DAYS = 3;

/** Close enough that the plan should change; not close enough to alarm. */
export const APPROACHING_DAYS = 14;

/** Access ending inside this window is worth saying before it happens. */
export const SUBSCRIPTION_WARNING_DAYS = 5;

/** Days without a recorded answer before we mention it. */
export const INACTIVE_DAYS = 5;

/** Below this the notebook is not yet a session's worth of work. */
export const NOTEBOOK_THRESHOLD = 10;

/** Most reminders shown at once. */
export const MAX_REMINDERS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days from `now` to `date`, rounded up.
 *
 * Rounded up because a student thinks of an exam 30 hours away as "in two
 * days", not "in one" - and rounding down would tell them they have longer
 * than they do.
 */
export function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

/** Whole days since `date`, rounded down. */
export function daysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS);
}

function usable(date: Date | null | undefined): Date | null {
  if (!date) return null;
  const value = date instanceof Date ? date : new Date(date);
  return Number.isFinite(value.getTime()) ? value : null;
}

/**
 * Everything true about this student right now, most time-bound first.
 *
 * Returns them all; capping is the caller's decision, because the dashboard
 * has room for three and an email should carry one.
 */
export function buildReminders(input: ReminderInput): Reminder[] {
  const reminders: Reminder[] = [];
  const now = input.now;

  const examDate = usable(input.examDate);
  if (examDate) {
    const days = daysUntil(examDate, now);
    // A past exam date is not a reminder. We do not know how it went - they
    // may have passed and moved on - and counting up from it would be
    // nagging someone about something already behind them.
    if (days >= 0 && days <= IMMINENT_DAYS) {
      reminders.push({ code: "exam_imminent", priority: 100, data: { days } });
    } else if (days > IMMINENT_DAYS && days <= APPROACHING_DAYS) {
      reminders.push({ code: "exam_approaching", priority: 70, data: { days } });
    }
  }

  const endDate = usable(input.subscriptionEndDate);
  if (endDate && input.hasActiveSubscription) {
    const days = daysUntil(endDate, now);
    if (days >= 0 && days <= SUBSCRIPTION_WARNING_DAYS) {
      reminders.push({ code: "subscription_ending", priority: 80, data: { days } });
    }
  }

  // Someone who has never answered anything is not "inactive" - they have not
  // started. Those two need different things said to them.
  if (input.totalAttempts === 0 && !input.lastAnsweredAt) {
    reminders.push({ code: "no_attempts_yet", priority: 60, data: {} });
  } else {
    const last = usable(input.lastAnsweredAt);
    if (last) {
      const days = daysSince(last, now);
      if (days >= INACTIVE_DAYS) {
        reminders.push({ code: "inactive", priority: 50, data: { days } });
      }
    }
  }

  if (input.missedQuestionCount >= NOTEBOOK_THRESHOLD) {
    reminders.push({
      code: "notebook_waiting",
      priority: 30,
      data: { count: input.missedQuestionCount },
    });
  }

  return reminders.sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code));
}

/** The few worth showing on a dashboard. */
export function topReminders(input: ReminderInput, limit = MAX_REMINDERS): Reminder[] {
  return buildReminders(input).slice(0, Math.max(0, limit));
}

/**
 * The single reminder worth an email, or null when none is.
 *
 * An email is a heavier thing than a line on a dashboard they were already
 * looking at, so the bar is higher: only reminders about something that will
 * pass them by if they do not see it. A full notebook will still be there
 * next week; an exam in two days will not.
 */
export const EMAIL_WORTHY: ReminderCode[] = [
  "exam_imminent",
  "subscription_ending",
  "exam_approaching",
  "inactive",
];

export function emailReminder(input: ReminderInput): Reminder | null {
  const worthy = buildReminders(input).filter((r) => EMAIL_WORTHY.includes(r.code));
  return worthy[0] ?? null;
}
