/**
 * Deterministic validation of generated questions.
 *
 * This is the gate. Nothing generated reaches a student without passing every
 * critical check here, and a failure discards the question rather than
 * repairing it - a question we had to argue with is not one to put in front of
 * someone sitting a licensing exam.
 *
 * Everything in this file is programmatic and pure. An AI second pass runs
 * afterwards (see aiValidation), but it runs SECOND: cheap deterministic
 * checks reject most bad output before we pay a model to look at it, and a
 * check that can be expressed as code should never be delegated to a sampler.
 */

import { conceptIdFor } from "@shared/concepts";

/** Difficulty ladder, mirroring the adaptive engine's levels. */
export type GeneratedDifficulty = "foundation" | "standard" | "exam_level" | "challenge";

export interface GeneratedChoice {
  id: string;
  text: string;
}

/** The strict shape a generator must return. */
export interface GeneratedQuestion {
  question: string;
  examId: string;
  conceptId: string;
  topic: string;
  difficulty: GeneratedDifficulty;
  language: "en" | "es";
  choices: GeneratedChoice[];
  correctAnswer: string;
  explanation: string;
  distractorExplanations: Record<string, string>;
  /** Ids of the approved questions this was derived from. Never empty. */
  sourceIds: string[];
  generationVersion: string;
}

export type ValidationSeverity = "critical" | "warning";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  detail: string;
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  /** 0-100. Warnings cost points; criticals fail outright. */
  qualityScore: number;
}

export const REQUIRED_CHOICE_COUNT = 4;
export const MIN_QUESTION_CHARS = 20;
export const MAX_QUESTION_CHARS = 600;
export const MIN_EXPLANATION_CHARS = 30;
/** Jaccard similarity at or above which two questions are near-duplicates. */
export const DUPLICATE_SIMILARITY = 0.75;

const VALID_DIFFICULTIES: GeneratedDifficulty[] = [
  "foundation",
  "standard",
  "exam_level",
  "challenge",
];

/**
 * Options that make a question weaker as an assessment.
 *
 * "All of the above" is guessable from partial knowledge, and absolute
 * qualifiers in a distractor are a well-known tell that it is the wrong one -
 * both let a test-wise student score without knowing the material.
 */
const WEAK_OPTION_PATTERNS = [
  /^all of the above$/i,
  /^none of the above$/i,
  /^both [ab] and [bc]$/i,
  /^todas las anteriores$/i,
  /^ninguna de las anteriores$/i,
];

const ABSOLUTE_QUALIFIERS = /\b(always|never|all|none|every|siempre|nunca|todos|ninguno)\b/i;

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/gi, " ").replace(/\s+/g, " ").trim();
}

function tokenSet(text: string): Set<string> {
  // Two-character tokens and shorter are noise for similarity purposes.
  return new Set(normalizeText(text).split(" ").filter((w) => w.length > 2));
}

/** Jaccard similarity of two texts, 0-1. */
export function similarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let shared = 0;
  for (const token of Array.from(setA)) if (setB.has(token)) shared++;

  return shared / (setA.size + setB.size - shared);
}

/**
 * Detect a correct answer that gives itself away.
 *
 * Two classic tells: the correct option being conspicuously longer than the
 * distractors (writers elaborate on the truth), and it echoing distinctive
 * wording from the stem. Both let a student pick correctly without knowing
 * the material, which makes the question useless for measuring readiness.
 */
export function detectAnswerLeakage(q: GeneratedQuestion): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const correct = q.choices.find((c) => c.id === q.correctAnswer);
  if (!correct) return issues;

  const others = q.choices.filter((c) => c.id !== q.correctAnswer);
  if (others.length === 0) return issues;

  const avgOtherLength = others.reduce((sum, c) => sum + c.text.length, 0) / others.length;
  if (avgOtherLength > 0 && correct.text.length > avgOtherLength * 1.8) {
    issues.push({
      code: "answer_length_tell",
      severity: "warning",
      detail: `Correct option is ${Math.round(correct.text.length / avgOtherLength)}x the average distractor length`,
    });
  }

  // Distinctive stem words reappearing only in the correct option.
  const stemTokens = tokenSet(q.question);
  const correctTokens = tokenSet(correct.text);
  const otherTokens = new Set(others.flatMap((c) => Array.from(tokenSet(c.text))));

  let exclusiveEchoes = 0;
  for (const token of Array.from(correctTokens)) {
    if (token.length > 5 && stemTokens.has(token) && !otherTokens.has(token)) exclusiveEchoes++;
  }
  if (exclusiveEchoes >= 2) {
    issues.push({
      code: "stem_echo",
      severity: "warning",
      detail: `Correct option uniquely echoes ${exclusiveEchoes} distinctive words from the question stem`,
    });
  }

  // An absolute qualifier in every distractor but not the answer is the same
  // tell in reverse.
  const distractorsAbsolute = others.every((c) => ABSOLUTE_QUALIFIERS.test(c.text));
  if (distractorsAbsolute && !ABSOLUTE_QUALIFIERS.test(correct.text)) {
    issues.push({
      code: "absolute_qualifier_tell",
      severity: "warning",
      detail: "Every distractor uses an absolute qualifier and the correct answer does not",
    });
  }

  return issues;
}

export interface ValidationContext {
  /** Categories that actually exist. */
  validExamIds: string[];
  /** Existing question text to check for near-duplicates. */
  existingQuestions?: string[];
  /** Ids the generator was told to derive from. */
  allowedSourceIds?: string[];
}

/**
 * Run every deterministic check.
 *
 * Order does not matter - all issues are collected so a rejected question can
 * be diagnosed in one pass rather than one failure at a time.
 */
export function validateGeneratedQuestion(
  q: GeneratedQuestion,
  context: ValidationContext,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const critical = (code: string, detail: string) =>
    issues.push({ code, severity: "critical", detail });
  const warn = (code: string, detail: string) =>
    issues.push({ code, severity: "warning", detail });

  // --- Shape -------------------------------------------------------------
  if (!q.question || !q.question.trim()) {
    critical("empty_question", "Question text is empty");
  } else {
    const len = q.question.trim().length;
    if (len < MIN_QUESTION_CHARS) {
      critical("question_too_short", `Question is ${len} chars, minimum ${MIN_QUESTION_CHARS}`);
    }
    if (len > MAX_QUESTION_CHARS) {
      critical("question_too_long", `Question is ${len} chars, maximum ${MAX_QUESTION_CHARS}`);
    }
  }

  if (!Array.isArray(q.choices) || q.choices.length !== REQUIRED_CHOICE_COUNT) {
    critical(
      "wrong_choice_count",
      `Expected ${REQUIRED_CHOICE_COUNT} choices, got ${q.choices?.length ?? 0}`,
    );
  }

  const choices = Array.isArray(q.choices) ? q.choices : [];

  if (choices.some((c) => !c?.text || !c.text.trim())) {
    critical("empty_choice", "At least one choice has no text");
  }

  const ids = choices.map((c) => c?.id);
  if (new Set(ids).size !== ids.length) {
    critical("duplicate_choice_ids", "Choice ids are not unique");
  }

  // Duplicate option text makes the question unanswerable: two identical
  // options cannot be distinguished, so one of them is wrongly marked wrong.
  const normalizedTexts = choices.map((c) => normalizeText(c?.text ?? ""));
  if (new Set(normalizedTexts).size !== normalizedTexts.length) {
    critical("duplicate_choice_text", "Two or more options are textually identical");
  }

  // --- Answer key --------------------------------------------------------
  if (!q.correctAnswer) {
    critical("missing_correct_answer", "No correct answer specified");
  } else if (!ids.includes(q.correctAnswer)) {
    critical(
      "correct_answer_not_in_choices",
      `Correct answer "${q.correctAnswer}" is not one of the choices`,
    );
  }

  // --- Classification ----------------------------------------------------
  if (!context.validExamIds.includes(q.examId)) {
    critical("invalid_exam_id", `Unknown exam id "${q.examId}"`);
  }
  if (!VALID_DIFFICULTIES.includes(q.difficulty)) {
    critical("invalid_difficulty", `Unknown difficulty "${q.difficulty}"`);
  }
  if (q.language !== "en" && q.language !== "es") {
    critical("invalid_language", `Unsupported language "${q.language}"`);
  }
  if (!q.conceptId || !q.conceptId.trim()) {
    critical("missing_concept", "No concept id");
  } else if (q.topic && conceptIdFor(q.topic) !== q.conceptId) {
    // A mismatch means the question would be filed under a concept it does not
    // actually test, which corrupts mastery for both concepts.
    warn(
      "concept_topic_mismatch",
      `Concept "${q.conceptId}" does not derive from topic "${q.topic}"`,
    );
  }

  // --- Grounding ---------------------------------------------------------
  // No source means the model wrote it from memory, which for Texas licensing
  // content is exactly the failure mode we refuse to ship.
  if (!Array.isArray(q.sourceIds) || q.sourceIds.length === 0) {
    critical("missing_source_grounding", "No source question ids - content is ungrounded");
  } else if (context.allowedSourceIds) {
    const unknown = q.sourceIds.filter((id) => !context.allowedSourceIds!.includes(id));
    if (unknown.length > 0) {
      critical(
        "unknown_source_ids",
        `Cites source ids that were not supplied: ${unknown.join(", ")}`,
      );
    }
  }

  if (!q.explanation || q.explanation.trim().length < MIN_EXPLANATION_CHARS) {
    critical(
      "missing_explanation",
      `Explanation is ${q.explanation?.trim().length ?? 0} chars, minimum ${MIN_EXPLANATION_CHARS}`,
    );
  }

  if (!q.generationVersion) {
    critical("missing_generation_version", "No generation version recorded");
  }

  // --- Quality -----------------------------------------------------------
  for (const choice of choices) {
    if (WEAK_OPTION_PATTERNS.some((p) => p.test((choice?.text ?? "").trim()))) {
      warn("weak_option", `Option "${choice.text}" is guessable from partial knowledge`);
    }
  }

  const missingDistractorExplanations = choices
    .filter((c) => c?.id && c.id !== q.correctAnswer)
    .filter((c) => !q.distractorExplanations?.[c.id]?.trim());
  if (missingDistractorExplanations.length > 0) {
    warn(
      "missing_distractor_explanations",
      `${missingDistractorExplanations.length} distractors have no explanation`,
    );
  }

  issues.push(...detectAnswerLeakage(q));

  // --- Duplication -------------------------------------------------------
  if (context.existingQuestions?.length) {
    for (const existing of context.existingQuestions) {
      const score = similarity(q.question, existing);
      if (score >= DUPLICATE_SIMILARITY) {
        critical(
          "near_duplicate",
          `Question is ${Math.round(score * 100)}% similar to an existing question`,
        );
        break;
      }
    }
  }

  const criticals = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    passed: criticals.length === 0,
    issues,
    // Warnings are worth 12 points each: enough that a question with three of
    // them ranks below a clean one, not so much that one cosmetic nit sinks it.
    qualityScore: criticals.length > 0 ? 0 : Math.max(0, 100 - warnings.length * 12),
  };
}

/**
 * Deduplicate a freshly generated batch against itself.
 *
 * A generator asked for eight variants of one concept will often produce two
 * that are the same question in different words. Checking each against the
 * bank does not catch that; they have to be checked against each other.
 */
export function dedupeBatch(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const kept: GeneratedQuestion[] = [];

  for (const q of questions) {
    const isDuplicate = kept.some((k) => similarity(q.question, k.question) >= DUPLICATE_SIMILARITY);
    if (!isDuplicate) kept.push(q);
  }

  return kept;
}
