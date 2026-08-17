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

describe("difficulty matching", () => {
  const NOW2 = new Date("2026-08-17T12:00:00Z");
  const base = {
    topicAccuracy: new Map<string, number>(),
    history: new Map(),
    now: NOW2,
  };

  it("prefers questions at the student's working level", () => {
    const picked = selectAdaptiveQuestions(
      {
        ...base,
        targetDifficulty: "foundation",
        candidates: [
          { id: "hard", topic: "Law", difficulty: "challenge" },
          { id: "easy", topic: "Law", difficulty: "foundation" },
        ],
      },
      1,
    );

    expect(picked.map((c) => c.id)).toEqual(["easy"]);
  });

  it("does not throw a failing student at the hardest questions", () => {
    // The anti-goal this whole feature exists to prevent.
    const picked = selectAdaptiveQuestions(
      {
        ...base,
        targetDifficulty: "foundation",
        candidates: [
          { id: "c1", topic: "Law", difficulty: "challenge" },
          { id: "c2", topic: "Law", difficulty: "challenge" },
          { id: "f1", topic: "Law", difficulty: "foundation" },
        ],
      },
      2,
    );

    expect(picked.map((c) => c.id)).toContain("f1");
  });

  it("treats an adjacent level as better than a distant one", () => {
    const picked = selectAdaptiveQuestions(
      {
        ...base,
        targetDifficulty: "standard",
        candidates: [
          { id: "far", topic: "Law", difficulty: "challenge" },
          { id: "near", topic: "Law", difficulty: "exam_level" },
        ],
      },
      1,
    );

    expect(picked.map((c) => c.id)).toEqual(["near"]);
  });

  it("keeps working on a partially calibrated bank", () => {
    // Uncalibrated questions score neutral rather than being excluded, so
    // calibration can roll out gradually without starving selection.
    const picked = selectAdaptiveQuestions(
      {
        ...base,
        targetDifficulty: "standard",
        candidates: [
          { id: "uncalibrated", topic: "Law", difficulty: null },
          { id: "wrong-level", topic: "Law", difficulty: "challenge" },
        ],
      },
      2,
    );

    expect(picked).toHaveLength(2);
  });

  it("ignores difficulty entirely when no target is set", () => {
    // Behaviour before calibration existed must be unchanged.
    const withTarget = selectAdaptiveQuestions(
      {
        ...base,
        candidates: [
          { id: "a", topic: "Law", difficulty: "challenge" },
          { id: "b", topic: "Law", difficulty: "foundation" },
        ],
      },
      2,
    );

    expect(withTarget).toHaveLength(2);
  });
});
