import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;
const DEDUPE = "outreach-v2-pilot-reply-fixture";
const EMAIL = "pilot-reply-fixture@example.com";

describeIfDb("automatic pilot-details reply", () => {
  let pool: import("pg").Pool;
  let store: typeof import("../outreach/campaignStore");
  let replies: typeof import("../outreach/replyProcessor");
  let emailService: typeof import("../outreach/emailService");

  async function cleanup() {
    await pool.query(
      `DELETE FROM partner_outreach_messages WHERE prospect_id IN
         (SELECT id FROM partner_prospects WHERE dedupe_key = $1)`,
      [DEDUPE],
    );
    await pool.query(
      `DELETE FROM partner_outreach_campaigns WHERE prospect_id IN
         (SELECT id FROM partner_prospects WHERE dedupe_key = $1)`,
      [DEDUPE],
    );
    await pool.query(`DELETE FROM partner_email_suppressions WHERE email = $1`, [EMAIL]);
    await pool.query(`DELETE FROM partner_prospects WHERE dedupe_key = $1`, [DEDUPE]);
  }

  beforeAll(async () => {
    const migrations = await import("../migrations");
    await migrations.runMigrations();
    const db = await import("../db");
    pool = db.pool as unknown as import("pg").Pool;
    store = await import("../outreach/campaignStore");
    replies = await import("../outreach/replyProcessor");
    emailService = await import("../outreach/emailService");
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("sends pilot details exactly once for an interested reply and never activates the partner", async () => {
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO partner_prospects
         (organization_name, dedupe_key, segment, outreach_status, contact_email,
          priority, partner_status, partner_active, decision_maker_name)
       VALUES ($1, $2, 'insurance_school', 'contacted', $3,
               'High', 'prospect', false, 'Alex Morgan')
       RETURNING id`,
      ["[outreach-v2] Pilot School", DEDUPE, EMAIL],
    );
    const prospectId = inserted.rows[0].id;
    const campaign = await store.enrollProspect(prospectId, EMAIL);
    expect(campaign).not.toBeNull();

    const service = new emailService.RecordingEmailService();
    await replies.processReply(campaign!, EMAIL, "Yes, please send the pilot details.", service);

    const firstPilotEmails = service.sent.filter((email) => email.to === EMAIL && email.subject.includes("pilot details"));
    expect(firstPilotEmails).toHaveLength(1);
    expect(firstPilotEmails[0].text).toContain("616 FM 1960 Road West, Suite 101");
    expect(firstPilotEmails[0].text.toLowerCase()).toContain("nothing is activated automatically");

    const after = await store.campaignByProspect(prospectId);
    expect(after?.state).toBe("interested");

    const prospect = await pool.query(
      `SELECT outreach_status, partner_active, partner_status FROM partner_prospects WHERE id = $1`,
      [prospectId],
    );
    expect(prospect.rows[0].outreach_status).toBe("interested");
    expect(prospect.rows[0].partner_active).toBe(false);
    expect(prospect.rows[0].partner_status).toBe("prospect");

    // Simulate a duplicate/retried inbound delivery. The reply may be logged
    // again, but the unique outbound (campaign, step) reservation must prevent
    // a second pilot-details email.
    await replies.processReply(after!, EMAIL, "Yes, please send the pilot details.", service);

    const allPilotEmails = service.sent.filter((email) => email.to === EMAIL && email.subject.includes("pilot details"));
    expect(allPilotEmails).toHaveLength(1);

    const recorded = await pool.query(
      `SELECT count(*) AS n FROM partner_outreach_messages
        WHERE campaign_id = $1 AND direction = 'outbound' AND step = 'pilot_details'`,
      [campaign!.id],
    );
    expect(Number(recorded.rows[0].n)).toBe(1);
  });
});
