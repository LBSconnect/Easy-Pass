/**
 * Choosing what a student should try to recall.
 *
 * The behaviour being pinned here is what makes a review session different
 * from the notebook page. The old one listed the questions you got wrong with
 * the answers already showing; these tests are about selecting items worth
 * retrieving, refusing to ask about something answered minutes ago, and mixing
 * concepts so a student cannot coast on the previous question's pattern.
 */
import { describe, it, expect } from "vitest";
import {
  scoreRetrieval,
  selectRetrieval,
  interleaveByTopic,
  topicAccuracy,
  TOO_RECENT_MS,
  MAX_SPACING_DAYS,
  type Exposure,
} from "@shared/retrievalReview";

const NOW = new Date("2026-08-19T15:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 60 * 60 * 1000);

const seen = (
  questionId: string,
  topic: string,
  isCorrect: boolean,
  answeredAt: Date,
): Exposure => ({ questionId, topic, isCorrect, answeredAt });

describe("scoreRetrieval", () => {
  it("puts a question the student last got wrong above one they got right", () => {
    const picks = scoreRetrieval(
      [
        seen("right", "Liability", true, daysAgo(5)),
        seen("wrong", "Liability", false, daysAgo(5)),
      ],
      NOW,
    );

    expect(picks.map((p) => p.questionId)).toEqual(["wrong", "right"]);
  });

  it("ranks a repeatedly missed question above a once-missed one", () => {
    const picks = scoreRetrieval(
      [
        seen("once", "Liability", false, daysAgo(5)),
        seen("thrice", "Liability", false, daysAgo(7)),
        seen("thrice", "Liability", false, daysAgo(6)),
        seen("thrice", "Liability", false, daysAgo(5)),
      ],
      NOW,
    );

    expect(picks[0].questionId).toBe("thrice");
  });

  it("prefers the colder of two otherwise identical questions", () => {
    // The spacing effect, and the signal the old review had no concept of.
    // Re-answering yesterday's question is nearly free and teaches little.
    const picks = scoreRetrieval(
      [
        seen("yesterday", "Liability", false, daysAgo(1)),
        seen("three-weeks", "Liability", false, daysAgo(21)),
      ],
      NOW,
    );

    expect(picks[0].questionId).toBe("three-weeks");
  });

  it("stops rewarding age past the cap", () => {
    // Otherwise one ancient easy question outranks a concept missed last week.
    const picks = scoreRetrieval(
      [
        seen("old", "Liability", true, daysAgo(MAX_SPACING_DAYS)),
        seen("ancient", "Liability", true, daysAgo(MAX_SPACING_DAYS * 10)),
      ],
      NOW,
    );

    expect(picks[0].score).toBeCloseTo(picks[1].score, 5);
  });

  it("will not ask about something answered minutes ago", () => {
    // Inside one sitting this measures whether the answer is still on screen.
    const picks = scoreRetrieval([seen("just-now", "Liability", false, hoursAgo(1))], NOW);

    expect(picks).toEqual([]);
  });

  it("asks again once enough time has passed", () => {
    const picks = scoreRetrieval(
      [seen("earlier", "Liability", false, new Date(NOW.getTime() - TOO_RECENT_MS))],
      NOW,
    );

    expect(picks.map((p) => p.questionId)).toEqual(["earlier"]);
  });

  it("judges recency by timestamp, not by row order", () => {
    // The response log arrives in whatever order the query returned. A stale
    // row appearing last must not make a question look freshly answered.
    const picks = scoreRetrieval(
      [
        seen("q", "Liability", false, daysAgo(1)),
        seen("q", "Liability", true, daysAgo(30)),
      ],
      NOW,
    );

    // The most recent answer was the wrong one, so it still ranks as missed.
    expect(picks[0].questionId).toBe("q");
    expect(picks).toHaveLength(1);
  });

  it("lifts questions sitting in a concept the student is weak on", () => {
    const exposures: Exposure[] = [
      // Weak topic: one right out of four.
      seen("weak-1", "Weak", false, daysAgo(5)),
      seen("weak-2", "Weak", false, daysAgo(5)),
      seen("weak-3", "Weak", false, daysAgo(5)),
      seen("target-weak", "Weak", true, daysAgo(5)),
      // Strong topic: all correct.
      seen("strong-1", "Strong", true, daysAgo(5)),
      seen("target-strong", "Strong", true, daysAgo(5)),
    ];

    const picks = scoreRetrieval(exposures, NOW);
    const weak = picks.find((p) => p.questionId === "target-weak")!;
    const strong = picks.find((p) => p.questionId === "target-strong")!;

    // Same history on the question itself; the concept around it differs.
    expect(weak.score).toBeGreaterThan(strong.score);
  });

  it("is stable, so reloading gives the same session", () => {
    const exposures = [
      seen("b", "Liability", true, daysAgo(5)),
      seen("a", "Liability", true, daysAgo(5)),
    ];

    expect(scoreRetrieval(exposures, NOW).map((p) => p.questionId)).toEqual(
      scoreRetrieval([...exposures].reverse(), NOW).map((p) => p.questionId),
    );
  });

  it("returns nothing for a student who has answered nothing", () => {
    expect(scoreRetrieval([], NOW)).toEqual([]);
  });

  it("survives an unreadable timestamp rather than throwing", () => {
    const picks = scoreRetrieval(
      [{ questionId: "q", topic: "Liability", isCorrect: false, answeredAt: "not a date" }],
      NOW,
    );

    // Treated as long ago, which is the safe reading - it gets asked.
    expect(picks.map((p) => p.questionId)).toEqual(["q"]);
  });
});

describe("interleaveByTopic", () => {
  it("does not ask two questions on one concept back to back", () => {
    // Blocked practice lets a student answer from the previous question's
    // pattern. The exam does not group its questions by topic either.
    const ordered = interleaveByTopic([
      { questionId: "a1", topic: "A", score: 10 },
      { questionId: "a2", topic: "A", score: 9 },
      { questionId: "b1", topic: "B", score: 8 },
      { questionId: "b2", topic: "B", score: 7 },
    ]);

    const topics = ordered.map((p) => p.topic);
    for (let i = 1; i < topics.length; i++) {
      expect(topics[i]).not.toBe(topics[i - 1]);
    }
  });

  it("keeps the highest-priority item first", () => {
    // Interleaving changes the order, never what was selected.
    const ordered = interleaveByTopic([
      { questionId: "top", topic: "A", score: 100 },
      { questionId: "next", topic: "B", score: 50 },
    ]);

    expect(ordered[0].questionId).toBe("top");
  });

  it("keeps every item when only one concept is available", () => {
    // Repeating a topic beats silently dropping questions.
    const ordered = interleaveByTopic([
      { questionId: "a1", topic: "A", score: 10 },
      { questionId: "a2", topic: "A", score: 9 },
      { questionId: "a3", topic: "A", score: 8 },
    ]);

    expect(ordered.map((p) => p.questionId)).toEqual(["a1", "a2", "a3"]);
  });

  it("loses nothing when concepts are unevenly represented", () => {
    const input = [
      { questionId: "a1", topic: "A", score: 10 },
      { questionId: "a2", topic: "A", score: 9 },
      { questionId: "a3", topic: "A", score: 8 },
      { questionId: "b1", topic: "B", score: 7 },
    ];

    expect(interleaveByTopic(input)).toHaveLength(4);
  });
});

describe("selectRetrieval", () => {
  const history: Exposure[] = [
    seen("missed-a", "A", false, daysAgo(10)),
    seen("missed-b", "B", false, daysAgo(10)),
    seen("known-a", "A", true, daysAgo(10)),
    seen("known-b", "B", true, daysAgo(10)),
  ];

  it("takes the most valuable items and mixes the concepts", () => {
    const picked = selectRetrieval(history, 2, NOW);

    expect(picked).toHaveLength(2);
    expect(picked.map((p) => p.questionId).sort()).toEqual(["missed-a", "missed-b"]);
    expect(picked[0].topic).not.toBe(picked[1].topic);
  });

  it("mixes concepts before cutting the list, not after", () => {
    // The bug this pins: taking the top N by score and interleaving afterwards
    // produced seven questions on one concept in a row, because the highest
    // scorers were nearly all from the student's weakest topic and nothing was
    // left to alternate with. Caught by running a real session, not by a unit
    // test - so here is the unit test.
    const lopsided: Exposure[] = [
      // One weak topic with many overdue items.
      ...Array.from({ length: 8 }, (_, i) => seen(`weak-${i}`, "Weak", false, daysAgo(20))),
      // A second topic, present but lower priority.
      ...Array.from({ length: 8 }, (_, i) => seen(`other-${i}`, "Other", true, daysAgo(20))),
    ];

    const topics = selectRetrieval(lopsided, 9, NOW).map((p) => p.topic);

    expect(topics).toHaveLength(9);
    for (let i = 1; i < topics.length; i++) {
      expect(topics[i], `position ${i} repeated ${topics[i]}`).not.toBe(topics[i - 1]);
    }
  });

  it("still leads with the highest-priority question", () => {
    // Alternating must not cost the student the item that matters most.
    const picked = selectRetrieval(
      [
        seen("urgent", "A", false, daysAgo(25)),
        seen("urgent", "A", false, daysAgo(24)),
        seen("calm", "B", true, daysAgo(3)),
      ],
      2,
      NOW,
    );

    expect(picked[0].questionId).toBe("urgent");
  });

  it("returns everything available when asked for more than exists", () => {
    expect(selectRetrieval(history, 50, NOW)).toHaveLength(4);
  });

  it("asks for nothing when told to", () => {
    expect(selectRetrieval(history, 0, NOW)).toEqual([]);
    expect(selectRetrieval(history, -3, NOW)).toEqual([]);
  });
});

describe("topicAccuracy", () => {
  it("reports accuracy per concept", () => {
    const accuracy = topicAccuracy([
      seen("q1", "A", true, daysAgo(1)),
      seen("q2", "A", false, daysAgo(1)),
      seen("q3", "B", true, daysAgo(1)),
    ]);

    expect(accuracy.get("A")).toBeCloseTo(0.5);
    expect(accuracy.get("B")).toBeCloseTo(1);
  });

  it("files an unlabelled question somewhere rather than losing it", () => {
    const accuracy = topicAccuracy([
      { questionId: "q", topic: "", isCorrect: false, answeredAt: daysAgo(1) },
    ]);

    expect(accuracy.get("General")).toBe(0);
  });
});
