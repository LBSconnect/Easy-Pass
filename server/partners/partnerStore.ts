/**
 * Reading and writing the partner channel.
 *
 * Kept apart from server/storage.ts deliberately. That file is the student
 * product's data access layer and is owned by the student-runtime side of
 * CODEOWNERS; partner acquisition is a different concern with a different
 * owner, and threading it through the same interface would make every future
 * partner change a change to a revenue-critical shared file.
 */

import { pool } from "../db";
import { isPubliclyActive } from "@shared/partners";
import type { ExamCategory } from "@shared/schema";

/**
 * What a public visitor is allowed to learn from a partner code.
 *
 * Deliberately tiny. Everything a person wrote about the organization - who
 * they spoke to, what was said, what we think the deal is - stays server-side.
 * This is the whole of what leaves the building.
 */
export interface PublicPartner {
  partnerCode: string;
  displayName: string;
  examCategory: ExamCategory | null;
  landingVariant: string | null;
}

/** What the server needs internally to attribute, which includes the id. */
export interface ResolvedPartner extends PublicPartner {
  prospectId: string;
}

/**
 * Resolve a code to a live partner, or null.
 *
 * Null covers every failure the same way - unknown code, a prospect nobody
 * activated, a partner switched off - because the caller must not be able to
 * tell them apart. "This code exists but is not active" would confirm that we
 * hold a record on that organization, which is exactly the thing an
 * unactivated prospect must not reveal.
 *
 * The activation test is isPubliclyActive() rather than an inline comparison,
 * so there is one definition of "may we say their name" in the codebase.
 */
export async function resolveActivePartner(code: string): Promise<ResolvedPartner | null> {
  const result = await pool.query<{
    id: string;
    partner_code: string;
    partner_status: string;
    partner_active: boolean;
    partner_display_name: string | null;
    organization_name: string;
    default_exam_category: ExamCategory | null;
    partner_landing_variant: string | null;
  }>(
    `SELECT id, partner_code, partner_status, partner_active, partner_display_name,
            organization_name, default_exam_category, partner_landing_variant
       FROM partner_prospects
      WHERE partner_code = $1
      LIMIT 1`,
    [code],
  );

  const row = result.rows[0];
  if (!row) return null;
  if (!isPubliclyActive(row.partner_status, row.partner_active)) return null;

  return {
    prospectId: row.id,
    partnerCode: row.partner_code,
    // The display name is a separate field so an organization can be shown as
    // it wishes to be shown, rather than as our research file happened to
    // record its legal name.
    displayName: row.partner_display_name?.trim() || row.organization_name,
    examCategory: row.default_exam_category,
    landingVariant: row.partner_landing_variant,
  };
}

/**
 * Record the partner that introduced a student, once.
 *
 * The WHERE clause is the first-touch rule, in the only place it can be
 * enforced reliably. Two requests arriving together both read a null profile
 * and both try to write; the database settles it, and whichever loses changes
 * nothing. Doing this check in application code would leave that race open.
 */
export async function attributeUserToPartner(
  userId: string,
  partner: { prospectId: string; partnerCode: string },
): Promise<boolean> {
  // INSERT ... ON CONFLICT, not UPDATE.
  //
  // Registration does not create a user_profiles row - profiles are made
  // lazily, the first time something needs one - so at the moment a student
  // finishes signing up there is usually nothing to update. A plain UPDATE
  // here matched zero rows and reported success, and the attribution was
  // silently lost for every student who came through a partner link. It is
  // worth being clear that this failed quietly in exactly the way that is
  // hardest to notice: no error, no log, just an empty column months later.
  //
  // user_id is uniquely indexed, and is the only NOT NULL column without a
  // default, so inserting a partial profile row here is safe: every other
  // column keeps the default it would have had anyway.
  const result = await pool.query(
    `INSERT INTO user_profiles (user_id, partner_code, partner_prospect_id, partner_attributed_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id) DO UPDATE
        SET partner_code = EXCLUDED.partner_code,
            partner_prospect_id = EXCLUDED.partner_prospect_id,
            partner_attributed_at = now(),
            updated_at = now()
      -- First touch wins, enforced here because two requests can race and only
      -- the database can settle which of them was first.
      WHERE user_profiles.partner_code IS NULL`,
    [userId, partner.partnerCode, partner.prospectId],
  );
  return (result.rowCount ?? 0) > 0;
}

export interface PartnerConversionInput {
  userId: string;
  stripeSubscriptionId: string;
  examCategory: ExamCategory | null;
  billingPeriod: string | null;
  status: string;
}

/**
 * Credit a verified subscription to whichever partner introduced the student.
 *
 * Reads the partner from the student's profile rather than from the request,
 * so a conversion cannot be attributed by anything the browser sends at
 * checkout time - the attribution was decided when they first arrived.
 *
 * ON CONFLICT DO NOTHING against the unique subscription id is the
 * deduplication. A reload, a second tab and a repeated sync all present the
 * same subscription, and all three end up as one row.
 *
 * Returns whether a new conversion was recorded, which is what the tests
 * assert on - "did nothing, successfully" and "recorded a sale" must be
 * distinguishable.
 */
export async function recordPartnerConversion(input: PartnerConversionInput): Promise<boolean> {
  const profile = await pool.query<{ partner_code: string | null; partner_prospect_id: string | null }>(
    `SELECT partner_code, partner_prospect_id FROM user_profiles WHERE user_id = $1 LIMIT 1`,
    [input.userId],
  );

  const row = profile.rows[0];
  if (!row?.partner_code || !row.partner_prospect_id) return false;

  const result = await pool.query(
    `INSERT INTO partner_conversions
       (partner_prospect_id, partner_code, user_id, stripe_subscription_id,
        exam_category, billing_period, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (stripe_subscription_id) DO NOTHING`,
    [
      row.partner_prospect_id,
      row.partner_code,
      input.userId,
      input.stripeSubscriptionId,
      input.examCategory,
      input.billingPeriod,
      input.status,
    ],
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * The admin list.
 *
 * Everything about an organization, because this screen is for the person
 * doing outreach and they need the contact details and the notes. It is behind
 * an admin check at the route; nothing here is safe to serve publicly.
 */
export interface AdminProspectRow {
  id: string;
  organizationName: string;
  segment: string;
  segmentRaw: string | null;
  market: string | null;
  state: string | null;
  website: string | null;
  publicContact: string | null;
  candidateSignal: string | null;
  knownExamVolume: number | null;
  priority: string | null;
  whyItMatters: string | null;
  sourceUrl: string | null;
  outreachStatus: string;
  owner: string | null;
  decisionMakerName: string | null;
  decisionMakerTitle: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  linkedinUrl: string | null;
  partnershipHypothesis: string | null;
  notes: string | null;
  nextAction: string | null;
  lastContactAt: string | null;
  scoreCandidatePipeline: number | null;
  scoreProductFit: number | null;
  scoreDecisionMakerAccess: number | null;
  scoreAudienceScale: number | null;
  scoreOverride: number | null;
  partnerStatus: string;
  partnerCode: string | null;
  defaultExamCategory: string | null;
  partnerActive: boolean;
  partnerDisplayName: string | null;
  /** Verified subscriptions credited to this organization. */
  attributedSubscriptions: number;
}

export async function listProspects(): Promise<AdminProspectRow[]> {
  const result = await pool.query(
    `SELECT p.*,
            -- Counted from partner_conversions, which only ever holds
            -- server-verified subscriptions. There is no other source for this
            -- number, so it cannot drift from what was actually sold.
            COALESCE(c.conversions, 0)::int AS attributed_subscriptions
       FROM partner_prospects p
       LEFT JOIN (
         SELECT partner_prospect_id, COUNT(*) AS conversions
           FROM partner_conversions
          GROUP BY partner_prospect_id
       ) c ON c.partner_prospect_id = p.id
      ORDER BY p.organization_name`,
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    organizationName: row.organization_name,
    segment: row.segment,
    segmentRaw: row.segment_raw,
    market: row.market,
    state: row.state,
    website: row.website,
    publicContact: row.public_contact,
    candidateSignal: row.candidate_signal,
    knownExamVolume: row.known_exam_volume,
    priority: row.priority,
    whyItMatters: row.why_it_matters,
    sourceUrl: row.source_url,
    outreachStatus: row.outreach_status,
    owner: row.owner,
    decisionMakerName: row.decision_maker_name,
    decisionMakerTitle: row.decision_maker_title,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    linkedinUrl: row.linkedin_url,
    partnershipHypothesis: row.partnership_hypothesis,
    notes: row.notes,
    nextAction: row.next_action,
    lastContactAt: row.last_contact_at ? new Date(row.last_contact_at).toISOString() : null,
    scoreCandidatePipeline: row.score_candidate_pipeline,
    scoreProductFit: row.score_product_fit,
    scoreDecisionMakerAccess: row.score_decision_maker_access,
    scoreAudienceScale: row.score_audience_scale,
    scoreOverride: row.score_override,
    partnerStatus: row.partner_status,
    partnerCode: row.partner_code,
    defaultExamCategory: row.default_exam_category,
    partnerActive: row.partner_active,
    partnerDisplayName: row.partner_display_name,
    attributedSubscriptions: row.attributed_subscriptions,
  }));
}

/** Columns an admin may edit. Anything not listed here cannot be written. */
const EDITABLE_COLUMNS: Record<string, string> = {
  outreachStatus: "outreach_status",
  owner: "owner",
  decisionMakerName: "decision_maker_name",
  decisionMakerTitle: "decision_maker_title",
  contactEmail: "contact_email",
  contactPhone: "contact_phone",
  linkedinUrl: "linkedin_url",
  facebookUrl: "facebook_url",
  instagramUrl: "instagram_url",
  partnershipHypothesis: "partnership_hypothesis",
  notes: "notes",
  nextAction: "next_action",
  lastContactAt: "last_contact_at",
  scoreCandidatePipeline: "score_candidate_pipeline",
  scoreProductFit: "score_product_fit",
  scoreDecisionMakerAccess: "score_decision_maker_access",
  scoreAudienceScale: "score_audience_scale",
  scoreOverride: "score_override",
  partnerStatus: "partner_status",
  partnerCode: "partner_code",
  defaultExamCategory: "default_exam_category",
  partnerActive: "partner_active",
  partnerDisplayName: "partner_display_name",
};

/**
 * Apply an edit.
 *
 * Column names come from the map above rather than from the request, so a
 * crafted field name cannot reach the SQL. Values are always parameters.
 */
export async function updateProspect(
  id: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [id];

  for (const [key, column] of Object.entries(EDITABLE_COLUMNS)) {
    if (!(key in patch)) continue;
    params.push(patch[key] === "" ? null : patch[key]);
    sets.push(`${column} = $${params.length}`);
  }

  if (sets.length === 0) return false;

  // Stamped whenever a partner is switched on for the first time, so "how long
  // has this link been live" is answerable later.
  if ("partnerActive" in patch && patch.partnerActive === true) {
    sets.push(`partner_created_at = COALESCE(partner_created_at, now())`);
  }

  const result = await pool.query(
    `UPDATE partner_prospects SET ${sets.join(", ")}, updated_at = now() WHERE id = $1`,
    params,
  );
  return (result.rowCount ?? 0) > 0;
}

export interface PartnerPerformanceRow {
  id: string;
  organizationName: string;
  partnerCode: string;
  partnerActive: boolean;
  defaultExamCategory: string | null;
  visits: number;
  readinessStarts: number;
  readinessCompletions: number;
  pricingViews: number;
  checkoutStarts: number;
  verifiedSubscriptions: number;
  lastActivityAt: string | null;
}

/**
 * What each live partner has actually produced.
 *
 * Funnel counts come from analytics_events by partner_code, which is the same
 * pipeline every other funnel number on the site uses. Subscriptions come from
 * partner_conversions instead - deliberately a different source, because an
 * analytics event is a claim by a browser and a conversion row is a fact the
 * server established with Stripe.
 */
export async function partnerPerformance(): Promise<PartnerPerformanceRow[]> {
  const result = await pool.query(
    `SELECT p.id, p.organization_name, p.partner_code, p.partner_active,
            p.default_exam_category,
            COALESCE(e.visits, 0)::int              AS visits,
            COALESCE(e.readiness_starts, 0)::int    AS readiness_starts,
            COALESCE(e.readiness_done, 0)::int      AS readiness_done,
            COALESCE(e.pricing_views, 0)::int       AS pricing_views,
            COALESCE(e.checkout_starts, 0)::int     AS checkout_starts,
            COALESCE(c.conversions, 0)::int         AS verified_subscriptions,
            e.last_activity_at
       FROM partner_prospects p
       LEFT JOIN (
         SELECT metadata->>'partner_code' AS code,
                COUNT(*) FILTER (WHERE event = 'partner_landing_view')  AS visits,
                COUNT(*) FILTER (WHERE event = 'diagnostic_start')      AS readiness_starts,
                COUNT(*) FILTER (WHERE event = 'diagnostic_completed')  AS readiness_done,
                COUNT(*) FILTER (WHERE event = 'pricing_view')          AS pricing_views,
                COUNT(*) FILTER (WHERE event = 'checkout_start')        AS checkout_starts,
                MAX(created_at)                                         AS last_activity_at
           FROM analytics_events
          WHERE metadata->>'partner_code' IS NOT NULL
          GROUP BY metadata->>'partner_code'
       ) e ON e.code = p.partner_code
       LEFT JOIN (
         SELECT partner_prospect_id, COUNT(*) AS conversions
           FROM partner_conversions
          GROUP BY partner_prospect_id
       ) c ON c.partner_prospect_id = p.id
      WHERE p.partner_code IS NOT NULL
      ORDER BY verified_subscriptions DESC, visits DESC, p.organization_name`,
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    organizationName: row.organization_name,
    partnerCode: row.partner_code,
    partnerActive: row.partner_active,
    defaultExamCategory: row.default_exam_category,
    visits: row.visits,
    readinessStarts: row.readiness_starts,
    readinessCompletions: row.readiness_done,
    pricingViews: row.pricing_views,
    checkoutStarts: row.checkout_starts,
    verifiedSubscriptions: row.verified_subscriptions,
    lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at).toISOString() : null,
  }));
}
