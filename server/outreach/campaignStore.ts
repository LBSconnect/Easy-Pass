/**
 * Reading and writing outreach campaigns.
 *
 * Same separation as server/partners/partnerStore.ts and for the same reason:
 * this is the acquisition side of CODEOWNERS, kept out of the student
 * product's data layer. Raw SQL against the pool, matching the partner
 * store's house style.
 *
 * THE INVARIANTS THIS FILE HOLDS AT THE DATABASE
 *
 *   - One campaign per prospect (unique index on prospect_id).
 *   - One outbound email per step per campaign (partial unique index) - a
 *     duplicate job, a retry, or two dispatchers racing cannot double-send,
 *     because the second INSERT of the same (campaign, step) fails before any
 *     provider call is made.
 *   - Suppression rows are only ever inserted by automation, never deleted.
 */

import { randomBytes } from "crypto";
import { pool } from "../db";
import {
  type CampaignState,
  type SequenceStep,
  type SuppressionReason,
  crmStatusFor,
} from "@shared/outreachCampaign";

export interface CampaignRow {
  id: string;
  prospectId: string;
  state: CampaignState;
  paused: boolean;
  contactEmail: string;
  campaignSource: string;
  initialSentAt: Date | null;
  lastSentAt: Date | null;
  nextActionAt: Date | null;
  replyReceivedAt: Date | null;
  replyClassification: string | null;
  replyExcerpt: string | null;
  stopReason: string | null;
  unsubscribeToken: string;
}

function mapCampaign(row: any): CampaignRow {
  return {
    id: row.id,
    prospectId: row.prospect_id,
    state: row.state,
    paused: row.paused,
    contactEmail: row.contact_email,
    campaignSource: row.campaign_source,
    initialSentAt: row.initial_sent_at,
    lastSentAt: row.last_sent_at,
    nextActionAt: row.next_action_at,
    replyReceivedAt: row.reply_received_at,
    replyClassification: row.reply_classification,
    replyExcerpt: row.reply_excerpt,
    stopReason: row.stop_reason,
    unsubscribeToken: row.unsubscribe_token,
  };
}

const CAMPAIGN_COLUMNS = `id, prospect_id, state, paused, contact_email, campaign_source,
  initial_sent_at, last_sent_at, next_action_at, reply_received_at,
  reply_classification, reply_excerpt, stop_reason, unsubscribe_token`;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// --- Suppression -----------------------------------------------------------

export async function isSuppressed(email: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM partner_email_suppressions WHERE email = $1`,
    [normalizeEmail(email)],
  );
  return (result.rowCount ?? 0) > 0;
}

/** Idempotent: suppressing an already-suppressed address is a no-op. */
export async function suppressEmail(
  email: string,
  reason: SuppressionReason,
  source: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO partner_email_suppressions (email, reason, source)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [normalizeEmail(email), reason, source],
  );
}

// --- Enrollment ------------------------------------------------------------

/**
 * Prospects allowed to enter the queue, in the order they should enter it.
 *
 * The WHERE clause is the eligibility policy, stated once:
 *   - a person marked them ready (`outreach_status = 'ready_to_contact'`)
 *   - there is an address to write to
 *   - they are not, and have never been, an activated partner
 *   - no campaign exists for them yet
 *   - the address is not suppressed
 *
 * Ordered by score-bearing priority then volume so higher-confidence
 * prospects go first, matching the campaign plan.
 */
export async function eligibleProspectsForEnrollment(limit: number): Promise<Array<{
  id: string;
  contactEmail: string;
}>> {
  const result = await pool.query<{ id: string; contact_email: string }>(
    `SELECT p.id, coalesce(p.contact_email, p.public_contact) AS contact_email
       FROM partner_prospects p
      WHERE p.outreach_status = 'ready_to_contact'
        AND coalesce(p.contact_email, '') <> ''
        AND p.partner_active = false
        AND p.partner_created_at IS NULL
        AND p.partner_status NOT IN ('active_partner', 'inactive_partner')
        AND NOT EXISTS (SELECT 1 FROM partner_outreach_campaigns c WHERE c.prospect_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM partner_email_suppressions s
                         WHERE s.email = lower(trim(p.contact_email)))
      ORDER BY CASE p.priority
                 WHEN 'Very High' THEN 0 WHEN 'High' THEN 1
                 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 ELSE 4 END,
               coalesce(p.known_exam_volume, 0) DESC,
               p.organization_name
      LIMIT $1`,
    [limit],
  );
  return result.rows.map((r) => ({ id: r.id, contactEmail: normalizeEmail(r.contact_email) }));
}

/** Create the campaign row for a prospect. Returns null if one already exists. */
export async function enrollProspect(prospectId: string, contactEmail: string): Promise<CampaignRow | null> {
  const token = randomBytes(24).toString("hex");
  const result = await pool.query(
    `INSERT INTO partner_outreach_campaigns (prospect_id, contact_email, unsubscribe_token)
     VALUES ($1, $2, $3)
     ON CONFLICT (prospect_id) DO NOTHING
     RETURNING ${CAMPAIGN_COLUMNS}`,
    [prospectId, normalizeEmail(contactEmail), token],
  );
  return result.rows[0] ? mapCampaign(result.rows[0]) : null;
}

// --- Reads -----------------------------------------------------------------

export async function campaignByProspect(prospectId: string): Promise<CampaignRow | null> {
  const result = await pool.query(
    `SELECT ${CAMPAIGN_COLUMNS} FROM partner_outreach_campaigns WHERE prospect_id = $1`,
    [prospectId],
  );
  return result.rows[0] ? mapCampaign(result.rows[0]) : null;
}

export async function campaignByUnsubscribeToken(token: string): Promise<CampaignRow | null> {
  const result = await pool.query(
    `SELECT ${CAMPAIGN_COLUMNS} FROM partner_outreach_campaigns WHERE unsubscribe_token = $1`,
    [token],
  );
  return result.rows[0] ? mapCampaign(result.rows[0]) : null;
}

/** The newest campaign writing to this address - how a reply finds its prospect. */
export async function campaignByContactEmail(email: string): Promise<CampaignRow | null> {
  const result = await pool.query(
    `SELECT ${CAMPAIGN_COLUMNS} FROM partner_outreach_campaigns
      WHERE contact_email = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [normalizeEmail(email)],
  );
  return result.rows[0] ? mapCampaign(result.rows[0]) : null;
}

/** Campaigns in active states, for the dispatcher to consult. */
export async function activeCampaigns(): Promise<CampaignRow[]> {
  const result = await pool.query(
    `SELECT ${CAMPAIGN_COLUMNS} FROM partner_outreach_campaigns
      WHERE state IN ('queued', 'contacted', 'follow_up_1_sent', 'follow_up_2_sent')
      ORDER BY created_at`,
  );
  return result.rows.map(mapCampaign);
}

/** Initial emails sent on this local calendar date, against the daily limit. */
export async function initialSendsOn(dateKeyStart: Date, dateKeyEnd: Date): Promise<number> {
  const result = await pool.query<{ n: string }>(
    `SELECT count(*) AS n FROM partner_outreach_messages
      WHERE direction = 'outbound' AND step = 'initial' AND status = 'sent'
        AND sent_at >= $1 AND sent_at < $2`,
    [dateKeyStart, dateKeyEnd],
  );
  return Number(result.rows[0]?.n ?? 0);
}

// --- The send, made single-shot --------------------------------------------

/**
 * Reserve the right to send `step` for this campaign.
 *
 * Inserts the message row in `pending` status BEFORE any provider call. The
 * partial unique index on (campaign_id, step) makes the second reservation
 * fail no matter who makes it or when, which is the double-send guarantee.
 * Returns the message id, or null when the step was already reserved.
 */
export async function reserveSend(
  campaignId: string,
  prospectId: string,
  step: SequenceStep,
  recipient: string,
  subject: string,
  templateVersion: string,
): Promise<string | null> {
  try {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO partner_outreach_messages
         (campaign_id, prospect_id, direction, step, recipient, subject, template_version, status)
       VALUES ($1, $2, 'outbound', $3, $4, $5, $6, 'pending')
       RETURNING id`,
      [campaignId, prospectId, step, normalizeEmail(recipient), subject, templateVersion],
    );
    return result.rows[0]?.id ?? null;
  } catch (error: any) {
    if (error?.code === "23505") return null; // step already reserved or sent
    throw error;
  }
}

/** The provider accepted it: the reservation becomes the record of the send. */
export async function markMessageSent(
  messageId: string,
  providerMessageId: string | null,
  sentAt: Date,
): Promise<void> {
  await pool.query(
    `UPDATE partner_outreach_messages
        SET status = 'sent', provider_message_id = $2, sent_at = $3
      WHERE id = $1`,
    [messageId, providerMessageId, sentAt],
  );
}

/**
 * The provider refused or the call failed: release the reservation so the
 * next dispatch run retries. Deleting the pending row is what makes the retry
 * possible; nothing was sent, so there is nothing to record.
 */
export async function releaseFailedSend(messageId: string): Promise<void> {
  await pool.query(
    `DELETE FROM partner_outreach_messages WHERE id = $1 AND status = 'pending'`,
    [messageId],
  );
}

export async function recordInboundReply(
  campaignId: string,
  prospectId: string,
  fromEmail: string,
  excerpt: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO partner_outreach_messages
       (campaign_id, prospect_id, direction, step, recipient, status, body_excerpt, sent_at)
     VALUES ($1, $2, 'inbound', 'reply', $3, 'received', $4, now())`,
    [campaignId, prospectId, normalizeEmail(fromEmail), excerpt],
  );
}

// --- State transitions -----------------------------------------------------

/** Advance after a successful send. */
export async function applySendResult(
  campaignId: string,
  step: SequenceStep,
  state: CampaignState,
  sentAt: Date,
  nextActionAt: Date,
): Promise<void> {
  await pool.query(
    `UPDATE partner_outreach_campaigns
        SET state = $2,
            ${step === "initial" ? "initial_sent_at = $3," : ""}
            last_sent_at = $3,
            next_action_at = $4,
            updated_at = now()
      WHERE id = $1`,
    [campaignId, state, sentAt, nextActionAt],
  );
}

/**
 * Move a campaign to a terminal or held state and project it onto the CRM.
 *
 * The prospect's human-facing outreach_status and last_contact_at move with
 * it, so the admin table tells the truth without joining the machine's table.
 */
export async function transitionCampaign(
  campaignId: string,
  state: CampaignState,
  fields: {
    stopReason?: string;
    replyClassification?: string;
    replyExcerpt?: string;
    replyReceivedAt?: Date;
    clearNextAction?: boolean;
  } = {},
): Promise<void> {
  await pool.query(
    `UPDATE partner_outreach_campaigns
        SET state = $2,
            stop_reason = coalesce($3, stop_reason),
            reply_classification = coalesce($4, reply_classification),
            reply_excerpt = coalesce($5, reply_excerpt),
            reply_received_at = coalesce($6, reply_received_at),
            next_action_at = CASE WHEN $7 THEN NULL ELSE next_action_at END,
            updated_at = now()
      WHERE id = $1`,
    [
      campaignId,
      state,
      fields.stopReason ?? null,
      fields.replyClassification ?? null,
      fields.replyExcerpt ?? null,
      fields.replyReceivedAt ?? null,
      fields.clearNextAction ?? true,
    ],
  );

  await pool.query(
    `UPDATE partner_prospects p
        SET outreach_status = $2, updated_at = now()
       FROM partner_outreach_campaigns c
      WHERE c.id = $1 AND p.id = c.prospect_id`,
    [campaignId, crmStatusFor(state)],
  );
}

export async function setPaused(campaignId: string, paused: boolean): Promise<void> {
  await pool.query(
    `UPDATE partner_outreach_campaigns SET paused = $2, updated_at = now() WHERE id = $1`,
    [campaignId, paused],
  );
}

/** Project a send onto the prospect row (status + last contact). */
export async function projectSendToProspect(prospectId: string, state: CampaignState, sentAt: Date): Promise<void> {
  await pool.query(
    `UPDATE partner_prospects
        SET outreach_status = $2, last_contact_at = $3, updated_at = now()
      WHERE id = $1`,
    [prospectId, crmStatusFor(state), sentAt],
  );
}

// --- Admin summaries -------------------------------------------------------

export interface CampaignSummary {
  prospectId: string;
  state: CampaignState;
  paused: boolean;
  step: number;
  lastSentAt: Date | null;
  nextActionAt: Date | null;
  replyClassification: string | null;
  replyReceivedAt: Date | null;
  replyExcerpt: string | null;
  suppressed: boolean;
  stopReason: string | null;
}

export async function listCampaignSummaries(): Promise<CampaignSummary[]> {
  const result = await pool.query(
    `SELECT c.prospect_id, c.state, c.paused, c.last_sent_at, c.next_action_at,
            c.reply_classification, c.reply_received_at, c.reply_excerpt, c.stop_reason,
            (SELECT count(*) FROM partner_outreach_messages m
              WHERE m.campaign_id = c.id AND m.direction = 'outbound' AND m.status = 'sent') AS steps_sent,
            EXISTS (SELECT 1 FROM partner_email_suppressions s
                     WHERE s.email = c.contact_email) AS suppressed
       FROM partner_outreach_campaigns c`,
  );
  return result.rows.map((row: any) => ({
    prospectId: row.prospect_id,
    state: row.state,
    paused: row.paused,
    step: Number(row.steps_sent),
    lastSentAt: row.last_sent_at,
    nextActionAt: row.next_action_at,
    replyClassification: row.reply_classification,
    replyReceivedAt: row.reply_received_at,
    replyExcerpt: row.reply_excerpt,
    suppressed: row.suppressed,
    stopReason: row.stop_reason,
  }));
}
