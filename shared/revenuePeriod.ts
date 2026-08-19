/**
 * Which month a payment counts towards.
 *
 * WHY THIS IS NOT `new Date().getMonth()`
 *
 * The server runs in UTC. The business is in Texas. Those disagree about which
 * month a payment belongs to for five or six hours every night: a subscription
 * that renews at 8pm on 31 January in Fort Worth is already 1 February in UTC,
 * so a naive month boundary would push it into the wrong month - and it would
 * do it silently, moving revenue between two figures that both look plausible.
 *
 * The month therefore runs on America/Chicago, which is what the person reading
 * the admin dashboard means by "this month". The same reasoning already governs
 * the student greeting in client/src/components/dashboard/welcome-card.tsx.
 *
 * WHY THE OFFSET IS COMPUTED TWICE
 *
 * The UTC instant of local midnight depends on whether daylight saving is in
 * effect *at that instant*, which is not necessarily what is in effect today.
 * Ask on 30 March what midnight on 1 March was, and today's CDT offset gives an
 * answer an hour out. So the offset is taken once at the caller's "now" to get a
 * first guess, then again at that guess to settle on the offset actually in
 * force on the first of the month.
 *
 * NO LIBRARY
 *
 * `Intl` ships with Node's full ICU and knows the US daylight-saving rules,
 * including the 2007 change and any future one. A hand-rolled `-6 hours` would
 * be wrong for half the year, and a date library would be a dependency for one
 * boundary.
 */

/** The timezone the business banks in. */
export const BILLING_TIME_ZONE = "America/Chicago";

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function localParts(at: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const read = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    // Some ICU versions render midnight as hour 24 under hour12:false.
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
}

/** How far the zone is from UTC at a given instant, in milliseconds. */
function offsetMsAt(at: Date, timeZone: string): number {
  const p = localParts(at, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Second precision is all `Intl` gives; the instant's own milliseconds are
  // subtracted back out so the offset is a whole-second quantity.
  return asIfUtc - (at.getTime() - at.getMilliseconds());
}

/**
 * The instant the current local month began.
 *
 * Payments at or after this instant are this month's; earlier ones are not.
 */
export function startOfMonth(now: Date, timeZone = BILLING_TIME_ZONE): Date {
  const here = localParts(now, timeZone);
  const midnightAsIfUtc = Date.UTC(here.year, here.month - 1, 1, 0, 0, 0);

  const guess = new Date(midnightAsIfUtc - offsetMsAt(now, timeZone));
  // Settle on the offset in force on the first of the month, which is not
  // necessarily the one in force today.
  return new Date(midnightAsIfUtc - offsetMsAt(guess, timeZone));
}

/**
 * How the period should be described wherever the figure appears.
 *
 * The label travels with the number so a reader is never left to assume the
 * total is all-time. "August 2026", not "this month", because a screenshot
 * pasted into an email outlives the month it was taken in.
 *
 * Formatted in the billing zone, so an instant that is local midnight on the
 * first names that month rather than the previous one.
 */
export function monthLabel(
  at: Date,
  locale = "en-US",
  timeZone = BILLING_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(at);
}

/**
 * The line under the revenue figure saying what it covers.
 *
 * Kept here rather than in the admin page so the wording is testable and the
 * month is derived from the period start the server sent, not from the
 * browser's clock - a dashboard open at 11pm in Texas on the 31st would
 * otherwise print next month's name over this month's number.
 *
 * Falls back to "this month" rather than to nothing: a bare figure with no
 * period reads as all-time, which is the misreading this whole change exists
 * to prevent.
 */
export function revenuePeriodNote(
  periodStartIso: string | null | undefined,
  language: "en" | "es",
): string {
  const es = language === "es";
  const start = periodStartIso ? new Date(periodStartIso) : null;

  if (!start || Number.isNaN(start.getTime())) {
    return es ? "Suscripciones de este mes" : "This month's subscriptions";
  }

  const month = monthLabel(start, es ? "es-US" : "en-US");
  return es ? `Suscripciones de ${month}` : `${month} subscriptions`;
}
