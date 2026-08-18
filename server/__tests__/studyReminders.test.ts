/**
 * Which reminders a student gets.
 *
 * The risk this guards is not that a reminder is missing - it is that one
 * fires when it should not. A nudge about an exam that has already happened,
 * or an "you have not practised" to someone who practised yesterday, teaches
 * a student that the reminders are noise, and then the one that mattered
 * gets ignored too.
 */
import { describe, it, expect } from "vitest";
import {
  buildReminders,
  topReminders,
  emailReminder,
  daysUntil,
  daysSince,
  IMMINENT_DAYS,
  APPROACHING_DAYS,
  INACTIVE_DAYS,
  NOTEBOOK_THRESHOLD,
  SUBSCRIPTION_WARNING_DAYS,
  MAX_REMINDERS,
  type ReminderInput,
} from "@shared/studyReminders";

const NOW = new Date("2026-08-18T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

/** A student with nothing to say about them. */
const quiet = (over: Partial<ReminderInput> = {}): ReminderInput => ({
  now: NOW,
  examDate: null,
  subscriptionEndDate: null,
  hasActiveSubscription: true,
  lastAnsweredAt: daysAgo(1),
  missedQuestionCount: 0,
  totalAttempts: 3,
  ...over,
});

const codes = (input: ReminderInput) => buildReminders(input).map((r) => r.code);

describe("daysUntil / daysSince", () => {
  it("rounds a future date up", () => {
    // 30 hours away is "in two days" to a student, and rounding down would
    // tell them they have longer than they do.
    expect(daysUntil(new Date(NOW.getTime() + 30 * 60 * 60 * 1000), NOW)).toBe(2);
  });

  it("rounds elapsed time down", () => {
    expect(daysSince(new Date(NOW.getTime() - 30 * 60 * 60 * 1000), NOW)).toBe(1);
  });
});

describe("a student with nothing going on", () => {
  it("gets no reminders at all", () => {
    expect(buildReminders(quiet())).toEqual([]);
  });
});

describe("exam date", () => {
  it("leads with an exam that is nearly here", () => {
    const reminders = buildReminders(quiet({ examDate: inDays(2) }));
    expect(reminders[0].code).toBe("exam_imminent");
    expect(reminders[0].data.days).toBe(2);
  });

  it("mentions one that is approaching without alarming", () => {
    expect(codes(quiet({ examDate: inDays(IMMINENT_DAYS + 2) }))).toEqual(["exam_approaching"]);
  });

  it("says nothing about an exam far out", () => {
    expect(codes(quiet({ examDate: inDays(APPROACHING_DAYS + 1) }))).toEqual([]);
  });

  it("says nothing about an exam that has already happened", () => {
    // We do not know how it went. They may have passed and moved on, and
    // counting up from a date behind them is nagging, not reminding.
    expect(codes(quiet({ examDate: daysAgo(2) }))).toEqual([]);
  });

  it("says nothing when no date was ever set", () => {
    // "Not scheduled yet" is a supported answer, not a gap to fill with a nag.
    expect(codes(quiet({ examDate: null }))).toEqual([]);
  });

  it("counts today's exam as imminent rather than past", () => {
    expect(codes(quiet({ examDate: NOW }))).toEqual(["exam_imminent"]);
  });
});

describe("subscription", () => {
  it("warns before access ends", () => {
    const reminders = buildReminders(
      quiet({ subscriptionEndDate: inDays(SUBSCRIPTION_WARNING_DAYS - 1) }),
    );
    expect(reminders.map((r) => r.code)).toContain("subscription_ending");
  });

  it("says nothing to someone who has no active subscription", () => {
    // They already know; the app tells them everywhere else. Repeating it as
    // a reminder is just a sales pitch wearing a reminder's clothes.
    expect(
      codes(quiet({ subscriptionEndDate: inDays(1), hasActiveSubscription: false })),
    ).toEqual([]);
  });

  it("says nothing about a renewal far out", () => {
    expect(codes(quiet({ subscriptionEndDate: inDays(SUBSCRIPTION_WARNING_DAYS + 3) }))).toEqual([]);
  });
});

describe("activity", () => {
  it("mentions a gap in practice", () => {
    const reminders = buildReminders(quiet({ lastAnsweredAt: daysAgo(INACTIVE_DAYS) }));
    expect(reminders[0].code).toBe("inactive");
    expect(reminders[0].data.days).toBe(INACTIVE_DAYS);
  });

  it("leaves someone who practised yesterday alone", () => {
    expect(codes(quiet({ lastAnsweredAt: daysAgo(1) }))).toEqual([]);
  });

  it("tells a student who has never started something different", () => {
    // "You have not practised in 40 days" to someone who has never practised
    // at all is both wrong and discouraging.
    expect(codes(quiet({ totalAttempts: 0, lastAnsweredAt: null }))).toEqual(["no_attempts_yet"]);
  });

  it("does not call a beginner inactive as well", () => {
    const result = codes(quiet({ totalAttempts: 0, lastAnsweredAt: null }));
    expect(result).not.toContain("inactive");
  });
});

describe("notebook", () => {
  it("mentions a notebook worth a session", () => {
    const reminders = buildReminders(quiet({ missedQuestionCount: NOTEBOOK_THRESHOLD }));
    expect(reminders[0].code).toBe("notebook_waiting");
    expect(reminders[0].data.count).toBe(NOTEBOOK_THRESHOLD);
  });

  it("stays quiet about a handful of missed questions", () => {
    expect(codes(quiet({ missedQuestionCount: NOTEBOOK_THRESHOLD - 1 }))).toEqual([]);
  });
});

describe("ordering and capping", () => {
  const busy = quiet({
    examDate: inDays(2),
    subscriptionEndDate: inDays(1),
    lastAnsweredAt: daysAgo(10),
    missedQuestionCount: 40,
  });

  it("puts the most time-bound first", () => {
    expect(codes(busy)).toEqual([
      "exam_imminent",
      "subscription_ending",
      "inactive",
      "notebook_waiting",
    ]);
  });

  it("shows only a few", () => {
    expect(topReminders(busy)).toHaveLength(MAX_REMINDERS);
    expect(topReminders(busy)[0].code).toBe("exam_imminent");
  });

  it("honours an explicit limit", () => {
    expect(topReminders(busy, 1).map((r) => r.code)).toEqual(["exam_imminent"]);
    expect(topReminders(busy, 0)).toEqual([]);
  });

  it("is deterministic for the same input", () => {
    expect(codes(busy)).toEqual(codes(busy));
  });
});

describe("emailReminder", () => {
  it("sends the most urgent thing that will pass them by", () => {
    expect(emailReminder(quiet({ examDate: inDays(2) }))?.code).toBe("exam_imminent");
  });

  it("does not email about a full notebook", () => {
    // It will still be there next week. An email is heavier than a line on a
    // dashboard they were already looking at.
    expect(emailReminder(quiet({ missedQuestionCount: 50 }))).toBeNull();
  });

  it("does not email a student who has simply not started", () => {
    expect(emailReminder(quiet({ totalAttempts: 0, lastAnsweredAt: null }))).toBeNull();
  });

  it("sends nothing when there is nothing to say", () => {
    expect(emailReminder(quiet())).toBeNull();
  });

  it("sends one thing, not a digest", () => {
    const result = emailReminder(
      quiet({ examDate: inDays(1), subscriptionEndDate: inDays(1), lastAnsweredAt: daysAgo(20) }),
    );
    expect(result?.code).toBe("exam_imminent");
  });
});

describe("bad data", () => {
  it("does not throw on an unparseable date", () => {
    const broken = quiet({ examDate: new Date("not a date") });
    expect(() => buildReminders(broken)).not.toThrow();
    expect(codes(broken)).toEqual([]);
  });
});
