/**
 * When a glossary term is fit to publish.
 *
 * The same rule the generated-question queue enforces, for the same reason:
 * publishing an English-only entry into a bilingual product leaves a
 * Spanish-speaking student with a blank where the answer should be. Half a
 * bilingual glossary is not half as good, it is a broken promise to half the
 * students.
 *
 * A minimum length on the definition is not pedantry either. "See policy" is
 * technically both languages and helps nobody; the floor is low enough not to
 * fight a genuinely short definition and high enough to catch a placeholder.
 */

export interface GlossaryDraft {
  termEn: string;
  termEs: string;
  definitionEn: string;
  definitionEs: string;
}

/** Shortest definition that could plausibly be one. */
export const MIN_DEFINITION_LENGTH = 20;

export interface GlossaryGateResult {
  ready: boolean;
  /** What is missing, in the order a person would fix it. */
  missing: string[];
}

export function checkGlossaryDraft(draft: GlossaryDraft): GlossaryGateResult {
  const missing: string[] = [];

  if (!draft.termEn?.trim()) missing.push("English term");
  if (!draft.termEs?.trim()) missing.push("Spanish term");

  if ((draft.definitionEn ?? "").trim().length < MIN_DEFINITION_LENGTH) {
    missing.push("English definition");
  }
  if ((draft.definitionEs ?? "").trim().length < MIN_DEFINITION_LENGTH) {
    missing.push("Spanish definition");
  }

  return { ready: missing.length === 0, missing };
}
