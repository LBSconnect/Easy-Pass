import { describe, it, expect } from "vitest";
import {
  newCardState,
  scheduleNext,
  selectDueCards,
  INITIAL_EASE,
  MIN_EASE,
  MAX_INTERVAL_DAYS,
  type CardState,
  type DueCandidate,
} from "../spacedRepetition";

const NOW = new Date("2026-08-17T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysFrom = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

function card(over: Partial<CardState> = {}): CardState {
  return { streak: 0, intervalDays: 0, ease: INITIAL_EASE, dueAt: NOW, ...over };
}

function candidate(over: Partial<DueCandidate> = {}): DueCandidate {
  return {
    questionId: "q",
    topic: "Law",
    state: null,
    topicAccuracy: 70,
    lastWasWrong: false,
    isBookmarked: false,
    ...over,
  };
}

describe("newCardState", () => {
  it("makes a brand new card due immediately", () => {
    expect(newCardState(NOW).dueAt).toEqual(NOW);
    expect(newCardState(NOW).streak).toBe(0);
  });
});

describe("scheduleNext", () => {
  it("schedules a first correct recall for tomorrow", () => {
    const next = scheduleNext(card(), "known", NOW);

    expect(next.streak).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.dueAt).toEqual(daysFrom(NOW, 1));
  });

  it("schedules a second correct recall three days out", () => {
    const next = scheduleNext(card({ streak: 1, intervalDays: 1 }), "known", NOW);

    expect(next.intervalDays).toBe(3);
    expect(next.dueAt).toEqual(daysFrom(NOW, 3));
  });

  it("grows the interval by the ease factor after that", () => {
    const next = scheduleNext(
      card({ streak: 2, intervalDays: 3, ease: 2.5 }),
      "known",
      NOW,
    );

    // 3 * 2.5 rounds to 8.
    expect(next.intervalDays).toBe(8);
  });

  it("brings a fumbled card back tomorrow rather than burying it", () => {
    const next = scheduleNext(
      card({ streak: 5, intervalDays: 60, ease: 2.8 }),
      "needs_work",
      NOW,
    );

    expect(next.intervalDays).toBe(1);
    expect(next.dueAt).toEqual(daysFrom(NOW, 1));
    expect(next.streak).toBe(0);
  });

  it("lowers ease on a miss so a repeatedly fumbled card returns more often", () => {
    const once = scheduleNext(card({ ease: 2.5 }), "needs_work", NOW);
    const twice = scheduleNext(once, "needs_work", NOW);

    expect(once.ease).toBeCloseTo(2.3);
    expect(twice.ease).toBeCloseTo(2.1);
  });

  it("never drops ease below the floor", () => {
    let state = card({ ease: MIN_EASE });
    for (let i = 0; i < 10; i++) state = scheduleNext(state, "needs_work", NOW);

    expect(state.ease).toBe(MIN_EASE);
  });

  it("raises ease on correct recall", () => {
    const next = scheduleNext(card({ ease: 2.5 }), "known", NOW);

    expect(next.ease).toBeCloseTo(2.55);
  });

  it("caps the interval so a card is never effectively deleted", () => {
    let state = card({ streak: 3, intervalDays: 150, ease: 2.5 });
    for (let i = 0; i < 5; i++) state = scheduleNext(state, "known", NOW);

    expect(state.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it("keeps intervals at least a day", () => {
    const next = scheduleNext(card({ streak: 2, intervalDays: 0, ease: 1.3 }), "known", NOW);

    expect(next.intervalDays).toBeGreaterThanOrEqual(1);
  });
});

describe("selectDueCards", () => {
  it("never shows a card before it is due", () => {
    const notYet = candidate({
      questionId: "future",
      state: card({ dueAt: daysFrom(NOW, 5) }),
    });

    expect(selectDueCards([notYet], NOW, 10)).toEqual([]);
  });

  it("includes never-reviewed cards", () => {
    const fresh = candidate({ questionId: "new", state: null });

    expect(selectDueCards([fresh], NOW, 10).map((c) => c.questionId)).toEqual(["new"]);
  });

  it("prioritises weaker topics", () => {
    const picked = selectDueCards(
      [
        candidate({ questionId: "strong", topicAccuracy: 92 }),
        candidate({ questionId: "weak", topicAccuracy: 41 }),
      ],
      NOW,
      1,
    );

    expect(picked.map((c) => c.questionId)).toEqual(["weak"]);
  });

  it("prioritises previously missed questions", () => {
    const picked = selectDueCards(
      [
        candidate({ questionId: "ok", lastWasWrong: false }),
        candidate({ questionId: "missed", lastWasWrong: true }),
      ],
      NOW,
      1,
    );

    expect(picked.map((c) => c.questionId)).toEqual(["missed"]);
  });

  it("gives bookmarked cards a lift", () => {
    const picked = selectDueCards(
      [
        candidate({ questionId: "plain" }),
        candidate({ questionId: "saved", isBookmarked: true }),
      ],
      NOW,
      1,
    );

    expect(picked.map((c) => c.questionId)).toEqual(["saved"]);
  });

  it("surfaces long-overdue cards ahead of just-due ones", () => {
    const picked = selectDueCards(
      [
        candidate({ questionId: "just-due", state: card({ dueAt: NOW }) }),
        candidate({ questionId: "overdue", state: card({ dueAt: daysAgo(20) }) }),
      ],
      NOW,
      1,
    );

    expect(picked.map((c) => c.questionId)).toEqual(["overdue"]);
  });

  it("breaks ties deterministically", () => {
    const forward = selectDueCards(
      [candidate({ questionId: "b" }), candidate({ questionId: "a" })],
      NOW,
      2,
    );
    const reversed = selectDueCards(
      [candidate({ questionId: "a" }), candidate({ questionId: "b" })],
      NOW,
      2,
    );

    expect(forward.map((c) => c.questionId)).toEqual(reversed.map((c) => c.questionId));
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => candidate({ questionId: `q${i}` }));

    expect(selectDueCards(many, NOW, 5)).toHaveLength(5);
  });

  it("returns nothing for a non-positive limit", () => {
    expect(selectDueCards([candidate()], NOW, 0)).toEqual([]);
  });

  it("handles an empty deck", () => {
    expect(selectDueCards([], NOW, 10)).toEqual([]);
  });
});
