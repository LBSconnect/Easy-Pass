/**
 * Checkout hand-off, and what may be reported to Google Ads.
 *
 * Both need backend states that are awkward or impossible to produce for real:
 * a Stripe return where the subscription never activated, a sign-in in the
 * middle of a purchase, a second visit to the success page. Those are the
 * cases that decide whether the conversion count can be trusted, so they are
 * arranged against the stub rather than left untested.
 *
 * The rule being defended: a conversion means the server asked Stripe and
 * Stripe said there is a live subscription. Not that the URL said so.
 */

import { test, expect } from "@playwright/test";
import { startStubServer, signedInUser, type StubServer } from "./fixtures/stub-server";
import type { Express } from "express";

const LIFE = "life_insurance";
const CONVERSION_LABEL = "AW-18360793283/gQDnCM3rg-UcEMPxjbNE";

type SyncMode = "active" | "none" | "canceled";

interface StubState {
  signedIn: boolean;
  sync: SyncMode;
  subscriptionId: string;
  checkoutCalls: string[];
  /** How many times the client asked the server to reconcile with Stripe. */
  syncCalls: number;
  events: Array<{ event: string; metadata: Record<string, unknown> }>;
}

const price = (cat: string, period: "weekly" | "monthly", amount: number) => ({
  id: `price_${cat}_${period}`,
  unit_amount: amount,
  currency: "usd",
  recurring_interval: period === "weekly" ? "week" : "month",
  subscription_type: "single",
  allowed_categories: [cat],
  billing_period: period,
  product_name: `${cat} ${period}`,
});

function buildStub(state: StubState) {
  return (app: Express) => {
    app.get("/api/auth/user", (_req, res) =>
      state.signedIn
        ? res.json({ id: "u1", email: "student@example.com", firstName: "Sam", claims: { sub: "u1" } })
        : res.status(401).json({ message: "Unauthorized" }),
    );
    signedInUser(app);

    app.get("/api/stripe/prices", (_req, res) =>
      res.json([
        ...["real_estate", "property_casualty", LIFE, "general_lines"].map((c) => price(c, "monthly", 3500)),
      ]),
    );

    app.post("/api/stripe/checkout", (req, res) => {
      state.checkoutCalls.push(req.body?.priceId ?? "");
      res.json({ url: `/__checkout?price=${encodeURIComponent(req.body?.priceId ?? "")}` });
    });
    app.get("/__checkout", (req, res) => res.send(`<h1>checkout for ${req.query.price}</h1>`));

    app.post("/api/login", (_req, res) => {
      state.signedIn = true;
      res.json({ id: "u1", email: "student@example.com", firstName: "Sam", claims: { sub: "u1" } });
    });

    // The verified source. This is the thing the conversion now hangs off.
    app.post("/api/stripe/sync-subscription", (_req, res) => {
      state.syncCalls += 1;
      if (state.sync === "none") return res.json({ message: "No active subscription found", synced: false });
      if (state.sync === "canceled") {
        return res.json({ synced: true, subscriptionId: state.subscriptionId, status: "canceled", plan: "monthly" });
      }
      res.json({
        synced: true,
        subscriptionId: state.subscriptionId,
        subscriptionType: "single",
        allowedCategories: [LIFE],
        plan: "monthly",
        status: "active",
      });
    });

    // The dashboard reads these on every load and expects arrays. Without
    // them it throws into its error boundary before the checkout return is
    // handled at all, which looks exactly like a conversion bug and is not.
    app.get("/api/results", (_req, res) => res.json([]));
    app.get("/api/diagnostic/latest", (_req, res) => res.json(null));
    app.get("/api/reminders", (_req, res) => res.json({ reminders: [], emailRemindersOptIn: false }));

    app.post("/api/analytics/events", (req, res) => {
      state.events.push({ event: req.body?.event, metadata: req.body?.metadata ?? {} });
      res.json({ ok: true });
    });
  };
}

/** Conversions the page pushed into the Google tag's queue. */
async function conversions(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const layer = (window as unknown as { dataLayer?: unknown[][] }).dataLayer ?? [];
    return layer
      .filter((entry) => entry[0] === "event" && entry[1] === "conversion")
      .map((entry) => entry[2] as Record<string, unknown>);
  });
}

/**
 * Waits until the client has actually finished reconciling with the server.
 *
 * A fixed pause here raced the request whenever the machine was busy, which is
 * exactly when the whole suite runs. Waiting for the call the conversion
 * depends on makes the assertion that follows mean what it says.
 */
async function syncCompleted(page: import("@playwright/test").Page, state: StubState, expected: number) {
  // The unbounded part - a request over a loaded machine - is waited for
  // properly.
  await expect.poll(() => state.syncCalls, { timeout: 20_000 }).toBe(expected);
  // What remains is the mutation's success callback running against a response
  // that has already arrived. That is a settled promise, not a race, so a
  // short fixed beat is honest here in a way it was not around the request.
  await page.waitForTimeout(250);
}

test.describe("checkout hand-off keeps the exam", () => {
  let stub: StubServer;
  let state: StubState;

  test.beforeEach(async () => {
    state = { signedIn: false, sync: "active", subscriptionId: "sub_1", checkoutCalls: [], syncCalls: 0, events: [] };
    stub = await startStubServer(buildStub(state));
  });

  test.afterEach(async () => {
    await stub.close();
  });

  test("a signed-out visitor is sent to sign UP and comes back to the same exam", async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing?category=${LIFE}`, { waitUntil: "networkidle" });
    await expect(page.getByTestId(`button-category-${LIFE}`)).toHaveAttribute("aria-checked", "true");

    await page.getByTestId("button-subscribe").click();

    // Sign-up, not log-in: a visitor reaching Subscribe without a session is
    // almost always new. The exam has to survive the round trip either way,
    // or they pick it twice.
    await page.waitForURL(/\/signup/, { timeout: 15_000 });
    const next = new URL(page.url()).searchParams.get("next");
    expect(next).toBe(`/pricing?category=${LIFE}`);
  });

  test("the price sent to checkout is the one Stripe quoted for that exam", async ({ page }) => {
    state.signedIn = true;
    await page.goto(`${stub.baseURL}/pricing?category=${LIFE}`, { waitUntil: "networkidle" });

    await page.getByTestId("button-subscribe").click();
    await page.waitForURL(/__checkout/, { timeout: 15_000 });

    // Not a hard-coded id, and not another exam's.
    expect(state.checkoutCalls).toEqual([`price_${LIFE}_monthly`]);
  });

  test("the funnel records the pricing step before checkout starts", async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing?category=${LIFE}`, { waitUntil: "networkidle" });
    await expect.poll(() => state.events.map((e) => e.event)).toContain("pricing_view");

    const view = state.events.find((e) => e.event === "pricing_view")!;
    expect(view.metadata.exam_type).toBe(LIFE);
    // No email, no name, no card data - ever.
    const serialized = JSON.stringify(view.metadata);
    expect(serialized).not.toContain("student@example.com");
    expect(serialized).not.toContain("Sam");
  });
});

test.describe("the Google Ads subscribe conversion", () => {
  let stub: StubServer;
  let state: StubState;

  test.beforeEach(async () => {
    state = { signedIn: true, sync: "active", subscriptionId: "sub_1", checkoutCalls: [], syncCalls: 0, events: [] };
    stub = await startStubServer(buildStub(state));
  });

  test.afterEach(async () => {
    await stub.close();
  });

  test("does not fire merely because a page loaded", async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing`, { waitUntil: "networkidle" });

    expect(await conversions(page)).toHaveLength(0);
  });

  test("does not fire when checkout is only started", async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing?category=${LIFE}`, { waitUntil: "networkidle" });
    await page.getByTestId("button-subscribe").click();
    await page.waitForURL(/__checkout/, { timeout: 15_000 });

    // Reaching Stripe is not buying anything.
    expect(await conversions(page)).toHaveLength(0);
  });

  test("does not fire when the Stripe return did not produce a subscription", async ({ page }) => {
    // The exact case the old URL check got wrong: the address says success,
    // the server asks Stripe, and Stripe has nothing active.
    state.sync = "none";
    await page.goto(`${stub.baseURL}/dashboard?success=true`, { waitUntil: "networkidle" });
    await syncCompleted(page, state, 1);

    expect(await conversions(page)).toHaveLength(0);
  });

  test("does not fire for a subscription Stripe reports as canceled", async ({ page }) => {
    state.sync = "canceled";
    await page.goto(`${stub.baseURL}/dashboard?success=true`, { waitUntil: "networkidle" });
    await syncCompleted(page, state, 1);

    expect(await conversions(page)).toHaveLength(0);
  });

  test("fires once the server has verified the subscription is active", async ({ page }) => {
    await page.goto(`${stub.baseURL}/dashboard?success=true`, { waitUntil: "networkidle" });

    await expect.poll(async () => (await conversions(page)).length, { timeout: 15_000 }).toBe(1);

    const [payload] = await conversions(page);
    expect(payload.send_to).toBe(CONVERSION_LABEL);
    expect(payload.currency).toBe("USD");
  });

  test("does not fire a second time when the success page is reloaded", async ({ page }) => {
    await page.goto(`${stub.baseURL}/dashboard?success=true`, { waitUntil: "networkidle" });
    await expect.poll(async () => (await conversions(page)).length, { timeout: 15_000 }).toBe(1);

    // Same subscription, same browser. A refresh must not sell it again.
    //
    // Counted as zero rather than still-one: a full navigation gives the page
    // a fresh dataLayer, so what is being asserted is that this second load
    // pushed no conversion of its own. The dedupe that stops it lives in
    // localStorage, which is what survives the reload.
    await page.goto(`${stub.baseURL}/dashboard?success=true`, { waitUntil: "networkidle" });
    await syncCompleted(page, state, 2);

    expect(await conversions(page)).toHaveLength(0);
  });

  test("does not fire for a subscriber who simply visits the dashboard", async ({ page }) => {
    // No success parameter: this is someone opening the app on a Tuesday.
    await page.goto(`${stub.baseURL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    // Nothing to reconcile and nothing to report: this visit is not a purchase.
    expect(state.syncCalls).toBe(0);
    expect(await conversions(page)).toHaveLength(0);
  });

  test("records the subscription internally, with no personal data", async ({ page }) => {
    await page.goto(`${stub.baseURL}/dashboard?success=true`, { waitUntil: "networkidle" });
    await expect.poll(() => state.events.map((e) => e.event), { timeout: 15_000 }).toContain(
      "subscription_completed",
    );

    const done = state.events.find((e) => e.event === "subscription_completed")!;
    expect(done.metadata.exam_type).toBe(LIFE);
    expect(done.metadata.billing_period).toBe("monthly");

    const serialized = JSON.stringify(done.metadata);
    for (const forbidden of ["student@example.com", "Sam", "sub_1", "u1"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
