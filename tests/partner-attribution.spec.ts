/**
 * Following a partner's student all the way to a verified sale.
 *
 * The attribution chain is the part of this feature that fails invisibly. If
 * it breaks, every page still works, nobody sees an error, and the only
 * symptom is a partner report that quietly says nobody sent anyone - which
 * looks exactly like a partner who is not performing. So the chain is walked
 * against a real server and a real database rather than reasoned about.
 *
 * The rules being defended:
 *
 *   - first touch wins, and later navigation cannot move it
 *   - a partner sale means Stripe said the subscription is live
 *   - the same subscription counts once, however many times it is presented
 *   - partner attribution sits alongside UTM attribution rather than replacing it
 */

import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { requireWritableTarget } from "./helpers/target";
import { journeyDb, closeJourneyDb } from "./helpers/journey";

const FIRST_CODE = "e2e-attr-first";
const SECOND_CODE = "e2e-attr-second";

async function seedTwoPartners(): Promise<{ firstId: string; secondId: string }> {
  const db = journeyDb();
  await db.query(`DELETE FROM partner_prospects WHERE dedupe_key LIKE 'e2e-attr-%'`);

  const rows = await Promise.all(
    [
      ["E2E Attribution First", "e2e-attr-first-key", FIRST_CODE, "real_estate"],
      ["E2E Attribution Second", "e2e-attr-second-key", SECOND_CODE, "life_insurance"],
    ].map(([name, key, code, category]) =>
      db.query<{ id: string }>(
        `INSERT INTO partner_prospects
           (organization_name, dedupe_key, segment, partner_status, partner_code,
            default_exam_category, partner_active)
         VALUES ($1,$2,'real_estate_brokerage','active_partner',$3,$4::exam_category,true)
         RETURNING id`,
        [name, key, code, category],
      ),
    ),
  );

  return { firstId: rows[0].rows[0].id, secondId: rows[1].rows[0].id };
}

/** A browser-like context that keeps its cookies, as a real visitor would. */
async function visitor(baseURL: string | undefined): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL });
}

async function attributionOf(email: string) {
  const db = journeyDb();
  const result = await db.query<{ partner_code: string | null; partner_prospect_id: string | null }>(
    `SELECT p.partner_code, p.partner_prospect_id
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.email = $1`,
    [email],
  );
  return result.rows[0] ?? { partner_code: null, partner_prospect_id: null };
}

test.describe("partner attribution", () => {
  test.beforeAll(async () => {
    requireWritableTarget(process.env.TEST_BASE_URL);
    await seedTwoPartners();
  });

  test.afterAll(async () => {
    await closeJourneyDb();
  });

  test("a student who arrives through a partner link is credited to that partner", async ({ baseURL }) => {
    const context = await visitor(baseURL);
    const email = `attr-basic-${Date.now()}@example.com`;

    await context.get(`/api/partners/resolve/${FIRST_CODE}`);
    await context.post("/api/register", {
      data: { email, password: "TestPassw0rd!", firstName: "A", lastName: "B" },
    });

    expect((await attributionOf(email)).partner_code).toBe(FIRST_CODE);
    await context.dispose();
  });

  test("attribution survives browsing the funnel before signing up", async ({ baseURL }) => {
    const context = await visitor(baseURL);
    const email = `attr-funnel-${Date.now()}@example.com`;

    await context.get(`/api/partners/resolve/${FIRST_CODE}`);
    // The visitor wanders: readiness, topics, pricing. Registration comes last,
    // which is the real shape of this funnel.
    await context.get("/api/study-guide/topics");
    await context.get("/api/stripe/prices");
    await context.get("/api/auth/user");
    await context.post("/api/register", {
      data: { email, password: "TestPassw0rd!", firstName: "A", lastName: "B" },
    });

    expect((await attributionOf(email)).partner_code).toBe(FIRST_CODE);
    await context.dispose();
  });

  test("a second partner link does not steal an existing student", async ({ baseURL }) => {
    const context = await visitor(baseURL);
    const email = `attr-first-touch-${Date.now()}@example.com`;

    await context.get(`/api/partners/resolve/${FIRST_CODE}`);
    await context.post("/api/register", {
      data: { email, password: "TestPassw0rd!", firstName: "A", lastName: "B" },
    });

    // Signed in, they now follow a rival partner's link. The relationship that
    // introduced them is the one that keeps the credit.
    await context.get(`/api/partners/resolve/${SECOND_CODE}`);

    expect((await attributionOf(email)).partner_code).toBe(FIRST_CODE);
    await context.dispose();
  });

  test("the first link seen in a visit wins, not the last", async ({ baseURL }) => {
    const context = await visitor(baseURL);
    const email = `attr-two-links-${Date.now()}@example.com`;

    // Both before registering, so the decision is made purely by order.
    await context.get(`/api/partners/resolve/${FIRST_CODE}`);
    await context.get(`/api/partners/resolve/${SECOND_CODE}`);
    await context.post("/api/register", {
      data: { email, password: "TestPassw0rd!", firstName: "A", lastName: "B" },
    });

    expect((await attributionOf(email)).partner_code).toBe(FIRST_CODE);
    await context.dispose();
  });

  test("attribution survives signing out and back in", async ({ baseURL }) => {
    const context = await visitor(baseURL);
    const email = `attr-relogin-${Date.now()}@example.com`;
    const password = "TestPassw0rd!";

    await context.get(`/api/partners/resolve/${FIRST_CODE}`);
    await context.post("/api/register", { data: { email, password, firstName: "A", lastName: "B" } });
    await context.get("/api/logout");
    await context.post("/api/login", { data: { email, password } });

    expect((await attributionOf(email)).partner_code).toBe(FIRST_CODE);
    await context.dispose();
  });

  test("a visitor with no partner is credited to nobody", async ({ baseURL }) => {
    const context = await visitor(baseURL);
    const email = `attr-none-${Date.now()}@example.com`;

    await context.post("/api/register", {
      data: { email, password: "TestPassw0rd!", firstName: "A", lastName: "B" },
    });

    // The absence has to be a real absence. A default partner would credit
    // organic traffic to whichever organization happened to be first.
    expect((await attributionOf(email)).partner_code).toBeNull();
    await context.dispose();
  });

  test("an inactive partner cannot attribute anyone", async ({ baseURL }) => {
    const db = journeyDb();
    await db.query(`DELETE FROM partner_prospects WHERE dedupe_key = 'e2e-attr-off-key'`);
    await db.query(
      `INSERT INTO partner_prospects
         (organization_name, dedupe_key, segment, partner_status, partner_code,
          default_exam_category, partner_active)
       VALUES ('E2E Not A Partner','e2e-attr-off-key','insurance_agency','prospect',
               'e2e-attr-off','life_insurance', false)`,
    );

    const context = await visitor(baseURL);
    const email = `attr-inactive-${Date.now()}@example.com`;
    await context.get("/api/partners/resolve/e2e-attr-off");
    await context.post("/api/register", {
      data: { email, password: "TestPassw0rd!", firstName: "A", lastName: "B" },
    });

    expect((await attributionOf(email)).partner_code).toBeNull();
    await context.dispose();
  });

  test("partner and UTM attribution coexist", async ({ page }) => {
    // A partner who posts their link on Facebook produces both, and both are
    // true: one is the channel, the other is the relationship.
    await page.goto(`/p/${FIRST_CODE}?utm_source=facebook&utm_campaign=e2e_partner_test`);
    await page.waitForURL(/\/readiness-check/, { timeout: 20_000 });

    const envelope = await page.evaluate(() => {
      try {
        return JSON.parse(sessionStorage.getItem("myeasypass:first-touch:v1") ?? "null");
      } catch {
        return null;
      }
    });

    expect(envelope?.partner_code).toBe(FIRST_CODE);
    expect(envelope?.utm_source).toBe("facebook");
    expect(envelope?.utm_campaign).toBe("e2e_partner_test");
  });

  test("a verified subscription is credited once, however often it is synced", async () => {
    // This lives in the end-to-end suite rather than only in the unit tests
    // because CI's unit job runs offline with no database by design - and the
    // deduplication being checked here IS a unique index. A test for it that
    // skips whenever there is no database is not a guard.
    const { recordPartnerConversion, attributeUserToPartner } = await import(
      "../server/partners/partnerStore"
    );

    const db = journeyDb();
    const prospect = await db.query<{ id: string }>(
      `SELECT id FROM partner_prospects WHERE partner_code = $1`,
      [FIRST_CODE],
    );
    const prospectId = prospect.rows[0].id;
    const userId = `e2e-conv-user-${Date.now()}`;
    const subscriptionId = `sub_e2e_${Date.now()}`;

    await attributeUserToPartner(userId, { prospectId, partnerCode: FIRST_CODE });

    const sale = {
      userId,
      stripeSubscriptionId: subscriptionId,
      examCategory: "real_estate" as const,
      billingPeriod: "monthly",
      status: "active",
    };

    // A reload, a second tab and a background repair, arriving together.
    const results = await Promise.all([
      recordPartnerConversion(sale),
      recordPartnerConversion(sale),
      recordPartnerConversion(sale),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);

    const counted = await db.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM partner_conversions WHERE stripe_subscription_id = $1`,
      [subscriptionId],
    );
    expect(counted.rows[0].c).toBe(1);

    await db.query(`DELETE FROM partner_conversions WHERE stripe_subscription_id = $1`, [subscriptionId]);
    await db.query(`DELETE FROM user_profiles WHERE user_id = $1`, [userId]);
  });

  test("a student nobody introduced is credited to nobody", async () => {
    const { recordPartnerConversion } = await import("../server/partners/partnerStore");
    const db = journeyDb();
    const userId = `e2e-organic-${Date.now()}`;
    await db.query(`INSERT INTO user_profiles (user_id) VALUES ($1)`, [userId]);

    const recorded = await recordPartnerConversion({
      userId,
      stripeSubscriptionId: `sub_organic_${Date.now()}`,
      examCategory: "real_estate",
      billingPeriod: "monthly",
      status: "active",
    });

    // Organic traffic must never be credited to a partner.
    expect(recorded).toBe(false);
    await db.query(`DELETE FROM user_profiles WHERE user_id = $1`, [userId]);
  });

  test("partner metadata carries nothing personal", async ({ page }) => {
    await page.goto(`/p/${FIRST_CODE}`);
    await page.waitForURL(/\/readiness-check/, { timeout: 20_000 });

    const db = journeyDb();
    const events = await db.query<{ metadata: Record<string, unknown> }>(
      `SELECT metadata FROM analytics_events
        WHERE event = 'partner_landing_view'
          AND metadata->>'partner_code' = $1
        ORDER BY created_at DESC LIMIT 5`,
      [FIRST_CODE],
    );

    expect(events.rows.length).toBeGreaterThan(0);
    for (const row of events.rows) {
      const serialized = JSON.stringify(row.metadata);
      // The prospect record holds decision-maker names, emails and private
      // notes. None of it may travel with an analytics event.
      for (const forbidden of ["@example.com", "decision", "notes", "contact_email"]) {
        expect(serialized.toLowerCase()).not.toContain(forbidden);
      }
    }
  });
});
