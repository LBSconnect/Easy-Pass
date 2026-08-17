/**
 * AI configuration - single source of truth for provider, models and limits.
 *
 * Every knob here is environment-overridable so a model can be swapped, a
 * timeout tightened or a capability disabled without a code change. Product
 * code never names a model; it names a *task* (see `ModelRole`) and this
 * module decides which model serves it.
 */

import { DEFAULT_FLAGS, type StudyAssistantFlags } from "@shared/studyAssistant";

export type ProviderName = "anthropic" | "none";

/**
 * Model roles, not model names.
 *
 * Routing cheap work to a cheap model is the single biggest cost lever, and it
 * only works if call sites ask for "the model that classifies things" rather
 * than hard-coding a flagship everywhere.
 */
export type ModelRole =
  /** Short grounded explanations to a student. Quality matters. */
  | "tutor"
  /** Generating practice content. Quality matters most. */
  | "generation"
  /** Independently checking generated content. Must not be the weak link. */
  | "validation"
  /** Routine classification and rephrasing. Cheapest capable model. */
  | "utility";

export interface AIConfig {
  provider: ProviderName;
  models: Record<ModelRole, string>;
  temperature: number;
  maxTokens: Record<ModelRole, number>;
  timeoutMs: number;
  maxRetries: number;
  flags: StudyAssistantFlags;
}

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** True when the deployment actually has credentials to call a provider. */
export function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Resolve configuration from the environment.
 *
 * Read at call time rather than module load so tests can vary the environment
 * and so a flag flip via the hosting dashboard takes effect on restart without
 * needing a rebuild.
 */
export function getAIConfig(): AIConfig {
  const credentialed = hasCredentials();

  // The master switch cannot be on without credentials. A deployment that
  // advertises the assistant and then 500s on every call is worse than one
  // that never shows it.
  const enabled = envFlag("ALEXI_ENABLED", false) && credentialed;

  const flags: StudyAssistantFlags = {
    ...DEFAULT_FLAGS,
    enabled,
    // Sub-capabilities default ON once the master switch is on, so operators
    // flip one variable to pilot, and individually OFF-able for incident
    // response. Each is still gated by `enabled` so the master switch really
    // is master.
    tutorEnabled: enabled && envFlag("ALEXI_TUTOR_ENABLED", true),
    quizGenerationEnabled: enabled && envFlag("ALEXI_QUIZ_GENERATION_ENABLED", false),
    flashcardsEnabled: enabled && envFlag("ALEXI_FLASHCARDS_ENABLED", true),
    mockExamEnabled: enabled && envFlag("ALEXI_MOCK_EXAM_ENABLED", false),
    retakerEnabled: enabled && envFlag("ALEXI_RETAKER_ENABLED", true),
    spanishEnabled: enabled && envFlag("ALEXI_SPANISH_ENABLED", true),
  };

  return {
    provider: credentialed ? "anthropic" : "none",
    models: {
      tutor: process.env.ALEXI_MODEL_TUTOR || "claude-opus-5",
      generation: process.env.ALEXI_MODEL_GENERATION || "claude-opus-5",
      validation: process.env.ALEXI_MODEL_VALIDATION || "claude-opus-5",
      utility: process.env.ALEXI_MODEL_UTILITY || "claude-haiku-4-5",
    },
    // Low temperature throughout: this is regulated educational content, not
    // creative writing. Variety comes from varying the *input* concept, not
    // from sampling noise.
    temperature: 0.2,
    maxTokens: {
      // Deliberately tight. A student who missed one question does not want
      // eight paragraphs, and every token is money at scale. "Explain more"
      // is a second, opt-in request.
      tutor: envInt("ALEXI_MAX_TOKENS_TUTOR", 700),
      generation: envInt("ALEXI_MAX_TOKENS_GENERATION", 4000),
      validation: envInt("ALEXI_MAX_TOKENS_VALIDATION", 1500),
      utility: envInt("ALEXI_MAX_TOKENS_UTILITY", 500),
    },
    timeoutMs: envInt("ALEXI_TIMEOUT_MS", 20000),
    maxRetries: envInt("ALEXI_MAX_RETRIES", 1),
    flags,
  };
}
