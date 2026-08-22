/**
 * The partner channel, against a real server and a real database.
 *
 * Two things are being defended here, and they are not the same thing.
 *
 * SECURITY. The prospect table is business-development data about sixty-two
 * organizations, most of which have never heard of MyEasyPass. Who we are
 * approaching, who we spoke to there and what we think the opportunity is are
 * all in that table, and none of it may reach a student, an anonymous request,
 * or the public partner route. An organization that has not agreed to anything
 * must not be discoverable as a MyEasyPass prospect.
 *
 * ATTRIBUTION. A partner sale has to mean a sale. The chain runs from the link
 * through the diagnostic, auth, pricing and checkout to a subscription the
 * server has verified with Stripe, and it is invisible when it breaks: every
 * screen still works, the number is just quietly wrong. So it is walked here
 * rather than reasoned about.
 */

import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { requireWritableTarget } from "./helpers/target";
import { journeyDb, closeJourneyDb } from "./helpers/journey";

const ACTIVE_CODE = "e2e-active-partner";
const INACTIVE_CODE = "e2e-inactive-partner";
/** Distinctive, so a leak of it anywhere is unambiguous. */
const SECRET_ORG = "E2E Secret Prospect Organization";
const SECRET_NOTE = "E2E-CONFIDENTIAL-NOTE-do-not-leak";

interface Fixture {
  activeId: string;
  inactiveId: string;
}

async function seedPartners(): Promise<Fixture> {
  const db = journeyDb();

  await db.query(`DELETE FROM partner_prospects WHERE dedupe_key LIKE 'e2e-partner-%'`);

  const active = await db.query<{ id: string }>(
    `INSERT INTO partner_prospects
       (organization_name, dedupe_key, segment, partner_status, partner_code,
        default_exam_category, partner_active, partner_display_name, notes)
     VALUES ($1,'e2e-partner-active','real_estate_brokerage','active_partner',$2,
             'real_estate', true, 'E2E Active Partner', $3)
     RETURNING id`,
    ["E2E Active Partner Organization", ACTIVE_CODE, SECRET_NOTE],
  );

  // Has a code, but nobody activated it. This is the row that must never be
  // discoverable: it stands for every organization on the research list.
  const inactive = await db.query<{ id: string }>(
    `INSERT INTO partner_prospects
       (organization_name, dedupe_key, segment, partner_status, partner_code,
        default_exam_category, partner_active, decision_maker_name, contact_email, notes)
     VALUES ($1,'e2e-partner-inactive','insurance_agency','prospect',$2,
             'life_insurance', false, 'Private Person', 'private@example.com', $3)
     RETURNING id`,
    [SECRET_ORG, INACTIVE_CODE, SECRET_NOTE],
  );

  return { activeId: active.rows[0].id, inactiveId: inactive.rows[0].id };
}

test.describe("partner referral route", () => {
  test.beforeAll(async () => {
    requireWritableTarget(process.env.TEST_BASE_URL);
    await seedPartners();
  });

  test.afterAll(async () => {
    await closeJourneyDb();
  });

  test("an active partner link lands in that partner's exam", async ({ page }) => {
    await page.goto(`/p/${ACTIVE_CODE}`);

    // Straight into the existing readiness check, scoped to the exam the admin
    // chose - not a partner-specific funnel.
    await page.waitForURL(/\/readiness-check/, { timeout: 20_000 });
    expect(new URL(page.url()).searchParams.get("category")).toBe("real_estate");
  });

  test("an inactive partner code reveals nothing about the organization", async ({ page }) => {
    await page.goto(`/p/${INACTIVE_CODE}`);
    await page.waitForURL(/\/readiness-check/, { timeout: 20_000 });

    // The visitor still gets the product. What they must not get is any hint
    // that this organization is on a list of ours.
    const body = await page.locator("body").innerText();
    expect(body).not.toContain(SECRET_ORG);
    expect(body).not.toContain("Private Person");
    expect(body).not.toContain(SECRET_NOTE);
    // No category either: an inactive partner's configuration is configuration
    // we are not entitled to act on.
    expect(new URL(page.url()).searchParams.get("category")).toBeNull();
  });

  test("an unknown code fails safely", async ({ page }) => {
    await page.goto("/p/definitely-not-a-partner");
    await page.waitForURL(/\/readiness-check/, { timeout: 20_000 });

    await expect(page.getByTestId("button-diagnostic-category-life_insurance")).toBeVisible({ timeout: 20_000 });
  });

  test("a hostile code cannot escape the route", async ({ page }) => {
    await page.goto("/p/..%2F..%2Fadmin");
    await page.waitForURL(/\/readiness-check/, { timeout: 20_000 });

    expect(page.url()).not.toContain("/admin");
  });

  test("the resolve endpoint answers the same way for inactive and unknown", async ({ request }) => {
    // Distinguishable answers would let the endpoint be walked to discover
    // which organizations we hold records on.
    const inactive = await request.get(`/api/partners/resolve/${INACTIVE_CODE}`);
    const unknown = await request.get("/api/partners/resolve/no-such-partner-code");

    expect(inactive.status()).toBe(404);
    expect(unknown.status()).toBe(404);
    expect(await inactive.text()).toBe(await unknown.text());
  });

  test("the active partner response carries nothing private", async ({ request }) => {
    const res = await request.get(`/api/partners/resolve/${ACTIVE_CODE}`);
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body).not.toContain(SECRET_NOTE);
    expect(body).not.toContain("decisionMaker");
    expect(body).not.toContain("contactEmail");
    // Only what rendering the visit requires. attributionPartnerCode is who
    // the visitor already belongs to - for an anonymous request that is always
    // the code just clicked, so it discloses nothing the caller did not send.
    expect(Object.keys(JSON.parse(body)).sort()).toEqual([
      "attributionPartnerCode", "displayName", "examCategory", "landingVariant", "partnerCode",
    ]);
    expect(JSON.parse(body).attributionPartnerCode).toBe(ACTIVE_CODE);
  });
});

test.describe("prospect data stays private", () => {
  test.beforeAll(async () => {
    requireWritableTarget(process.env.TEST_BASE_URL);
    await seedPartners();
  });

  test.afterAll(async () => {
    await closeJourneyDb();
  });

  test("an anonymous request cannot read the prospect database", async ({ request }) => {
    const res = await request.get("/api/admin/partners/prospects");
    expect(res.status()).toBe(401);
  });

  test("an anonymous request cannot read partner performance", async ({ request }) => {
    expect((await request.get("/api/admin/partners/performance")).status()).toBe(401);
  });

  test("a signed-in student cannot read the prospect database", async ({ request, baseURL }) => {
    const context = await playwrightRequest.newContext({ baseURL });
    const email = `partner-guard-${Date.now()}@example.com`;
    await context.post("/api/register", {
      data: { email, password: "TestPassw0rd!", firstName: "Guard", lastName: "Test" },
    });

    // Registered and signed in - and still refused, because the gate is the
    // admin role rather than merely having an account.
    const res = await context.get("/api/admin/partners/prospects");
    expect(res.status()).toBe(403);
    expect(await res.text()).not.toContain(SECRET_ORG);

    const edit = await context.patch("/api/admin/partners/prospects/00000000-0000-0000-0000-000000000000", {
      data: { notes: "should never be written" },
    });
    expect(edit.status()).toBe(403);

    await context.dispose();
  });

  test("the CSV files are not served to the browser", async ({ request }) => {
    // The research files live in data/prospects and are read by server-side
    // tooling only. If the static handler ever started serving that directory,
    // the entire prospect list would be one URL away.
    for (const path of [
      "/data/prospects/brokerages.csv",
      "/data/prospects/real-estate-schools.csv",
      "/prospects/brokerages.csv",
    ]) {
      const res = await request.get(path);
      const body = await res.text();
      expect(body).not.toContain("Organization,Segment");
      expect(body).not.toContain("Recruiting Signal");
    }
  });

  test("prospect names are not bundled into the client JavaScript", async ({ request }) => {
    // A build-time import of the CSVs would put every organization, and the
    // notes about them, into a file anyone can download.
    const html = await (await request.get("/")).text();
    const scripts = Array.from(html.matchAll(/src="([^"]+\.js)"/g)).map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);

    for (const src of scripts) {
      const body = await (await request.get(src)).text();
      expect(body).not.toContain("Champions School of Real Estate");
      expect(body).not.toContain("Recruiting Signal");
      expect(body).not.toContain(SECRET_NOTE);
    }
  });
});

/**
 * A partner code is a published URL and the key its history is filed under.
 *
 * Those two facts are why the rules below exist. A live code has been printed
 * on a flyer, pasted into a newsletter and typed into phones, so changing it
 * breaks links that are already out in the world - and every analytics event
 * and verified subscription already recorded carries the OLD code, so the
 * report joins on a value that no longer exists and the partner appears to
 * have sent nobody. The failure is silent in both directions.
 *
 * The other half is coherence. A record that is switched on while pointing at
 * no exam, or carrying no code, is a live link that cannot work. The earlier
 * version of this endpoint checked only the incoming patch, which meant that
 * state was reachable one field at a time. What is checked now is the record
 * as it WILL BE.
 */

const CODE_INTEGRITY_ORG = "E2E Code Integrity Partner";
const LIVE_CODE = "e2e-integrity-live";

interface IntegrityFixture {
  liveId: string;
  draftId: string;
  admin: APIRequestContext;
}

/**
 * An admin, made the way the journey fixture makes its world: registration
 * goes through the real API, and the role - which no route grants - is set in
 * SQL. Arranging the world is SQL; using the product is not.
 */
async function adminContext(baseURL: string | undefined): Promise<APIRequestContext> {
  const db = journeyDb();
  const context = await playwrightRequest.newContext({ baseURL });
  const email = `partner-admin-${Date.now()}@example.com`;

  await context.post("/api/register", {
    data: { email, password: "TestPassw0rd!", firstName: "Admin", lastName: "Test" },
  });

  const user = await db.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
  await db.query(
    `INSERT INTO user_profiles (user_id, role) VALUES ($1, 'admin')
     ON CONFLICT (user_id) DO UPDATE SET role = 'admin'`,
    [user.rows[0].id],
  );

  return context;
}

async function seedIntegrityFixture(baseURL: string | undefined): Promise<IntegrityFixture> {
  const db = journeyDb();

  await db.query(`DELETE FROM partner_conversions WHERE partner_code = $1`, [LIVE_CODE]);
  await db.query(`DELETE FROM analytics_events WHERE metadata->>'partner_code' = $1`, [LIVE_CODE]);
  await db.query(`DELETE FROM partner_prospects WHERE dedupe_key LIKE 'e2e-integrity-%'`);

  // A partner whose link has been live: it has a stamp, a code, an exam and a
  // switched-on flag, which is the state the admin route leaves behind.
  const live = await db.query<{ id: string }>(
    `INSERT INTO partner_prospects
       (organization_name, dedupe_key, segment, partner_status, partner_code,
        default_exam_category, partner_active, partner_created_at)
     VALUES ($1,'e2e-integrity-live','real_estate_brokerage','active_partner',$2,
             'real_estate', true, now())
     RETURNING id`,
    [CODE_INTEGRITY_ORG, LIVE_CODE],
  );

  // A record nobody has published: researched, never agreed to anything.
  const draft = await db.query<{ id: string }>(
    `INSERT INTO partner_prospects
       (organization_name, dedupe_key, segment, partner_status, partner_active)
     VALUES ('E2E Code Integrity Draft','e2e-integrity-draft','insurance_agency','prospect', false)
     RETURNING id`,
  );

  return { liveId: live.rows[0].id, draftId: draft.rows[0].id, admin: await adminContext(baseURL) };
}

/** The fields the rules below are about, straight from the row. */
async function partnerRow(id: string) {
  const db = journeyDb();
  const result = await db.query(
    `SELECT partner_code, partner_status, default_exam_category, partner_active
       FROM partner_prospects WHERE id = $1`,
    [id],
  );
  return result.rows[0];
}

test.describe("partner code and active state stay coherent", () => {
  let fixture: IntegrityFixture;

  test.beforeAll(async ({ baseURL }) => {
    requireWritableTarget(process.env.TEST_BASE_URL);
    fixture = await seedIntegrityFixture(baseURL);
  });

  test.afterAll(async () => {
    await fixture.admin.dispose();
    await closeJourneyDb();
  });

  const patch = (id: string, data: Record<string, unknown>) =>
    fixture.admin.patch(`/api/admin/partners/prospects/${id}`, { data });

  test("a live partner's code cannot be renamed", async () => {
    const res = await patch(fixture.liveId, { partnerCode: "e2e-integrity-renamed" });

    expect(res.status()).toBe(409);
    expect((await res.json()).message).toMatch(/cannot be changed/i);
    // And the refusal is not cosmetic - nothing was written.
    expect((await partnerRow(fixture.liveId)).partner_code).toBe(LIVE_CODE);
  });

  test("a live partner's code cannot be cleared", async () => {
    for (const cleared of ["", null]) {
      const res = await patch(fixture.liveId, { partnerCode: cleared });

      expect(res.status()).toBe(409);
      expect((await res.json()).message).toMatch(/cannot be cleared/i);
      expect((await partnerRow(fixture.liveId)).partner_code).toBe(LIVE_CODE);
    }
  });

  test("resubmitting the same code is not a change", async () => {
    // The admin form posts every field back, so an unchanged code arrives on
    // edits that have nothing to do with it. Blocking those would make the
    // record uneditable rather than the code immutable.
    const res = await patch(fixture.liveId, {
      partnerCode: LIVE_CODE,
      notes: "Edited without touching the code",
    });

    expect(res.status()).toBe(200);
    expect((await partnerRow(fixture.liveId)).partner_code).toBe(LIVE_CODE);
  });

  test("a live partner cannot have its exam cleared one field at a time", async () => {
    // The rule this pins: the endpoint validates the record as it WILL BE.
    // Sending only `defaultExamCategory: null` used to be waved through
    // because the patch said nothing about activation - leaving a live link
    // pointing at no exam.
    const res = await patch(fixture.liveId, { defaultExamCategory: null });

    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/exam/i);
    expect((await partnerRow(fixture.liveId)).default_exam_category).toBe("real_estate");
  });

  test("a live partner cannot be demoted while its link is still on", async () => {
    const res = await patch(fixture.liveId, { partnerStatus: "prospect" });

    expect(res.status()).toBe(400);
    expect((await partnerRow(fixture.liveId)).partner_status).toBe("active_partner");
  });

  test("a rejected edit writes none of its other fields either", async () => {
    // A partial write would be the worst outcome: the request is refused and
    // the record changes anyway.
    const before = await partnerRow(fixture.liveId);

    const res = await patch(fixture.liveId, {
      partnerCode: "e2e-integrity-sneaky",
      partnerDisplayName: "Should Not Be Written",
      notes: "Should not be written either",
    });
    expect(res.status()).toBe(409);

    const db = journeyDb();
    const after = await db.query(
      `SELECT partner_code, partner_display_name, notes FROM partner_prospects WHERE id = $1`,
      [fixture.liveId],
    );
    expect(after.rows[0].partner_code).toBe(before.partner_code);
    expect(after.rows[0].partner_display_name).not.toBe("Should Not Be Written");
    expect(after.rows[0].notes).not.toBe("Should not be written either");
  });

  test("the live partner still resolves after every refused edit", async ({ request }) => {
    const res = await request.get(`/api/partners/resolve/${LIVE_CODE}`);

    expect(res.status()).toBe(200);
    expect((await res.json()).partnerCode).toBe(LIVE_CODE);
  });

  test("switching a partner off keeps its code and its history", async () => {
    const db = journeyDb();

    // Give the partner something to lose: one recorded visit and one verified
    // subscription, both filed under its code.
    const student = await db.query<{ id: string }>(
      `INSERT INTO users (email, password) VALUES ($1,'x') RETURNING id`,
      [`integrity-student-${Date.now()}@example.com`],
    );
    await db.query(
      `INSERT INTO analytics_events (event, metadata) VALUES ('partner_landing_view', $1::jsonb)`,
      [JSON.stringify({ partner_code: LIVE_CODE })],
    );
    await db.query(
      `INSERT INTO partner_conversions
         (partner_prospect_id, partner_code, user_id, stripe_subscription_id, status)
       VALUES ($1,$2,$3,$4,'active')`,
      [fixture.liveId, LIVE_CODE, student.rows[0].id, `sub_integrity_${Date.now()}`],
    );

    const before = await fixture.admin.get("/api/admin/partners/performance");
    const beforeRow = (await before.json()).find((r: any) => r.partnerCode === LIVE_CODE);
    expect(beforeRow).toMatchObject({ visits: 1, verifiedSubscriptions: 1 });

    // Switching off is allowed, and is not the same as erasing the partner.
    expect((await patch(fixture.liveId, { partnerActive: false })).status()).toBe(200);

    const off = await partnerRow(fixture.liveId);
    expect(off.partner_active).toBe(false);
    expect(off.partner_code).toBe(LIVE_CODE);

    // The link stops working...
    expect((await fixture.admin.get(`/api/partners/resolve/${LIVE_CODE}`)).status()).toBe(404);

    // ...and the history is exactly where it was.
    const after = await fixture.admin.get("/api/admin/partners/performance");
    const afterRow = (await after.json()).find((r: any) => r.partnerCode === LIVE_CODE);
    expect(afterRow).toMatchObject({ visits: 1, verifiedSubscriptions: 1, partnerActive: false });

    // A switched-off partner's code is still spoken for.
    expect((await patch(fixture.liveId, { partnerCode: "e2e-integrity-reused" })).status()).toBe(409);

    // Switching it back on restores the same relationship, not a new one.
    expect((await patch(fixture.liveId, { partnerActive: true })).status()).toBe(200);
    expect((await fixture.admin.get(`/api/partners/resolve/${LIVE_CODE}`)).status()).toBe(200);

    const back = await fixture.admin.get("/api/admin/partners/performance");
    expect((await back.json()).find((r: any) => r.partnerCode === LIVE_CODE)).toMatchObject({
      visits: 1,
      verifiedSubscriptions: 1,
    });
  });

  test("a draft cannot be activated without an exam", async () => {
    const res = await patch(fixture.draftId, {
      partnerStatus: "active_partner",
      partnerCode: "e2e-integrity-noexam",
      partnerActive: true,
    });

    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/exam/i);
    expect((await partnerRow(fixture.draftId)).partner_active).toBe(false);
  });

  test("a draft cannot be activated without a code", async () => {
    const res = await patch(fixture.draftId, {
      partnerStatus: "active_partner",
      defaultExamCategory: "life_insurance",
      partnerActive: true,
    });

    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/code/i);
    expect((await partnerRow(fixture.draftId)).partner_active).toBe(false);
  });

  test("a draft cannot be activated while it is still only a prospect", async () => {
    // The whole point of the two-field split: talking to an organization is
    // not the same as being allowed to publish its name.
    const res = await patch(fixture.draftId, {
      partnerCode: "e2e-integrity-prospect",
      defaultExamCategory: "life_insurance",
      partnerActive: true,
    });

    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/active partner/i);
    expect((await partnerRow(fixture.draftId)).partner_active).toBe(false);
  });

  test("a draft's code is free to change right up until it goes live", async () => {
    expect((await patch(fixture.draftId, { partnerCode: "e2e-integrity-first-try" })).status()).toBe(200);
    expect((await patch(fixture.draftId, { partnerCode: "e2e-integrity-second-try" })).status()).toBe(200);
    expect((await partnerRow(fixture.draftId)).partner_code).toBe("e2e-integrity-second-try");

    // A complete activation is accepted...
    expect(
      (
        await patch(fixture.draftId, {
          partnerStatus: "active_partner",
          defaultExamCategory: "life_insurance",
          partnerActive: true,
        })
      ).status(),
    ).toBe(200);

    // ...and from that moment the code is fixed.
    expect((await patch(fixture.draftId, { partnerCode: "e2e-integrity-too-late" })).status()).toBe(409);
    expect((await partnerRow(fixture.draftId)).partner_code).toBe("e2e-integrity-second-try");
  });
});

/**
 * The outreach engine's public surface, added with the automation PR.
 *
 * Three new unauthenticated endpoints exist so a scheduler, a webhook and an
 * unsubscribe click can reach the engine. Each must reveal nothing about who
 * is in the CRM: the same refusals whoever asks, and the unsubscribe page the
 * same whether the token was real or garbage.
 */
test.describe("outreach engine public surface", () => {
  test.beforeAll(async () => {
    requireWritableTarget(process.env.TEST_BASE_URL);
    await seedPartners();
  });

  test.afterAll(async () => {
    await closeJourneyDb();
  });

  test("dispatch refuses without its secret", async ({ request }) => {
    // 503 when the secret is unset (this environment), 401 when set and wrong.
    // Either way: no run, no detail.
    const res = await request.post("/api/outreach/dispatch", {
      headers: { "x-outreach-secret": "wrong" },
    });
    expect([401, 503]).toContain(res.status());
    expect(await res.text()).not.toContain(SECRET_ORG);
  });

  test("the webhook refuses an unsigned request", async ({ request }) => {
    const res = await request.post("/api/outreach/webhook", {
      data: { type: "email.received", data: { from: "private@example.com", text: "yes" } },
    });
    expect([401, 503]).toContain(res.status());
  });

  test("the unsubscribe page confirms without identifying anyone", async ({ request }) => {
    for (const token of ["", "not-a-real-token", "0".repeat(48)]) {
      const res = await request.get(`/api/outreach/unsubscribe?token=${token}`);
      expect(res.status()).toBe(200);
      const body = await res.text();
      expect(body).toContain("unsubscribed");
      expect(body).not.toContain(SECRET_ORG);
      expect(body).not.toContain("private@example.com");
    }
  });

  test("campaign state is admin-only", async ({ request, baseURL }) => {
    expect((await request.get("/api/admin/partners/campaigns")).status()).toBe(401);

    const context = await playwrightRequest.newContext({ baseURL });
    const email = `outreach-guard-${Date.now()}@example.com`;
    await context.post("/api/register", {
      data: { email, password: "TestPassw0rd!", firstName: "Guard", lastName: "Test" },
    });
    const asStudent = await context.get("/api/admin/partners/campaigns");
    expect(asStudent.status()).toBe(403);
    expect(await asStudent.text()).not.toContain(SECRET_ORG);

    const action = await context.post(
      "/api/admin/partners/campaigns/00000000-0000-0000-0000-000000000000/action",
      { data: { action: "pause" } },
    );
    expect(action.status()).toBe(403);
    await context.dispose();
  });
});
