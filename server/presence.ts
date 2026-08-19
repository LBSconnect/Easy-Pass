/**
 * Recording that a student is using the app.
 *
 * Runs on authenticated API requests and writes `user_profiles.last_seen_at`,
 * which is what the admin "online now" figure counts. See
 * shared/onlinePresence.ts for what that number honestly means.
 *
 * THREE THINGS THIS MUST NOT DO
 *
 * Slow a request down: the write is fired without being awaited, so a student
 * never waits on bookkeeping for an admin screen.
 *
 * Break a request: a failure here is swallowed. Losing a presence tick is not
 * worth failing a student's exam submission over, and it is not worth a line
 * in the log every time either - a database blip would fill the log with
 * noise about the least important write in the system.
 *
 * Flood the database: without throttling this would be an UPDATE on every
 * request from every student. The last write time per student is held in
 * memory, so a busy student costs one write a minute.
 *
 * THE IN-MEMORY MAP
 *
 * It is a cache, not state. If the process restarts, or a second instance
 * starts serving, the worst case is one extra write per student per minute -
 * so nothing depends on it being shared or durable. It is bounded so a long
 * uptime cannot grow it without limit.
 */

import type { RequestHandler } from "express";
import { storage } from "./storage";
import { shouldTouch, TOUCH_THROTTLE_MS } from "@shared/onlinePresence";

/**
 * Most students tracked in memory at once.
 *
 * Reached only with more concurrent students than this app has ever had; the
 * cap exists so a long-running process cannot accumulate entries for every
 * account that ever signed in.
 */
const MAX_TRACKED = 5000;

const lastTouched = new Map<string, number>();

/** When stale entries were last swept, so the sweep is occasional not per-call. */
let lastSweep = 0;

/** Exposed for tests; not part of how the middleware is used. */
export function resetPresenceCache(): void {
  lastTouched.clear();
  lastSweep = 0;
}

export function presenceCacheSize(): number {
  return lastTouched.size;
}

/**
 * Drop entries that are older than the throttle.
 *
 * They can only cause an immediate write next time anyway, so forgetting them
 * costs nothing and keeps the map from growing with every student who ever
 * signed in.
 */
function evictStale(now: number): void {
  for (const [userId, at] of Array.from(lastTouched.entries())) {
    if (now - at >= TOUCH_THROTTLE_MS) lastTouched.delete(userId);
  }
}

/**
 * Note that this student is active, at most once per throttle window.
 *
 * @returns whether a write was started, so tests can assert the throttling
 *   rather than inspect the database.
 */
export function recordPresence(userId: string, now = Date.now()): boolean {
  if (!userId) return false;

  // Sweep occasionally rather than only at the cap. An entry older than the
  // throttle can do nothing except allow a write next time, so keeping it
  // serves no purpose - and without this the map would grow to every student
  // seen since the process started, rather than staying proportional to how
  // many are actually here at once.
  if (now - lastSweep >= TOUCH_THROTTLE_MS) {
    evictStale(now);
    lastSweep = now;
  }

  if (!shouldTouch(lastTouched.get(userId) ?? null, now)) return false;

  if (lastTouched.size >= MAX_TRACKED) {
    evictStale(now);
    // Still full of genuinely recent entries: skip the bookkeeping rather
    // than grow without bound. The student is active either way, and one of
    // the 5000 already counted almost certainly covers this moment.
    if (lastTouched.size >= MAX_TRACKED) return false;
  }

  lastTouched.set(userId, now);

  // Deliberately not awaited: the student's request must not wait on this.
  void storage.touchLastSeen(userId, new Date(now)).catch(() => {
    // Swallowed on purpose. Losing a presence tick is not worth failing a
    // request, and logging every failure would bury real errors.
    lastTouched.delete(userId);
  });

  return true;
}

/**
 * Express middleware form.
 *
 * Reads the user off the request if authentication has already put one there,
 * and does nothing at all for signed-out traffic.
 */
export const trackPresence: RequestHandler = (req: any, _res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (userId) recordPresence(userId);
  } catch {
    // Presence must never be the reason a request fails.
  }
  next();
};
