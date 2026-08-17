import { describe, it, expect } from "vitest";
import {
  buildGenerationRequest,
  parseGenerationResponse,
  buildValidationRequest,
  interpretValidation,
  batchSizeFor,
  GENERATION_SCHEMA,
  VALIDATION_SCHEMA,
  GENERATION_VERSION,
  MAX_BATCH_SIZE,
  MIN_VALIDATOR_CONFIDENCE,
  type GenerationInput,
  type SourceQuestion,
} from "../alexi/questionGeneration";

const source: SourceQuestion = {
  id: "src-1",
  topic: "BOP Eligibility",
  questionText: "Which risk is eligible for a Businessowners Policy?",
  options: ["A small retail store", "A refinery", "A bank", "A mine"],
  correctIndex: 0,
  explanation: "Businessowners Policies are designed for small and medium-sized businesses.",
};

function input(over: Partial<GenerationInput> = {}): GenerationInput {
  return {
    examId: "property_casualty",
    conceptId: "bop-eligibility",
    sources: [source],
    count: 4,
    difficulty: "standard",
    language: "en",
    ...over,
  };
}

describe("buildGenerationRequest", () => {
  it("routes to the generation model role", () => {
    expect(buildGenerationRequest(input()).role).toBe("generation");
  });

  it("demands structured output rather than prose", () => {
    // Regexing exam questions out of prose is how wrong answers reach students.
    expect(buildGenerationRequest(input()).jsonSchema).toBe(GENERATION_SCHEMA);
  });

  it("includes the approved source material as grounding", () => {
    const request = buildGenerationRequest(input());

    expect(request.system).toContain("Businessowners Policies are designed for");
    expect(request.system).toContain("[id: src-1]");
    expect(request.system).toContain("APPROVED SOURCE MATERIAL");
  });

  it("forbids introducing facts the sources do not contain", () => {
    const request = buildGenerationRequest(input());

    expect(request.system).toMatch(/do not introduce any regulatory fact/i);
    expect(request.system).toMatch(/returning 3 well-grounded questions is correct/i);
  });

  it("requires every question to cite its sources", () => {
    expect(buildGenerationRequest(input()).system).toMatch(/must cite the ids/i);
  });

  it("forbids the weak option patterns the validator rejects", () => {
    // Prompt and validator must agree, or every batch loses questions to a
    // rule the generator was never told about.
    const request = buildGenerationRequest(input());

    expect(request.system).toMatch(/all of the above/i);
    expect(request.system).toMatch(/similar in length/i);
    expect(request.system).toMatch(/do not echo distinctive wording/i);
  });

  it("caps the batch so one call cannot balloon", () => {
    const request = buildGenerationRequest(input({ count: 50 }));

    expect(request.system).toContain(String(MAX_BATCH_SIZE));
    expect(request.system).not.toContain("50");
  });

  it("switches to Spanish when asked", () => {
    expect(buildGenerationRequest(input({ language: "es" })).system).toContain("Spanish");
  });

  it("carries the safety preamble", () => {
    const request = buildGenerationRequest(input());

    expect(request.system).toMatch(/not TREC, TDI, Pearson VUE/i);
    expect(request.system).toMatch(/never reveal/i);
  });
});

describe("parseGenerationResponse", () => {
  const valid = JSON.stringify({
    questions: [
      {
        question: "An accounting office with 8 staff needs coverage. Which form fits?",
        choices: [
          { id: "A", text: "Businessowners Policy" },
          { id: "B", text: "Refinery package" },
          { id: "C", text: "Homeowners" },
          { id: "D", text: "Auto policy" },
        ],
        correctAnswer: "A",
        explanation: "A BOP suits small and medium businesses including professional offices.",
        distractorExplanations: { B: "Not a small risk", C: "Residential", D: "Vehicles only" },
        sourceIds: ["src-1"],
      },
    ],
  });

  it("parses a well-formed batch", () => {
    const parsed = parseGenerationResponse(valid, input());

    expect(parsed).toHaveLength(1);
    expect(parsed[0].correctAnswer).toBe("A");
    expect(parsed[0].sourceIds).toEqual(["src-1"]);
  });

  it("stamps classification from our input, not the model", () => {
    // The model has no business deciding which exam or concept its output
    // belongs to - a mislabelled question corrupts mastery for two concepts.
    const withLies = JSON.stringify({
      questions: [
        {
          ...JSON.parse(valid).questions[0],
          examId: "life_insurance",
          conceptId: "annuities",
          difficulty: "challenge",
        },
      ],
    });
    const parsed = parseGenerationResponse(withLies, input());

    expect(parsed[0].examId).toBe("property_casualty");
    expect(parsed[0].conceptId).toBe("bop-eligibility");
    expect(parsed[0].difficulty).toBe("standard");
  });

  it("stamps the generation version for later audit", () => {
    expect(parseGenerationResponse(valid, input())[0].generationVersion).toBe(GENERATION_VERSION);
    expect(GENERATION_VERSION).toContain("@");
  });

  it("returns nothing for unparseable output rather than throwing", () => {
    // A generator producing garbage is expected, not exceptional - the caller
    // falls back to bank questions and the student notices nothing.
    expect(parseGenerationResponse("not json at all", input())).toEqual([]);
    expect(parseGenerationResponse("", input())).toEqual([]);
  });

  it("returns nothing when the payload has no questions array", () => {
    expect(parseGenerationResponse(JSON.stringify({ result: "ok" }), input())).toEqual([]);
  });

  it("skips malformed entries but keeps good ones", () => {
    const mixed = JSON.stringify({
      questions: [{ nonsense: true }, JSON.parse(valid).questions[0]],
    });

    expect(parseGenerationResponse(mixed, input())).toHaveLength(1);
  });

  it("defaults missing fields to empty so validation rejects rather than crashes", () => {
    const partial = JSON.stringify({ questions: [{ question: "A question with enough length here?" }] });
    const parsed = parseGenerationResponse(partial, input());

    expect(parsed[0].choices).toEqual([]);
    expect(parsed[0].sourceIds).toEqual([]);
    expect(parsed[0].explanation).toBe("");
  });

  it("drops non-string source ids", () => {
    const dirty = JSON.stringify({
      questions: [{ ...JSON.parse(valid).questions[0], sourceIds: ["src-1", 42, null] }],
    });

    expect(parseGenerationResponse(dirty, input())[0].sourceIds).toEqual(["src-1"]);
  });
});

describe("buildValidationRequest", () => {
  const draft = parseGenerationResponse(
    JSON.stringify({
      questions: [
        {
          question: "An accounting office with 8 staff needs coverage. Which form fits?",
          choices: [
            { id: "A", text: "Businessowners Policy" },
            { id: "B", text: "Refinery package" },
            { id: "C", text: "Homeowners" },
            { id: "D", text: "Auto policy" },
          ],
          correctAnswer: "A",
          explanation: "A BOP suits small and medium businesses including professional offices.",
          distractorExplanations: {},
          sourceIds: ["src-1"],
        },
      ],
    }),
    input(),
  )[0];

  it("routes to the validation model role", () => {
    expect(buildValidationRequest(draft, [source]).role).toBe("validation");
  });

  it("demands a structured verdict", () => {
    expect(buildValidationRequest(draft, [source]).jsonSchema).toBe(VALIDATION_SCHEMA);
  });

  it("tells the validator to default to failing", () => {
    // A wrongly rejected question costs one question. A wrongly approved one
    // can teach a student something false before their exam.
    const request = buildValidationRequest(draft, [source]);

    expect(request.system).toMatch(/default to FAIL/i);
    expect(request.system).toMatch(/if you are unsure.*that is\s+a FAIL/is);
  });

  it("forbids the validator from repairing the question", () => {
    expect(buildValidationRequest(draft, [source]).system).toMatch(/do not rewrite or repair/i);
  });

  it("shows the draft and sources but not the generator's reasoning", () => {
    const request = buildValidationRequest(draft, [source]);

    expect(request.messages[0].content).toContain("Stated correct answer: A");
    expect(request.system).toContain("Businessowners Policies are designed for");
    // Nothing about why the generator thought this was good.
    expect(request.messages[0].content).not.toMatch(/because I|I chose|rationale/i);
  });
});

describe("interpretValidation", () => {
  it("accepts a confident pass", () => {
    const verdict = interpretValidation(
      JSON.stringify({ verdict: "PASS", confidence: 0.92, reason: "Well grounded" }),
    );

    expect(verdict.verdict).toBe("PASS");
  });

  it("respects an explicit fail", () => {
    const verdict = interpretValidation(
      JSON.stringify({ verdict: "FAIL", confidence: 0.9, reason: "Two defensible answers" }),
    );

    expect(verdict.verdict).toBe("FAIL");
    expect(verdict.reason).toMatch(/two defensible/i);
  });

  it("fails a low-confidence pass", () => {
    // A hedged approval is not an approval.
    const verdict = interpretValidation(
      JSON.stringify({ verdict: "PASS", confidence: 0.4, reason: "Probably fine" }),
    );

    expect(verdict.verdict).toBe("FAIL");
    expect(verdict.reason).toMatch(/low confidence/i);
  });

  it("uses the documented confidence floor", () => {
    const justUnder = interpretValidation(
      JSON.stringify({ verdict: "PASS", confidence: MIN_VALIDATOR_CONFIDENCE - 0.01, reason: "x" }),
    );
    const atFloor = interpretValidation(
      JSON.stringify({ verdict: "PASS", confidence: MIN_VALIDATOR_CONFIDENCE, reason: "x" }),
    );

    expect(justUnder.verdict).toBe("FAIL");
    expect(atFloor.verdict).toBe("PASS");
  });

  it("fails a pass that also lists ungrounded claims", () => {
    // Self-contradictory output: take the specific claims over the verdict.
    const verdict = interpretValidation(
      JSON.stringify({
        verdict: "PASS",
        confidence: 0.95,
        reason: "Looks fine",
        ungroundedClaims: ["States a 30-day cancellation notice not present in the source"],
      }),
    );

    expect(verdict.verdict).toBe("FAIL");
    expect(verdict.reason).toMatch(/30-day cancellation/);
  });

  it("fails closed on unparseable validator output", () => {
    expect(interpretValidation("garbage").verdict).toBe("FAIL");
    expect(interpretValidation("").verdict).toBe("FAIL");
  });

  it("fails closed when no verdict is present", () => {
    expect(interpretValidation(JSON.stringify({ confidence: 0.99 })).verdict).toBe("FAIL");
  });

  it("fails closed on a missing confidence", () => {
    expect(interpretValidation(JSON.stringify({ verdict: "PASS", reason: "ok" })).verdict)
      .toBe("FAIL");
  });
});

describe("batchSizeFor", () => {
  it("over-requests so validation rejections do not force a second round trip", () => {
    expect(batchSizeFor(5, 0.7)).toBeGreaterThan(5);
  });

  it("never exceeds the batch cap", () => {
    expect(batchSizeFor(100)).toBe(MAX_BATCH_SIZE);
  });

  it("returns nothing for a non-positive request", () => {
    expect(batchSizeFor(0)).toBe(0);
    expect(batchSizeFor(-3)).toBe(0);
  });

  it("keeps a 20-question quiz well under 20 model calls", () => {
    // The mission's efficiency rule: batches, not one call per question.
    const callsNeeded = Math.ceil(20 / MAX_BATCH_SIZE);

    expect(callsNeeded).toBeLessThanOrEqual(3);
  });
});
