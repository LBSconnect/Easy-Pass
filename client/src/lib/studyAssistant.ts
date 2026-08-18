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

export function useRecommendation(category: string | null, minutes?: number) {
  const query = minutes ? `?minutes=${minutes}` : "";
  return useQuery<RecommendationResult>({
    queryKey: [`/api/alexi/recommendation/${category}${query}`],
    enabled: Boolean(category),
  });
}

/** Student-facing label for a learning mode. */
export function modeLabel(mode: LearningMode, es: boolean): string {
  const labels: Record<LearningMode, [string, string]> = {
    teach: ["Learn the concept", "Aprende el concepto"],
    flashcards: ["Flashcards", "Tarjetas de estudio"],
    practice: ["Targeted practice", "Práctica dirigida"],
    scenarios: ["Applied scenarios", "Escenarios aplicados"],
    review: ["Mixed review", "Repaso mixto"],
    mock_exam: ["Mock exam", "Examen simulado"],
  };
  return labels[mode][es ? 1 : 0];
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

