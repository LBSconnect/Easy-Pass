/**
 * Who is using the app right now.
 *
 * WHAT "NOW" HONESTLY MEANS
 *
 * There is no live connection to a student's browser - no websocket, no
 * heartbeat - so nobody can be observed leaving. What is actually known is
 * when each student last made a request, and "online" is defined from that:
 * anyone whose last request was within ONLINE_WINDOW_MS.
 *
 * That is a real measurement rather than a guess, but it is not the same as
 * "currently has the tab open", and the interface must not imply it is. A
 * student who closes their laptop still counts for the rest of the window,
 * and one reading a question for six minutes without clicking drops out of
 * it. The window is chosen to make the second case rare rather than to make
 * the number flattering.
 *
 * WHY THE SESSION TABLE CANNOT ANSWER THIS
 *
 * Sessions are stored in Postgres, but express-session runs with
 * `resave: false`, so a row is only written when the session data changes.
 * A student can browse for an hour without their session row being touched
 * once. Reading `expire` would report people as offline while they are
 * demonstrably using the app.
 *
 * WHY THE WRITE IS THROTTLED
 *
 * Recording last-seen on every request would mean an UPDATE per request per
 * student, which is a lot of write traffic to answer one number on one admin
 * screen. Once per TOUCH_THROTTLE_MS per student is enough to keep the count
 * accurate to within the throttle, at a fraction of the cost.
 */

/** How recently a student must have made a request to count as online. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Shortest gap between two last-seen writes for the same student.
 *
 * Well under the window, so a continuously active student is never within a
 * write of dropping out of the count.
 */
export const TOUCH_THROTTLE_MS = 60 * 1000;

/**
 * Whether a student counts as online.
 *
 * A missing timestamp is not online - it means they have not made a request
 * since the column existed, which is the honest reading of "no evidence".
 */
export function isOnline(
  lastSeenAt: Date | string | null | undefined,
  now: Date,
  windowMs = ONLINE_WINDOW_MS,
): boolean {
  if (!lastSeenAt) return false;
  const seen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seen)) return false;

  const age = now.getTime() - seen;
  // A timestamp in the future is a clock disagreement between the app and the
  // database, not a student from tomorrow. Treated as "just now" rather than
  // discarded, because the alternative is dropping a genuinely active student.
  if (age < 0) return true;
  return age < windowMs;
}

/**
 * Whether this request should write a new last-seen timestamp.
 *
 * @param lastTouched when this student's timestamp was last written, or null
 *   if it never has been in this process's memory.
 */
export function shouldTouch(
  lastTouched: number | null | undefined,
  now: number,
  throttleMs = TOUCH_THROTTLE_MS,
): boolean {
  if (lastTouched === null || lastTouched === undefined) return true;
  // A clock that has gone backwards would otherwise suppress writes until it
  // caught up, silently emptying the count.
  if (now < lastTouched) return true;
  return now - lastTouched >= throttleMs;
}
