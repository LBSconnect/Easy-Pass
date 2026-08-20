import { describe, it, expect } from "vitest";
import {
  buildSessionPlan,
  resolveBlock,
  type PlanInput,
  reconcileLabel,
  type PlannableQuestion,
} from "../alexi/sessionPlan";

function q(
  id: string,
  topic: string,
  explanation: string | null = "Because the statute says so.",
): PlannableQuestion {
  return {
    id,
    topic,
    questionText: `Question ${id}?`,
    options: ["A", "B", "C", "D"],
    correctAnswer: 1,
    explanation,
  };
}

/** Fixed so a session built from history is reproducible. */
const NOW = new Date("2026-08-19T15:00:00Z");

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    blocks: [],
    pool: [q("a", "BOP Eligibility"), q("b", "BOP Eligibility"), q("c", "Texas Law")],
    exposures: [],
    answeredQuestionIds: new Set<string>(),
    conceptTopic: null,
    now: NOW,
    ...over,
  };
}

const block = (mode: any, itemCount = 3, purpose: any = "main") => ({
  mode,
  purpose,
  itemCount,
  estimatedMinutes: 5,
  label: `${mode} block`,
});

describe("resolveBlock - teach", () => {
  it("teaches from worked examples that carry an approved explanation", () => {
    const out = resolveBlock(block("teach"), input()) as any;

    expect(out.mode).toBe("teach");
    expect(out.examples.length).toBeGreaterThan(0);
    for (const e of out.examples) {
      expect(e.explanation.length).toBeGreaterThan(0);
      expect(e.correctIndex).toBe(1);
    }
  });

  it("drops the block rather than teaching from questions with no explanation", () => {
    // Generating the explanation instead would mean stating regulation from
    // memory, which is the one thing the grounding rule forbids.
    const pool = [q("a", "BOP Eligibility", null), q("b", "BOP Eligibility", "  ")];

    expect(resolveBlock(block("teach"), input({ pool }))).toBeNull();
  });

  it("never turns a lead-in into a lecture", () => {
    const pool = Array.from({ length: 20 }, (_, i) => q(`q${i}`, "BOP Eligibility"));
    const out = resolveBlock(block("teach", 20), input({ pool })) as any;

    expect(out.examples.length).toBeLessThanOrEqual(3);
  });

  it("leads with the concept the recommendation named", () => {
    const out = resolveBlock(
      block("teach", 1),
      input({ conceptTopic: "texas law" }),
    ) as any;

    expect(out.examples[0].topic).toBe("Texas Law");
  });
});

describe("resolveBlock - flashcards", () => {
  it("puts the question on the front and the answer plus reason on the back", () => {
    const out = resolveBlock(block("flashcards", 2), input()) as any;

    expect(out.cards).toHaveLength(2);
    expect(out.cards[0].front).toBe("Question a?");
    expect(out.cards[0].back).toContain("B");
    expect(out.cards[0].back).toContain("Because the statute says so.");
  });

  it("still makes a card when there is no explanation to add", () => {
    const out = resolveBlock(
      block("flashcards", 1),
      input({ pool: [q("a", "T", null)] }),
    ) as any;

    expect(out.cards[0].back).toBe("B");
  });
});

/**
 * Review is retrieval, not reading.
 *
 * It used to hand the client every item with `correctIndex` and the
 * explanation already attached, and the page rendered them straight away - the
 * student read their mistakes back. That is the notebook page, and re-reading
 * a worked answer is the weakest way to study. These pin the block asking
 * instead, and pin the answer key staying on the server until it does.
 */
describe("resolveBlock - review", () => {
  const wrong = (id: string, topic: string, daysAgo: number) => ({
    questionId: id,
    topic,
    isCorrect: false,
    answeredAt: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000),
  });

  it("asks the student rather than showing them the answer", () => {
    const out = resolveBlock(
      block("review", 5),
      input({ exposures: [wrong("c", "Texas Law", 5), wrong("a", "BOP Eligibility", 5)] }),
    ) as any;

    expect(out.questions).toHaveLength(2);
    for (const question of out.questions) {
      expect(question).not.toHaveProperty("correctIndex");
      expect(question).not.toHaveProperty("explanation");
      expect(question.options.length).toBeGreaterThan(1);
    }
  });

  it("prefers the item the student last got wrong over one they got right", () => {
    const out = resolveBlock(
      block("review", 1),
      input({
        exposures: [
          { questionId: "a", topic: "BOP Eligibility", isCorrect: true, answeredAt: new Date(NOW.getTime() - 5 * 86400000) },
          wrong("c", "Texas Law", 5),
        ],
      }),
    ) as any;

    expect(out.questions.map((q: any) => q.questionId)).toEqual(["c"]);
  });

  it("will not re-ask something answered minutes ago", () => {
    // Inside one sitting that measures whether the answer is still on screen.
    const justNow = {
      questionId: "a",
      topic: "BOP Eligibility",
      isCorrect: false,
      answeredAt: new Date(NOW.getTime() - 60 * 1000),
    };

    expect(resolveBlock(block("review"), input({ exposures: [justNow] }))).toBeNull();
  });

  it("drops the block when the student has answered nothing, rather than faking a review", () => {
    // Building one out of unseen questions would make review mean practice.
    // The session keeps its warm-up and mastery check either way.
    expect(resolveBlock(block("review"), input({ exposures: [] }))).toBeNull();
  });

  it("ignores history for questions no longer in the active pool", () => {
    const out = resolveBlock(
      block("review"),
      input({ exposures: [wrong("retired-question", "Texas Law", 5), wrong("a", "BOP Eligibility", 5)] }),
    ) as any;

    expect(out.questions.map((q: any) => q.questionId)).toEqual(["a"]);
  });

  it("mixes concepts rather than asking one topic in a row", () => {
    const out = resolveBlock(
      block("review", 3),
      input({
        exposures: [
          wrong("a", "BOP Eligibility", 5),
          wrong("b", "BOP Eligibility", 5),
          wrong("c", "Texas Law", 5),
        ],
      }),
    ) as any;

    const topics = out.questions.map((q: any) => q.topic);
    expect(topics).toHaveLength(3);
    // Only two topics exist here, so the middle one has to break the pair.
    expect(topics[0]).not.toBe(topics[1]);
  });

  it("tells the truth about how many questions it found", () => {
    const out = resolveBlock(
      { mode: "review", purpose: "main" as const, itemCount: 9, estimatedMinutes: 5, label: "9 questions from memory" },
      input({ exposures: [wrong("a", "BOP Eligibility", 5)] }),
    ) as any;

    expect(out.label).toBe("1 questions from memory");
  });
});

describe("resolveBlock - practice", () => {
  it("never sends the correct answer to the client", () => {
    const out = resolveBlock(block("practice", 3), input()) as any;

    for (const question of out.questions) {
      expect(question).not.toHaveProperty("correctIndex");
      expect(question).not.toHaveProperty("correctAnswer");
      expect(question).not.toHaveProperty("explanation");
    }
  });

  it("prefers questions the student has not answered before", () => {
    const out = resolveBlock(
      block("practice", 2),
      input({ answeredQuestionIds: new Set(["a", "b"]) }),
    ) as any;

    expect(out.questions[0].questionId).toBe("c");
  });

  it("falls back to seen questions rather than returning a short block", () => {
    const out = resolveBlock(
      block("practice", 3),
      input({ answeredQuestionIds: new Set(["a", "b", "c"]) }),
    ) as any;

    expect(out.questions).toHaveLength(3);
  });
});

describe("resolveBlock - mock exam", () => {
  it("is referenced, never inlined", () => {
    const out = resolveBlock(block("mock_exam"), input()) as any;

    expect(out.mode).toBe("mock_exam");
    expect(out).not.toHaveProperty("questions");
  });
});

describe("buildSessionPlan", () => {
  it("keeps the recommendation's order", () => {
    const plan = buildSessionPlan(
      input({
        blocks: [block("teach"), block("flashcards"), block("practice")],
      }),
    );

    expect(plan.blocks.map((b) => b.mode)).toEqual(["teach", "flashcards", "practice"]);
  });

  it("re-estimates from the blocks that survived", () => {
    // The review block cannot be built with no history, so its minutes must not
    // stay in the total - a student told 15 minutes should not be handed 10.
    const plan = buildSessionPlan(
      input({ blocks: [block("teach"), block("review")], exposures: [] }),
    );

    expect(plan.blocks).toHaveLength(1);
    expect(plan.estimatedMinutes).toBe(5);
  });

  it("collects only the question ids it will actually grade", () => {
    const plan = buildSessionPlan(
      input({
        blocks: [block("teach"), block("practice", 2), block("flashcards")],
      }),
    );

    // Teach and flashcard items are shown, never answered, so they are not
    // part of the answer-order bookkeeping.
    expect(plan.questionIds).toHaveLength(2);
  });

  it("carries each block's purpose through to the client", () => {
    // The client names steps from purpose: without it a mastery check reads as
    // "Targeted practice" again, which is what the block before it said. The
    // resolver builds new objects, so this is exactly where it got dropped.
    const plan = buildSessionPlan(
      input({ blocks: [block("teach", 3, "main"), block("practice", 2, "check")] }),
    );

    expect(plan.blocks.map((b) => b.purpose)).toEqual(["main", "check"]);
  });

  it("grades the review answers too", () => {
    // Review questions are answered now, so they count. Leaving them out meant
    // a student could retrieve a dozen items and have none of it reach their
    // mastery - which is the measurement the whole adapt loop runs on.
    const plan = buildSessionPlan(
      input({
        blocks: [block("review", 2), block("practice", 2)],
        exposures: [
          { questionId: "a", topic: "BOP Eligibility", isCorrect: false, answeredAt: new Date(NOW.getTime() - 5 * 86400000) },
          { questionId: "c", topic: "Texas Law", isCorrect: false, answeredAt: new Date(NOW.getTime() - 5 * 86400000) },
        ],
      }),
    );

    expect(plan.questionIds).toHaveLength(4);
  });

  it("returns an empty plan rather than throwing when nothing can be built", () => {
    const plan = buildSessionPlan(input({ blocks: [block("review")], pool: [] }));

    expect(plan.blocks).toEqual([]);
    expect(plan.estimatedMinutes).toBe(0);
  });
});

describe("reconcileLabel", () => {
  it("corrects a count the bank could not meet", () => {
    expect(reconcileLabel("8 smart flashcards", 3)).toBe("3 smart flashcards");
    expect(reconcileLabel("5-question mastery check", 2)).toBe("2-question mastery check");
  });

  it("leaves a label that was already right alone", () => {
    expect(reconcileLabel("8 smart flashcards", 8)).toBe("8 smart flashcards");
  });

  it("leaves a label with no count alone", () => {
    expect(reconcileLabel("Mixed review", 4)).toBe("Mixed review");
  });

  it("is applied to blocks whose label states a quantity", () => {
    const short = buildSessionPlan(
      input({
        blocks: [{ mode: "flashcards", purpose: "main" as const, itemCount: 8, estimatedMinutes: 4, label: "8 smart flashcards" }],
        pool: [q("a", "T"), q("b", "T")],
      }),
    );

    expect(short.blocks[0].label).toBe("2 smart flashcards");
  });

  it("is not applied to a teach label, where a number names the subject", () => {
    const plan = buildSessionPlan(
      input({
        blocks: [{ mode: "teach", purpose: "main" as const, itemCount: 3, estimatedMinutes: 3, label: "Section 5 explained simply" }],
        pool: [q("a", "T")],
      }),
    );

    expect(plan.blocks[0].label).toBe("Section 5 explained simply");
  });
});
