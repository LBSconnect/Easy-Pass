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
    publicContact?: string | null;
    status?: string;
    priority?: string;
    segment?: string;
  } = {}) {
    const email = opts.email === undefined ? `${name}@${DOMAIN}` : opts.email;
    const result = await pool.query<{ id: string }>(
      `INSERT INTO partner_prospects
         (organization_name, dedupe_key, segment, outreach_status, contact_email,
          public_contact, priority, partner_status, partner_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'prospect', false)
       RETURNING id`,
      [
        `[${FX}] ${name}`,
        `${FX}-${name}`,
        opts.segment ?? "insurance_agency",
        opts.status ?? "researching",
        email,
        opts.publicContact ?? null,
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

  it("moves every untouched safe prospect to ready_to_contact while suppression stays blocked", async () => {
    const eligible = await prospect("eligible", { priority: "Very High" });
    const low = await prospect("low", { priority: "Low" });
    const missingEmail = await prospect("missing", { email: null, priority: "High" });
    const other = await prospect("other", { segment: "other", priority: "High" });
    const suppressed = await prospect("suppressed", { priority: "High" });

    await pool.query(
      `INSERT INTO partner_email_suppressions (email, reason, source)
       VALUES ($1, 'unsubscribed', 'test')`,
      [suppressed.email],
    );

    const prepared = await autoQualifyProspects(10);
    expect(prepared).toBe(3);

    const rows = await pool.query<{ id: string; outreach_status: string }>(
      `SELECT id, outreach_status FROM partner_prospects WHERE id = ANY($1::uuid[])`,
      [[eligible.id, low.id, missingEmail.id, other.id, suppressed.id]],
    );
    const status = new Map(rows.rows.map((r) => [r.id, r.outreach_status]));

    expect(status.get(eligible.id)).toBe("ready_to_contact");
    expect(status.get(low.id)).toBe("ready_to_contact");
    expect(status.get(missingEmail.id)).toBe("ready_to_contact");
    expect(status.get(other.id)).toBe("ready_to_contact");
    expect(status.get(suppressed.id)).toBe("researching");
  });

  it("extracts a literal published email, while phone-only prospects are still ready but unsendable", async () => {
    const published = await prospect("published", {
      email: null,
      publicContact: `Public.Team@${DOMAIN} | 713-555-0100`,
      priority: "Very High",
    });
    const phoneOnly = await prospect("phone-only", {
      email: null,
      publicContact: "713-555-0101",
      priority: "Very High",
    });

    expect(await autoQualifyProspects(10)).toBe(1);

    const rows = await pool.query<{ id: string; outreach_status: string; contact_email: string | null }>(
      `SELECT id, outreach_status, contact_email
         FROM partner_prospects
        WHERE id = ANY($1::uuid[])`,
      [[published.id, phoneOnly.id]],
    );
    const byId = new Map(rows.rows.map((r) => [r.id, r]));

    expect(byId.get(published.id)?.outreach_status).toBe("ready_to_contact");
    expect(byId.get(published.id)?.contact_email).toBe(`public.team@${DOMAIN}`);
    expect(byId.get(phoneOnly.id)?.outreach_status).toBe("ready_to_contact");
    expect(byId.get(phoneOnly.id)?.contact_email).toBeNull();
  });

  it("does not revive a suppressed published email", async () => {
    const email = `blocked@${DOMAIN}`;
    const blocked = await prospect("public-suppressed", {
      email: null,
      publicContact: `${email} | 713-555-0102`,
      priority: "Very High",
    });
    await pool.query(
      `INSERT INTO partner_email_suppressions (email, reason, source)
       VALUES ($1, 'unsubscribed', 'test')`,
      [email],
    );

    expect(await autoQualifyProspects(10)).toBe(0);
    const row = await pool.query<{ outreach_status: string; contact_email: string | null }>(
      `SELECT outreach_status, contact_email FROM partner_prospects WHERE id = $1`,
      [blocked.id],
    );
    expect(row.rows[0].outreach_status).toBe("researching");
    expect(row.rows[0].contact_email).toBeNull();
  });

  it("limits canonical recipient preparation to the remaining daily budget without undoing ready state", async () => {
    const a = await prospect("budget-a", { email: null, publicContact: `a@${DOMAIN}`, priority: "High" });
    const b = await prospect("budget-b", { email: null, publicContact: `b@${DOMAIN}`, priority: "High" });

    expect(await autoQualifyProspects(1)).toBe(1);

    const rows = await pool.query<{ id: string; outreach_status: string; contact_email: string | null }>(
      `SELECT id, outreach_status, contact_email
         FROM partner_prospects
        WHERE id = ANY($1::uuid[])`,
      [[a.id, b.id]],
    );
    expect(rows.rows.every((row) => row.outreach_status === "ready_to_contact")).toBe(true);
    expect(rows.rows.filter((row) => row.contact_email !== null)).toHaveLength(1);
  });
});
