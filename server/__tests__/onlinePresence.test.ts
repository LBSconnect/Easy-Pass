/**
 * The "online now" count.
 *
 * The risk here is a number that looks authoritative and is not. It appears
 * beside Total Users, which is exact, so it will be read as exact too. These
 * tests pin the two things that keep it honest: the window it actually
 * measures, and the fact that absence of evidence reads as offline rather
 * than as online.
 */
import { describe, it, expect } from "vitest";
import {
  isOnline,
  shouldTouch,
  ONLINE_WINDOW_MS,
  TOUCH_THROTTLE_MS,
} from "@shared/onlinePresence";

const NOW = new Date("2026-08-19T15:00:00Z");
const agoMs = (ms: number) => new Date(NOW.getTime() - ms);

describe("isOnline", () => {
  it("counts a student who just made a request", () => {
    expect(isOnline(agoMs(1000), NOW)).toBe(true);
  });

  it("counts one who acted within the window", () => {
    expect(isOnline(agoMs(ONLINE_WINDOW_MS - 1000), NOW)).toBe(true);
  });

  it("stops counting one who has gone quiet past it", () => {
    expect(isOnline(agoMs(ONLINE_WINDOW_MS + 1), NOW)).toBe(false);
  });

  it("is exclusive at the boundary, so the window is what it says", () => {
    expect(isOnline(agoMs(ONLINE_WINDOW_MS), NOW)).toBe(false);
  });

  it("treats never-seen as offline rather than online", () => {
    // Every student predates this column. Reading a null as "online" would
    // have reported the entire user base as active the moment it shipped.
    expect(isOnline(null, NOW)).toBe(false);
    expect(isOnline(undefined, NOW)).toBe(false);
  });

  it("treats an unreadable timestamp as offline", () => {
    expect(isOnline("not a date", NOW)).toBe(false);
  });

  it("accepts a timestamp string as well as a Date", () => {
    // Postgres hands back strings through some drivers.
    expect(isOnline(agoMs(1000).toISOString(), NOW)).toBe(true);
  });

  it("keeps a student whose clock runs ahead", () => {
    // A future timestamp is the app and the database disagreeing, not a
    // student from tomorrow. Dropping them would undercount real activity.
    expect(isOnline(new Date(NOW.getTime() + 30_000), NOW)).toBe(true);
  });

  it("honours an explicit window", () => {
    expect(isOnline(agoMs(90_000), NOW, 60_000)).toBe(false);
    expect(isOnline(agoMs(90_000), NOW, 120_000)).toBe(true);
  });
});

describe("shouldTouch", () => {
  const now = NOW.getTime();

  it("writes the first time a student is seen", () => {
    expect(shouldTouch(null, now)).toBe(true);
    expect(shouldTouch(undefined, now)).toBe(true);
  });

  it("does not write again immediately", () => {
    // Otherwise this is an UPDATE on every request, to answer one number on
    // one admin screen.
    expect(shouldTouch(now - 1000, now)).toBe(false);
  });

  it("writes again once the throttle has passed", () => {
    expect(shouldTouch(now - TOUCH_THROTTLE_MS, now)).toBe(true);
  });

  it("writes often enough that an active student never drops out", () => {
    // The guarantee the count depends on: someone still clicking is always
    // re-recorded well before their last write ages out of the window.
    expect(TOUCH_THROTTLE_MS).toBeLessThan(ONLINE_WINDOW_MS);
  });

  it("recovers if the clock goes backwards", () => {
    // Suppressing writes until a rewound clock caught up would quietly empty
    // the count.
    expect(shouldTouch(now + 60_000, now)).toBe(true);
  });

  it("honours an explicit throttle", () => {
    expect(shouldTouch(now - 5000, now, 10_000)).toBe(false);
    expect(shouldTouch(now - 5000, now, 1000)).toBe(true);
  });
});
