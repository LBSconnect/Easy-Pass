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

/**
 * Targeted practice papers, which are a different kind of thing.
 *
 * The paper is assembled from questions that are already in the bank and
 * already human-approved. Nothing is generated, so no model is called and no
 * API credential is involved.
 *
 * That is why it is not resolved through getAIConfig() like the capabilities
 * above. Every one of those is `enabled && itsOwnFlag`, and `enabled`
 * requires credentials - so routing this through it would mean a rotated or
 * expired API key silently switched off a feature that never used the key.
 * A student would lose their practice papers for a reason that has nothing to
 * do with what practice papers do.
 *
 * It shares ALEXI_MOCK_EXAM_ENABLED because that is the switch operators
 * already expect to control it, and because being able to turn a new exam
 * mode off without a deploy is worth having.
 */
export const TARGETED_PRACTICE_ENV = "ALEXI_MOCK_EXAM_ENABLED";

export function resolveTargetedPractice(raw: string | undefined): boolean {
  // Off unless deliberately turned on, and only the two values the rest of
  // the flag surface accepts count. Anything else is a typo, and a typo
  // should not enable a feature.
  return raw === "true" || raw === "1";
}
