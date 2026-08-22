/**
 * The outreach campaign state machine, as pure functions.
 *
 * Everything here answers one question: given a campaign row and a clock,
 * what - if anything - is the engine allowed to do next? No I/O, no database,
 * no provider. The server module (server/outreach/) supplies the rows and the
 * transport; this file supplies the rules, which is what makes the rules
 * testable without either.
 *
 * THE SEQUENCE, IN FULL
 *
 *   queued ──▶ contacted ──▶ follow_up_1_sent ──▶ follow_up_2_sent ──▶ completed
 *                 day 0          +4 business days     +9 business days    (closed)
 *
 * and that is all of it. Two follow-ups, then silence. Every reply, bounce,
 * unsubscribe, complaint, manual pause or activation exits the sequence
 * immediately and permanently - the exit states below are terminal for
 * automation, and re-entry requires a person.
 *
 * "Due" is derived, never stored: a follow-up is due when `nextActionAt` has
 * passed, so there is no clock-driven state write that could race a reply.
 */

export const CAMPAIGN_STATES = [
  // Active automation states - the only states the engine may send from.
  "queued", //            eligible, waiting for capacity and a sending window
  "contacted", //         initial email sent, waiting (step 1 done)
  "follow_up_1_sent", //  first follow-up sent, waiting (step 2 done)
  "follow_up_2_sent", //  final follow-up sent; nothing left to send (step 3 done)
  // Closed without a reply.
  "completed",
  // Reply exits. All terminal for automation.
  "interested",
  "maybe_later",
  "not_interested",
  "wrong_contact",
  "needs_human_review",
  // Delivery exits. Terminal, and the address is suppressed separately.
  "unsubscribed",
  "bounced",
  // A person said stop. Terminal until a person says otherwise.
  "stopped",
] as const;
export type CampaignState = (typeof CAMPAIGN_STATES)[number];

/** States from which the engine may still send an email. */
export const SENDABLE_STATES: readonly CampaignState[] = [
  "queued",
  "contacted",
  "follow_up_1_sent",
];

/** States meaning "a reply arrived and a person may need to look". */
export const REPLY_STATES: readonly CampaignState[] = [
  "interested",
  "maybe_later",
  "not_interested",
  "wrong_contact",
  "needs_human_review",
];

export const TERMINAL_STATES: readonly CampaignState[] = [
  "completed",
  ...REPLY_STATES,
  "unsubscribed",
  "bounced",
  "stopped",
];

/** Sequence steps, matching the message log. */
export type SequenceStep = "initial" | "follow_up_1" | "follow_up_2";

/** Business days between the initial send and each follow-up. */
export const FOLLOW_UP_1_BUSINESS_DAYS = 4;
export const FOLLOW_UP_2_BUSINESS_DAYS = 9;
/** Business days after the final follow-up before the campaign closes. */
export const COMPLETION_BUSINESS_DAYS = 5;

/**
 * Every prospect in this CRM is a Texas organization, so "recipient-local
 * business hours" has one honest answer until the data says otherwise.
 */
export const OUTREACH_TIME_ZONE = "America/Chicago";

export interface SendingWindowConfig {
  /** Inclusive first local hour emails may go out (0-23). */
  startHour: number;
  /** Exclusive local hour after which they may not (0-23). */
  endHour: number;
  timeZone: string;
}

export const DEFAULT_SENDING_WINDOW: SendingWindowConfig = {
  startHour: 9,
  endHour: 17,
  timeZone: OUTREACH_TIME_ZONE,
};

/** New-prospect sends per business day. Follow-ups that are due ride on top. */
export const DEFAULT_DAILY_NEW_PROSPECT_LIMIT = 15;
export const MAX_DAILY_NEW_PROSPECT_LIMIT = 20;

/** Local calendar facts for an instant, without a timezone library. */
function localParts(at: Date, timeZone: string): { weekday: number; hour: number; dateKey: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // Intl reports hour 24 for midnight in some environments; normalise to 0.
  const hour = Number(get("hour")) % 24;
  return {
    weekday: weekdays.indexOf(get("weekday")),
    hour,
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export function isBusinessDay(at: Date, timeZone: string = OUTREACH_TIME_ZONE): boolean {
  const { weekday } = localParts(at, timeZone);
  return weekday >= 1 && weekday <= 5;
}

/**
 * May an email leave right now? Weekdays, inside working hours, recipient's
 * clock. A cron that fires overnight simply finds this false and sends
 * nothing - the schedule of the caller must never leak into inboxes.
 */
export function isWithinSendingWindow(at: Date, window: SendingWindowConfig = DEFAULT_SENDING_WINDOW): boolean {
  if (!isBusinessDay(at, window.timeZone)) return false;
  const { hour } = localParts(at, window.timeZone);
  return hour >= window.startHour && hour < window.endHour;
}

/** The local calendar date, used to count "sends today" against the limit. */
export function localDateKey(at: Date, timeZone: string = OUTREACH_TIME_ZONE): string {
  return localParts(at, timeZone).dateKey;
}

/**
 * `from` plus N business days, landing at the same wall-clock time.
 *
 * Counted in the recipient's calendar: Friday + 1 business day is Monday.
 * Deliberately simple - no holiday table - because a follow-up landing on
 * July 4th is unfortunate, not harmful, and a wrong holiday table is both.
 */
export function addBusinessDays(from: Date, days: number, timeZone: string = OUTREACH_TIME_ZONE): Date {
  const result = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setTime(result.getTime() + 24 * 60 * 60 * 1000);
    if (isBusinessDay(result, timeZone)) remaining -= 1;
  }
  return result;
}

/** The campaign fields the rules need. A projection of the DB row. */
export interface CampaignSnapshot {
  state: CampaignState;
  /** True while a person has the campaign on hold. Blocks every send. */
  paused: boolean;
  initialSentAt: Date | null;
  nextActionAt: Date | null;
}

export type DueAction =
  | { type: "send"; step: SequenceStep }
  | { type: "complete" }
  | { type: "wait" }
  | { type: "none" };

/**
 * What does this campaign need right now?
 *
 * The single decision function the engine consults per campaign per run.
 * Pause and terminal states answer "none" before any date is even read, which
 * is what makes the stop conditions structural rather than a caller's habit.
 */
export function dueAction(campaign: CampaignSnapshot, now: Date): DueAction {
  if (campaign.paused) return { type: "none" };

  switch (campaign.state) {
    case "queued":
      return { type: "send", step: "initial" };
    case "contacted":
    case "follow_up_1_sent": {
      if (!campaign.nextActionAt) return { type: "wait" };
      if (now.getTime() < campaign.nextActionAt.getTime()) return { type: "wait" };
      return {
        type: "send",
        step: campaign.state === "contacted" ? "follow_up_1" : "follow_up_2",
      };
    }
    case "follow_up_2_sent": {
      if (!campaign.nextActionAt) return { type: "wait" };
      if (now.getTime() < campaign.nextActionAt.getTime()) return { type: "wait" };
      return { type: "complete" };
    }
    default:
      // Every terminal state. Nothing is ever due again.
      return { type: "none" };
  }
}

/** The state and timer that follow a successful send of `step`. */
export function afterSend(
  step: SequenceStep,
  sentAt: Date,
  initialSentAt: Date | null,
  timeZone: string = OUTREACH_TIME_ZONE,
): { state: CampaignState; nextActionAt: Date } {
  const anchor = initialSentAt ?? sentAt;
  switch (step) {
    case "initial":
      return { state: "contacted", nextActionAt: addBusinessDays(sentAt, FOLLOW_UP_1_BUSINESS_DAYS, timeZone) };
    case "follow_up_1":
      return { state: "follow_up_1_sent", nextActionAt: addBusinessDays(anchor, FOLLOW_UP_2_BUSINESS_DAYS, timeZone) };
    case "follow_up_2":
      return { state: "follow_up_2_sent", nextActionAt: addBusinessDays(sentAt, COMPLETION_BUSINESS_DAYS, timeZone) };
  }
}

/** Reply classifications, in the order the classifier checks them. */
export const REPLY_CLASSIFICATIONS = [
  "unsubscribe",
  "wrong_contact",
  "not_interested",
  "maybe_later",
  "interested",
  "needs_human_review",
] as const;
export type ReplyClassification = (typeof REPLY_CLASSIFICATIONS)[number];

/** The campaign state each classification lands the prospect in. */
export const CLASSIFICATION_STATE: Record<ReplyClassification, CampaignState> = {
  unsubscribe: "unsubscribed",
  wrong_contact: "wrong_contact",
  not_interested: "not_interested",
  maybe_later: "maybe_later",
  interested: "interested",
  needs_human_review: "needs_human_review",
};

/**
 * Classify a reply, conservatively and deterministically.
 *
 * The rules are ordered so the protective classifications win: an email
 * containing both "interested" and "unsubscribe" is an unsubscribe. Anything
 * the patterns cannot claim with confidence lands in needs_human_review,
 * where the only automated consequence is that automation stops - the failure
 * mode of an unmatched reply is a person reading an email, never a wrong
 * automatic answer. No classification, here or anywhere, activates a
 * partnership.
 */
export function classifyReply(text: string): ReplyClassification {
  const t = text.toLowerCase().replace(/\s+/g, " ");

  if (/unsubscribe|remove (me|us) from|take (me|us) off|stop (emailing|contacting|sending)|do not (email|contact) (me|us)/.test(t)) {
    return "unsubscribe";
  }
  if (/wrong (person|contact|department)|not the right (person|contact)|no longer (work|works|with|at|here)|left the (company|firm|agency|school)|doesn'?t work here|has (left|retired)/.test(t)) {
    return "wrong_contact";
  }
  if (/not interested|no thank(s| you)|we('| a)re not (looking|interested)|please don'?t|not a fit for us|we already (have|use)/.test(t)) {
    return "not_interested";
  }
  if (/not right now|maybe (later|next)|next (quarter|semester|month|year)|circle back|check back|reach (back )?out (in|after|next)|busy season|after (the )?(new year|summer|licensing)/.test(t)) {
    return "maybe_later";
  }
  // Out-of-office and other automatic replies: a person did not read the
  // email, so nothing may be concluded from it - but sends still stop,
  // because a mailbox that answers is a mailbox someone will eventually read.
  if (/out of (the )?office|automatic reply|auto-?reply|auto-?response|on (vacation|leave|pto)|currently away/.test(t)) {
    return "needs_human_review";
  }
  if (/\b(yes|interested|tell me more|more information|more details|send (me )?(the )?(details|info|pilot)|sounds (good|great|interesting)|would love to|let'?s (talk|try|do)|happy to (try|test|chat)|sign us up|how (do|does|would) (we|this|it) (start|work))\b/.test(t)) {
    return "interested";
  }
  return "needs_human_review";
}

/**
 * Project the campaign machine onto the CRM's human vocabulary
 * (shared/partners.ts OUTREACH_STATUSES), so the admin table keeps meaning
 * what it always meant. Additive statuses cover the genuinely new outcomes;
 * nothing existing is renamed.
 */
export function crmStatusFor(state: CampaignState): string {
  switch (state) {
    case "queued":
      return "ready_to_contact";
    case "contacted":
      return "contacted";
    case "follow_up_1_sent":
    case "follow_up_2_sent":
      return "follow_up";
    case "completed":
      return "contacted";
    case "interested":
      return "interested";
    case "maybe_later":
      return "maybe_later";
    case "not_interested":
      return "not_interested";
    case "wrong_contact":
      return "researching";
    case "needs_human_review":
      return "needs_review";
    case "unsubscribed":
      return "unsubscribed";
    case "bounced":
      return "bounced";
    case "stopped":
      return "contacted";
  }
}

/** Suppression reasons. Suppression rows are never deleted by automation. */
export const SUPPRESSION_REASONS = [
  "unsubscribed",
  "hard_bounce",
  "spam_complaint",
  "manual",
] as const;
export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];
