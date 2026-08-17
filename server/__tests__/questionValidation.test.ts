import { describe, it, expect } from "vitest";
import {
  validateGeneratedQuestion,
  detectAnswerLeakage,
  dedupeBatch,
  similarity,
  REQUIRED_CHOICE_COUNT,
  type GeneratedQuestion,
  type ValidationContext,
} from "../alexi/questionValidation";

function question(over: Partial<GeneratedQuestion> = {}): GeneratedQuestion {
  return {
    question: "A retail store with 12 employees seeks property coverage. Which policy form applies?",
    examId: "property_casualty",
    conceptId: "bop-eligibility",
    topic: "BOP Eligibility",
    difficulty: "standard",
    language: "en",
    choices: [
      { id: "A", text: "Businessowners Policy" },
      { id: "B", text: "Commercial Package Policy only" },
      { id: "C", text: "Personal lines homeowners form" },
      { id: "D", text: "Workers compensation policy" },
    ],
    correctAnswer: "A",
    explanation:
      "A Businessowners Policy is designed for small and medium businesses such as retail stores, bundling property and liability coverage.",
    distractorExplanations: {
      B: "A CPP is available but is not the form intended for a business this size.",
      C: "Homeowners forms cover residential, not commercial, exposures.",
      D: "Workers compensation covers employee injury, not property.",
    },
    sourceIds: ["src-1"],
    generationVersion: "question_generation@v1",
    ...over,
  };
}

const context: ValidationContext = {
  validExamIds: ["real_estate", "property_casualty", "life_insurance", "general_lines"],
  allowedSourceIds: ["src-1", "src-2"],
};

const codes = (q: GeneratedQuestion, ctx: ValidationContext = context) =>
  validateGeneratedQuestion(q, ctx).issues.map((i) => i.code);

describe("similarity", () => {
  it("scores identical text as 1", () => {
    expect(similarity("the quick brown fox", "the quick brown fox")).toBe(1);
  });

  it("scores unrelated text near 0", () => {
    expect(similarity("annuity payout options", "fire sprinkler classification")).toBeLessThan(0.2);
  });

  it("ignores case and punctuation", () => {
    expect(similarity("BOP Eligibility!", "bop eligibility")).toBe(1);
  });

  it("handles empty input without dividing by zero", () => {
    expect(similarity("", "something")).toBe(0);
    expect(similarity("", "")).toBe(0);
  });
});

describe("validateGeneratedQuestion - a good question", () => {
  it("passes", () => {
    const result = validateGeneratedQuestion(question(), context);

    expect(result.passed).toBe(true);
    expect(result.issues.filter((i) => i.severity === "critical")).toEqual([]);
    expect(result.qualityScore).toBeGreaterThan(80);
  });
});

describe("validateGeneratedQuestion - shape", () => {
  it("rejects the wrong number of choices", () => {
    const q = question({ choices: [{ id: "A", text: "One" }, { id: "B", text: "Two" }] });

    expect(validateGeneratedQuestion(q, context).passed).toBe(false);
    expect(codes(q)).toContain("wrong_choice_count");
  });

  it("requires exactly four choices", () => {
    expect(REQUIRED_CHOICE_COUNT).toBe(4);
  });

  it("rejects an empty choice", () => {
    const q = question({
      choices: [
        { id: "A", text: "Businessowners Policy" },
        { id: "B", text: "   " },
        { id: "C", text: "Homeowners" },
        { id: "D", text: "Workers comp" },
      ],
    });

    expect(codes(q)).toContain("empty_choice");
  });

  it("rejects textually identical options", () => {
    // Two identical options make the question unanswerable - one of them is
    // wrongly marked wrong.
    const q = question({
      choices: [
        { id: "A", text: "Businessowners Policy" },
        { id: "B", text: "businessowners policy!" },
        { id: "C", text: "Homeowners" },
        { id: "D", text: "Workers comp" },
      ],
    });

    expect(codes(q)).toContain("duplicate_choice_text");
  });

  it("rejects duplicate choice ids", () => {
    const q = question({
      choices: [
        { id: "A", text: "One" },
        { id: "A", text: "Two" },
        { id: "C", text: "Three" },
        { id: "D", text: "Four" },
      ],
    });

    expect(codes(q)).toContain("duplicate_choice_ids");
  });

  it("rejects a question that is too short to test anything", () => {
    expect(codes(question({ question: "Which one?" }))).toContain("question_too_short");
  });

  it("rejects a runaway question", () => {
    expect(codes(question({ question: "A".repeat(700) }))).toContain("question_too_long");
  });

  it("rejects empty question text", () => {
    expect(codes(question({ question: "   " }))).toContain("empty_question");
  });
});

describe("validateGeneratedQuestion - answer key", () => {
  it("rejects a correct answer that is not among the choices", () => {
    // The single most dangerous defect: an unanswerable question that marks
    // every student wrong.
    const q = question({ correctAnswer: "Z" });

    expect(validateGeneratedQuestion(q, context).passed).toBe(false);
    expect(codes(q)).toContain("correct_answer_not_in_choices");
  });

  it("rejects a missing correct answer", () => {
    expect(codes(question({ correctAnswer: "" }))).toContain("missing_correct_answer");
  });
});

describe("validateGeneratedQuestion - grounding", () => {
  it("rejects a question with no source ids", () => {
    // No source means it was written from model memory, which for Texas
    // licensing content is the failure mode this pipeline exists to stop.
    const q = question({ sourceIds: [] });

    expect(validateGeneratedQuestion(q, context).passed).toBe(false);
    expect(codes(q)).toContain("missing_source_grounding");
  });

  it("rejects sources the generator was never given", () => {
    // A fabricated citation is worse than none - it looks grounded.
    const q = question({ sourceIds: ["src-invented"] });

    expect(validateGeneratedQuestion(q, context).passed).toBe(false);
    expect(codes(q)).toContain("unknown_source_ids");
  });

  it("accepts sources drawn from the supplied set", () => {
    expect(codes(question({ sourceIds: ["src-1", "src-2"] }))).not.toContain("unknown_source_ids");
  });

  it("rejects a missing or stub explanation", () => {
    expect(codes(question({ explanation: "Because." }))).toContain("missing_explanation");
  });

  it("rejects content with no generation version", () => {
    // Without it, "what did prompt v1 produce?" is unanswerable after a
    // problem is found.
    expect(codes(question({ generationVersion: "" }))).toContain("missing_generation_version");
  });
});

describe("validateGeneratedQuestion - classification", () => {
  it("rejects an unknown exam id", () => {
    expect(codes(question({ examId: "texas_plumbing" }))).toContain("invalid_exam_id");
  });

  it("rejects an unknown difficulty", () => {
    expect(codes(question({ difficulty: "impossible" as never }))).toContain("invalid_difficulty");
  });

  it("rejects an unsupported language", () => {
    expect(codes(question({ language: "fr" as never }))).toContain("invalid_language");
  });

  it("warns when the concept does not match the topic", () => {
    const q = question({ conceptId: "annuities", topic: "BOP Eligibility" });

    expect(codes(q)).toContain("concept_topic_mismatch");
  });
});

describe("detectAnswerLeakage", () => {
  it("flags a correct answer far longer than the distractors", () => {
    // Writers elaborate on the truth; a test-wise student picks the long one.
    const issues = detectAnswerLeakage(
      question({
        choices: [
          {
            id: "A",
            text: "A Businessowners Policy, which bundles property and liability coverage specifically designed for small and medium sized commercial risks such as retail operations",
          },
          { id: "B", text: "A CPP" },
          { id: "C", text: "Homeowners" },
          { id: "D", text: "Workers comp" },
        ],
      }),
    );

    expect(issues.map((i) => i.code)).toContain("answer_length_tell");
  });

  it("flags a correct answer that echoes distinctive stem wording", () => {
    const issues = detectAnswerLeakage(
      question({
        question: "Which coverage applies to earthquake damage and subsidence damage?",
        choices: [
          { id: "A", text: "Earthquake and subsidence endorsement" },
          { id: "B", text: "Standard fire form" },
          { id: "C", text: "Liability form" },
          { id: "D", text: "Inland marine form" },
        ],
        correctAnswer: "A",
      }),
    );

    expect(issues.map((i) => i.code)).toContain("stem_echo");
  });

  it("flags absolute qualifiers appearing only in distractors", () => {
    const issues = detectAnswerLeakage(
      question({
        choices: [
          { id: "A", text: "Coverage may apply subject to policy terms" },
          { id: "B", text: "Coverage always applies without exception" },
          { id: "C", text: "Coverage never applies in any circumstance" },
          { id: "D", text: "All losses are covered every time" },
        ],
        correctAnswer: "A",
      }),
    );

    expect(issues.map((i) => i.code)).toContain("absolute_qualifier_tell");
  });

  it("stays quiet on a well-balanced question", () => {
    expect(detectAnswerLeakage(question())).toEqual([]);
  });

  it("does not throw when the correct answer is missing", () => {
    expect(() => detectAnswerLeakage(question({ correctAnswer: "Z" }))).not.toThrow();
  });
});

describe("validateGeneratedQuestion - weak options", () => {
  it("warns on 'all of the above'", () => {
    const q = question({
      choices: [
        { id: "A", text: "Businessowners Policy" },
        { id: "B", text: "Commercial Package Policy" },
        { id: "C", text: "Homeowners form" },
        { id: "D", text: "All of the above" },
      ],
    });

    expect(codes(q)).toContain("weak_option");
  });

  it("warns in Spanish too", () => {
    const q = question({
      language: "es",
      choices: [
        { id: "A", text: "Poliza Businessowners" },
        { id: "B", text: "Poliza comercial" },
        { id: "C", text: "Forma residencial" },
        { id: "D", text: "Ninguna de las anteriores" },
      ],
    });

    expect(codes(q)).toContain("weak_option");
  });

  it("warns when distractors have no explanation", () => {
    expect(codes(question({ distractorExplanations: {} })))
      .toContain("missing_distractor_explanations");
  });

  it("does not fail a question for warnings alone", () => {
    // Warnings shape ranking; only criticals discard.
    const result = validateGeneratedQuestion(question({ distractorExplanations: {} }), context);

    expect(result.passed).toBe(true);
    expect(result.qualityScore).toBeLessThan(100);
  });
});

describe("validateGeneratedQuestion - duplication", () => {
  it("rejects a near-duplicate of an existing question", () => {
    const q = question();
    const result = validateGeneratedQuestion(q, {
      ...context,
      existingQuestions: [q.question],
    });

    expect(result.passed).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain("near_duplicate");
  });

  it("accepts a genuinely different question on the same concept", () => {
    // The whole point of variants: same concept, new scenario.
    const result = validateGeneratedQuestion(question(), {
      ...context,
      existingQuestions: [
        "An apartment building owner requests liability coverage. Which endorsement is required for the pool?",
      ],
    });

    expect(result.passed).toBe(true);
  });
});

describe("quality scoring", () => {
  it("scores a failing question zero regardless of its other merits", () => {
    const result = validateGeneratedQuestion(question({ sourceIds: [] }), context);

    expect(result.qualityScore).toBe(0);
  });

  it("ranks a clean question above a warning-laden one", () => {
    const clean = validateGeneratedQuestion(question(), context);
    const messy = validateGeneratedQuestion(
      question({
        distractorExplanations: {},
        choices: [
          { id: "A", text: "Businessowners Policy" },
          { id: "B", text: "Commercial Package Policy" },
          { id: "C", text: "Homeowners form" },
          { id: "D", text: "All of the above" },
        ],
      }),
      context,
    );

    expect(clean.qualityScore).toBeGreaterThan(messy.qualityScore);
  });

  it("collects every issue in one pass rather than failing at the first", () => {
    const result = validateGeneratedQuestion(
      question({ sourceIds: [], explanation: "x", examId: "nope" }),
      context,
    );

    expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });
});

describe("dedupeBatch", () => {
  it("drops a rephrased duplicate from the same batch", () => {
    // A generator asked for eight variants routinely produces two that are the
    // same question in different words; bank comparison never catches that.
    const a = question({ question: "A retail store with 12 employees seeks property coverage. Which policy form applies?" });
    const b = question({ question: "A retail store with 12 employees seeks property coverage. Which policy form applies now?" });

    expect(dedupeBatch([a, b])).toHaveLength(1);
  });

  it("keeps genuinely distinct variants", () => {
    const a = question({ question: "A retail store with 12 employees seeks property coverage. Which form applies?" });
    const b = question({ question: "An oil refinery requests a package policy. Why is it ineligible for a BOP?" });

    expect(dedupeBatch([a, b])).toHaveLength(2);
  });

  it("handles an empty batch", () => {
    expect(dedupeBatch([])).toEqual([]);
  });
});
