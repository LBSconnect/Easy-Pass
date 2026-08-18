/**
 * Study assistant identity and capability configuration.
 *
 * The public-facing name lives HERE and nowhere else. Product, marketing and
 * legal all have a habit of renaming an assistant after launch, and a name
 * spread across fifty components is a refactor; a name in one constant is an
 * edit. Nothing in the codebase should contain the literal string "Alexi"
 * outside this file and its translations - use `STUDY_ASSISTANT.displayName`.
 *
 * Shared between client and server so both render the same name without a
 * round trip.
 */

export const STUDY_ASSISTANT = {
  /** Public-facing name. Change here to rename everywhere. */
  displayName: "Alexi",
  /** Positioning line shown under the name. */
  taglineEn: "Your MyEasyPass Study Assistant",
  taglineEs: "Tu Asistente de Estudio de MyEasyPass",
  /** Supporting line. */
  subtitleEn: "Your personal AI licensing exam coach.",
  subtitleEs: "Tu entrenador personal de examen de licencia con IA.",
} as const;

/**
 * Feature flags.
 *
 * Every assistant capability ships behind a flag so rollout is
 * internal -> beta -> general availability rather than all-at-once, and so a
 * misbehaving capability can be switched off without a deploy rollback.
 *
 * Server reads these from the environment; the client receives the resolved
 * values from `GET /api/alexi/config`. The client NEVER decides its own flags -
 * that would let a student flip one in devtools.
 */
export interface StudyAssistantFlags {
  /** Master switch. When false, nothing assistant-related renders at all. */
  enabled: boolean;
  /** Conversational grounded tutoring. */
  tutorEnabled: boolean;
  /** AI-generated practice questions (requires the validation pipeline). */
  quizGenerationEnabled: boolean;
  /** AI-assisted flashcard selection. */
  flashcardsEnabled: boolean;
  /** AI-assisted mock exam construction. */
  mockExamEnabled: boolean;
  /** Retaker rescue intake and planning. */
  retakerEnabled: boolean;
  /** Spanish-language assistant responses. */
  spanishEnabled: boolean;
}

export const DEFAULT_FLAGS: StudyAssistantFlags = {
  enabled: false,
  tutorEnabled: false,
  quizGenerationEnabled: false,
  flashcardsEnabled: false,
  mockExamEnabled: false,
  retakerEnabled: false,
  spanishEnabled: false,
};

/**
 * What the client is told about the assistant.
 *
 * Deliberately excludes provider, model and prompt version: a student has no
 * use for them and publishing them hands an attacker the shape of the system.
 */
export interface StudyAssistantConfig {
  displayName: string;
  flags: StudyAssistantFlags;
  /** False when the deployment has no AI credentials - UI degrades quietly. */
  aiAvailable: boolean;
  /**
   * Targeted practice papers, which need no credentials at all - they are
   * assembled from the approved question bank. Reported separately from
   * `flags` for exactly that reason: everything in `flags` is off whenever
   * `aiAvailable` is false, and this is not.
   */
  targetedPracticeAvailable: boolean;
}
