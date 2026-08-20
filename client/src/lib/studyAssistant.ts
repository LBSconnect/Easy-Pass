/**
 * Client-side study assistant types and config access.
 *
 * The display name is read from shared config, never typed inline in a
 * component - renaming the assistant must stay a one-line change.
 */

import { useQuery } from "@tanstack/react-query";
import { STUDY_ASSISTANT, type StudyAssistantConfig } from "@shared/studyAssistant";

export { STUDY_ASSISTANT };

export type LearningMode =
  | "teach"
  | "flashcards"
  | "practice"
  | "scenarios"
  | "review"
  | "mock_exam";

export type DifficultyLevel = "foundation" | "standard" | "exam_level" | "challenge";

export interface SessionBlock {
  mode: LearningMode;
  itemCount: number;
  estimatedMinutes: number;
  label: string;
}

export interface WeakConcept {
  conceptId: string;
  label: string;
  mastery: number;
  band: "critical" | "needs_work" | "improving" | "strong";
}

export interface RecommendationResult {
  recommendation: {
    mode: LearningMode;
    concept: { conceptId: string; label: string; mastery: number } | null;
    difficulty: DifficultyLevel;
    reasonCodes: string[];
    evidence: string[];
    blocks: SessionBlock[];
    estimatedMinutes: number;
    headline: string;
    detail: string;
    suggestHumanHelp: boolean;
    insight: string | null;
  };
  phrasing: string;
  usedFallback: boolean;
  profile: {
    easyPassScore: number | null;
    daysRemaining: number | null;
    isRetaker: boolean;
    weakestConcepts: WeakConcept[];
    recentAccuracy: number | null;
    coverage: number;
    insight: string | null;
  };
}

/**
 * Resolved assistant configuration.
 *
 * Flags come from the server on every load. The client never decides its own
 * flags - a student could flip one in devtools, and the server gates the
 * actual capability anyway, so a client-side flag would only ever produce a
 * button that does nothing.
 */
export function useStudyAssistantConfig() {
  return useQuery<StudyAssistantConfig>({
    queryKey: ["/api/alexi/config"],
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * The recommendation, validated once.
 *
 * Three separate screens read this payload, and each guarded with `if (data)`.
 * An object is truthy even when it is missing `recommendation`, so a 200 with
 * a partial body sailed past all three guards and threw on
 * `data.recommendation.mode` mid-render. Validating in the hook means every
 * consumer's existing guard actually holds, instead of each one having to
 * re-check the same fields and one of them forgetting.
 */
export function useRecommendation(category: string | null, minutes?: number) {
  const query = minutes ? `?minutes=${minutes}` : "";
  return useQuery<RecommendationResult, Error, RecommendationResult | undefined>({
    queryKey: [`/api/alexi/recommendation/${category}${query}`],
    enabled: Boolean(category),
    select: (body) =>
      body?.recommendation && Array.isArray(body.recommendation.blocks) && body.profile
        ? body
        : undefined,
  });
}

/**
 * What a block is for, which its mode does not say.
 *
 * Mirrors BlockPurpose in server/alexi/nextBestAction.ts. A practice session
 * is two practice blocks - the practice, then the check at the end - so
 * labelling from mode alone told the student "Targeted practice" twice.
 */
export type BlockPurpose = "main" | "warm_up" | "check";

/**
 * The name of one step, as the student reads it on the rail and in the summary.
 *
 * Purpose wins where it changes what the step actually is: a flashcard warm-up
 * is not the same activity as a flashcard session, and a five-question check is
 * not more targeted practice. Everything else falls through to the mode name.
 */
export function blockLabel(mode: LearningMode, purpose: BlockPurpose, es: boolean): string {
  if (purpose === "check") return es ? "Comprobación" : "Mastery check";
  if (purpose === "warm_up") return es ? "Calentamiento" : "Warm-up";
  return modeLabel(mode, es);
}

/**
 * What happens in that step.
 *
 * Same reasoning as blockLabel: the check and the warm-up describe themselves,
 * because "questions on the topics you get wrong most" is not what either of
 * them does.
 */
export function blockHint(mode: LearningMode, purpose: BlockPurpose, es: boolean): string {
  if (purpose === "check") {
    return es
      ? "Unas pocas preguntas para medir lo que acabas de estudiar"
      : "A few questions to measure what you just studied";
  }
  if (purpose === "warm_up") {
    return es
      ? "Tarjetas rápidas para volver al tema"
      : "Quick cards to get back into the material";
  }
  return modeHint(mode, es);
}

/** Student-facing label for a learning mode. */
export function modeLabel(mode: LearningMode, es: boolean): string {
  const labels: Record<LearningMode, [string, string]> = {
    teach: ["Learn the concept", "Aprende el concepto"],
    flashcards: ["Flashcards", "Tarjetas de estudio"],
    practice: ["Targeted practice", "Práctica dirigida"],
    scenarios: ["Applied scenarios", "Escenarios aplicados"],
    review: ["Recall practice", "Práctica de memoria"],
    mock_exam: ["Mock exam", "Examen simulado"],
  };
  return labels[mode][es ? 1 : 0];
}

/**
 * What a student is actually going to do in this step.
 *
 * The labels above name a block; these say what happens in it. A student
 * arriving at a session has agreed to something described as "3-minute
 * review, 8 flashcards" without being told what any of that involves, and
 * "Mixed review" is a heading, not an explanation.
 *
 * Each one describes real behaviour of the step it names - nothing here
 * promises anything the runner does not do.
 */
export function modeHint(mode: LearningMode, es: boolean): string {
  const hints: Record<LearningMode, [string, string]> = {
    teach: [
      "The key points, with worked examples",
      "Los puntos clave, con ejemplos resueltos",
    ],
    flashcards: [
      "Flip a card, say the answer, mark how it went",
      "Voltea una tarjeta, responde y marca cómo te fue",
    ],
    practice: [
      "Questions on the topics you get wrong most",
      "Preguntas sobre los temas que más fallas",
    ],
    scenarios: [
      "Longer situations, the way the exam frames them",
      "Situaciones más largas, como las plantea el examen",
    ],
    review: [
      // Not "a mix of what you have covered" any more. The step asks the
      // student to answer from memory, and the hint has to say so - the
      // difficulty is deliberate and reads as a bug if it arrives unannounced.
      "Answer from memory, mixed across topics",
      "Responde de memoria, mezclando temas",
    ],
    mock_exam: [
      "A full timed paper on its own screen",
      "Un examen completo cronometrado en su propia pantalla",
    ],
  };
  return hints[mode][es ? 1 : 0];
}

/**
 * Where Start sends the student.
 *
 * The session runner walks the recommendation's blocks in order, so the
 * session Alexi described is the session the student actually sits. Before
 * this, every mode landed on a generic page and the described session was
 * never run.
 */
export function blockHref(mode: LearningMode, category: string): string {
  // A full mock exam is a timed paper with its own screen and its own rules,
  // so it stays where it is. Everything else is run by the session runner,
  // which walks the recommendation's blocks in order.
  if (mode === "mock_exam") return `/exams/${category}?mode=full`;
  return `/session/${category}`;
}

