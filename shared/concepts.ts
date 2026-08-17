/**
 * Concept layer.
 *
 * EXAM -> DOMAIN -> TOPIC -> CONCEPT -> QUESTION.
 *
 * A student who misses three differently-worded questions about Businessowners
 * Policy eligibility has ONE weakness, not three. Everything downstream - the
 * recommendation engine, flashcards, the tutor - reasons about concepts so it
 * can say "you're struggling with BOP eligibility" instead of "you missed
 * questions 419, 583 and 712".
 *
 * The question bank currently carries a free-text `topic` and no concept
 * column. Rather than block on a data migration, a concept id is DERIVED from
 * the topic by normalisation, and an alias table collapses the variants that
 * normalisation alone cannot ("Texas Law & Regulations" vs "Texas Laws and
 * Regulations"). When a `concept_id` column is added to `questions` later, the
 * only change needed is to prefer the stored value in `conceptIdFor` - nothing
 * downstream moves.
 */

export type ConceptId = string;

/**
 * Explicit merges, keyed by normalised form.
 *
 * Populated from real bank data as duplicate phrasings are found. Config
 * rather than code so merging two concepts never needs a migration.
 */
const CONCEPT_ALIASES: Record<string, ConceptId> = {
  "texas-law-regulations": "texas-laws-and-regulations",
  "texas-law-and-regulations": "texas-laws-and-regulations",
  "texas-laws-regulations": "texas-laws-and-regulations",
  "tx-laws-and-regulations": "texas-laws-and-regulations",
  "general-insurance-concepts": "general-insurance",
  "policy-provisions-and-options": "policy-provisions",
  "policy-provisions-options": "policy-provisions",
};

/** Fallback bucket for questions with no topic recorded. */
export const UNCLASSIFIED_CONCEPT: ConceptId = "general";
export const UNCLASSIFIED_LABEL = "General";

/**
 * Normalise a free-text topic to a stable slug.
 *
 * Case, punctuation and "and"/"&" differences all collapse, which is what
 * makes two hand-entered topic strings land on the same concept.
 */
export function normalizeConcept(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve a question's concept id.
 *
 * `storedConceptId` is the seam for a future `questions.concept_id` column: an
 * explicit mapping always wins over derivation.
 */
export function conceptIdFor(
  topic: string | null | undefined,
  storedConceptId?: string | null,
): ConceptId {
  if (storedConceptId) return storedConceptId;
  if (!topic || !topic.trim()) return UNCLASSIFIED_CONCEPT;

  const normalized = normalizeConcept(topic);
  if (!normalized) return UNCLASSIFIED_CONCEPT;

  return CONCEPT_ALIASES[normalized] ?? normalized;
}

/**
 * Human-readable label for a concept.
 *
 * Prefers the original topic text so students see the wording the bank uses
 * rather than a slug; falls back to title-casing the id when no source topic
 * is to hand.
 */
export function conceptLabel(conceptId: ConceptId, sourceTopic?: string | null): string {
  if (sourceTopic && sourceTopic.trim()) return sourceTopic.trim();
  if (conceptId === UNCLASSIFIED_CONCEPT) return UNCLASSIFIED_LABEL;

  return conceptId
    .split("-")
    .map((word) => (word === "and" ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}
