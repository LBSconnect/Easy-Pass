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

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    blocks: [],
    pool: [q("a", "BOP Eligibility"), q("b", "BOP Eligibility"), q("c", "Texas Law")],
    missedQuestionIds: [],
    answeredQuestionIds: new Set<string>(),
    conceptTopic: null,
    ...over,
  };
}

const block = (mode: any, itemCount = 3) => ({
  mode,
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

describe("resolveBlock - review", () => {
  it("reviews questions the student actually got wrong", () => {
    const out = resolveBlock(
      block("review", 5),
      input({ missedQuestionIds: ["c", "a"] }),
    ) as any;

    expect(out.items.map((i: any) => i.questionId)).toEqual(["c", "a"]);
    // Reviewing a miss without the answer and the reason is useless.
    expect(out.items[0].correctIndex).toBe(1);
    expect(out.items[0].explanation).toBeTruthy();
  });

  it("drops the block when there is nothing missed, rather than faking a review", () => {
    expect(resolveBlock(block("review"), input({ missedQuestionIds: [] }))).toBeNull();
  });

  it("ignores missed ids that are no longer in the active pool", () => {
    const out = resolveBlock(
      block("review"),
      input({ missedQuestionIds: ["retired-question", "a"] }),
    ) as any;

    expect(out.items.map((i: any) => i.questionId)).toEqual(["a"]);
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
        missedQuestionIds: [],
      }),
    );

    expect(plan.blocks.map((b) => b.mode)).toEqual(["teach", "flashcards", "practice"]);
  });

  it("re-estimates from the blocks that survived", () => {
    // The review block cannot be built with no misses, so its minutes must not
    // stay in the total - a student told 15 minutes should not be handed 10.
    const plan = buildSessionPlan(
      input({ blocks: [block("teach"), block("review")], missedQuestionIds: [] }),
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
        blocks: [{ mode: "flashcards", itemCount: 8, estimatedMinutes: 4, label: "8 smart flashcards" }],
        pool: [q("a", "T"), q("b", "T")],
      }),
    );

    expect(short.blocks[0].label).toBe("2 smart flashcards");
  });

  it("is not applied to a teach label, where a number names the subject", () => {
    const plan = buildSessionPlan(
      input({
        blocks: [{ mode: "teach", itemCount: 3, estimatedMinutes: 3, label: "Section 5 explained simply" }],
        pool: [q("a", "T")],
      }),
    );

    expect(plan.blocks[0].label).toBe("Section 5 explained simply");
  });
});
