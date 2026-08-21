/**
 * Matching the landing headline to the search that produced the click.
 *
 * A visitor who searched "texas life insurance practice test" and lands on a
 * page headed "Texas Life Insurance Exam Prep" has to do a small piece of work
 * to satisfy themselves they are in the right place. Closing that gap is worth
 * real money on paid search.
 *
 * It is also the single easiest place in this codebase to start lying, so the
 * rule here is narrow on purpose:
 *
 *   The query string never becomes page copy.
 *
 * An inbound value is looked up in the table below and either matches one of a
 * handful of headings we have written and stand behind, or it is ignored and
 * the page keeps its own H1. utm_term is attacker-controlled and appears in
 * search-partner traffic we do not write; rendering it would put arbitrary
 * text - a competitor's name, a promise we do not make, markup - inside our
 * own heading. There is no sanitising that makes that safe, so it is not
 * attempted.
 */

import type { ExamCategory } from "./schema";

export interface LandingVariant {
  /** The key an ad's utm_term or intent parameter must equal exactly. */
  key: string;
  headingEn: string;
  headingEs: string;
}

/**
 * The approved variants, per category.
 *
 * Every one of these is a true description of what the page offers: practice
 * questions drawn from the same bank, sat under the same conditions. None of
 * them promises a result, names an authority, or implies affiliation.
 */
const VARIANTS: Partial<Record<ExamCategory, LandingVariant[]>> = {
  life_insurance: [
    {
      key: "exam_prep",
      headingEn: "Texas Life Insurance Exam Prep",
      headingEs: "Preparación para el Examen de Seguros de Vida de Texas",
    },
    {
      key: "practice_test",
      headingEn: "Texas Life Insurance Practice Test",
      headingEs: "Examen de Práctica de Seguros de Vida de Texas",
    },
    {
      key: "exam_questions",
      headingEn: "Texas Life Insurance Exam Questions",
      headingEs: "Preguntas del Examen de Seguros de Vida de Texas",
    },
    {
      key: "test_prep",
      headingEn: "Texas Life Insurance Test Prep",
      headingEs: "Preparación para la Prueba de Seguros de Vida de Texas",
    },
  ],
};

/** Longest key we will even consider, so a huge query string is dropped early. */
const MAX_KEY_LENGTH = 40;

/**
 * The approved heading for an inbound intent key, or null to keep the page's
 * own H1.
 *
 * Matching is exact after lowercasing and trimming, and hyphens are folded to
 * underscores so `practice-test` and `practice_test` both work - ad platforms
 * are inconsistent about which they emit, and that is a formatting difference
 * rather than a different intent. Nothing else is normalised: near-misses
 * fall through to the default rather than being guessed at.
 */
export function resolveLandingVariant(
  category: ExamCategory,
  rawKey: string | null | undefined,
): LandingVariant | null {
  if (!rawKey) return null;
  if (rawKey.length > MAX_KEY_LENGTH) return null;

  const key = rawKey.trim().toLowerCase().replace(/-/g, "_");
  if (!key) return null;

  const variants = VARIANTS[category];
  if (!variants) return null;

  return variants.find((variant) => variant.key === key) ?? null;
}

/** Exposed for tests and for anyone adding an ad group, so the set is discoverable. */
export function approvedVariantKeys(category: ExamCategory): string[] {
  return (VARIANTS[category] ?? []).map((variant) => variant.key);
}
