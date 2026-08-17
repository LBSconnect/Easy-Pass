/**
 * Question generation and the AI second-pass validator.
 *
 * SCOPE, stated plainly: this generates VARIANTS of approved bank questions -
 * same concept, new scenario, new distractors. It does not write net-new
 * questions about Texas law, because we hold no approved regulatory source to
 * ground that against. A variant's grounding is the source question and its
 * reviewed explanation, both of which exist today. Net-new generation waits on
 * the approved knowledge layer.
 *
 * Efficiency: one model call produces a whole batch. A 20-question quiz must
 * never be 20 round trips.
 *
 * Request construction and response parsing are pure so the schema contract,
 * the batching and the validator's fail-closed behaviour are all testable
 * without a provider.
 */

import { conceptIdFor, conceptLabel } from "@shared/concepts";
import { QUESTION_GENERATION, QUESTION_VALIDATION, promptRef } from "../ai/prompts";
import type { CompletionRequest } from "../ai/provider";
import type { GeneratedDifficulty, GeneratedQuestion } from "./questionValidation";

export const GENERATION_VERSION = promptRef(QUESTION_GENERATION);
export const VALIDATION_VERSION = promptRef(QUESTION_VALIDATION);

/** An approved bank question used as grounding. */
export interface SourceQuestion {
  id: string;
  topic: string | null;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
}

/**
 * Structured output schema for a generation batch.
 *
 * Every field the validator needs is required. Parsing exam questions out of
 * free prose is how wrong answers reach students, so the shape is enforced at
 * the provider rather than by us regexing a response.
 */
export const GENERATION_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["questions"],
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        required: [
          "question",
          "choices",
          "correctAnswer",
          "explanation",
          "distractorExplanations",
          "sourceIds",
        ],
        additionalProperties: false,
        properties: {
          question: { type: "string", minLength: 20, maxLength: 600 },
          choices: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "object",
              required: ["id", "text"],
              additionalProperties: false,
              properties: {
                id: { type: "string", enum: ["A", "B", "C", "D"] },
                text: { type: "string", minLength: 1 },
              },
            },
          },
          correctAnswer: { type: "string", enum: ["A", "B", "C", "D"] },
          explanation: { type: "string", minLength: 30 },
          distractorExplanations: {
            type: "object",
            additionalProperties: { type: "string" },
          },
          sourceIds: { type: "array", minItems: 1, items: { type: "string" } },
        },
      },
    },
  },
};

/** Structured output schema for the validator. */
export const VALIDATION_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["verdict", "confidence", "reason"],
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["PASS", "FAIL"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string", minLength: 1, maxLength: 500 },
    ungroundedClaims: { type: "array", items: { type: "string" } },
  },
};

export interface GenerationInput {
  examId: string;
  conceptId: string;
  sources: SourceQuestion[];
  count: number;
  difficulty: GeneratedDifficulty;
  language: "en" | "es";
}

/** Cap per call: beyond this, quality degrades and one failure costs more. */
export const MAX_BATCH_SIZE = 8;
/** Sources per call. Enough to vary from, few enough to stay in context. */
export const MAX_SOURCES = 6;

function renderSources(sources: SourceQuestion[], language: "en" | "es"): string {
  const letter = (i: number) => String.fromCharCode(65 + i);

  return sources
    .slice(0, MAX_SOURCES)
    .map((s) => {
      const lines = [
        `[id: ${s.id}]`,
        `Question: ${s.questionText}`,
        ...s.options.map((o, i) => `  ${letter(i)}. ${o}`),
        `Correct: ${letter(s.correctIndex)}`,
      ];
      if (s.explanation) lines.push(`Approved explanation: ${s.explanation}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

export function buildGenerationRequest(input: GenerationInput): CompletionRequest {
  const label = conceptLabel(input.conceptId, input.sources[0]?.topic ?? null);

  return {
    role: "generation",
    system: QUESTION_GENERATION.build({
      count: String(Math.min(input.count, MAX_BATCH_SIZE)),
      conceptLabel: label,
      examId: input.examId,
      difficulty: input.difficulty,
      language: input.language === "es" ? "Spanish" : "English",
      sources: renderSources(input.sources, input.language),
    }),
    messages: [
      {
        role: "user",
        content: `Write ${Math.min(input.count, MAX_BATCH_SIZE)} grounded variant questions on this concept.`,
      },
    ],
    jsonSchema: GENERATION_SCHEMA,
  };
}

/**
 * Parse a generation response into candidate questions.
 *
 * Returns [] rather than throwing on malformed output. A generator producing
 * garbage is an expected condition, not an exception - the caller falls back
 * to approved bank questions and the student notices nothing.
 */
export function parseGenerationResponse(
  raw: string,
  input: GenerationInput,
): GeneratedQuestion[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const items = (parsed as { questions?: unknown[] })?.questions;
  if (!Array.isArray(items)) return [];

  const topic = input.sources[0]?.topic ?? null;

  return items.flatMap((item) => {
    const q = item as Partial<GeneratedQuestion>;
    if (!q || typeof q.question !== "string") return [];

    // Classification fields are stamped by us, never taken from the model -
    // it has no business deciding which exam or concept its output belongs to,
    // and trusting it there would let a mislabelled question corrupt mastery.
    return [{
      question: q.question,
      examId: input.examId,
      conceptId: input.conceptId,
      topic: topic ?? conceptLabel(input.conceptId),
      difficulty: input.difficulty,
      language: input.language,
      choices: Array.isArray(q.choices) ? q.choices : [],
      correctAnswer: typeof q.correctAnswer === "string" ? q.correctAnswer : "",
      explanation: typeof q.explanation === "string" ? q.explanation : "",
      distractorExplanations:
        q.distractorExplanations && typeof q.distractorExplanations === "object"
          ? q.distractorExplanations
          : {},
      sourceIds: Array.isArray(q.sourceIds) ? q.sourceIds.filter((s) => typeof s === "string") : [],
      generationVersion: GENERATION_VERSION,
    } as GeneratedQuestion];
  });
}

export interface ValidationVerdict {
  verdict: "PASS" | "FAIL";
  confidence: number;
  reason: string;
  ungroundedClaims?: string[];
}

/**
 * Build the second-pass validation request.
 *
 * The validator sees the question and the source material - never the
 * generator's reasoning. A validator shown the case for a question tends to
 * agree with it.
 */
export function buildValidationRequest(
  q: GeneratedQuestion,
  sources: SourceQuestion[],
): CompletionRequest {
  const draft = [
    `Question: ${q.question}`,
    ...q.choices.map((c) => `  ${c.id}. ${c.text}`),
    `Stated correct answer: ${q.correctAnswer}`,
    `Stated explanation: ${q.explanation}`,
  ].join("\n");

  return {
    role: "validation",
    system: QUESTION_VALIDATION.build({
      conceptLabel: conceptLabel(q.conceptId, q.topic),
      sources: renderSources(sources, q.language),
    }),
    messages: [{ role: "user", content: draft }],
    jsonSchema: VALIDATION_SCHEMA,
  };
}

/** Below this confidence a PASS is not trusted. */
export const MIN_VALIDATOR_CONFIDENCE = 0.7;

/**
 * Interpret a validator response.
 *
 * Fails closed in every ambiguous case: unparseable output, a missing verdict,
 * or a low-confidence PASS all reject. The asymmetry is deliberate - a wrongly
 * rejected question costs us one question, a wrongly approved one can teach a
 * student something false before their exam.
 */
export function interpretValidation(raw: string): ValidationVerdict {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { verdict: "FAIL", confidence: 0, reason: "Validator response was not valid JSON" };
  }

  const v = parsed as Partial<ValidationVerdict>;
  if (v?.verdict !== "PASS" && v?.verdict !== "FAIL") {
    return { verdict: "FAIL", confidence: 0, reason: "Validator returned no usable verdict" };
  }

  const confidence = typeof v.confidence === "number" ? v.confidence : 0;

  if (v.verdict === "PASS" && confidence < MIN_VALIDATOR_CONFIDENCE) {
    return {
      verdict: "FAIL",
      confidence,
      reason: `Validator passed with low confidence (${confidence.toFixed(2)})`,
    };
  }

  // A PASS that also lists ungrounded claims is self-contradictory; take the
  // claims as the more specific signal.
  if (v.verdict === "PASS" && Array.isArray(v.ungroundedClaims) && v.ungroundedClaims.length > 0) {
    return {
      verdict: "FAIL",
      confidence,
      reason: `Validator passed but flagged ungrounded claims: ${v.ungroundedClaims.join("; ")}`,
      ungroundedClaims: v.ungroundedClaims,
    };
  }

  return {
    verdict: v.verdict,
    confidence,
    reason: typeof v.reason === "string" ? v.reason : "",
    ungroundedClaims: Array.isArray(v.ungroundedClaims) ? v.ungroundedClaims : undefined,
  };
}

/**
 * How many questions to request to end up with roughly `wanted`.
 *
 * Validation rejects a real fraction of any batch, so asking for exactly the
 * number needed reliably under-delivers and triggers a second round trip.
 */
export function batchSizeFor(wanted: number, expectedPassRate = 0.7): number {
  if (wanted <= 0) return 0;
  return Math.min(MAX_BATCH_SIZE, Math.ceil(wanted / expectedPassRate));
}
