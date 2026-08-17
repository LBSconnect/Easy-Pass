import { describe, it, expect } from "vitest";
import {
  calculateEasyPassScore,
  bandFor,
  DEFAULT_BANDS,
  PROVISIONAL_THRESHOLD,
  type ScoreInput,
} from "../easyPassScore";

const NOW = new Date("2026-08-17T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function responses(
  specs: Array<{ q?: string; topic?: string; correct: boolean; days?: number }>,
) {
  return specs.map((s, i) => ({
    questionId: s.q ?? `q${i}`,
    topic: s.topic ?? "General",
    isCorrect: s.correct,
    answeredAt: daysAgo(s.days ?? 1),
  }));
}

function input(over: Partial<ScoreInput> = {}): ScoreInput {
  return {
    responses: [],
    mockExamScores: [],
    questionBankSize: 200,
    now: NOW,
    ...over,
  };
}

describe("bandFor", () => {
  it("maps scores to the documented bands", () => {
    expect(bandFor(95)).toBe("exam_ready");
    expect(bandFor(90)).toBe("exam_ready");
    expect(bandFor(89)).toBe("nearly_ready");
    expect(bandFor(80)).toBe("nearly_ready");
    expect(bandFor(79)).toBe("improving");
    expect(bandFor(70)).toBe("improving");
    expect(bandFor(69)).toBe("needs_review");
    expect(bandFor(60)).toBe("needs_review");
    expect(bandFor(59)).toBe("intensive_study");
    expect(bandFor(0)).toBe("intensive_study");
  });

  it("honours custom admin thresholds", () => {
    const strict = [
      { band: "exam_ready" as const, min: 95 },
      { band: "intensive_study" as const, min: 0 },
    ];
    expect(bandFor(94, strict)).toBe("intensive_study");
    expect(bandFor(95, strict)).toBe("exam_ready");
  });
});

describe("calculateEasyPassScore", () => {
  it("returns zero for a user with no history", () => {
    const result = calculateEasyPassScore(input());

    expect(result.score).toBe(0);
    expect(result.band).toBe("intensive_study");
    expect(result.questionsAttempted).toBe(0);
    expect(result.strongestTopic).toBeNull();
    expect(result.weakestTopic).toBeNull();
  });

  it("marks a thin history as provisional", () => {
    const result = calculateEasyPassScore(
      input({ responses: responses([{ correct: true }, { correct: true }]) }),
    );

    expect(result.provisional).toBe(true);
  });

  it("clears provisional once past the threshold", () => {
    const many = responses(
      Array.from({ length: PROVISIONAL_THRESHOLD }, (_, i) => ({
        q: `q${i}`,
        correct: true,
      })),
    );
    const result = calculateEasyPassScore(input({ responses: many }));

    expect(result.provisional).toBe(false);
  });

  it("excludes mock performance entirely when no mock has been sat", () => {
    const result = calculateEasyPassScore(
      input({ responses: responses([{ correct: true }]) }),
    );
    const mock = result.components.find((c) => c.key === "mock_performance")!;

    expect(mock.applicable).toBe(false);
  });

  it("treats a missing mock as absent, not as a zero", () => {
    // Renormalization means an inapplicable component redistributes its weight
    // rather than scoring 0. So never having sat a mock must rank strictly
    // better than having sat one and failed it.
    const answers = responses(
      Array.from({ length: 30 }, (_, i) => ({ q: `q${i}`, correct: true })),
    );

    const noMock = calculateEasyPassScore(input({ responses: answers }));
    const failedMock = calculateEasyPassScore(
      input({ responses: answers, mockExamScores: [0] }),
    );
    const passedMock = calculateEasyPassScore(
      input({ responses: answers, mockExamScores: [100] }),
    );

    expect(noMock.score).toBeGreaterThan(failedMock.score);
    // And a strong mock is still worth more than not having sat one.
    expect(passedMock.score).toBeGreaterThan(noMock.score);
  });

  it("weights the most recent mock attempt most heavily", () => {
    const answers = responses([{ correct: true }]);
    // Same two scores, opposite order. Weights 2 and 1 must favour the
    // ordering whose most recent attempt is the strong one.
    const improving = calculateEasyPassScore(
      input({ responses: answers, mockExamScores: [90, 50] }),
    );
    const declining = calculateEasyPassScore(
      input({ responses: answers, mockExamScores: [50, 90] }),
    );

    expect(improving.score).toBeGreaterThan(declining.score);
  });

  it("penalises narrow mastery even when overall accuracy is high", () => {
    // Both students answer 20 questions with 15 correct, but one is uniformly
    // decent and the other is perfect on one topic and failing another.
    const even = responses([
      ...Array.from({ length: 10 }, (_, i) => ({ q: `a${i}`, topic: "Law", correct: i < 8 })),
      ...Array.from({ length: 10 }, (_, i) => ({ q: `b${i}`, topic: "Property", correct: i < 7 })),
    ]);
    const lopsided = responses([
      ...Array.from({ length: 10 }, (_, i) => ({ q: `a${i}`, topic: "Law", correct: true })),
      ...Array.from({ length: 10 }, (_, i) => ({ q: `b${i}`, topic: "Property", correct: i < 5 })),
    ]);

    const evenScore = calculateEasyPassScore(input({ responses: even }));
    const lopsidedScore = calculateEasyPassScore(input({ responses: lopsided }));

    expect(evenScore.score).toBeGreaterThan(lopsidedScore.score);
  });

  it("decays the recency component as the student goes idle", () => {
    const fresh = calculateEasyPassScore(
      input({ responses: responses([{ correct: true, days: 0 }]) }),
    );
    const stale = calculateEasyPassScore(
      input({ responses: responses([{ correct: true, days: 20 }]) }),
    );

    expect(fresh.score).toBeGreaterThan(stale.score);
  });

  it("falls back to full history when recent activity is too thin", () => {
    // Only old answers: recent-accuracy must still be computed, not zeroed.
    const old = responses(
      Array.from({ length: 20 }, (_, i) => ({ q: `q${i}`, correct: true, days: 60 })),
    );
    const result = calculateEasyPassScore(input({ responses: old }));
    const acc = result.components.find((c) => c.key === "recent_accuracy")!;

    expect(acc.applicable).toBe(true);
    expect(acc.value).toBe(100);
  });

  it("credits recovering a previously missed question", () => {
    const recovered = responses([
      { q: "q1", correct: false, days: 5 },
      { q: "q1", correct: true, days: 1 },
    ]);
    const notRecovered = responses([
      { q: "q1", correct: false, days: 5 },
      { q: "q1", correct: false, days: 1 },
    ]);

    const good = calculateEasyPassScore(input({ responses: recovered }));
    const bad = calculateEasyPassScore(input({ responses: notRecovered }));

    expect(good.components.find((c) => c.key === "recovery")!.value).toBe(100);
    expect(bad.components.find((c) => c.key === "recovery")!.value).toBe(0);
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it("ignores recovery when no question has been missed then retried", () => {
    const result = calculateEasyPassScore(
      input({ responses: responses([{ q: "q1", correct: true }]) }),
    );

    expect(result.components.find((c) => c.key === "recovery")!.applicable).toBe(false);
  });

  it("rewards broader coverage of the question bank", () => {
    const narrow = responses(
      Array.from({ length: 10 }, (_, i) => ({ q: `q${i}`, correct: true })),
    );
    const broad = responses(
      Array.from({ length: 100 }, (_, i) => ({ q: `q${i}`, correct: true })),
    );

    const narrowScore = calculateEasyPassScore(input({ responses: narrow }));
    const broadScore = calculateEasyPassScore(input({ responses: broad }));

    expect(broadScore.score).toBeGreaterThan(narrowScore.score);
  });

  it("does not count re-answers as extra coverage", () => {
    const repeated = responses(
      Array.from({ length: 20 }, () => ({ q: "same", correct: true })),
    );
    const result = calculateEasyPassScore(input({ responses: repeated }));

    // One distinct question out of a 100-question coverage target.
    expect(result.components.find((c) => c.key === "coverage")!.value).toBe(1);
  });

  it("identifies strongest and weakest topics", () => {
    const mixed = responses([
      ...Array.from({ length: 5 }, (_, i) => ({ q: `a${i}`, topic: "Law", correct: true })),
      ...Array.from({ length: 5 }, (_, i) => ({ q: `b${i}`, topic: "Property", correct: false })),
    ]);
    const result = calculateEasyPassScore(input({ responses: mixed }));

    expect(result.strongestTopic).toBe("Law");
    expect(result.weakestTopic).toBe("Property");
  });

  it("ignores topics with too few attempts when ranking", () => {
    const mixed = responses([
      ...Array.from({ length: 5 }, (_, i) => ({ q: `a${i}`, topic: "Law", correct: true })),
      ...Array.from({ length: 5 }, (_, i) => ({ q: `b${i}`, topic: "Property", correct: false })),
      // A single unlucky answer should not become the "weakest topic".
      { q: "c1", topic: "Ethics", correct: false },
    ]);
    const result = calculateEasyPassScore(input({ responses: mixed }));

    expect(result.weakestTopic).toBe("Property");
  });

  it("never leaves the 0-100 range", () => {
    const perfect = responses(
      Array.from({ length: 300 }, (_, i) => ({ q: `q${i}`, correct: true, days: 0 })),
    );
    const result = calculateEasyPassScore(
      input({ responses: perfect, mockExamScores: [100, 100, 100] }),
    );

    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("gives a strong, recently-active student an exam-ready score", () => {
    const strong = responses(
      Array.from({ length: 150 }, (_, i) => ({
        q: `q${i}`,
        topic: i % 2 === 0 ? "Law" : "Property",
        correct: i % 20 !== 0, // 95% accuracy
        days: 0,
      })),
    );
    const result = calculateEasyPassScore(
      input({ responses: strong, mockExamScores: [94, 91] }),
    );

    expect(result.band).toBe("exam_ready");
    expect(result.provisional).toBe(false);
  });

  it("gives a weak student an intensive-study score", () => {
    const weak = responses(
      Array.from({ length: 40 }, (_, i) => ({
        q: `q${i}`,
        topic: i % 2 === 0 ? "Law" : "Property",
        correct: i % 3 === 0, // ~33% accuracy
        days: 10,
      })),
    );
    const result = calculateEasyPassScore(
      input({ responses: weak, mockExamScores: [41] }),
    );

    expect(result.band).toBe("intensive_study");
  });

  it("uses the injected clock rather than wall time", () => {
    const answers = responses([{ correct: true, days: 0 }]);
    const later = calculateEasyPassScore(
      input({ responses: answers, now: new Date(NOW.getTime() + 40 * 86400000) }),
    );

    // 40 days past the answer, recency must have decayed to its floor.
    expect(later.components.find((c) => c.key === "recency")!.value).toBe(0);
  });

  it("keeps DEFAULT_BANDS covering the whole range", () => {
    for (let s = 0; s <= 100; s++) {
      expect(bandFor(s, DEFAULT_BANDS)).toBeTruthy();
    }
  });
});
