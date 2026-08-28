import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;
const FX = "recipient-dedupe-fx";
const DOMAIN = "recipient-dedupe.example";
const TUE = new Date("2026-08-25T15:00:00Z");

describeIfDb("outreach recipient deduplication", () => {
  let pool: import("pg").Pool;
  let engine: typeof import("../outreach/engine");
  let store: typeof import("../outreach/campaignStore");
  let emailService: typeof import("../outreach/emailService");
  let autoQualifyProspects: typeof import("../outreach/autoQualification").autoQualifyProspects;

  const config = () => ({
    enabled: true,
    fromEmail: "Sean at MyEasyPass.net <info@lbsconnect.net>",
    replyTo: "info@lbsconnect.net",
    alertEmail: `owner@${DOMAIN}`,
    senderName: "Sean",
    dailyNewProspectLimit: 5,
    breakers: {
      spamComplaintLimit: 1000,
      hardBounceRatioLimit: 1.01,
      bounceCheckMinSends: 999999,
      windowDays: 7,
    },
  });

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
    await pool.query(`DELETE FROM partner_email_suppressions WHERE email LIKE $1`, [`%@${DOMAIN}`]);
    await pool.query(`DELETE FROM partner_prospects WHERE dedupe_key LIKE $1`, [`${FX}-%`]);
  }

  async function makeProspect(opts: {
    name: string;
    email?: string | null;
    publicContact?: string | null;
    status?: string;
    priority?: string;
  }): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO partner_prospects
         (organization_name, dedupe_key, segment, outreach_status, contact_email,
          public_contact, priority, partner_status, partner_active)
       VALUES ($1, $2, 'insurance_agency', $3, $4, $5, $6, 'prospect', false)
       RETURNING id`,
      [
        `[${FX}] ${opts.name}`,
        `${FX}-${opts.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        opts.status ?? "researching",
        opts.email === undefined ? null : opts.email,
        opts.publicContact ?? null,
        opts.priority ?? "High",
      ],
    );
    return result.rows[0].id;
  }

  beforeAll(async () => {
    const migrations = await import("../migrations");
    await migrations.runMigrations();
    const db = await import("../db");
    pool = db.pool as unknown as import("pg").Pool;
    engine = await import("../outreach/engine");
    store = await import("../outreach/campaignStore");
    emailService = await import("../outreach/emailService");
    ({ autoQualifyProspects } = await import("../outreach/autoQualification"));
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("prepares only one canonical recipient when multiple ready rows share one published mailbox", async () => {
    await cleanup();
    const shared = `shared@${DOMAIN}`;
    const high = await makeProspect({
      name: "Shared High",
      publicContact: `${shared} | 555-0100`,
      priority: "Very High",
    });
    const lower = await makeProspect({
      name: "Shared Lower",
      publicContact: `${shared} | 555-0101`,
      priority: "High",
    });

    expect(await autoQualifyProspects(5)).toBe(1);

    const rows = await pool.query<{ id: string; outreach_status: string; contact_email: string | null }>(
      `SELECT id, outreach_status, contact_email
         FROM partner_prospects WHERE id = ANY($1::uuid[])`,
      [[high, lower]],
    );
    const byId = new Map(rows.rows.map((row) => [row.id, row]));
    expect(byId.get(high)?.outreach_status).toBe("ready_to_contact");
    expect(byId.get(high)?.contact_email).toBe(shared);
    expect(byId.get(lower)?.outreach_status).toBe("ready_to_contact");
    expect(byId.get(lower)?.contact_email).toBeNull();
  });

  it("will not enroll a second prospect for an email that already has a campaign", async () => {
    await cleanup();
    const shared = `historical@${DOMAIN}`;
    const first = await makeProspect({ name: "Historical First", email: shared, status: "ready_to_contact" });
    const firstCampaign = await store.enrollProspect(first, shared);
    expect(firstCampaign).not.toBeNull();
    await store.transitionCampaign(firstCampaign!.id, "stopped", { stopReason: "fixture" });

    const second = await makeProspect({ name: "Historical Second", email: shared, status: "ready_to_contact" });
    const service = new emailService.RecordingEmailService();
    const run = await engine.runOutreachDispatch(service, TUE, config());

    expect(service.sent.filter((email) => email.to === shared)).toHaveLength(0);
    expect(await store.campaignByProspect(second)).toBeNull();
    expect(run.skipped).toBeGreaterThanOrEqual(1);
  });

  it("stops later active duplicate campaigns so only one mailbox receives follow-ups", async () => {
    await cleanup();
    const shared = `active@${DOMAIN}`;
    const first = await makeProspect({ name: "Active First", email: shared, status: "contacted" });
    const second = await makeProspect({ name: "Active Second", email: shared, status: "contacted" });
    const c1 = await store.enrollProspect(first, shared);
    const c2 = await store.enrollProspect(second, shared);
    expect(c1).not.toBeNull();
    expect(c2).not.toBeNull();

    await pool.query(
      `UPDATE partner_outreach_campaigns
          SET state = 'contacted',
              initial_sent_at = $2,
              last_sent_at = $2,
              next_action_at = $3
        WHERE id = ANY($1::uuid[])`,
      [[c1!.id, c2!.id], new Date("2026-08-20T15:00:00Z"), TUE],
    );

    const service = new emailService.RecordingEmailService();
    const run = await engine.runOutreachDispatch(service, TUE, config());

    expect(service.sent.filter((email) => email.to === shared)).toHaveLength(1);
    expect(run.followUpsSent).toBe(1);

    const campaigns = await pool.query<{ state: string; stop_reason: string | null }>(
      `SELECT state, stop_reason
         FROM partner_outreach_campaigns
        WHERE id = ANY($1::uuid[])`,
      [[c1!.id, c2!.id]],
    );
    expect(campaigns.rows.filter((row) => row.state === "follow_up_1_sent")).toHaveLength(1);
    expect(campaigns.rows.filter((row) => row.state === "stopped" && row.stop_reason === "duplicate_recipient")).toHaveLength(1);
  });
});
