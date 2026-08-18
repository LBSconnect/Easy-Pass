/**
 * The words a reminder is said in.
 *
 * These tests are mostly about what the copy must NOT do. The wording is a
 * product promise as much as the numbers are: this app tells students what is
 * true and declines to guess at outcomes, and a reminder that says "only 2
 * days left to pass!" quietly breaks that in a place nobody thinks to check.
 */
import { describe, it, expect } from "vitest";
import { reminderCopy, type ReminderLanguage } from "@shared/reminderCopy";
import { buildReminders, type Reminder, type ReminderCode } from "@shared/studyReminders";

const NOW = new Date("2026-08-18T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const ALL_CODES: ReminderCode[] = [
  "exam_imminent",
  "exam_approaching",
  "subscription_ending",
  "inactive",
  "notebook_waiting",
  "no_attempts_yet",
];

/** One reminder of each kind, produced by the real rules rather than by hand. */
const samples: Reminder[] = [
  ...buildReminders({
    now: NOW,
    examDate: new Date(NOW.getTime() + 2 * DAY),
    subscriptionEndDate: new Date(NOW.getTime() + 1 * DAY),
    hasActiveSubscription: true,
    lastAnsweredAt: new Date(NOW.getTime() - 10 * DAY),
    missedQuestionCount: 40,
    totalAttempts: 4,
  }),
  ...buildReminders({
    now: NOW,
    examDate: new Date(NOW.getTime() + 10 * DAY),
    subscriptionEndDate: null,
    hasActiveSubscription: true,
    lastAnsweredAt: null,
    missedQuestionCount: 0,
    totalAttempts: 0,
  }),
];

const LANGS: ReminderLanguage[] = ["en", "es"];

describe("every reminder can be said in both languages", () => {
  it("covers every code the rules can produce", () => {
    const covered = new Set(samples.map((r) => r.code));
    for (const code of ALL_CODES) expect(covered.has(code)).toBe(true);
  });

  for (const lang of LANGS) {
    it(`produces a title, an action and an in-app link (${lang})`, () => {
      for (const reminder of samples) {
        const copy = reminderCopy(reminder, lang);
        expect(copy.title.trim().length).toBeGreaterThan(0);
        expect(copy.action.trim().length).toBeGreaterThan(0);
        // The link is part of the sentence. An English button on the end of
        // a Spanish reminder is worse than either language alone.
        expect(copy.linkLabel.trim().length).toBeGreaterThan(0);
        // Relative, so a reminder can never point a student off the site.
        expect(copy.href.startsWith("/")).toBe(true);
        expect(copy.href.startsWith("//")).toBe(false);
      }
    });
  }
});

describe("what the copy must not say", () => {
  const everything = LANGS.flatMap((lang) =>
    samples.map((r) => {
      const copy = reminderCopy(r, lang);
      return `${copy.title} ${copy.action}`.toLowerCase();
    }),
  );

  it("never predicts or promises an exam outcome", () => {
    // We have no validated data linking anything we measure to a real pass or
    // fail, so a reminder must not imply one.
    for (const text of everything) {
      expect(text).not.toMatch(/guarantee|guaranteed|garantiz/);
      expect(text).not.toMatch(/you will pass|vas a aprobar|aprobaras/);
      expect(text).not.toMatch(/\bpass rate\b|probabilidad de aprobar/);
    }
  });

  it("never manufactures urgency out of a plain number", () => {
    for (const text of everything) {
      expect(text).not.toMatch(/only \d|hurry|last chance|don't miss|urgent/);
      expect(text).not.toMatch(/solo \d|apurate|ultima oportunidad/);
    }
  });

  it("does not shout", () => {
    for (const text of everything) expect(text).not.toContain("!");
  });
});

describe("the numbers in the sentence", () => {
  it("uses the real figure rather than a rounded one", () => {
    const reminder = buildReminders({
      now: NOW,
      examDate: null,
      subscriptionEndDate: null,
      hasActiveSubscription: true,
      lastAnsweredAt: new Date(NOW.getTime() - 1 * DAY),
      missedQuestionCount: 37,
      totalAttempts: 2,
    })[0];

    expect(reminderCopy(reminder, "en").title).toContain("37");
  });

  it("says today rather than in 0 days", () => {
    const [reminder] = buildReminders({
      now: NOW,
      examDate: NOW,
      subscriptionEndDate: null,
      hasActiveSubscription: true,
      lastAnsweredAt: new Date(NOW.getTime() - DAY),
      missedQuestionCount: 0,
      totalAttempts: 1,
    });

    expect(reminderCopy(reminder, "en").title).toBe("Your exam is today.");
    expect(reminderCopy(reminder, "es").title).toBe("Tu examen es hoy.");
  });

  it("gets singular and plural right", () => {
    const one = buildReminders({
      now: NOW,
      examDate: new Date(NOW.getTime() + DAY),
      subscriptionEndDate: null,
      hasActiveSubscription: true,
      lastAnsweredAt: new Date(NOW.getTime() - DAY),
      missedQuestionCount: 0,
      totalAttempts: 1,
    })[0];

    expect(reminderCopy(one, "en").title).toBe("Your exam is in 1 day.");
    expect(reminderCopy(one, "es").title).toBe("Tu examen es en 1 día.");
  });
});
