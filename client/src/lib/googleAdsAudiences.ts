/**
 * Google Ads audience signals for MyEasyPass acquisition funnels.
 *
 * The site already loads AW-18360793283 globally and reports verified paid
 * subscriptions separately. This module adds NON-CONVERSION audience signals
 * so Google Ads can build useful website-visitor segments such as:
 *
 *   - readiness started / completed
 *   - pricing viewers
 *   - checkout abandoners
 *   - signup starters
 *   - retaker-rescue visitors
 *   - partner-referred visitors
 *
 * PRIVACY RULE
 * Only coarse, allowlisted marketing context is sent. Never pass email,
 * student name, quiz answers, free-text content, user IDs, Stripe IDs, or raw
 * query strings through this module.
 */

const GOOGLE_ADS_DESTINATION = "AW-18360793283";

interface AttributionForAds {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  partner_code?: string | null;
}

interface AudienceSignalInput {
  event: string;
  path: string;
  attribution: AttributionForAds;
  metadata?: Record<string, unknown>;
}

/**
 * Events close enough to revenue to justify explicit audience membership.
 * Keeping this list small avoids filling Google Ads with low-value noise.
 */
const FUNNEL_STAGE_BY_EVENT: Record<string, string> = {
  partner_landing_view: "partner_visit",
  exam_landing_view: "exam_interest",
  readiness_cta_click: "readiness_intent",
  diagnostic_start: "readiness_started",
  diagnostic_completed: "readiness_completed",
  diagnostic_result_view: "readiness_result",
  result_upgrade_click: "upgrade_intent",
  pricing_view: "pricing_viewed",
  pricing_cta_click: "pricing_intent",
  signup_started: "signup_started",
  signup_completed: "registered",
  checkout_start: "checkout_started",
  checkout_canceled: "checkout_abandoned",
  guest_practice_wall_shown: "practice_paywall",
  guest_practice_signup_click: "practice_signup_intent",
  retaker_rescue_start: "retaker_rescue",
  subscription_completed: "subscribed",
};

function safeString(value: unknown, maxLength = 100): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function inferExamType(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  return (
    safeString(metadata.exam_type) ??
    safeString(metadata.examType) ??
    safeString(metadata.category) ??
    safeString(metadata.exam_category)
  );
}

function inferLanguage(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  return safeString(metadata.language, 20) ?? safeString(metadata.lang, 20);
}

/**
 * Emit a Google Ads data event that can be used in Audience Manager rules.
 *
 * We deliberately use page_view because Google Ads documents custom parameters
 * on data/remarketing event snippets with this event, while the custom
 * `mep_*` parameters make the actual funnel action unambiguous.
 */
export function sendGoogleAdsAudienceSignal(input: AudienceSignalInput): boolean {
  const funnelStage = FUNNEL_STAGE_BY_EVENT[input.event];
  if (!funnelStage) return false;

  const layer = (window as unknown as { dataLayer?: unknown[][] }).dataLayer;
  if (!Array.isArray(layer)) return false;

  const examType = inferExamType(input.metadata);
  const language = inferLanguage(input.metadata);

  const params: Record<string, string> = {
    send_to: GOOGLE_ADS_DESTINATION,
    edu_pagetype: "exam_prep",
    mep_funnel_stage: funnelStage,
    mep_path: input.path.slice(0, 200),
  };

  const source = safeString(input.attribution.utm_source);
  const medium = safeString(input.attribution.utm_medium);
  const campaign = safeString(input.attribution.utm_campaign);
  const partner = safeString(input.attribution.partner_code);

  if (examType) params.mep_exam_type = examType;
  if (language) params.mep_language = language;
  if (source) params.mep_source = source;
  if (medium) params.mep_medium = medium;
  if (campaign) params.mep_campaign = campaign;
  if (partner) params.mep_partner_code = partner;

  layer.push(["event", "page_view", params]);
  return true;
}

export const __testing = { GOOGLE_ADS_DESTINATION, FUNNEL_STAGE_BY_EVENT };
