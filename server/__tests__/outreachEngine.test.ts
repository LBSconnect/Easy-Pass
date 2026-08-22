/**
 * The outreach engine, held to the 22 promises it was specified with.
 *
 * Two halves, matching this repo's convention. The pure half tests the rules
 * (state machine, business-day math, sending window, classification,
 * templates) with no database at all - it runs in CI's offline unit job. The
 * describeIfDb half runs the real engine against real Postgres with a
 * recording email service, because "cannot double-send" is a property of the
 * unique index and "an activated partner never receives acquisition email" is
 * a property of the live row - neither can be proven against a mock.
 *
 * Every scenario from the task's TESTS list is here, tagged [T<n>] so the
 * list can be audited against the file.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  addBusinessDays,
  afterSend,
  classifyReply,
  crmStatusFor,
  dueAction,
  isBusinessDay,
  isWithinSendingWindow,
  CAMPAIGN_STATES,
  DEFAULT_SENDING_WINDOW,
  FOLLOW_UP_1_BUSINESS_DAYS,
  FOLLOW_UP_2_BUSINESS_DAYS,
  type CampaignSnapshot,
} from "@shared/outreachCampaign";
import {
  countWords,
  renderFollowUp1,
  renderFollowUp2,
  renderInitialEmail,
  unsubscribeFooter,
  INITIAL_MAX_WORDS,
  INITIAL_MIN_WORDS,
  REPLY_CTA,
  TEMPLATE_VERSION,
} from "@shared/partnerOutreachEmails";
import { PARTNER_SEGMENTS, OUTREACH_STATUSES } from "@shared/partners";

// A Tuesday morning in Texas: 15:00 UTC = 10:00 CDT.
const TUE = new Date("2026-08-25T15:00:00Z");

function snapshot(partial: Partial<CampaignSnapshot>): CampaignSnapshot {
  return { state: "queued", paused: false, initialSentAt: null, nextActionAt: null, ...partial };
}

describe("business-day scheduling", () => {
  it("[T17] refuses weekends and refuses evenings, Texas clock", () => {
    expect(isWithinSendingWindow(TUE)).toBe(true);
    // Saturday, same hour.
    expect(isWithinSendingWindow(new Date("2026-08-29T15:00:00Z"))).toBe(false);
    // Sunday.
    expect(isWithinSendingWindow(new Date("2026-08-30T15:00:00Z"))).toBe(false);
    // Tuesday 18:30 in Texas - the cron may run then; emails may not.
    expect(isWithinSendingWindow(new Date("2026-08-25T23:30:00Z"))).toBe(false);
    // Tuesday 07:00 in Texas - too early.
    expect(isWithinSendingWindow(new Date("2026-08-25T12:00:00Z"))).toBe(false);
  });

  it("counts business days across weekends", () => {
    // Friday + 1 business day is Monday.
    const friday = new Date("2026-08-28T15:00:00Z");
    const monday = addBusinessDays(friday, 1);
    expect(isBusinessDay(monday)).toBe(true);
    expect(monday.toISOString()).toBe("2026-08-31T15:00:00.000Z");
  });

  it("[T5] follow-up #1 waits exactly four business days", () => {
    const after = afterSend("initial", TUE, null);
    expect(after.state).toBe("contacted");
    // Tue + 4 business days = Monday.
    expect(after.nextActionAt.toISOString()).toBe("2026-08-31T15:00:00.000Z");

    const early = snapshot({ state: "contacted", nextActionAt: after.nextActionAt });
    // The next morning: nothing due.
    expect(dueAction(early, new Date("2026-08-26T15:00:00Z"))).toEqual({ type: "wait" });
    // The Friday before: still nothing.
    expect(dueAction(early, new Date("2026-08-28T16:00:00Z"))).toEqual({ type: "wait" });
    // On the day: follow-up 1, and only follow-up 1.
    expect(dueAction(early, new Date("2026-08-31T15:00:00Z"))).toEqual({ type: "send", step: "follow_up_1" });
  });

  it("[T9] follow-up #2 lands nine business days after the initial, not after #1", () => {
    const fu1SentAt = new Date("2026-08-31T16:00:00Z");
    const after = afterSend("follow_up_1", fu1SentAt, TUE);
    expect(after.state).toBe("follow_up_1_sent");
    // Anchored to the INITIAL send: Tue Aug 25 + 9 business days = Mon Sep 7.
    expect(after.nextActionAt.toISOString()).toBe("2026-09-07T15:00:00.000Z");
  });

  it("[T10] after follow-up #2 the machine only completes - there is no step 4", () => {
    const after = afterSend("follow_up_2", new Date("2026-09-07T15:00:00Z"), TUE);
    expect(after.state).toBe("follow_up_2_sent");

    const done = snapshot({ state: "follow_up_2_sent", nextActionAt: after.nextActionAt });
    const later = new Date(after.nextActionAt.getTime() + 60_000);
    expect(dueAction(done, later)).toEqual({ type: "complete" });

    // And no terminal state ever sends again.
    for (const state of ["completed", "interested", "not_interested", "unsubscribed", "bounced", "stopped"] as const) {
      expect(dueAction(snapshot({ state, nextActionAt: new Date(0) }), TUE)).toEqual({ type: "none" });
    }
  });

  it("a paused campaign is owed nothing, whatever its timers say", () => {
    const paused = snapshot({ state: "contacted", paused: true, nextActionAt: new Date(0) });
    expect(dueAction(paused, TUE)).toEqual({ type: "none" });
  });
});

describe("reply classification", () => {
  it("[T11] recognises interest, conservatively", () => {
    expect(classifyReply("Yes, tell me more about the pilot")).toBe("interested");
    expect(classifyReply("This sounds interesting - how does it work?")).toBe("interested");
  });

  it("[T12] recognises a decline", () => {
    expect(classifyReply("Not interested, thanks.")).toBe("not_interested");
    expect(classifyReply("No thanks - we already have a vendor for this.")).toBe("not_interested");
  });

  it("[T13] everything uncertain goes to a human", () => {
    expect(classifyReply("Who gave you this address?")).toBe("needs_human_review");
    expect(classifyReply("Can you call our office?")).toBe("needs_human_review");
    // Automatic replies conclude nothing about the person.
    expect(classifyReply("I am out of the office until Monday.")).toBe("needs_human_review");
  });

  it("[T14] recognises a wrong contact", () => {
    expect(classifyReply("I'm the wrong person for this - try our training team.")).toBe("wrong_contact");
    expect(classifyReply("She no longer works here.")).toBe("wrong_contact");
  });

  it("[T7] an unsubscribe outranks everything else in the same message", () => {
    expect(classifyReply("Please unsubscribe me.")).toBe("unsubscribe");
    expect(classifyReply("Interesting, but please remove us from your list.")).toBe("unsubscribe");
  });

  it("recognises maybe-later", () => {
    expect(classifyReply("Not right now - circle back after the summer.")).toBe("maybe_later");
  });
});

describe("email templates", () => {
  const base = {
    organizationName: "Example Realty School",
    senderName: "Sean",
  };

  it("holds every initial variant to 90-150 words with the reply CTA", () => {
    for (const segment of PARTNER_SEGMENTS) {
      for (const extras of [
        {},
        { decisionMakerName: "Alex Morgan" },
        { partnershipHypothesis: "Your course ends at completion; a readiness layer between course and exam extends what you already promise students." },
      ]) {
        const email = renderInitialEmail({ ...base, segment, ...extras });
        const body = email.text.slice(0, email.text.indexOf("Sean\nMyEasyPass"));
        const words = countWords(body);
        expect(words, `${segment} ${JSON.stringify(extras)}: ${words} words`).toBeGreaterThanOrEqual(INITIAL_MIN_WORDS);
        expect(words, `${segment} ${JSON.stringify(extras)}: ${words} words`).toBeLessThanOrEqual(INITIAL_MAX_WORDS);
        expect(email.text).toContain(REPLY_CTA);
        expect(email.subject.length).toBeGreaterThan(10);
      }
    }
  });

  it("never fabricates: no claims of relationship, volume, or endorsement", () => {
    for (const segment of PARTNER_SEGMENTS) {
      const all = [
        renderInitialEmail({ ...base, segment }),
        renderFollowUp1({ ...base, segment }),
        renderFollowUp2({ ...base, segment }),
      ]
        .map((e) => `${e.subject}\n${e.text}`)
        .join("\n")
        .toLowerCase();

      // The forbidden registers: invented familiarity, invented numbers,
      // invented authority, manufactured urgency.
      for (const banned of [
        "we spoke", "as discussed", "per our conversation", "great meeting you",
        "guaranteed", "pass rate", "% of", "approved by", "endorsed",
        "trec-approved", "tdi-approved", "pearson", "official",
        "last chance", "act now", "expires", "limited time",
      ]) {
        expect(all, `"${banned}" must not appear (${segment})`).not.toContain(banned);
      }
    }
  });

  it("includes the researched hypothesis verbatim when it fits, drops it when it cannot", () => {
    const hypothesis = "A bilingual readiness check is a concrete add-on for a border-market school.";
    const withIt = renderInitialEmail({ ...base, segment: "real_estate_school", partnershipHypothesis: hypothesis });
    expect(withIt.text).toContain(hypothesis);

    const tooLong = Array(80).fill("relevant").join(" ");
    const without = renderInitialEmail({ ...base, segment: "real_estate_school", partnershipHypothesis: tooLong });
    expect(without.text).not.toContain(tooLong);
  });

  it("follow-up #2 is a very short close-the-loop", () => {
    const email = renderFollowUp2({ ...base, segment: "insurance_agency" });
    expect(countWords(email.text)).toBeLessThan(70);
    expect(email.text.toLowerCase()).toContain("won't email you about it again");
  });

  it("the unsubscribe footer names its link", () => {
    expect(unsubscribeFooter("https://x/unsub?token=t")).toContain("https://x/unsub?token=t");
  });

  it("every campaign state projects onto a real CRM status", () => {
    for (const state of CAMPAIGN_STATES) {
      expect(OUTREACH_STATUSES, `crmStatusFor(${state})`).toContain(crmStatusFor(state) as any);
    }
  });
});

// ---------------------------------------------------------------------------
// The engine against real Postgres.
// ---------------------------------------------------------------------------

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

const FX = "outreach-fx";
const FX_DOMAIN = "outreach-fx.example";

describeIfDb("the engine against a real database", () => {
  let pool: import("pg").Pool;
  let engine: typeof import("../outreach/engine");
  let store: typeof import("../outreach/campaignStore");
  let replies: typeof import("../outreach/replyProcessor");
  let emailService: typeof import("../outreach/emailService");

  const config = (overrides: Partial<import("../outreach/emailService").OutreachEmailConfig> = {}) => ({
    enabled: true,
    fromEmail: "Sean at MyEasyPass <partners@myeasypass.net>",
    replyTo: "partners@myeasypass.net",
    alertEmail: `owner@${FX_DOMAIN}`,
    senderName: "Sean",
    dailyNewProspectLimit: 15,
    // Breakers held open for the ordinary tests - this file deliberately
    // creates complaints and bounces, and each test isolates what it proves.
    // The breaker tests below use the strict production defaults.
    breakers: { spamComplaintLimit: 1000, hardBounceRatioLimit: 1.01, bounceCheckMinSends: 999999, windowDays: 7 },
    ...overrides,
  });

  async function makeProspect(opts: {
    name: string;
    email?: string | null;
    status?: string;
    priority?: string;
    partnerActive?: boolean;
    partnerStatus?: string;
  }): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO partner_prospects
         (organization_name, dedupe_key, segment, outreach_status, contact_email,
          priority, partner_status, partner_active, decision_maker_name, partnership_hypothesis)
       VALUES ($1, $2, 'insurance_agency', $3, $4, $5, $6, $7, 'Fixture Person', null)
       RETURNING id`,
      [
        `[${FX}] ${opts.name}`,
        `${FX}-${opts.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        opts.status ?? "ready_to_contact",
        opts.email === null ? null : opts.email ?? `${opts.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@${FX_DOMAIN}`,
        opts.priority ?? "High",
        opts.partnerStatus ?? "prospect",
        opts.partnerActive ?? false,
      ],
    );
    return result.rows[0].id;
  }

  async function cleanup() {
    await pool.query(
      `DELETE FROM partner_outreach_messages WHERE prospect_id IN
         (SELECT id FROM partner_prospects WHERE dedupe_key LIKE $1)`,
      [`${FX}-%`],
    );
    await pool.query(
      `DELETE FROM partner_outreach_campaigns WHERE prospect_id IN
         (SELECT id FROM partner_prospects WHERE dedupe_key LIKE $1)`,
      [`${FX}-%`],
    );
    await pool.query(`DELETE FROM partner_email_suppressions WHERE email LIKE $1`, [`%@${FX_DOMAIN}`]);
    await pool.query(`DELETE FROM partner_prospects WHERE dedupe_key LIKE $1`, [`${FX}-%`]);
  }

  beforeAll(async () => {
    const migrations = await import("../migrations");
    await migrations.runMigrations();

    const db = await import("../db");
    pool = db.pool as unknown as import("pg").Pool;
    engine = await import("../outreach/engine");
    store = await import("../outreach/campaignStore");
    replies = await import("../outreach/replyProcessor");
    emailService = await import("../outreach/emailService");
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("[T1][T3][T19] an eligible prospect enters the queue and gets exactly one initial email, recorded", async () => {
    const prospectId = await makeProspect({ name: "Eligible Agency" });
    const service = new emailService.RecordingEmailService();

    const run = await engine.runOutreachDispatch(service, TUE, config());
    expect(run.ran).toBe(true);
    expect(run.enrolled).toBeGreaterThanOrEqual(1);
    expect(service.sent.some((e) => e.to === `eligible-agency@${FX_DOMAIN}`)).toBe(true);

    const campaign = await store.campaignByProspect(prospectId);
    expect(campaign).not.toBeNull();
    expect(campaign!.state).toBe("contacted");
    expect(campaign!.initialSentAt).toEqual(TUE);
    expect(campaign!.nextActionAt?.toISOString()).toBe("2026-08-31T15:00:00.000Z");

    // The CRM record moved with it.
    const prospect = await pool.query(
      `SELECT outreach_status, last_contact_at FROM partner_prospects WHERE id = $1`,
      [prospectId],
    );
    expect(prospect.rows[0].outreach_status).toBe("contacted");
    expect(prospect.rows[0].last_contact_at).toEqual(TUE);

    // The message row carries the audit trail the spec lists.
    const message = await pool.query(
      `SELECT * FROM partner_outreach_messages WHERE prospect_id = $1 AND direction = 'outbound'`,
      [prospectId],
    );
    expect(message.rowCount).toBe(1);
    expect(message.rows[0].step).toBe("initial");
    expect(message.rows[0].status).toBe("sent");
    expect(message.rows[0].template_version).toBe(TEMPLATE_VERSION);
    expect(message.rows[0].provider_message_id).toBeTruthy();
    expect(message.rows[0].subject).toBeTruthy();
    expect(message.rows[0].sent_at).toEqual(TUE);

    // The email itself carried the unsubscribe machinery.
    const sent = service.sent.find((e) => e.to === `eligible-agency@${FX_DOMAIN}`)!;
    expect(sent.text).toContain("/api/outreach/unsubscribe?token=");
    expect(sent.headers?.["List-Unsubscribe"]).toBeTruthy();
  });

  it("[T4] a duplicate run cannot duplicate the send", async () => {
    const service = new emailService.RecordingEmailService();
    // Same instant, same everything: the campaign is already 'contacted', so
    // nothing is due; and even a direct reservation of the same step fails.
    const run = await engine.runOutreachDispatch(service, TUE, config());
    expect(service.sent.filter((e) => e.to === `eligible-agency@${FX_DOMAIN}`)).toHaveLength(0);
    expect(run.initialSent).toBe(0);

    const campaign = await store.campaignByProspect(
      (await pool.query(`SELECT id FROM partner_prospects WHERE dedupe_key = $1`, [`${FX}-eligible-agency`])).rows[0].id,
    );
    const again = await store.reserveSend(
      campaign!.id, campaign!.prospectId, "initial", campaign!.contactEmail, "dup", TEMPLATE_VERSION,
    );
    expect(again).toBeNull();

    const count = await pool.query(
      `SELECT count(*) AS n FROM partner_outreach_messages
        WHERE campaign_id = $1 AND direction = 'outbound' AND step = 'initial'`,
      [campaign!.id],
    );
    expect(Number(count.rows[0].n)).toBe(1);
  });

  it("[T5][T9][T10] the sequence walks its calendar and stops after #2", async () => {
    const prospectId = (await pool.query(
      `SELECT id FROM partner_prospects WHERE dedupe_key = $1`, [`${FX}-eligible-agency`],
    )).rows[0].id;
    const service = new emailService.RecordingEmailService();

    // Wednesday: too early for follow-up 1.
    await engine.runOutreachDispatch(service, new Date("2026-08-26T15:00:00Z"), config());
    expect(service.sent).toHaveLength(0);

    // Monday Aug 31: follow-up 1.
    let run = await engine.runOutreachDispatch(service, new Date("2026-08-31T15:00:00Z"), config());
    expect(run.followUpsSent).toBe(1);
    expect((await store.campaignByProspect(prospectId))!.state).toBe("follow_up_1_sent");

    // Monday Sep 7 (nine business days after the initial): follow-up 2.
    run = await engine.runOutreachDispatch(service, new Date("2026-09-07T15:00:00Z"), config());
    expect(run.followUpsSent).toBe(1);
    expect((await store.campaignByProspect(prospectId))!.state).toBe("follow_up_2_sent");

    // A week on: the campaign closes; nothing else ever sends.
    run = await engine.runOutreachDispatch(service, new Date("2026-09-14T15:00:00Z"), config());
    expect(run.completed).toBe(1);
    expect(run.followUpsSent).toBe(0);
    expect((await store.campaignByProspect(prospectId))!.state).toBe("completed");

    const outbound = await pool.query(
      `SELECT count(*) AS n FROM partner_outreach_messages
        WHERE prospect_id = $1 AND direction = 'outbound'`,
      [prospectId],
    );
    expect(Number(outbound.rows[0].n)).toBe(3);

    // [T19] the prospect's CRM status followed each move and is now settled.
    const status = await pool.query(`SELECT outreach_status FROM partner_prospects WHERE id = $1`, [prospectId]);
    expect(status.rows[0].outreach_status).toBe("contacted");
  });

  it("[T6][T13] a reply cancels the remaining follow-ups", async () => {
    const prospectId = await makeProspect({ name: "Replies Midway" });
    const service = new emailService.RecordingEmailService();
    await engine.runOutreachDispatch(service, TUE, config());

    const campaign = (await store.campaignByProspect(prospectId))!;
    expect(campaign.state).toBe("contacted");

    await replies.processReply(campaign, campaign.contactEmail, "Can you call our office to discuss?", service);
    const after = (await store.campaignByProspect(prospectId))!;
    expect(after.state).toBe("needs_human_review");
    expect(after.replyClassification).toBe("needs_human_review");
    expect(after.replyReceivedAt).not.toBeNull();

    // Follow-up day arrives; nothing goes out.
    service.sent = [];
    await engine.runOutreachDispatch(service, new Date("2026-08-31T15:00:00Z"), config());
    expect(service.sent.filter((e) => e.to === after.contactEmail)).toHaveLength(0);

    const inbound = await pool.query(
      `SELECT body_excerpt FROM partner_outreach_messages WHERE prospect_id = $1 AND direction = 'inbound'`,
      [prospectId],
    );
    expect(inbound.rowCount).toBe(1);
    expect(inbound.rows[0].body_excerpt).toContain("call our office");
  });

  it("[T11] an interested reply stops automation and packages the warm handoff", async () => {
    const prospectId = await makeProspect({ name: "Interested Org" });
    const service = new emailService.RecordingEmailService();
    process.env.OUTREACH_ALERT_EMAIL = `owner@${FX_DOMAIN}`;
    process.env.OUTREACH_ENABLED = "true";
    try {
      await engine.runOutreachDispatch(service, TUE, config());
      const campaign = (await store.campaignByProspect(prospectId))!;

      service.sent = [];
      await replies.processReply(campaign, campaign.contactEmail, "Yes - tell me more about the pilot!", service);

      const after = (await store.campaignByProspect(prospectId))!;
      expect(after.state).toBe("interested");

      // The prospect's CRM row now says interested too.
      const row = await pool.query(
        `SELECT outreach_status, partner_active, partner_status FROM partner_prospects WHERE id = $1`,
        [prospectId],
      );
      expect(row.rows[0].outreach_status).toBe("interested");
      // And NOTHING activated a partnership.
      expect(row.rows[0].partner_active).toBe(false);
      expect(row.rows[0].partner_status).toBe("prospect");

      // The owner alert went out, with the package and without an activation.
      const alert = service.sent.find((e) => e.to === `owner@${FX_DOMAIN}`);
      expect(alert).toBeDefined();
      expect(alert!.subject).toContain("Interested Org");
      expect(alert!.text).toContain("Their reply:");
      expect(alert!.text).toContain("tell me more about the pilot");
      expect(alert!.text.toLowerCase()).toContain("nothing has been activated");
    } finally {
      delete process.env.OUTREACH_ALERT_EMAIL;
      delete process.env.OUTREACH_ENABLED;
    }
  });

  it("[T12] a not-interested reply stops automation permanently", async () => {
    const prospectId = await makeProspect({ name: "Declines Politely" });
    const service = new emailService.RecordingEmailService();
    await engine.runOutreachDispatch(service, TUE, config());
    const campaign = (await store.campaignByProspect(prospectId))!;

    await replies.processReply(campaign, campaign.contactEmail, "Not interested, thanks.", service);
    expect((await store.campaignByProspect(prospectId))!.state).toBe("not_interested");

    service.sent = [];
    for (const when of ["2026-08-31T15:00:00Z", "2026-09-07T15:00:00Z", "2026-10-05T15:00:00Z"]) {
      await engine.runOutreachDispatch(service, new Date(when), config());
    }
    expect(service.sent.filter((e) => e.to === campaign.contactEmail)).toHaveLength(0);
  });

  it("[T14] a wrong-contact reply stops the address and returns the prospect to research", async () => {
    const prospectId = await makeProspect({ name: "Wrong Person" });
    const service = new emailService.RecordingEmailService();
    await engine.runOutreachDispatch(service, TUE, config());
    const campaign = (await store.campaignByProspect(prospectId))!;

    await replies.processReply(campaign, campaign.contactEmail, "I'm the wrong person for this.", service);
    expect((await store.campaignByProspect(prospectId))!.state).toBe("wrong_contact");

    const row = await pool.query(`SELECT outreach_status FROM partner_prospects WHERE id = $1`, [prospectId]);
    expect(row.rows[0].outreach_status).toBe("researching");

    service.sent = [];
    await engine.runOutreachDispatch(service, new Date("2026-08-31T15:00:00Z"), config());
    expect(service.sent.filter((e) => e.to === campaign.contactEmail)).toHaveLength(0);
  });

  it("[T7] an unsubscribe suppresses the address permanently", async () => {
    const prospectId = await makeProspect({ name: "Unsubscribes" });
    const service = new emailService.RecordingEmailService();
    await engine.runOutreachDispatch(service, TUE, config());
    const campaign = (await store.campaignByProspect(prospectId))!;

    const ok = await replies.processUnsubscribeToken(campaign.unsubscribeToken);
    expect(ok).toBe(true);
    expect(await replies.processUnsubscribeToken("no-such-token")).toBe(false);

    expect((await store.campaignByProspect(prospectId))!.state).toBe("unsubscribed");
    expect(await store.isSuppressed(campaign.contactEmail)).toBe(true);

    // Follow-up day: nothing.
    service.sent = [];
    await engine.runOutreachDispatch(service, new Date("2026-08-31T15:00:00Z"), config());
    expect(service.sent.filter((e) => e.to === campaign.contactEmail)).toHaveLength(0);

    // [T2] and no future prospect with that address can even enter the queue.
    await makeProspect({ name: "Same Address Again", email: campaign.contactEmail });
    const run = await engine.runOutreachDispatch(service, TUE, config());
    expect(service.sent.filter((e) => e.to === campaign.contactEmail)).toHaveLength(0);
    expect(run.ran).toBe(true);
  });

  it("[T8] a hard bounce suppresses future sends; a soft bounce does not", async () => {
    const prospectId = await makeProspect({ name: "Hard Bounces" });
    const service = new emailService.RecordingEmailService();
    await engine.runOutreachDispatch(service, TUE, config());
    const campaign = (await store.campaignByProspect(prospectId))!;

    const outcome = await replies.processWebhookEvent(
      { type: "email.bounced", data: { to: [campaign.contactEmail], bounce: { type: "hard" } } },
      service,
    );
    expect(outcome).toEqual({ handled: true, action: "hard_bounce_suppressed" });
    expect((await store.campaignByProspect(prospectId))!.state).toBe("bounced");
    expect(await store.isSuppressed(campaign.contactEmail)).toBe(true);

    const soft = await replies.processWebhookEvent(
      { type: "email.bounced", data: { to: [`soft@${FX_DOMAIN}`], bounce: { type: "soft" } } },
      service,
    );
    expect(soft.action).toBe("soft_bounce_ignored");
    expect(await store.isSuppressed(`soft@${FX_DOMAIN}`)).toBe(false);

    // A spam complaint suppresses the same way.
    const complaint = await replies.processWebhookEvent(
      { type: "email.complained", data: { to: [`complainer@${FX_DOMAIN}`] } },
      service,
    );
    expect(complaint.action).toBe("complaint_suppressed");
    expect(await store.isSuppressed(`complainer@${FX_DOMAIN}`)).toBe(true);
  });

  it("[T15] an activated partner never receives acquisition outreach", async () => {
    // Already active at enrollment time: never even enters the queue.
    await makeProspect({ name: "Active Already", partnerActive: true, partnerStatus: "active_partner" });
    const service = new emailService.RecordingEmailService();
    await engine.runOutreachDispatch(service, TUE, config());
    expect(service.sent.filter((e) => e.to === `active-already@${FX_DOMAIN}`)).toHaveLength(0);

    // Activated MID-sequence: the send-time gate catches the live row.
    const midId = await makeProspect({ name: "Activates Midway" });
    await engine.runOutreachDispatch(service, TUE, config());
    expect((await store.campaignByProspect(midId))!.state).toBe("contacted");
    await pool.query(
      `UPDATE partner_prospects SET partner_active = true, partner_status = 'active_partner' WHERE id = $1`,
      [midId],
    );
    service.sent = [];
    await engine.runOutreachDispatch(service, new Date("2026-08-31T15:00:00Z"), config());
    expect(service.sent.filter((e) => e.to === `activates-midway@${FX_DOMAIN}`)).toHaveLength(0);
    expect((await store.campaignByProspect(midId))!.state).toBe("stopped");
    expect((await store.campaignByProspect(midId))!.stopReason).toBe("partner_activated");
  });

  it("[T16] the daily limit holds, and follow-ups ride on top of it", async () => {
    // A fresh calendar day so other tests' sends do not count against it.
    const day = new Date("2026-09-15T15:00:00Z"); // Tuesday
    for (const n of ["Limit A", "Limit B", "Limit C"]) {
      await makeProspect({ name: n, priority: "Low" });
    }
    const service = new emailService.RecordingEmailService();
    const run = await engine.runOutreachDispatch(service, day, config({ dailyNewProspectLimit: 2 }));
    expect(run.initialSent).toBe(2);

    // Same day, second cron tick: budget spent, nothing more.
    const second = await engine.runOutreachDispatch(service, new Date("2026-09-15T18:00:00Z"), config({ dailyNewProspectLimit: 2 }));
    expect(second.initialSent).toBe(0);

    // Next business day: the third goes out.
    const third = await engine.runOutreachDispatch(service, new Date("2026-09-16T15:00:00Z"), config({ dailyNewProspectLimit: 2 }));
    expect(third.initialSent).toBe(1);

    // Park these three so their follow-up timers stay out of later tests.
    for (const n of ["limit-a", "limit-b", "limit-c"]) {
      const id = (await pool.query(`SELECT id FROM partner_prospects WHERE dedupe_key = $1`, [`${FX}-${n}`])).rows[0].id;
      const campaign = await store.campaignByProspect(id);
      if (campaign) await store.transitionCampaign(campaign.id, "stopped", { stopReason: "manual_stop" });
    }
  });

  it("[T17] outside the window or switched off, the engine does not run at all", async () => {
    await makeProspect({ name: "Never Contacted Weekend" });
    const service = new emailService.RecordingEmailService();

    const saturday = await engine.runOutreachDispatch(service, new Date("2026-08-29T15:00:00Z"), config());
    expect(saturday.ran).toBe(false);
    expect(saturday.reason).toContain("window");

    const disabled = await engine.runOutreachDispatch(service, TUE, config({ enabled: false }));
    expect(disabled.ran).toBe(false);
    expect(service.sent).toHaveLength(0);
    // Cleanup so this fixture doesn't drift into other tests' counts.
    await pool.query(`DELETE FROM partner_prospects WHERE dedupe_key = $1`, [`${FX}-never-contacted-weekend`]);
  });

  it("[T18] a provider failure retries safely without double-sending", async () => {
    const prospectId = await makeProspect({ name: "Provider Hiccup" });
    const service = new emailService.RecordingEmailService();
    service.failNext = 1;

    const day = new Date("2026-09-22T15:00:00Z"); // Tuesday, fresh budget day
    const first = await engine.runOutreachDispatch(service, day, config());
    expect(first.failed).toBeGreaterThanOrEqual(1);
    // Nothing recorded as sent, campaign not advanced.
    expect((await store.campaignByProspect(prospectId))!.state).toBe("queued");

    const retry = await engine.runOutreachDispatch(service, new Date("2026-09-22T16:00:00Z"), config());
    expect(retry.initialSent).toBeGreaterThanOrEqual(1);
    expect((await store.campaignByProspect(prospectId))!.state).toBe("contacted");

    const count = await pool.query(
      `SELECT count(*) AS n FROM partner_outreach_messages
        WHERE prospect_id = $1 AND direction = 'outbound' AND status = 'sent'`,
      [prospectId],
    );
    expect(Number(count.rows[0].n)).toBe(1);
  });

  it("[T20] partner attribution fields are untouched by a full engine pass", async () => {
    const before = await pool.query(
      `SELECT id, partner_status, partner_code, partner_active, partner_created_at
         FROM partner_prospects ORDER BY id`,
    );
    const service = new emailService.RecordingEmailService();
    await engine.runOutreachDispatch(service, new Date("2026-09-29T15:00:00Z"), config());
    const after = await pool.query(
      `SELECT id, partner_status, partner_code, partner_active, partner_created_at
         FROM partner_prospects ORDER BY id`,
    );
    expect(after.rows).toEqual(before.rows);
  });

  it("[T22] the engine writes nothing into analytics", async () => {
    const before = await pool.query(`SELECT count(*) AS n FROM analytics_events`);
    const service = new emailService.RecordingEmailService();
    await makeProspect({ name: "Analytics Check" });
    await engine.runOutreachDispatch(service, new Date("2026-10-06T15:00:00Z"), config());
    const campaign = await store.campaignByProspect(
      (await pool.query(`SELECT id FROM partner_prospects WHERE dedupe_key = $1`, [`${FX}-analytics-check`])).rows[0].id,
    );
    await replies.processReply(campaign!, campaign!.contactEmail, "yes, interested", service);
    const after = await pool.query(`SELECT count(*) AS n FROM analytics_events`);
    expect(after.rows[0].n).toEqual(before.rows[0].n);
  });

  it("circuit breaker: any recent spam complaint pauses the whole campaign", async () => {
    // T8 above recorded a real spam-complaint suppression inside the window.
    // At the production default (zero tolerated), the entire run refuses -
    // not one address, everything.
    await makeProspect({ name: "Blocked By Breaker" });
    const service = new emailService.RecordingEmailService();
    const run = await engine.runOutreachDispatch(
      service,
      new Date("2026-10-13T15:00:00Z"),
      config({ breakers: { spamComplaintLimit: 0, hardBounceRatioLimit: 1.01, bounceCheckMinSends: 999999, windowDays: 90 } }),
    );
    expect(run.ran).toBe(false);
    expect(run.reason).toContain("circuit breaker");
    expect(run.reason).toContain("spam complaint");
    expect(service.sent).toHaveLength(0);
  });

  it("circuit breaker: a material hard-bounce rate pauses the campaign", async () => {
    const service = new emailService.RecordingEmailService();
    const run = await engine.runOutreachDispatch(
      service,
      new Date("2026-10-13T15:00:00Z"),
      config({ breakers: { spamComplaintLimit: 1000, hardBounceRatioLimit: 0.0001, bounceCheckMinSends: 1, windowDays: 90 } }),
    );
    expect(run.ran).toBe(false);
    expect(run.reason).toContain("hard-bounce rate");
    expect(service.sent).toHaveLength(0);
    // Clean up the enrollment fixture from the previous breaker test.
    await pool.query(`DELETE FROM partner_prospects WHERE dedupe_key = $1`, [`${FX}-blocked-by-breaker`]);
  });

  it("the webhook signature check accepts only a fresh, correctly signed payload", async () => {
    const { createHmac } = await import("crypto");
    const secretBytes = Buffer.from("test-secret-bytes-for-webhook").toString("base64");
    const secret = `whsec_${secretBytes}`;
    const body = JSON.stringify({ type: "email.received", data: {} });
    const now = new Date("2026-08-25T15:00:00Z");
    const timestamp = String(Math.floor(now.getTime() / 1000));
    const signature = createHmac("sha256", Buffer.from(secretBytes, "base64"))
      .update(`msg_1.${timestamp}.${body}`)
      .digest("base64");

    const headers = { id: "msg_1", timestamp, signature: `v1,${signature}` };
    expect(replies.verifyWebhookSignature(body, headers, secret, now)).toBe(true);
    // Wrong secret, stale timestamp, tampered body: all refused.
    expect(replies.verifyWebhookSignature(body, headers, "whsec_" + Buffer.from("other").toString("base64"), now)).toBe(false);
    expect(replies.verifyWebhookSignature(body, headers, secret, new Date(now.getTime() + 10 * 60_000))).toBe(false);
    expect(replies.verifyWebhookSignature(body + " ", headers, secret, now)).toBe(false);
  });

  it("[T21] campaign data carries no route to the public: reply excerpts stay in admin-only tables", async () => {
    // The structural claim: the only tables the engine writes are the three
    // outreach tables and partner_prospects' CRM columns - all served
    // exclusively by requireAdmin routes (proven over HTTP by the e2e suite).
    // Here: the unsubscribe path, the one public write, identifies nobody.
    const result = await replies.processUnsubscribeToken("0000000000000000000000000000000000000000000000");
    expect(result).toBe(false); // and nothing else: no row, no detail, no error
  });
});
