import { describe, it, expect } from "vitest";
import {
  selectAdaptiveQuestions,
  scoreCandidate,
  buildHistory,
  type SelectionInput,
  type CandidateQuestion,
} from "../adaptiveSelection";

const NOW = new Date("2026-08-17T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function input(over: Partial<SelectionInput> = {}): SelectionInput {
  return {
    candidates: [],
    topicAccuracy: new Map(),
    history: new Map(),
    now: NOW,
    ...over,
  };
}

const q = (id: string, topic: string | null = "Law"): CandidateQuestion => ({ id, topic });
const ids = (list: CandidateQuestion[]) => list.map((c) => c.id);

describe("buildHistory", () => {
  it("counts exposures and keeps the latest answer's correctness", () => {
    const history = buildHistory([
      { questionId: "a", isCorrect: false, answeredAt: daysAgo(5) },
      { questionId: "a", isCorrect: true, answeredAt: daysAgo(1) },
    ]);

    expect(history.get("a")).toMatchObject({ timesSeen: 2, lastWasWrong: false });
    expect(history.get("a")!.lastAnsweredAt).toEqual(daysAgo(1));
  });

  it("is insensitive to input ordering", () => {
    // Same two answers, reversed. The later answer must still win.
    const history = buildHistory([
      { questionId: "a", isCorrect: true, answeredAt: daysAgo(1) },
      { questionId: "a", isCorrect: false, answeredAt: daysAgo(5) },
    ]);

    expect(history.get("a")!.lastWasWrong).toBe(false);
    expect(history.get("a")!.timesSeen).toBe(2);
  });

  it("returns an empty map for no responses", () => {
    expect(buildHistory([]).size).toBe(0);
  });
});

describe("selectAdaptiveQuestions", () => {
  it("prefers questions from weaker topics", () => {
    const selected = selectAdaptiveQuestions(
      input({
        candidates: [q("strong", "Property"), q("weak", "Law")],
        topicAccuracy: new Map([["Property", 90], ["Law", 40]]),
      }),
      1,
    );

    expect(ids(selected)).toEqual(["weak"]);
  });

  it("prioritises a previously missed question over an unseen one", () => {
    const selected = selectAdaptiveQuestions(
      input({
        candidates: [q("unseen"), q("missed")],
        topicAccuracy: new Map([["Law", 50]]),
        history: new Map([
          ["missed", { timesSeen: 1, lastWasWrong: true, lastAnsweredAt: daysAgo(2) }],
        ]),
      }),
      1,
    );

    expect(ids(selected)).toEqual(["missed"]);
  });

  it("prefers an unseen question over one already answered correctly", () => {
    const selected = selectAdaptiveQuestions(
      input({
        candidates: [q("unseen"), q("known")],
        topicAccuracy: new Map([["Law", 50]]),
        history: new Map([
          ["known", { timesSeen: 1, lastWasWrong: false, lastAnsweredAt: daysAgo(1) }],
        ]),
      }),
      1,
    );

    expect(ids(selected)).toEqual(["unseen"]);
  });

  it("rotates the bank instead of repeating heavily-seen questions", () => {
    const selected = selectAdaptiveQuestions(
      input({
        candidates: [q("fresh"), q("overexposed")],
        topicAccuracy: new Map([["Law", 50]]),
        history: new Map([
          ["fresh", { timesSeen: 1, lastWasWrong: false, lastAnsweredAt: daysAgo(1) }],
          ["overexposed", { timesSeen: 6, lastWasWrong: false, lastAnsweredAt: daysAgo(1) }],
        ]),
      }),
      1,
    );

    expect(ids(selected)).toEqual(["fresh"]);
  });

  it("resurfaces a long-untouched question over a recently seen one", () => {
    const selected = selectAdaptiveQuestions(
      input({
        candidates: [q("stale"), q("recent")],
        topicAccuracy: new Map([["Law", 50]]),
        history: new Map([
          ["stale", { timesSeen: 1, lastWasWrong: false, lastAnsweredAt: daysAgo(60) }],
          ["recent", { timesSeen: 1, lastWasWrong: false, lastAnsweredAt: daysAgo(0) }],
        ]),
      }),
      1,
    );

    expect(ids(selected)).toEqual(["stale"]);
  });

  it("caps the spacing bonus so age alone cannot outrank a live miss", () => {
    const selected = selectAdaptiveQuestions(
      input({
        candidates: [q("ancient"), q("missed")],
        topicAccuracy: new Map([["Law", 50]]),
        history: new Map([
          ["ancient", { timesSeen: 1, lastWasWrong: false, lastAnsweredAt: daysAgo(3650) }],
          ["missed", { timesSeen: 1, lastWasWrong: true, lastAnsweredAt: daysAgo(1) }],
        ]),
      }),
      1,
    );

    expect(ids(selected)).toEqual(["missed"]);
  });

  it("does not flood the student with one untouched topic", () => {
    // An unseen topic scores neutral, not maximally weak, so a genuinely
    // failing known topic still wins.
    const selected = selectAdaptiveQuestions(
      input({
        candidates: [q("untouched", "Ethics"), q("failing", "Law")],
        topicAccuracy: new Map([["Law", 20]]),
      }),
      1,
    );

    expect(ids(selected)).toEqual(["failing"]);
  });

  it("treats a null topic as General", () => {
    const selected = selectAdaptiveQuestions(
      input({
        candidates: [q("untopiced", null)],
        topicAccuracy: new Map([["General", 10]]),
      }),
      1,
    );

    expect(ids(selected)).toEqual(["untopiced"]);
    expect(
      scoreCandidate(q("untopiced", null), input({ topicAccuracy: new Map([["General", 10]]) })),
    ).toBeGreaterThan(
      scoreCandidate(q("untopiced", null), input({ topicAccuracy: new Map([["General", 90]]) })),
    );
  });

  it("breaks ties deterministically rather than by input order", () => {
    const forward = selectAdaptiveQuestions(
      input({ candidates: [q("b"), q("a"), q("c")] }),
      3,
    );
    const reversed = selectAdaptiveQuestions(
      input({ candidates: [q("c"), q("a"), q("b")] }),
      3,
    );

    expect(ids(forward)).toEqual(ids(reversed));
  });

  it("returns at most the requested number", () => {
    const selected = selectAdaptiveQuestions(
      input({ candidates: [q("a"), q("b"), q("c")] }),
      2,
    );

    expect(selected).toHaveLength(2);
  });

  it("returns everything available when the limit exceeds the pool", () => {
    const selected = selectAdaptiveQuestions(input({ candidates: [q("a"), q("b")] }), 10);

    expect(selected).toHaveLength(2);
  });

  it("returns nothing for a non-positive limit", () => {
    expect(selectAdaptiveQuestions(input({ candidates: [q("a")] }), 0)).toEqual([]);
    expect(selectAdaptiveQuestions(input({ candidates: [q("a")] }), -5)).toEqual([]);
  });

  it("handles an empty candidate pool", () => {
    expect(selectAdaptiveQuestions(input(), 10)).toEqual([]);
  });

  it("orders a realistic mixed pool the way a tutor would", () => {
    const selected = selectAdaptiveQuestions(
      input({
        candidates: [
          q("mastered", "Property"),
          q("weak-unseen", "Law"),
          q("weak-missed", "Law"),
        ],
        topicAccuracy: new Map([["Property", 95], ["Law", 35]]),
        history: new Map([
          ["mastered", { timesSeen: 3, lastWasWrong: false, lastAnsweredAt: daysAgo(1) }],
          ["weak-missed", { timesSeen: 1, lastWasWrong: true, lastAnsweredAt: daysAgo(2) }],
        ]),
      }),
      3,
    );

    // Missed question in a failing topic first, then the unseen one in that
    // same topic, and the already-mastered question last.
    expect(ids(selected)).toEqual(["weak-missed", "weak-unseen", "mastered"]);
  });
});
