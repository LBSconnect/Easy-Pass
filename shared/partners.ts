/**
 * The vocabulary of the partner channel: what a prospect is, what a partner
 * is, and the difference between them.
 *
 * THE DISTINCTION THIS FILE EXISTS TO HOLD
 *
 * Everything in data/prospects is an organization we have researched. None of
 * it is a relationship. Nobody on that list has agreed to anything, and most
 * do not know we exist.
 *
 * So a prospect can be scored, sorted and written to, and a PARTNER - only
 * after an admin says so - can have a link that carries their name. Anything
 * public that names an organization is gated on `active_partner` and nothing
 * else, because the alternative is implying an endorsement nobody gave.
 */

import type { ExamCategory } from "./schema";

/** Where a prospect sits in outreach. Ordered as the work actually flows. */
export const OUTREACH_STATUSES = [
  "not_contacted",
  "researching",
  "ready_to_contact",
  "contacted",
  "follow_up",
  "interested",
  "pilot",
  "partner",
  "not_a_fit",
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

/**
 * The relationship itself, which is not the same as the conversation about it.
 *
 * Separate from outreach status on purpose: "we have spoken to them twice" and
 * "their link is live" are different facts, and collapsing them is how a
 * prospect ends up with a public branded page because somebody replied to an
 * email.
 */
export const PARTNER_STATUSES = [
  "prospect",
  "contacted",
  "interested",
  "pilot",
  "active_partner",
  "inactive_partner",
  "not_a_fit",
] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

/**
 * The only status that may be shown publicly.
 *
 * One function, used by the route and the resolver both, so "are we allowed to
 * say this organization's name out loud" has exactly one answer in the codebase.
 */
export function isPubliclyActive(status: string | null | undefined, active: boolean | null | undefined): boolean {
  return status === "active_partner" && active === true;
}

/**
 * Canonical segments, folded down from the free text in the CSVs.
 *
 * The source files carry sixteen different descriptions - "Insurance Agency /
 * Life Recruiting", "Real Estate Brokerage / School Referral" - which are
 * useful to a human reading a row and useless for filtering or for choosing an
 * outreach template. The raw text is preserved on the record; this is what the
 * product reasons about.
 */
export const PARTNER_SEGMENTS = [
  "real_estate_school",
  "real_estate_brokerage",
  "insurance_school",
  "insurance_agency",
  "association",
  "other",
] as const;
export type PartnerSegment = (typeof PARTNER_SEGMENTS)[number];

/**
 * Fold a source segment string to a canonical one.
 *
 * Association is checked first: "Insurance Association / Recruiting Network"
 * is an association that happens to mention insurance, and reaching an
 * association is a different conversation from reaching one agency - so the
 * more specific fact wins over the substring that appears in both.
 */
export function normalizeSegment(raw: string | null | undefined): PartnerSegment {
  const text = (raw ?? "").toLowerCase();
  if (!text.trim()) return "other";

  if (text.includes("association")) return "association";
  if (text.includes("school") || text.includes("education")) {
    if (text.includes("insurance")) return "insurance_school";
    if (text.includes("real estate")) return "real_estate_school";
  }
  if (text.includes("insurance")) return "insurance_agency";
  if (text.includes("real estate")) return "real_estate_brokerage";
  return "other";
}

/** Priorities as written in the source files. */
export const PROSPECT_PRIORITIES = ["Very High", "High", "Medium", "Low"] as const;
export type ProspectPriority = (typeof PROSPECT_PRIORITIES)[number];

export function normalizePriority(raw: string | null | undefined): ProspectPriority | null {
  const text = (raw ?? "").trim().toLowerCase();
  const match = PROSPECT_PRIORITIES.find((p) => p.toLowerCase() === text);
  return match ?? null;
}

/**
 * The exam a segment most plausibly sends us - or null, which is a real answer.
 *
 * A real estate brokerage sends real estate candidates. An insurance agency
 * might send life, or property and casualty, or general lines, and guessing
 * wrong means a visitor lands in the wrong exam and leaves. So insurance
 * segments return null and an admin chooses; the field is required before a
 * partner can be activated.
 */
export function suggestedCategory(segment: PartnerSegment): ExamCategory | null {
  if (segment === "real_estate_school" || segment === "real_estate_brokerage") return "real_estate";
  return null;
}

/**
 * Partner codes appear in a URL people are asked to type and print, so the
 * accepted shape is deliberately dull: lowercase, digits and single hyphens.
 */
const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_PARTNER_CODE_LENGTH = 48;

export function normalizePartnerCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!code || code.length > MAX_PARTNER_CODE_LENGTH) return null;
  return CODE_PATTERN.test(code) ? code : null;
}

/** A first suggestion for a code, from the organization's name. */
export function suggestPartnerCode(organizationName: string): string | null {
  return normalizePartnerCode(organizationName);
}

/**
 * A key for recognising the same organization across re-imports.
 *
 * Name plus market, because "Keller Williams" names dozens of independent
 * offices and only the market separates them. Punctuation and legal suffixes
 * are dropped so "Champions School of Real Estate LTD" and "Champions School
 * of Real Estate, Ltd." are one organization rather than two.
 */
export function prospectKey(organizationName: string, market: string | null | undefined): string {
  const name = organizationName
    .toLowerCase()
    .replace(/\b(ltd|llc|inc|l\.?p\.?|co|corp|company)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  const place = (market ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return place ? `${name}|${place}` : name;
}
