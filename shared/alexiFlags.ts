/**
 * Which switch is stopping an assistant capability?
 *
 * Every sub-capability resolves as `enabled && itsOwnFlag`, so setting
 * ALEXI_QUIZ_GENERATION_ENABLED does nothing at all while ALEXI_ENABLED is
 * unset. That caught us out once already, and "generation is unavailable" is
 * not a message anyone can act on.
 *
 * So the answer is computed here, in one place, and names the exact
 * environment variable to change. The master switch is checked first because
 * it is the one that silently overrides everything else.
 */

export interface AssistantFlagState {
  enabled: boolean;
  tutorEnabled: boolean;
  quizGenerationEnabled: boolean;
  flashcardsEnabled: boolean;
  mockExamEnabled: boolean;
  retakerEnabled: boolean;
  spanishEnabled: boolean;
}

/** Sub-capabilities, and the environment variable behind each. */
export const CAPABILITY_ENV: Record<keyof Omit<AssistantFlagState, "enabled">, string> = {
  tutorEnabled: "ALEXI_TUTOR_ENABLED",
  quizGenerationEnabled: "ALEXI_QUIZ_GENERATION_ENABLED",
  flashcardsEnabled: "ALEXI_FLASHCARDS_ENABLED",
  mockExamEnabled: "ALEXI_MOCK_EXAM_ENABLED",
  retakerEnabled: "ALEXI_RETAKER_ENABLED",
  spanishEnabled: "ALEXI_SPANISH_ENABLED",
};

export const MASTER_ENV = "ALEXI_ENABLED";

/**
 * The environment variable to set to turn `capability` on, or null when it is
 * already on.
 *
 * @param flags resolved server-side state, not the raw environment.
 */
export function blockingEnvVar(
  flags: AssistantFlagState | null | undefined,
  capability: keyof Omit<AssistantFlagState, "enabled">,
): string | null {
  // No config at all: the master switch is the honest thing to point at, since
  // nothing downstream can be true without it.
  if (!flags) return MASTER_ENV;
  if (!flags.enabled) return MASTER_ENV;
  if (!flags[capability]) return CAPABILITY_ENV[capability];
  return null;
}
