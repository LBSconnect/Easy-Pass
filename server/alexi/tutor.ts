/**
 * Grounded tutoring.
 *
 * Scope is deliberately narrow: the tutor re-explains a question the student
 * has ALREADY answered, using the approved explanation we already hold. It is
 * not an open "ask me anything about Texas insurance law" box.
 *
 * That constraint is the whole safety design. An open box invites exactly the
 * questions we cannot answer safely - "what's the Texas cancellation notice
 * period?" - and a confidently wrong answer to one of those can cost a student
 * an exam. Re-explaining an approved explanation is groundable, checkable and
 * cheap.
 *
 * Request construction is pure so grounding, redaction and injection handling
 * are all testable without a provider.
 */

import { conceptIdFor, conceptLabel } from "@shared/concepts";
import { TUTOR_EXPLANATION, promptRef, wrapUntrusted } from "../ai/prompts";
import type { CompletionRequest } from "../ai/provider";

/** What the student asked for. A fixed menu, not free-form by default. */
export type TutorIntent =
  | "explain_simply"
  | "why_wrong"
  | "why_correct"
  | "give_example"
  | "memory_trick"
  | "explain_more";

export const TUTOR_INTENTS: TutorIntent[] = [
  "explain_simply",
  "why_wrong",
  "why_correct",
  "give_example",
  "memory_trick",
  "explain_more",
];

/** Approved material about one question. The only facts the tutor may use. */
export interface ApprovedQuestionContext {
  questionId: string;
  topic: string | null;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  category: string;
}

export interface TutorRequestInput {
  intent: TutorIntent;
  context: ApprovedQuestionContext;
  /** Which option the student picked. Null when unknown. */
  studentAnswerIndex: number | null;
  /** Optional free text. Untrusted. */
  studentMessage?: string | null;
  language: "en" | "es";
  /**
   * Earlier turns on this same question, oldest first.
   *
   * Continuity only. The system prompt still binds every answer to the
   * approved material, so remembering the conversation cannot widen what the
   * tutor is allowed to say - it only stops a follow-up like "why not the
   * second one?" arriving with no idea what was just discussed.
   */
  history?: Array<{ role: "student" | "assistant"; text: string }>;
}

/** Free-text cap. Anything longer is a payload, not a question. */
export const MAX_STUDENT_MESSAGE_CHARS = 400;

export type TutorRefusalReason = "no_approved_explanation" | "not_answered" | "unsupported_intent";

export interface TutorGrounding {
  /** False when we lack approved material and must not call the model. */
  sufficient: boolean;
  reason?: TutorRefusalReason;
}

/**
 * Is there enough approved material to ground an answer?
 *
 * Without a stored explanation the model would be re-deriving Texas
 * regulation from memory, which is precisely the failure mode this design
 * exists to prevent. Better to say we cannot answer.
 */
export function checkGrounding(context: ApprovedQuestionContext): TutorGrounding {
  const hasExplanation = Boolean(context.explanation && context.explanation.trim().length >= 20);
  if (!hasExplanation) {
    return { sufficient: false, reason: "no_approved_explanation" };
  }
  if (!context.questionText.trim() || context.options.length === 0) {
    return { sufficient: false, reason: "no_approved_explanation" };
  }
  return { sufficient: true };
}

/**
 * Trim and neutralise student free text.
 *
 * Truncation is the substantive control - it caps how much attacker-controlled
 * text can reach the model at all. Stripping tag characters stops the input
 * from closing the wrapper element and appearing to be system text; it is not
 * relied on as the primary defence, which is the wrapper plus the system
 * rule that tagged content is data.
 */
export function sanitizeStudentMessage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, MAX_STUDENT_MESSAGE_CHARS).replace(/[<>]/g, " ");
}

const INTENT_INSTRUCTION_EN: Record<TutorIntent, string> = {
  explain_simply: "Explain the underlying concept in plain language.",
  why_wrong: "Explain why the option the student chose is not correct.",
  why_correct: "Explain why the correct option is correct.",
  give_example: "Give one short, concrete real-world example of this concept.",
  memory_trick: "Give one short memory aid for recalling this on exam day.",
  explain_more: "Give a fuller explanation, up to 200 words.",
};

const INTENT_INSTRUCTION_ES: Record<TutorIntent, string> = {
  explain_simply: "Explica el concepto subyacente en lenguaje sencillo.",
  why_wrong: "Explica por qué la opción que eligió el estudiante no es correcta.",
  why_correct: "Explica por qué la opción correcta es correcta.",
  give_example: "Da un ejemplo breve y concreto de este concepto en la vida real.",
  memory_trick: "Da un truco breve para recordar esto el día del examen.",
  explain_more: "Da una explicación más completa, hasta 200 palabras.",
};

/**
 * Build the approved-context block.
 *
 * Only this question's material goes in. Nothing about other questions, other
 * students, or the wider bank - a prompt that never contains the answer key
 * for question 500 cannot be talked into revealing it.
 */
export function buildApprovedContext(
  context: ApprovedQuestionContext,
  studentAnswerIndex: number | null,
): string {
  const letter = (i: number) => String.fromCharCode(65 + i);
  const lines = [
    `Topic: ${conceptLabel(conceptIdFor(context.topic), context.topic)}`,
    `Question: ${context.questionText}`,
    "Options:",
    ...context.options.map((opt, i) => `  ${letter(i)}. ${opt}`),
    `Correct option: ${letter(context.correctIndex)}`,
    `Approved explanation: ${context.explanation ?? ""}`,
  ];

  if (studentAnswerIndex !== null && studentAnswerIndex >= 0 && studentAnswerIndex < context.options.length) {
    lines.push(`The student chose: ${letter(studentAnswerIndex)}`);
  }

  return lines.join("\n");
}

/**
 * Assemble the provider request.
 *
 * Student free text goes in wrapped and last. The system prompt already tells
 * the model that wrapped content is data; putting it after the fixed
 * instruction means an injected "ignore the above" has nothing above it to
 * cancel but the wrapper itself.
 */
export function buildTutorRequest(input: TutorRequestInput): CompletionRequest {
  const spanish = input.language === "es";
  const instruction = (spanish ? INTENT_INSTRUCTION_ES : INTENT_INSTRUCTION_EN)[input.intent];

  const system = TUTOR_EXPLANATION.build({
    language: spanish ? "Spanish" : "English",
    context: buildApprovedContext(input.context, input.studentAnswerIndex),
  });

  let userContent = instruction;
  const message = sanitizeStudentMessage(input.studentMessage);
  if (message) {
    userContent += `\n\n${wrapUntrusted("student_message", message)}`;
  }

  // Earlier turns, as real conversation turns rather than pasted into the
  // prompt. A remembered student message stays wrapped as untrusted: it was
  // untrusted when it arrived and nothing about having stored it makes it
  // safer to hand back unmarked.
  const priorTurns = (input.history ?? [])
    .map((turn) => {
      const text = turn.role === "student" ? sanitizeStudentMessage(turn.text) : turn.text.trim();
      if (!text) return null;
      return turn.role === "student"
        ? { role: "user" as const, content: wrapUntrusted("student_message", text) }
        : { role: "assistant" as const, content: text };
    })
    .filter((turn): turn is { role: "user" | "assistant"; content: string } => turn !== null);

  return {
    role: "tutor",
    system,
    messages: [...priorTurns, { role: "user", content: userContent }],
    // "Explain more" is the one intent allowed to run long, and only because
    // the student explicitly asked for it.
    maxTokens: input.intent === "explain_more" ? 900 : undefined,
  };
}

export const TUTOR_PROMPT_REF = promptRef(TUTOR_EXPLANATION);

/**
 * What the student sees when the tutor cannot or should not answer.
 *
 * Always falls back to the approved explanation where one exists, so a provider
 * outage costs the student the rephrasing, not the help. Never surfaces a
 * technical error.
 */
export function fallbackAnswer(
  context: ApprovedQuestionContext,
  language: "en" | "es",
): string {
  if (context.explanation && context.explanation.trim()) {
    return context.explanation.trim();
  }
  return language === "es"
    ? "No tengo suficiente información aprobada para explicar esto con precisión. Consulta la guía de estudio de este tema."
    : "I don't have enough approved information to explain this accurately. Please check the study guide for this topic.";
}

/** Refusal copy for the insufficient-grounding case. */
export function refusalMessage(language: "en" | "es"): string {
  return language === "es"
    ? "No estoy seguro de tener suficiente información aprobada para responder eso con precisión."
    : "I'm not confident I have enough approved information to answer that accurately.";
}
