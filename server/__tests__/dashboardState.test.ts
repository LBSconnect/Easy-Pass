import { describe, it, expect } from "vitest";
import {
  deriveDashboardState,
  sectionsFor,
  primaryActionFor,
  shouldShowAnalytics,
  EXAM_APPROACHING_DAYS,
  HIGH_READINESS_SCORE,
  MIN_ATTEMPTS_FOR_ANALYTICS,
  type DashboardInput,
} from "@shared/dashboardState";

function input(over: Partial<DashboardInput> = {}): DashboardInput {
  return {
    hasSelectedExam: true,
    totalAttempts: 120,
    easyPassScore: 68,
    daysUntilExam: null,
    hasPreviousAttempt: false,
    hasActiveSubscription: true,
    examsTaken: 3,
    hasCompletedDiagnostic: false,
    ...over,
  };
}

const state = (over: Partial<DashboardInput> = {}) => deriveDashboardState(input(over));
const sections = (over: Partial<DashboardInput> = {}) =>
  sectionsFor(deriveDashboardState(input(over)), input(over));

describe("deriveDashboardState", () => {
  it("treats a student with no exam selected as new", () => {
    expect(state({ hasSelectedExam: false })).toBe("new");
  });

  it("treats a student with no attempts as new even with an exam selected", () => {
    expect(state({ totalAttempts: 0 })).toBe("new");
  });

  /**
   * The repeating-readiness-check bug.
   *
   * A student finished their readiness check, was shown the subscribe prompt,
   * declined, and returned to the dashboard - which asked them to take the
   * readiness check again, because `totalAttempts` only counts questions
   * answered inside a paid exam session and is therefore zero until they pay.
   * They could go round that loop forever.
   */
  describe("a completed readiness check", () => {
    it("keeps an unsubscribed student on the checklist, where step 4 is subscribe", () => {
      // Still "new" - but the onboarding it drives now shows the readiness
      // step ticked off, so this is a student with one job left, not one who
      // is sent round the diagnostic again.
      expect(
        state({ totalAttempts: 0, hasCompletedDiagnostic: true, hasActiveSubscription: false }),
      ).toBe("new");
    });

    it("releases a subscribed student from onboarding before they answer anything", () => {
      // They have paid and they have a readiness result. There is nothing left
      // to onboard; keeping them here is the dead end.
      expect(
        state({ totalAttempts: 0, hasCompletedDiagnostic: true, hasActiveSubscription: true }),
      ).not.toBe("new");
    });

    it("still respects an imminent exam once they are through onboarding", () => {
      expect(
        state({
          totalAttempts: 0,
          hasCompletedDiagnostic: true,
          hasActiveSubscription: true,
          daysUntilExam: 3,
        }),
      ).toBe("exam_approaching");
    });

    it("does not release a student who has not done one", () => {
      expect(
        state({ totalAttempts: 0, hasCompletedDiagnostic: false, hasActiveSubscription: true }),
      ).toBe("new");
    });

    it("does not override a missing exam choice", () => {
      // Nothing to personalise to, whatever else they have done.
      expect(
        state({
          hasSelectedExam: false,
          hasCompletedDiagnostic: true,
          hasActiveSubscription: true,
        }),
      ).toBe("new");
    });

    it("changes nothing for a student who is already studying", () => {
      expect(state({ totalAttempts: 120, hasCompletedDiagnostic: true })).toBe("active");
      expect(state({ totalAttempts: 120, hasCompletedDiagnostic: false })).toBe("active");
    });
  });

  it("recognises an ordinary active student", () => {
    expect(state()).toBe("active");
  });

  it("prioritises an imminent exam over everything else", () => {
    // Three days out, what to do next is the same for a retaker and a
    // first-timer; the countdown is the more urgent fact.
    expect(state({ daysUntilExam: 3, hasPreviousAttempt: true })).toBe("exam_approaching");
    expect(state({ daysUntilExam: 3, easyPassScore: 95 })).toBe("exam_approaching");
  });

  it("uses the documented approaching window", () => {
    expect(state({ daysUntilExam: EXAM_APPROACHING_DAYS })).toBe("exam_approaching");
    expect(state({ daysUntilExam: EXAM_APPROACHING_DAYS + 1 })).not.toBe("exam_approaching");
  });

  it("treats exam day itself as approaching", () => {
    expect(state({ daysUntilExam: 0 })).toBe("exam_approaching");
  });

  it("recognises a retaker", () => {
    expect(state({ hasPreviousAttempt: true })).toBe("retaker");
  });

  it("does not treat an unanswered retaker question as a retaker", () => {
    // Null means never asked, which is not the same as no.
    expect(state({ hasPreviousAttempt: null })).toBe("active");
  });

  it("recognises high readiness", () => {
    expect(state({ easyPassScore: HIGH_READINESS_SCORE })).toBe("high_readiness");
  });

  it("does not call a provisional score high readiness", () => {
    // A null score means not enough evidence; it must never read as ready.
    expect(state({ easyPassScore: null })).toBe("active");
  });

  it("recognises a student fresh off a diagnostic", () => {
    expect(state({ easyPassScore: 62, totalAttempts: 6 })).toBe("diagnostic_complete");
  });
});

describe("sectionsFor - new student", () => {
  const list = sections({ hasSelectedExam: false });

  it("shows onboarding and nothing else that needs data", () => {
    expect(list).toContain("onboarding");
    expect(list).not.toContain("score");
    expect(list).not.toContain("mastery");
    expect(list).not.toContain("plan");
  });

  it("never shows a summary card with nothing in it", () => {
    expect(list).not.toContain("summary");
  });

  it("stays sparse - one job, not a wall of cards", () => {
    expect(list.length).toBeLessThanOrEqual(3);
  });
});

describe("sectionsFor - ordering", () => {
  it("leads an active student with Alexi, then the score", () => {
    const list = sections();

    expect(list.indexOf("alexi")).toBeLessThan(list.indexOf("score"));
    expect(list.indexOf("score")).toBeLessThan(list.indexOf("plan"));
  });

  it("leads a retaker with Alexi rather than restating the score", () => {
    const list = sections({ hasPreviousAttempt: true });

    expect(list.indexOf("alexi")).toBeLessThan(list.indexOf("score"));
  });

  it("leads an approaching exam with Alexi, not the score", () => {
    // Every state leads with the recommendation. With days left, what to do
    // about the gap matters more than the number describing it.
    const list = sections({ daysUntilExam: 3 });

    expect(list.indexOf("alexi")).toBeLessThan(list.indexOf("score"));
  });

  it("leads with Alexi at high readiness too", () => {
    const list = sections({ easyPassScore: 92 });

    expect(list.indexOf("alexi")).toBeLessThan(list.indexOf("score"));
  });

  it("raises quick actions above the daily plan at high readiness", () => {
    // Drilling basics is the wrong advice; confirmation is the useful step.
    const list = sections({ easyPassScore: 92 });

    expect(list.indexOf("quick_actions")).toBeLessThan(list.indexOf("plan"));
  });

  it("puts the welcome card first for every non-new state", () => {
    for (const over of [
      {},
      { daysUntilExam: 3 },
      { hasPreviousAttempt: true },
      { easyPassScore: 92 },
      { easyPassScore: 62, totalAttempts: 6 },
    ]) {
      expect(sections(over)[0]).toBe("welcome");
    }
  });

  it("keeps study tools ahead of upgrade messaging in every state", () => {
    // The mission is explicit: students must not scroll past sales to reach
    // study tools.
    for (const over of [
      { hasActiveSubscription: false },
      { hasActiveSubscription: false, daysUntilExam: 3 },
      { hasActiveSubscription: false, hasPreviousAttempt: true },
      { hasActiveSubscription: false, easyPassScore: 92 },
    ]) {
      const list = sections(over);
      const upgrade = list.indexOf("upgrade");
      expect(upgrade).toBeGreaterThan(list.indexOf("plan"));
      expect(upgrade).toBeGreaterThan(list.indexOf("alexi"));
      expect(upgrade).toBe(list.length - 1);
    }
  });

  it("puts the answer to 'what next' in the first three sections", () => {
    for (const over of [{}, { daysUntilExam: 3 }, { hasPreviousAttempt: true }, { easyPassScore: 92 }]) {
      const list = sections(over);
      expect(list.indexOf("alexi")).toBeLessThanOrEqual(2);
    }
  });
});

describe("sectionsFor - subscription", () => {
  it("hides upgrade messaging from paid students", () => {
    expect(sections({ hasActiveSubscription: true })).not.toContain("upgrade");
  });

  it("shows it to free students, at the bottom", () => {
    const list = sections({ hasActiveSubscription: false });

    expect(list).toContain("upgrade");
    expect(list[list.length - 1]).toBe("upgrade");
  });
});

describe("sectionsFor - analytics gating", () => {
  it("hides the summary until the numbers mean something", () => {
    expect(sections({ totalAttempts: 4, easyPassScore: 60 })).not.toContain("summary");
  });

  it("shows it once there is real history", () => {
    expect(sections({ totalAttempts: 200 })).toContain("summary");
  });

  it("places the summary before the current-exam block", () => {
    const list = sections({ totalAttempts: 200 });

    expect(list.indexOf("summary")).toBeLessThan(list.indexOf("current_exam"));
  });
});

describe("shouldShowAnalytics", () => {
  it("suppresses zero-state statistics", () => {
    // "0 exams, 0%, 0 minutes" tells a student nothing and makes the product
    // look empty - the specific thing the redesign removes.
    expect(shouldShowAnalytics(input({ totalAttempts: 0 }))).toBe(false);
  });

  it("uses the documented threshold", () => {
    expect(shouldShowAnalytics(input({ totalAttempts: MIN_ATTEMPTS_FOR_ANALYTICS }))).toBe(true);
    expect(shouldShowAnalytics(input({ totalAttempts: MIN_ATTEMPTS_FOR_ANALYTICS - 1 }))).toBe(false);
  });
});

describe("primaryActionFor", () => {
  it("gives every state exactly one dominant action", () => {
    const states = [
      "new", "diagnostic_complete", "active", "exam_approaching", "retaker", "high_readiness",
    ] as const;

    for (const s of states) {
      expect(primaryActionFor(s)).toBeTruthy();
    }
  });

  it("sends a new student to the diagnostic", () => {
    expect(primaryActionFor("new")).toBe("diagnostic");
  });

  it("sends a ready student to a mock exam, not more drills", () => {
    expect(primaryActionFor("high_readiness")).toBe("mock_exam");
  });

  it("sends an approaching exam and a retaker to the Alexi session", () => {
    expect(primaryActionFor("exam_approaching")).toBe("alexi_session");
    expect(primaryActionFor("retaker")).toBe("alexi_session");
  });
});
