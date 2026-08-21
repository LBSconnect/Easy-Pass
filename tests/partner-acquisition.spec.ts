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

import { test, expect, request as playwrightRequest } from "@playwright/test";
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
    // Only what rendering the visit requires.
    expect(Object.keys(JSON.parse(body)).sort()).toEqual([
      "displayName", "examCategory", "landingVariant", "partnerCode",
    ]);
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
