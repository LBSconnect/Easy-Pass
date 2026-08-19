/**
 * Recording that a student is active.
 *
 * This runs on every authenticated request in the app, so the properties that
 * matter are about restraint: it must not write on every request, must not
 * make the student wait, and must never be the reason a request fails. A
 * presence tick is the least important write in the system and should behave
 * like it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const touchLastSeen = vi.fn();
vi.mock("../storage", () => ({ storage: { touchLastSeen } }));

const { recordPresence, resetPresenceCache, presenceCacheSize, trackPresence } =
  await import("../presence");
const { TOUCH_THROTTLE_MS } = await import("@shared/onlinePresence");

const NOW = new Date("2026-08-19T15:00:00Z").getTime();

beforeEach(() => {
  vi.clearAllMocks();
  resetPresenceCache();
  touchLastSeen.mockResolvedValue(undefined);
});

describe("recordPresence", () => {
  it("records a student the first time it sees them", () => {
    expect(recordPresence("u1", NOW)).toBe(true);
    expect(touchLastSeen).toHaveBeenCalledWith("u1", new Date(NOW));
  });

  it("does not write again on the next request", () => {
    // Otherwise this is an UPDATE per request, for one number on one screen.
    recordPresence("u1", NOW);
    expect(recordPresence("u1", NOW + 1000)).toBe(false);
    expect(touchLastSeen).toHaveBeenCalledTimes(1);
  });

  it("writes again once the throttle has passed", () => {
    recordPresence("u1", NOW);
    expect(recordPresence("u1", NOW + TOUCH_THROTTLE_MS)).toBe(true);
    expect(touchLastSeen).toHaveBeenCalledTimes(2);
  });

  it("tracks students independently", () => {
    recordPresence("u1", NOW);
    expect(recordPresence("u2", NOW)).toBe(true);
    expect(touchLastSeen).toHaveBeenCalledTimes(2);
  });

  it("ignores a missing user rather than writing a blank row", () => {
    expect(recordPresence("", NOW)).toBe(false);
    expect(touchLastSeen).not.toHaveBeenCalled();
  });

  it("does not make the caller wait on the write", () => {
    // Never awaited: a student's request must not block on bookkeeping.
    let settle: (() => void) | null = null;
    touchLastSeen.mockReturnValue(new Promise<void>((r) => { settle = () => r(); }));

    expect(recordPresence("u1", NOW)).toBe(true);
    expect(settle).not.toBeNull();
    settle!();
  });

  it("survives a failing database without throwing", async () => {
    touchLastSeen.mockRejectedValue(new Error("connection lost"));

    expect(() => recordPresence("u1", NOW)).not.toThrow();
    // Let the rejection settle so an unhandled rejection would surface here.
    await new Promise((r) => setTimeout(r, 0));
  });

  it("retries after a failed write rather than staying silent for a minute", async () => {
    touchLastSeen.mockRejectedValueOnce(new Error("blip"));
    recordPresence("u1", NOW);
    await new Promise((r) => setTimeout(r, 0));

    // The failed attempt is forgotten, so the next request tries again
    // instead of the student vanishing from the count until the throttle
    // expires.
    expect(recordPresence("u1", NOW + 1000)).toBe(true);
  });

  it("forgets students it no longer needs to remember", () => {
    for (let i = 0; i < 50; i++) recordPresence(`u${i}`, NOW);
    expect(presenceCacheSize()).toBe(50);

    // Long after the throttle, those entries can only cause a write anyway,
    // so holding them serves nothing.
    recordPresence("later", NOW + TOUCH_THROTTLE_MS * 2);
    expect(presenceCacheSize()).toBeLessThan(50);
  });
});

describe("trackPresence middleware", () => {
  it("records a signed-in student and continues", () => {
    const next = vi.fn();
    trackPresence({ user: { claims: { sub: "u1" } } } as any, {} as any, next);

    expect(touchLastSeen).toHaveBeenCalledWith("u1", expect.any(Date));
    expect(next).toHaveBeenCalled();
  });

  it("does nothing for signed-out traffic", () => {
    const next = vi.fn();
    trackPresence({} as any, {} as any, next);

    expect(touchLastSeen).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("continues even when presence throws", () => {
    // A request must never fail because of this.
    const next = vi.fn();
    const hostile = { get user() { throw new Error("boom"); } };

    expect(() => trackPresence(hostile as any, {} as any, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});
