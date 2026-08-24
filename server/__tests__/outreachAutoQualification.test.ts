import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;
const FX = "autoqual-fx";
const DOMAIN = "autoqual-fx.example";

describeIfDb("automated outreach qualification", () => {
  let pool: import("pg").Pool;
  let autoQualifyProspects: typeof import("../outreach/autoQualification").autoQualifyProspects;

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

  async function prospect(name: string, opts: {
    email?: string | null;
    status?: string;
    priority?: string;
    segment?: string;
  } = {}) {
    const email = opts.email === undefined ? `${name}@${DOMAIN}` : opts.email;
    const result = await pool.query<{ id: string }>(
      `INSERT INTO partner_prospects
         (organization_name, dedupe_key, segment, outreach_status, contact_email,
          priority, partner_status, partner_active)
       VALUES ($1, $2, $3, $4, $5, $6, 'prospect', false)
       RETURNING id`,
      [
        `[${FX}] ${name}`,
        `${FX}-${name}`,
        opts.segment ?? "insurance_agency",
        opts.status ?? "researching",
        email,
        opts.priority ?? "High",
      ],
    );
    return { id: result.rows[0].id, email };
  }

  beforeAll(async () => {
    const migrations = await import("../migrations");
    await migrations.runMigrations();
    const db = await import("../db");
    pool = db.pool as unknown as import("pg").Pool;
    ({ autoQualifyProspects } = await import("../outreach/autoQualification"));
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("promotes eligible researched prospects without manual ready_to_contact work", async () => {
    const eligible = await prospect("eligible", { priority: "Very High" });
    const low = await prospect("low", { priority: "Low" });
    const missingEmail = await prospect("missing", { email: null, priority: "High" });
    const other = await prospect("other", { segment: "other", priority: "High" });
    const suppressed = await prospect("suppressed", { priority: "High" });

    await pool.query(
      `INSERT INTO partner_email_suppressions (email, reason, source)
       VALUES ($1, 'unsubscribe', 'test')`,
      [suppressed.email],
    );

    const promoted = await autoQualifyProspects(10);
    expect(promoted).toBe(1);

    const rows = await pool.query<{ id: string; outreach_status: string }>(
      `SELECT id, outreach_status FROM partner_prospects WHERE id = ANY($1::uuid[])`,
      [[eligible.id, low.id, missingEmail.id, other.id, suppressed.id]],
    );
    const status = new Map(rows.rows.map((r) => [r.id, r.outreach_status]));

    expect(status.get(eligible.id)).toBe("ready_to_contact");
    expect(status.get(low.id)).toBe("researching");
    expect(status.get(missingEmail.id)).toBe("researching");
    expect(status.get(other.id)).toBe("researching");
    expect(status.get(suppressed.id)).toBe("researching");
  });

  it("respects the remaining daily budget", async () => {
    await prospect("budget-a", { priority: "High" });
    await prospect("budget-b", { priority: "High" });

    expect(await autoQualifyProspects(1)).toBe(1);

    const count = await pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM partner_prospects
        WHERE dedupe_key LIKE $1 AND outreach_status = 'ready_to_contact'`,
      [`${FX}-budget-%`],
    );
    expect(Number(count.rows[0].n)).toBe(1);
  });
});
