/**
 * Everything that comes BACK: replies, bounces, complaints, unsubscribes.
 *
 * Resend delivers these as signed webhooks (Svix signature scheme). The
 * signature is verified with plain node crypto - the scheme is HMAC-SHA256
 * over `${id}.${timestamp}.${payload}` - so no new dependency rides in on
 * the webhook path.
 *
 * THE ONE RULE ABOVE ALL OTHERS
 *
 * Nothing in this file, and nothing downstream of its classifications, can
 * activate a partnership. A reply - however enthusiastic - moves a campaign
 * to `interested`, sends the pre-approved pilot details once, and emails the
 * owner. `partner_active` is written by exactly one code path in this app (the
 * admin PATCH route, with its validation), and this module does not import it.
 */

import { createHmac, timingSafeEqual } from "crypto";
import {
  classifyReply,
  CLASSIFICATION_STATE,
  type ReplyClassification,
} from "@shared/outreachCampaign";
import {
  TEMPLATE_VERSION,
  renderPilotDetailsEmail,
  unsubscribeFooter,
} from "@shared/partnerOutreachEmails";
import { suggestPartnerCode, suggestedCategory, type PartnerSegment } from "@shared/partners";
import { pool } from "../db";
import {
  campaignByContactEmail,
  markMessageSent,
  normalizeEmail,
  recordInboundReply,
  releaseFailedSend,
  suppressEmail,
  transitionCampaign,
  type CampaignRow,
} from "./campaignStore";
import { outreachConfig, type OutreachEmailService } from "./emailService";

/** How much of a reply is kept. Enough to act on, not an archive. */
const REPLY_EXCERPT_LIMIT = 2000;

// --- Webhook signature (Svix scheme, as Resend signs) ----------------------

export interface WebhookHeaders {
  id: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
}

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

/**
 * Verify a Resend webhook. True only for a fresh, correctly signed payload.
 * The secret is the endpoint's `whsec_...` value from the Resend dashboard.
 */
export function verifyWebhookSignature(
  rawBody: string,
  headers: WebhookHeaders,
  secret: string,
  now: Date = new Date(),
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;

  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(now.getTime() / 1000 - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${headers.id}.${headers.timestamp}.${rawBody}`)
    .digest("base64");

  // Header carries one or more space-separated "v1,<base64>" entries.
  for (const part of headers.signature.split(" ")) {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) continue;
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

// --- Event handling --------------------------------------------------------

export interface WebhookOutcome {
  handled: boolean;
  action?: string;
}

function firstEmail(value: unknown): string | null {
  if (typeof value === "string" && value.includes("@")) {
    // "Name <addr@x>" or a bare address.
    const match = value.match(/<([^>]+)>/);
    return normalizeEmail(match ? match[1] : value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstEmail(item);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Route one verified webhook event.
 *
 * Types are matched by suffix so a provider-side rename of the prefix
 * ("email.bounced" vs "inbound.email.received") degrades to "unhandled"
 * rather than to a wrong action.
 */
export async function processWebhookEvent(
  event: { type?: string; data?: any },
  service: OutreachEmailService,
): Promise<WebhookOutcome> {
  const type = event.type ?? "";
  const data = event.data ?? {};

  if (type.endsWith("bounced")) {
    const address = firstEmail(data.to) ?? firstEmail(data.email);
    if (!address) return { handled: false };
    // Hard vs soft: Resend labels the bounce; anything not explicitly soft is
    // treated as hard, because resending into an unknown failure is the risk.
    const subtype = String(data.bounce?.subType ?? data.bounce?.type ?? "").toLowerCase();
    const isSoft = subtype.includes("soft") || subtype.includes("transient");
    if (isSoft) return { handled: true, action: "soft_bounce_ignored" };

    await suppressEmail(address, "hard_bounce", "resend-webhook");
    const campaign = await campaignByContactEmail(address);
    if (campaign) {
      await transitionCampaign(campaign.id, "bounced", { stopReason: "hard_bounce" });
    }
    return { handled: true, action: "hard_bounce_suppressed" };
  }

  if (type.endsWith("complained")) {
    const address = firstEmail(data.to) ?? firstEmail(data.email);
    if (!address) return { handled: false };
    await suppressEmail(address, "spam_complaint", "resend-webhook");
    const campaign = await campaignByContactEmail(address);
    if (campaign) {
      await transitionCampaign(campaign.id, "stopped", { stopReason: "spam_complaint" });
    }
    return { handled: true, action: "complaint_suppressed" };
  }

  if (type.endsWith("received")) {
    const from = firstEmail(data.from);
    if (!from) return { handled: false };
    const campaign = await campaignByContactEmail(from);
    if (!campaign) return { handled: true, action: "reply_from_unknown_address" };

    const text = String(data.text ?? data.subject ?? "");
    return await processReply(campaign, from, text, service);
  }

  return { handled: false };
}

/**
 * A reply arrived. Stop the sequence first, classify second - in that order,
 * so even a classifier bug can never leave follow-ups running against
 * someone who answered.
 */
export async function processReply(
  campaign: CampaignRow,
  fromEmail: string,
  text: string,
  service: OutreachEmailService,
): Promise<WebhookOutcome> {
  const excerpt = text.slice(0, REPLY_EXCERPT_LIMIT);
  await recordInboundReply(campaign.id, campaign.prospectId, fromEmail, excerpt);

  const classification = classifyReply(text);
  const state = CLASSIFICATION_STATE[classification];

  await transitionCampaign(campaign.id, state, {
    stopReason: "reply_received",
    replyClassification: classification,
    replyExcerpt: excerpt,
    replyReceivedAt: new Date(),
  });

  if (classification === "unsubscribe") {
    await suppressEmail(fromEmail, "unsubscribed", "reply");
  }

  if (classification === "interested") {
    // This is deliberately pre-approved, factual follow-through - not an AI
    // generated reply. It is idempotent by (campaign, step), so a retried
    // webhook cannot send the pilot details twice. It never activates a
    // partner; the second-step activation decision remains explicit.
    await sendPilotDetails(campaign, service);
    await sendInterestedAlert(campaign, excerpt, service);
  }

  return { handled: true, action: `reply_${classification}` };
}

// --- Interested reply: automatic pilot details ----------------------------

function appOrigin(): string {
  const host = process.env.APP_DOMAIN || "www.myeasypass.net";
  return `https://${host}`;
}

/**
 * Reserve the one automatic pilot-details response. The existing partial
 * unique index on outbound (campaign_id, step) is the source of truth; direct
 * insertion here is intentional because `pilot_details` is not a scheduled
 * SequenceStep and must never enter the dispatch state machine.
 */
async function reservePilotDetails(
  campaign: CampaignRow,
  subject: string,
): Promise<string | null> {
  try {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO partner_outreach_messages
         (campaign_id, prospect_id, direction, step, recipient, subject, template_version, status)
       VALUES ($1, $2, 'outbound', 'pilot_details', $3, $4, $5, 'pending')
       RETURNING id`,
      [campaign.id, campaign.prospectId, normalizeEmail(campaign.contactEmail), subject, TEMPLATE_VERSION],
    );
    return result.rows[0]?.id ?? null;
  } catch (error: any) {
    if (error?.code === "23505") return null;
    throw error;
  }
}

/**
 * Send the fixed pilot explanation once after a clearly interested reply.
 * Failure does not restart the cold sequence or alter the interested state;
 * the CRM/owner alert remains the fallback if the provider has a transient
 * problem.
 */
export async function sendPilotDetails(
  campaign: CampaignRow,
  service: OutreachEmailService,
): Promise<void> {
  const config = outreachConfig();
  if (!service.isConfigured()) return;

  const result = await pool.query(
    `SELECT organization_name, segment, decision_maker_name
       FROM partner_prospects WHERE id = $1`,
    [campaign.prospectId],
  );
  const row = result.rows[0];
  if (!row) return;

  const rendered = renderPilotDetailsEmail({
    organizationName: row.organization_name,
    segment: row.segment as PartnerSegment,
    decisionMakerName: row.decision_maker_name,
    senderName: config.senderName,
  });

  const messageId = await reservePilotDetails(campaign, rendered.subject);
  if (!messageId) return;

  const unsubscribeUrl = `${appOrigin()}/api/outreach/unsubscribe?token=${campaign.unsubscribeToken}`;
  const outcome = await service.send({
    to: campaign.contactEmail,
    subject: rendered.subject,
    text: `${rendered.text}\n\n${unsubscribeFooter(unsubscribeUrl)}`,
    replyTo: config.replyTo ?? undefined,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (!outcome.ok) {
    await releaseFailedSend(messageId);
    console.error(`[Outreach] pilot details send failed for campaign ${campaign.id}: ${outcome.error}`);
    return;
  }

  await markMessageSent(messageId, outcome.providerMessageId, new Date());
}

// --- The warm handoff ------------------------------------------------------

/**
 * Package an interested prospect for the owner: who they are, what we
 * hypothesized, what they said, and a suggested next step. Sent to the
 * configured alert address; if none is set, the admin panel still shows the
 * interested state, so nothing is lost - only the push notification.
 */
export async function sendInterestedAlert(
  campaign: CampaignRow,
  replyExcerpt: string,
  service: OutreachEmailService,
): Promise<void> {
  const config = outreachConfig();
  if (!config.alertEmail || !service.isConfigured()) return;

  const result = await pool.query(
    `SELECT organization_name, segment, decision_maker_name, decision_maker_title,
            partnership_hypothesis, default_exam_category
       FROM partner_prospects WHERE id = $1`,
    [campaign.prospectId],
  );
  const row = result.rows[0];
  if (!row) return;

  const segment = row.segment as PartnerSegment;
  const code = suggestPartnerCode(row.organization_name);
  const category = row.default_exam_category ?? suggestedCategory(segment);

  const lines = [
    `An outreach prospect replied and looks interested.`,
    ``,
    `Organization:   ${row.organization_name}`,
    `Decision maker: ${row.decision_maker_name ?? "(not on file)"}${row.decision_maker_title ? ` — ${row.decision_maker_title}` : ""}`,
    `Contact:        ${campaign.contactEmail}`,
    `Hypothesis:     ${row.partnership_hypothesis ?? "(none recorded)"}`,
    ``,
    `Their reply:`,
    replyExcerpt,
    ``,
    `The pre-approved pilot details were automatically attempted and the cold`,
    `follow-up sequence has stopped. If they reply yes again to request a`,
    `tracked partner link, review the relationship and activate it deliberately`,
    `in /admin/partners.`,
    ``,
    `If it becomes a partnership: suggested partner code "${code ?? "(set manually)"}",`,
    `suggested exam category ${category ?? "(choose in admin — insurance segments vary)"}.`,
    `Activation stays manual in /admin/partners; nothing has been activated.`,
  ];

  await service.send({
    to: config.alertEmail,
    subject: `Interested partner prospect: ${row.organization_name}`,
    text: lines.join("\n"),
  });
}

/** One-click unsubscribe from the link in every outreach email. */
export async function processUnsubscribeToken(token: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT id, contact_email FROM partner_outreach_campaigns WHERE unsubscribe_token = $1`,
    [token],
  );
  const row = result.rows[0];
  if (!row) return false;

  await suppressEmail(row.contact_email, "unsubscribed", "unsubscribe-link");
  await transitionCampaign(row.id, "unsubscribed", { stopReason: "unsubscribe_link" });
  return true;
}
