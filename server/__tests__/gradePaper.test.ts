import { describe, it, expect } from "vitest";
import { gradePaper, type ScoredQuestion } from "../examScoring";

function bank(...qs: Array<[string, string | null, number]>): Map<string, ScoredQuestion> {
  return new Map(qs.map(([id, topic, correctAnswer]) => [id, { id, topic, correctAnswer }]));
}

describe("gradePaper", () => {
  it("scores against the session's shuffled answer order, not the bank order", () => {
    const questions = bank(["q1", "Law", 0]);
    // The bank says index 0, but this session shuffled the correct option to 3.
    const result = gradePaper(["q1"], questions, { q1: 3 }, { q1: 3 });

    expect(result.correctAnswers).toBe(1);
    expect(result.responses[0].isCorrect).toBe(true);
  });

  it("falls back to the bank's correctAnswer when the session has no answerOrder", () => {
    const questions = bank(["q1", "Law", 2]);
    const result = gradePaper(["q1"], questions, { q1: 2 }, null);

    expect(result.correctAnswers).toBe(1);
  });

  it("marks an answer wrong when it matches the bank order but not the shuffled order", () => {
    const questions = bank(["q1", "Law", 0]);
    // Answering 0 would be right in the bank, but this session moved it to 3.
    const result = gradePaper(["q1"], questions, { q1: 0 }, { q1: 3 });

    expect(result.correctAnswers).toBe(0);
    expect(result.responses[0].isCorrect).toBe(false);
  });

  it("records unanswered questions as incorrect with a null selectedAnswer", () => {
    const questions = bank(["q1", "Law", 1]);
    const result = gradePaper(["q1"], questions, {}, null);

    expect(result.correctAnswers).toBe(0);
    expect(result.responses).toHaveLength(1);
    expect(result.responses[0].selectedAnswer).toBeNull();
    expect(result.responses[0].isCorrect).toBe(false);
  });

  it("does not treat answer index 0 as unanswered", () => {
    // Guards the `?? null` fallback against 0 being falsy.
    const questions = bank(["q1", "Law", 0]);
    const result = gradePaper(["q1"], questions, { q1: 0 }, null);

    expect(result.responses[0].selectedAnswer).toBe(0);
    expect(result.responses[0].isCorrect).toBe(true);
  });

  it("buckets untopiced questions under General", () => {
    const questions = bank(["q1", null, 0]);
    const result = gradePaper(["q1"], questions, { q1: 0 }, null);

    expect(result.topicStats.General).toEqual({ correct: 1, total: 1 });
    expect(result.responses[0].topic).toBe("General");
  });

  it("skips question ids with no matching question row", () => {
    const questions = bank(["q1", "Law", 0]);
    const result = gradePaper(["q1", "deleted"], questions, { q1: 0, deleted: 1 }, null);

    expect(result.responses).toHaveLength(1);
    expect(result.responses[0].questionId).toBe("q1");
    expect(result.topicStats.Law.total).toBe(1);
  });

  it("aggregates topic stats across a mixed paper", () => {
    const questions = bank(
      ["q1", "Law", 0],
      ["q2", "Law", 1],
      ["q3", "Property", 0],
    );
    const result = gradePaper(
      ["q1", "q2", "q3"],
      questions,
      { q1: 0, q2: 0, q3: 0 },
      null,
    );

    expect(result.correctAnswers).toBe(2);
    expect(result.topicStats.Law).toEqual({ correct: 1, total: 2 });
    expect(result.topicStats.Property).toEqual({ correct: 1, total: 1 });
  });

  it("emits one response row per graded question, in paper order", () => {
    const questions = bank(["q1", "Law", 0], ["q2", "Property", 0]);
    const result = gradePaper(["q2", "q1"], questions, {}, null);

    expect(result.responses.map((r) => r.questionId)).toEqual(["q2", "q1"]);
  });

  it("handles an empty paper", () => {
    const result = gradePaper([], bank(), {}, null);

    expect(result).toEqual({ correctAnswers: 0, topicStats: {}, responses: [] });
  });
});
