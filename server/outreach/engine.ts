/**
 * The dispatch run: everything the outreach engine does when the clock fires.
 *
 * Triggered exactly like study reminders - an external cron calls a
 * secret-guarded route (see routes.ts), because this app deliberately has no
 * internal scheduler. The run itself decides whether anything may actually
 * leave: outside business hours or on a weekend it processes nothing, so the
 * cron's own schedule never reaches an inbox.
 *
 * ORDER OF A RUN
 *
 *   1. Follow-ups and completions that have come due.
 *   2. New enrollments, up to the daily limit, highest-confidence first.
 *
 * Follow-ups first because a promise already half-made ("I'll follow up")
 * outranks starting a new conversation, and because the daily limit applies
 * only to NEW prospects - due follow-ups ride on top by design.
 *
 * EVERY send passes the same four gates immediately before the provider call:
 * campaign in a sendable state and not paused, prospect not an activated
 * partner, address not suppressed, and the (campaign, step) reservation not
 * already taken. The gates live server-side, here, so no caller can skip them.
 */

import {
  SENDABLE_STATES,
  afterSend,
  dueAction,
  isWithinSendingWindow,
  DEFAULT_SENDING_WINDOW,
  OUTREACH_TIME_ZONE,
  type SequenceStep,
  type SendingWindowConfig,
} from "@shared/outreachCampaign";
import {
  TEMPLATE_VERSION,
  renderStep,
  unsubscribeFooter,
  type OutreachEmailInputs,
} from "@shared/partnerOutreachEmails";
import type { PartnerSegment } from "@shared/partners";
import { pool } from "../db";
import {
  type CampaignRow,
  activeCampaigns,
  applySendResult,
  eligibleProspectsForEnrollment,
  enrollProspect,
  initialSendsOn,
  isSuppressed,
  markMessageSent,
  projectSendToProspect,
  releaseFailedSend,
  reserveSend,
  transitionCampaign,
} from "./campaignStore";
import { outreachConfig, type OutreachEmailService, type OutreachEmailConfig } from "./emailService";

export interface DispatchRunResult {
  ran: boolean;
  reason?: string;
  enrolled: number;
  initialSent: number;
  followUpsSent: number;
  completed: number;
  skipped: number;
  failed: number;
}

interface ProspectFacts {
  organizationName: string;
  segment: PartnerSegment;
  decisionMakerName: string | null;
  partnershipHypothesis: string | null;
  partnerActive: boolean;
  partnerStatus: string;
}

async function prospectFacts(prospectId: string): Promise<ProspectFacts | null> {
  const result = await pool.query(
    `SELECT organization_name, segment, decision_maker_name, partnership_hypothesis,
            partner_active, partner_status
       FROM partner_prospects WHERE id = $1`,
    [prospectId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    organizationName: row.organization_name,
    segment: row.segment as PartnerSegment,
    decisionMakerName: row.decision_maker_name,
    partnershipHypothesis: row.partnership_hypothesis,
    partnerActive: row.partner_active,
    partnerStatus: row.partner_status,
  };
}

function appOrigin(): string {
  const host = process.env.APP_DOMAIN || "www.myeasypass.net";
  return `https://${host}`;
}

/**
 * Send one step of one campaign through every gate. Returns what happened,
 * and never throws for a single campaign's failure - the batch must survive
 * any one row.
 */
async function sendStep(
  campaign: CampaignRow,
  step: SequenceStep,
  service: OutreachEmailService,
  config: OutreachEmailConfig,
  now: Date,
): Promise<"sent" | "skipped" | "failed"> {
  // Gate 1: still sendable, still unpaused. (Re-read state is the caller's
  // snapshot; paused was checked by dueAction, state here.)
  if (!SENDABLE_STATES.includes(campaign.state) || campaign.paused) return "skipped";

  // Gate 2: an activated partner never receives acquisition email. Checked
  // against the live row, not the enrollment-time snapshot.
  const facts = await prospectFacts(campaign.prospectId);
  if (!facts) return "skipped";
  if (facts.partnerActive || facts.partnerStatus === "active_partner") {
    await transitionCampaign(campaign.id, "stopped", { stopReason: "partner_activated" });
    return "skipped";
  }

  // Gate 3: suppression, checked at send time so an unsubscribe recorded a
  // minute ago beats a follow-up queued a week ago.
  if (await isSuppressed(campaign.contactEmail)) {
    await transitionCampaign(campaign.id, "stopped", { stopReason: "suppressed" });
    return "skipped";
  }

  const inputs: OutreachEmailInputs = {
    organizationName: facts.organizationName,
    segment: facts.segment,
    decisionMakerName: facts.decisionMakerName,
    partnershipHypothesis: facts.partnershipHypothesis,
    senderName: config.senderName,
  };
  const rendered = renderStep(step, inputs);
  const unsubscribeUrl = `${appOrigin()}/api/outreach/unsubscribe?token=${campaign.unsubscribeToken}`;
  const text = `${rendered.text}\n\n${unsubscribeFooter(unsubscribeUrl)}`;

  // Gate 4: reserve (campaign, step) BEFORE calling the provider. If the row
  // exists - a previous run sent it, or is sending it right now - stop here.
  const messageId = await reserveSend(
    campaign.id,
    campaign.prospectId,
    step,
    campaign.contactEmail,
    rendered.subject,
    TEMPLATE_VERSION,
  );
  if (!messageId) return "skipped";

  const outcome = await service.send({
    to: campaign.contactEmail,
    subject: rendered.subject,
    text,
    replyTo: config.replyTo ?? undefined,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (!outcome.ok) {
    // Nothing left the building. Release the reservation so the next run
    // retries; do not advance the campaign.
    await releaseFailedSend(messageId);
    console.error(`[Outreach] send failed for campaign ${campaign.id} step ${step}: ${outcome.error}`);
    return "failed";
  }

  await markMessageSent(messageId, outcome.providerMessageId, now);
  const next = afterSend(step, now, campaign.initialSentAt, OUTREACH_TIME_ZONE);
  await applySendResult(campaign.id, step, next.state, now, next.nextActionAt);
  await projectSendToProspect(campaign.prospectId, next.state, now);
  return "sent";
}

/**
 * One dispatch run. Call it as often as you like; it does only what is due,
 * only inside the sending window, and only within the daily limit.
 */
export async function runOutreachDispatch(
  service: OutreachEmailService,
  now: Date = new Date(),
  config: OutreachEmailConfig = outreachConfig(),
  window: SendingWindowConfig = DEFAULT_SENDING_WINDOW,
): Promise<DispatchRunResult> {
  const result: DispatchRunResult = {
    ran: false,
    enrolled: 0,
    initialSent: 0,
    followUpsSent: 0,
    completed: 0,
    skipped: 0,
    failed: 0,
  };

  if (!config.enabled) {
    result.reason = "OUTREACH_ENABLED is not true";
    return result;
  }
  if (!service.isConfigured()) {
    result.reason = "email service not configured";
    return result;
  }
  if (!isWithinSendingWindow(now, window)) {
    result.reason = "outside business-hours sending window";
    return result;
  }
  result.ran = true;

  // The day's budget for NEW prospects. "Today" is the recipient's calendar
  // day, so the count and the limit agree about when a day starts. Follow-ups
  // are deliberately outside the budget: they are promises already half-made.
  const dayStart = startOfLocalDay(now, window.timeZone);
  const dayEnd = new Date(dayStart.getTime() + 36 * 60 * 60 * 1000); // past any DST edge
  const sentToday = await initialSendsOn(dayStart, dayEnd);
  let budget = Math.max(0, config.dailyNewProspectLimit - sentToday);

  // 1. What existing campaigns are owed - due follow-ups, completions, and
  // initials whose earlier send attempt failed (a `queued` campaign already
  // exists for them, so enrollment below will never see them again).
  for (const campaign of await activeCampaigns()) {
    const action = dueAction(campaign, now);
    if (action.type === "complete") {
      await transitionCampaign(campaign.id, "completed", { stopReason: "sequence_finished" });
      result.completed += 1;
      continue;
    }
    if (action.type !== "send") continue;

    if (action.step === "initial") {
      if (budget <= 0) continue; // still counts against the daily limit
      const outcome = await sendStep(campaign, "initial", service, config, now);
      if (outcome === "sent") {
        result.initialSent += 1;
        budget -= 1;
      } else if (outcome === "failed") result.failed += 1;
      else result.skipped += 1;
      continue;
    }

    const outcome = await sendStep(campaign, action.step, service, config, now);
    if (outcome === "sent") result.followUpsSent += 1;
    else if (outcome === "failed") result.failed += 1;
    else result.skipped += 1;
  }

  // 2. New prospects, inside what remains of the budget.
  if (budget > 0) {
    const eligible = await eligibleProspectsForEnrollment(budget);
    for (const prospect of eligible) {
      const campaign = (await enrollProspect(prospect.id, prospect.contactEmail))
        ?? null;
      if (!campaign) continue;
      result.enrolled += 1;

      const outcome = await sendStep(campaign, "initial", service, config, now);
      if (outcome === "sent") {
        result.initialSent += 1;
        budget -= 1;
      } else if (outcome === "failed") result.failed += 1;
      else result.skipped += 1;
    }
  }

  return result;
}

/** Midnight, recipient's clock, expressed as a UTC instant. */
function startOfLocalDay(at: Date, timeZone: string): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hoursIntoDay = (get("hour") % 24) + get("minute") / 60;
  return new Date(at.getTime() - hoursIntoDay * 60 * 60 * 1000);
}
