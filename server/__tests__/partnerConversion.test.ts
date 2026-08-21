/**
 * What counts as a partner sale.
 *
 * Every one of these is a way the number could be inflated, and an inflated
 * partner report is worse than no report: it is the basis for deciding which
 * relationships to invest in, and for whatever compensation is eventually
 * agreed. A partner credited with sales that did not happen is a conversation
 * nobody wants to have twice.
 *
 * The rule is the one PR #160 established for Google Ads and this reuses:
 * a sale exists when the server has asked Stripe and been told the
 * subscription is live. Not when a URL said so, not when checkout started.
 *
 * These run against the real functions and a real database, because the
 * deduplication being tested lives in a unique index rather than in code -
 * mocking the database would test nothing.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Pool } from "pg";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

/**
 * Loaded lazily, and that is not a style choice.
 *
 * partnerStore imports server/db, which builds its pool at module scope and
 * throws when DATABASE_URL is absent. CI runs the unit suite deliberately
 * offline, so a static import here fails the whole file before describe.skip
 * is ever consulted - the skip cannot save a module that threw on the way in.
 */
type PartnerStore = typeof import("../partners/partnerStore");
let store: PartnerStore;

let pool: Pool;
let prospectId: string;

describeIfDb("recordPartnerConversion", () => {
  beforeAll(async () => {
    store = await import("../partners/partnerStore");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    await pool.query(`DELETE FROM partner_prospects WHERE dedupe_key = 'unit-conversion-key'`);
    const result = await pool.query<{ id: string }>(
      `INSERT INTO partner_prospects
         (organization_name, dedupe_key, segment, partner_status, partner_code,
          default_exam_category, partner_active)
       VALUES ('Unit Conversion Partner','unit-conversion-key','real_estate_brokerage',
               'active_partner','unit-conv-code','real_estate', true)
       RETURNING id`,
    );
    prospectId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM partner_conversions WHERE partner_prospect_id = $1`, [prospectId]);
    await pool.query(`DELETE FROM user_profiles WHERE user_id LIKE 'unit-conv-user-%'`);
    await pool.query(`DELETE FROM partner_prospects WHERE id = $1`, [prospectId]);
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM partner_conversions WHERE partner_prospect_id = $1`, [prospectId]);
    await pool.query(`DELETE FROM user_profiles WHERE user_id LIKE 'unit-conv-user-%'`);
  });

  const attributed = async (suffix: string) => {
    const userId = `unit-conv-user-${suffix}`;
    await store.attributeUserToPartner(userId, { prospectId, partnerCode: "unit-conv-code" });
    return userId;
  };

  const sale = (userId: string, subscriptionId: string, status = "active") => ({
    userId,
    stripeSubscriptionId: subscriptionId,
    examCategory: "real_estate" as const,
    billingPeriod: "monthly",
    status,
  });

  it("credits a verified subscription to the introducing partner", async () => {
    const userId = await attributed("a");

    expect(await store.recordPartnerConversion(sale(userId, "sub_unit_a"))).toBe(true);

    const rows = await pool.query(
      `SELECT partner_code, status FROM partner_conversions WHERE stripe_subscription_id = 'sub_unit_a'`,
    );
    expect(rows.rows[0]).toMatchObject({ partner_code: "unit-conv-code", status: "active" });
  });

  it("credits nobody when no partner introduced the student", async () => {
    // Organic traffic must not be credited to whichever partner happens to be
    // handy - that is the difference between a report and a fiction.
    await pool.query(`INSERT INTO user_profiles (user_id) VALUES ('unit-conv-user-organic')`);

    expect(await store.recordPartnerConversion(sale("unit-conv-user-organic", "sub_unit_organic"))).toBe(false);

    const rows = await pool.query(`SELECT 1 FROM partner_conversions WHERE stripe_subscription_id = 'sub_unit_organic'`);
    expect(rows.rowCount).toBe(0);
  });

  it("credits nobody for a student with no profile at all", async () => {
    expect(await store.recordPartnerConversion(sale("unit-conv-user-ghost", "sub_unit_ghost"))).toBe(false);
  });

  it("counts one subscription once, however many times it is presented", async () => {
    const userId = await attributed("dedupe");

    // A reload, a second tab and a repeated sync all arrive with the same
    // subscription id. The unique index is what makes them one sale.
    const first = await store.recordPartnerConversion(sale(userId, "sub_unit_dedupe"));
    const second = await store.recordPartnerConversion(sale(userId, "sub_unit_dedupe"));
    const third = await store.recordPartnerConversion(sale(userId, "sub_unit_dedupe"));

    expect([first, second, third]).toEqual([true, false, false]);

    const rows = await pool.query(
      `SELECT COUNT(*)::int AS c FROM partner_conversions WHERE stripe_subscription_id = 'sub_unit_dedupe'`,
    );
    expect(rows.rows[0].c).toBe(1);
  });

  it("survives three simultaneous syncs without double counting", async () => {
    const userId = await attributed("race");

    // Two tabs and a background repair can genuinely arrive together. Nothing
    // in application code can settle that; the index has to.
    const results = await Promise.all([
      store.recordPartnerConversion(sale(userId, "sub_unit_race")),
      store.recordPartnerConversion(sale(userId, "sub_unit_race")),
      store.recordPartnerConversion(sale(userId, "sub_unit_race")),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    const rows = await pool.query(
      `SELECT COUNT(*)::int AS c FROM partner_conversions WHERE stripe_subscription_id = 'sub_unit_race'`,
    );
    expect(rows.rows[0].c).toBe(1);
  });

  it("counts a renewal as one sale, not two", async () => {
    const userId = await attributed("renew");

    // A subscription that renews keeps its id, so month two must not appear as
    // a second acquisition.
    await store.recordPartnerConversion(sale(userId, "sub_unit_renew"));
    await store.recordPartnerConversion(sale(userId, "sub_unit_renew"));

    const rows = await pool.query(
      `SELECT COUNT(*)::int AS c FROM partner_conversions WHERE partner_prospect_id = $1`,
      [prospectId],
    );
    expect(rows.rows[0].c).toBe(1);
  });

  it("counts a genuinely separate subscription separately", async () => {
    const userId = await attributed("two");

    await store.recordPartnerConversion(sale(userId, "sub_unit_two_a"));
    await store.recordPartnerConversion(sale(userId, "sub_unit_two_b"));

    const rows = await pool.query(
      `SELECT COUNT(*)::int AS c FROM partner_conversions WHERE partner_prospect_id = $1`,
      [prospectId],
    );
    expect(rows.rows[0].c).toBe(2);
  });

  it("records the status it was told, so a trial is distinguishable", async () => {
    const userId = await attributed("trial");
    await store.recordPartnerConversion(sale(userId, "sub_unit_trial", "trialing"));

    const rows = await pool.query(
      `SELECT status FROM partner_conversions WHERE stripe_subscription_id = 'sub_unit_trial'`,
    );
    expect(rows.rows[0].status).toBe("trialing");
  });
});

describeIfDb("attributeUserToPartner", () => {
  let localPool: Pool;
  let firstId: string;
  let secondId: string;

  beforeAll(async () => {
    store = await import("../partners/partnerStore");
    localPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    await localPool.query(`DELETE FROM partner_prospects WHERE dedupe_key IN ('unit-attr-1','unit-attr-2')`);
    const a = await localPool.query<{ id: string }>(
      `INSERT INTO partner_prospects (organization_name, dedupe_key, segment, partner_status, partner_code, partner_active)
       VALUES ('Unit Attr One','unit-attr-1','real_estate_school','active_partner','unit-attr-one',true) RETURNING id`,
    );
    const b = await localPool.query<{ id: string }>(
      `INSERT INTO partner_prospects (organization_name, dedupe_key, segment, partner_status, partner_code, partner_active)
       VALUES ('Unit Attr Two','unit-attr-2','real_estate_school','active_partner','unit-attr-two',true) RETURNING id`,
    );
    firstId = a.rows[0].id;
    secondId = b.rows[0].id;
  });

  afterAll(async () => {
    await localPool.query(`DELETE FROM user_profiles WHERE user_id LIKE 'unit-attr-user-%'`);
    await localPool.query(`DELETE FROM partner_prospects WHERE id IN ($1,$2)`, [firstId, secondId]);
    await localPool.end();
  });

  it("creates the profile row when a student has none yet", async () => {
    // Registration does not create a profile - they are made lazily - so an
    // UPDATE here silently attributed nobody. This is that bug, pinned.
    const userId = `unit-attr-user-${Date.now()}-new`;

    expect(await store.attributeUserToPartner(userId, { prospectId: firstId, partnerCode: "unit-attr-one" })).toBe(true);

    const rows = await localPool.query(`SELECT partner_code FROM user_profiles WHERE user_id = $1`, [userId]);
    expect(rows.rows[0].partner_code).toBe("unit-attr-one");
  });

  it("attributes a student who already has a profile", async () => {
    const userId = `unit-attr-user-${Date.now()}-existing`;
    await localPool.query(`INSERT INTO user_profiles (user_id, preferred_language) VALUES ($1,'en')`, [userId]);

    expect(await store.attributeUserToPartner(userId, { prospectId: firstId, partnerCode: "unit-attr-one" })).toBe(true);
  });

  it("refuses to move an attribution that already exists", async () => {
    const userId = `unit-attr-user-${Date.now()}-first-touch`;
    await store.attributeUserToPartner(userId, { prospectId: firstId, partnerCode: "unit-attr-one" });

    expect(await store.attributeUserToPartner(userId, { prospectId: secondId, partnerCode: "unit-attr-two" })).toBe(false);

    const rows = await localPool.query(`SELECT partner_code FROM user_profiles WHERE user_id = $1`, [userId]);
    expect(rows.rows[0].partner_code).toBe("unit-attr-one");
  });

  it("leaves the rest of an existing profile alone", async () => {
    const userId = `unit-attr-user-${Date.now()}-preserve`;
    await localPool.query(
      `INSERT INTO user_profiles (user_id, preferred_language, subscription_status) VALUES ($1,'es','active')`,
      [userId],
    );

    await store.attributeUserToPartner(userId, { prospectId: firstId, partnerCode: "unit-attr-one" });

    const rows = await localPool.query(
      `SELECT preferred_language, subscription_status FROM user_profiles WHERE user_id = $1`,
      [userId],
    );
    expect(rows.rows[0]).toMatchObject({ preferred_language: "es", subscription_status: "active" });
  });
});
