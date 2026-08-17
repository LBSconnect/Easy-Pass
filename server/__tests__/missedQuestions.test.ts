import { describe, it, expect } from "vitest";
import {
  buildNotebook,
  filterNotebook,
  notebookCounts,
  RECENT_WINDOW_DAYS,
  type AnswerEvent,
} from "../missedQuestions";

const NOW = new Date("2026-08-17T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function ev(
  questionId: string,
  isCorrect: boolean,
  days: number,
  topic = "Law",
): AnswerEvent {
  return { questionId, topic, isCorrect, answeredAt: daysAgo(days) };
}

const ids = (list: ReturnType<typeof buildNotebook>) => list.map((e) => e.questionId);

describe("buildNotebook", () => {
  it("excludes questions that were never missed", () => {
    const book = buildNotebook([ev("clean", true, 1), ev("clean", true, 2)], NOW);

    expect(book).toEqual([]);
  });

  it("marks a question whose latest answer was wrong as struggling", () => {
    const book = buildNotebook([ev("q1", true, 5), ev("q1", false, 1)], NOW);

    expect(book[0].status).toBe("struggling");
  });

  it("marks a recovered question as mastered", () => {
    const book = buildNotebook([ev("q1", false, 5), ev("q1", true, 1)], NOW);

    expect(book[0].status).toBe("mastered");
  });

  it("keeps a mastered question in the notebook rather than deleting the history", () => {
    // The student should still be able to review what they once got wrong.
    const book = buildNotebook([ev("q1", false, 20), ev("q1", true, 1)], NOW);

    expect(book).toHaveLength(1);
    expect(book[0].timesWrong).toBe(1);
    expect(book[0].timesSeen).toBe(2);
  });

  it("is insensitive to the order responses arrive in", () => {
    const forward = buildNotebook([ev("q1", false, 5), ev("q1", true, 1)], NOW);
    const reversed = buildNotebook([ev("q1", true, 1), ev("q1", false, 5)], NOW);

    expect(forward[0].status).toBe(reversed[0].status);
    expect(forward[0].lastAnsweredAt).toEqual(reversed[0].lastAnsweredAt);
  });

  it("counts every wrong answer, not just the latest", () => {
    const book = buildNotebook(
      [ev("q1", false, 9), ev("q1", false, 5), ev("q1", true, 1)],
      NOW,
    );

    expect(book[0].timesWrong).toBe(2);
    expect(book[0].timesSeen).toBe(3);
  });

  it("flags entries answered inside the recent window", () => {
    const book = buildNotebook(
      [ev("fresh", false, 1), ev("old", false, RECENT_WINDOW_DAYS + 5)],
      NOW,
    );

    expect(book.find((e) => e.questionId === "fresh")!.isRecent).toBe(true);
    expect(book.find((e) => e.questionId === "old")!.isRecent).toBe(false);
  });

  it("sorts struggling questions ahead of mastered ones", () => {
    const book = buildNotebook(
      [ev("fixed", false, 9), ev("fixed", true, 1), ev("broken", false, 2)],
      NOW,
    );

    expect(ids(book)).toEqual(["broken", "fixed"]);
  });

  it("orders equally-struggling questions by how often they were missed", () => {
    const book = buildNotebook(
      [
        ev("once", false, 1),
        ev("thrice", false, 5),
        ev("thrice", false, 3),
        ev("thrice", false, 2),
      ],
      NOW,
    );

    expect(ids(book)).toEqual(["thrice", "once"]);
  });

  it("takes the topic from the most recent answer", () => {
    // A question re-topiced in the bank should report where it lives now.
    const book = buildNotebook(
      [ev("q1", false, 5, "Old Topic"), ev("q1", false, 1, "New Topic")],
      NOW,
    );

    expect(book[0].topic).toBe("New Topic");
  });

  it("handles an empty response log", () => {
    expect(buildNotebook([], NOW)).toEqual([]);
  });
});

describe("filterNotebook", () => {
  const book = buildNotebook(
    [
      ev("struggling-recent", false, 1, "Law"),
      ev("mastered-old", false, 30, "Property"),
      ev("mastered-old", true, 20, "Property"),
    ],
    NOW,
  );

  it("returns everything for 'all'", () => {
    expect(filterNotebook(book, "all")).toHaveLength(2);
  });

  it("filters to still-struggling questions", () => {
    expect(ids(filterNotebook(book, "struggling"))).toEqual(["struggling-recent"]);
  });

  it("filters to mastered questions", () => {
    expect(ids(filterNotebook(book, "mastered"))).toEqual(["mastered-old"]);
  });

  it("filters to the recent window", () => {
    expect(ids(filterNotebook(book, "recent"))).toEqual(["struggling-recent"]);
  });

  it("filters by topic", () => {
    expect(ids(filterNotebook(book, "topic", "Property"))).toEqual(["mastered-old"]);
  });

  it("returns nothing for a topic filter with no topic given", () => {
    // Returning everything would misrepresent the filter as applied.
    expect(filterNotebook(book, "topic")).toEqual([]);
  });
});

describe("notebookCounts", () => {
  it("counts each bucket for the filter chips", () => {
    const book = buildNotebook(
      [
        ev("a", false, 1),
        ev("b", false, 30),
        ev("c", false, 30),
        ev("c", true, 29),
      ],
      NOW,
    );

    expect(notebookCounts(book)).toEqual({
      all: 3,
      struggling: 2,
      mastered: 1,
      recent: 1,
    });
  });

  it("returns zeroes for an empty notebook", () => {
    expect(notebookCounts([])).toEqual({ all: 0, struggling: 0, mastered: 0, recent: 0 });
  });
});
