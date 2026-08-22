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

/**
 * Where a prospect sits in outreach. Ordered as the work actually flows.
 *
 * The trailing five were added with the automated outreach engine
 * (shared/outreachCampaign.ts) for outcomes only automation can observe -
 * a declined reply, an unsubscribe, a bounce. Additive on purpose: nothing
 * existing was renamed, so every stored status still means what it meant.
 */
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
  "maybe_later",
  "not_interested",
  "unsubscribed",
  "bounced",
  "needs_review",
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

/**
 * The fields that decide whether a partner record is coherent.
 *
 * Deliberately a plain shape rather than the database row: this is validated
 * before any write, and the caller assembles it from "what exists now" plus
 * "what the admin just sent".
 */
export interface PartnerState {
  partnerStatus?: string | null;
  partnerCode?: string | null;
  defaultExamCategory?: string | null;
  partnerActive?: boolean | null;
  /** Set the first time a link was switched on. Its presence means "live once". */
  partnerCreatedAt?: Date | string | null;
}

export interface PartnerStateProblem {
  field: "partnerCode" | "defaultExamCategory" | "partnerStatus";
  message: string;
  /** 409 for a conflict with an established fact, 400 for an incomplete request. */
  status: 400 | 409;
}

/**
 * Is the record the admin is about to create actually publishable?
 *
 * VALIDATE THE RESULT, NOT THE REQUEST
 *
 * The earlier version checked the incoming patch: it only ran when
 * `partnerActive: true` was in the body. That let an already-live partner be
 * edited into a contradictory state one field at a time - clear the exam
 * category on its own, and the record stays active while pointing at no exam,
 * because no rule was consulted. So this takes the record as it WILL BE and
 * asks whether that is allowed, which cannot be sidestepped by splitting a
 * change across two requests.
 */
export function validatePartnerState(next: PartnerState): PartnerStateProblem[] {
  const problems: PartnerStateProblem[] = [];
  if (next.partnerActive !== true) return problems;

  if (next.partnerStatus !== "active_partner") {
    problems.push({
      field: "partnerStatus",
      status: 400,
      message: "Promote the organization to Active Partner before activating its link.",
    });
  }
  if (!normalizePartnerCode(next.partnerCode ?? null)) {
    problems.push({
      field: "partnerCode",
      status: 400,
      message: "A partner code is required before activating.",
    });
  }
  if (!next.defaultExamCategory) {
    problems.push({
      field: "defaultExamCategory",
      status: 400,
      message: "Choose the exam this partner sends before activating.",
    });
  }

  return problems;
}

/**
 * May this partner's code still be changed?
 *
 * Once a link has been live, no - and this is a reporting rule rather than a
 * philosophical one. Analytics events are grouped by the partner_code recorded
 * on them, and the performance query joins those events to the partner's
 * CURRENT code. Rename a live partner and every event already recorded under
 * the old code stops matching: the traffic does not move, it disappears from
 * that partner's report entirely, and the partner appears to have sent nobody.
 *
 * Aliases and code history would solve it properly. That is a deliberate
 * feature, not something to improvise here, so for now the code is fixed at
 * the moment it first goes live. Deactivating is still allowed and keeps the
 * code, so history stays joined up and the link can be switched back on.
 */
export function partnerCodeChangeProblem(
  existing: {
    partnerCode?: string | null;
    partnerCreatedAt?: Date | string | null;
    partnerActive?: boolean | null;
  },
  incomingCode: string | null | undefined,
): PartnerStateProblem | null {
  // Live now, or live at some point in the past. The two are asked separately
  // because they can disagree: `partner_created_at` is stamped by the admin
  // route, so a row switched on by any other means - a migration, a fixture, a
  // hand-written UPDATE during an incident - would otherwise look like a draft
  // while its link was serving traffic.
  const hasBeenLive = Boolean(existing.partnerCreatedAt) || existing.partnerActive === true;

  // Never been live: the code is still a draft and may be anything.
  if (!hasBeenLive) return null;
  // Not being touched by this request.
  if (incomingCode === undefined) return null;

  const next = normalizePartnerCode(incomingCode ?? null);
  const current = existing.partnerCode ?? null;

  if (next === current) return null;

  return {
    field: "partnerCode",
    status: 409,
    message: next
      ? "This partner code is already active and cannot be changed."
      : "This partner code is already active and cannot be cleared.",
  };
}
