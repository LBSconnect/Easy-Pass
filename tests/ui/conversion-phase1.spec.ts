/**
 * The five Phase 1 conversion fixes, each proven against the failure it
 * removes.
 *
 * 1. Cold acquisition CTAs enter the readiness funnel instead of opening an
 *    account form, and the clicks are finally measurable.
 * 2. Backing out of Stripe keeps the student's exam selected and says,
 *    calmly, that nothing was charged.
 * 3. The pricing auth wall is the sign-up form - the population reaching it
 *    is almost entirely new - with login still one click away.
 * 4. The window between "Stripe said paid" and "our server confirmed it"
 *    shows an activation state, never the unpaid upsell.
 * 5. checkout_start means checkout was started, not that a pricing link was
 *    clicked.
 *
 * All of it runs against a stub backend because the states worth testing -
 * a slow sync, a failed sync, a cancelled checkout - are exactly the ones a
 * real Stripe account will not produce on demand.
 */

import { test, expect } from "@playwright/test";
import { startStubServer, signedInUser, type StubServer } from "./fixtures/stub-server";
import type { Express } from "express";

const LIFE = "life_insurance";
const CATEGORIES = ["real_estate", "property_casualty", "life_insurance", "general_lines"];

type SyncMode = "active" | "slow-active" | "none" | "error";

interface StubState {
  signedIn: boolean;
  sync: SyncMode;
  /** What GET /api/profile reports. The sync stub flips it to "active" on
   *  success, the way the real endpoint writes the profile before replying. */
  profileStatus: string | null;
  /** Rendered by the dashboard only when the student has finished onboarding
   *  steps 1-3, which is what step 4 ("subscribe") requires to appear. */
  onboardingReady: boolean;
  syncCalls: number;
  checkoutBodies: Array<Record<string, unknown>>;
  events: Array<{ event: string; metadata: Record<string, unknown> }>;
}

const price = (cat: string, amount: number) => ({
  id: `price_${cat}_monthly`,
  unit_amount: amount,
  currency: "usd",
  recurring_interval: "month",
  subscription_type: "single",
  allowed_categories: [cat],
  billing_period: "monthly",
  product_name: `${cat} monthly`,
});

function buildStub(state: StubState) {
  return (app: Express) => {
    // Registered before signedInUser so these win route matching.
    app.get("/api/auth/user", (_req, res) =>
      state.signedIn
        ? res.json({ id: "u1", email: "student@example.com", firstName: "Sam", claims: { sub: "u1" } })
        : res.status(401).json({ message: "Unauthorized" }),
    );
    app.get("/api/profile", (_req, res) =>
      res.json({
        userId: "u1",
        preferredLanguage: "en",
        allowedCategories: state.profileStatus === "active" ? [LIFE] : [],
        subscriptionStatus: state.profileStatus,
        preferredCategory: state.onboardingReady ? LIFE : null,
        role: "user",
        examDate: state.onboardingReady ? "2027-01-15" : null,
        hasPreviousAttempt: false,
      }),
    );
    signedInUser(app);

    app.get("/api/stripe/prices", (_req, res) => res.json(CATEGORIES.map((c) => price(c, 3500))));

    app.post("/api/stripe/checkout", (req, res) => {
      state.checkoutBodies.push(req.body ?? {});
      res.json({ url: `/__checkout?price=${encodeURIComponent(req.body?.priceId ?? "")}` });
    });
    app.get("/__checkout", (req, res) => res.send(`<h1>checkout for ${req.query.price}</h1>`));

    app.post("/api/stripe/sync-subscription", (_req, res) => {
      state.syncCalls += 1;
      const respond = () => {
        if (state.sync === "error") return res.status(500).json({ message: "Sync failed" });
        if (state.sync === "none") return res.json({ message: "No active subscription found", synced: false });
        // The real endpoint writes the profile before replying; mirror that,
        // or the activation screen would never resolve here.
        state.profileStatus = "active";
        res.json({
          synced: true,
          subscriptionId: "sub_1",
          subscriptionType: "single",
          allowedCategories: [LIFE],
          plan: "monthly",
          status: "active",
        });
      };
      if (state.sync === "slow-active") setTimeout(respond, 2500);
      else respond();
    });

    app.get("/api/results", (_req, res) => res.json([]));
    app.get("/api/diagnostic/latest", (_req, res) =>
      res.json(
        state.onboardingReady
          ? { category: LIFE, score: 60, correctAnswers: 6, totalQuestions: 10, completedAt: "2026-08-01T00:00:00Z" }
          : null,
      ),
    );
    app.get("/api/reminders", (_req, res) => res.json({ reminders: [], emailRemindersOptIn: false }));

    app.post("/api/analytics/events", (req, res) => {
      state.events.push({ event: req.body?.event, metadata: req.body?.metadata ?? {} });
      res.status(204).end();
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

const named = (state: StubState, name: string) => state.events.filter((e) => e.event === name);

let stub: StubServer;
let state: StubState;

test.beforeEach(async () => {
  state = {
    signedIn: false,
    sync: "active",
    profileStatus: null,
    onboardingReady: false,
    syncCalls: 0,
    checkoutBodies: [],
    events: [],
  };
  stub = await startStubServer(buildStub(state));
});

test.afterEach(async () => {
  await stub.close();
});

test.describe("cold acquisition CTAs enter the readiness funnel", () => {
  test("the homepage hero leads to the readiness check and the click is counted once", async ({ page }) => {
    await page.goto(`${stub.baseURL}/`, { waitUntil: "networkidle" });
    await page.getByTestId("cta-hero-start-practicing").click();

    await page.waitForURL(/\/readiness-check/);
    // No account form anywhere on the way in.
    expect(page.url()).not.toContain("signup");

    await expect
      .poll(() => named(state, "diagnostic_cta_click").filter((e) => e.metadata.source === "homepage_hero").length)
      .toBe(1);
  });

  test("the navbar CTA does the same, under its own source", async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing`, { waitUntil: "networkidle" });
    await page.getByTestId("cta-header-start").click();

    await page.waitForURL(/\/readiness-check/);
    await expect
      .poll(() => named(state, "diagnostic_cta_click").filter((e) => e.metadata.source === "navbar").length)
      .toBe(1);
    // Hero and navbar are distinguishable in the data.
    expect(named(state, "diagnostic_cta_click").filter((e) => e.metadata.source === "homepage_hero")).toHaveLength(0);
  });

  test("a homepage exam card starts the readiness check in that exam", async ({ page }) => {
    await page.goto(`${stub.baseURL}/`, { waitUntil: "networkidle" });
    await page.getByTestId("card-category-real_estate").click();

    await page.waitForURL(/\/readiness-check\?category=real_estate/);
    await expect
      .poll(() => named(state, "diagnostic_cta_click").filter((e) => e.metadata.source === "homepage_exams").length)
      .toBe(1);
  });
});

test.describe("cancelling Stripe keeps the student's place", () => {
  for (const category of CATEGORIES) {
    test(`the ${category} selection survives a cancelled checkout`, async ({ page }) => {
      await page.goto(`${stub.baseURL}/pricing?category=${category}&canceled=true`, { waitUntil: "networkidle" });

      await expect(page.getByTestId("card-checkout-canceled")).toBeVisible();
      await expect(page.getByTestId(`button-category-${category}`)).toHaveAttribute("aria-checked", "true");
    });
  }

  test("the return says nothing was charged, without error styling, and is counted", async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing?category=${LIFE}&canceled=true`, { waitUntil: "networkidle" });

    const notice = page.getByTestId("card-checkout-canceled");
    await expect(notice).toContainText(/nothing was charged/i);
    await expect(notice).toContainText(/still here/i);

    await expect.poll(() => named(state, "checkout_canceled").length).toBe(1);
    expect(named(state, "checkout_canceled")[0].metadata.exam_type).toBe(LIFE);
  });

  test("Subscribe works again without reselecting, and carries the exam to the server", async ({ page }) => {
    state.signedIn = true;
    await page.goto(`${stub.baseURL}/pricing?category=${LIFE}&canceled=true`, { waitUntil: "networkidle" });

    await page.getByTestId("button-subscribe").click();
    await page.waitForURL(/__checkout/, { timeout: 15_000 });

    // The category rides with the checkout request so the server can build a
    // cancel URL that brings them back here - selection intact - next time too.
    expect(state.checkoutBodies).toHaveLength(1);
    expect(state.checkoutBodies[0]).toMatchObject({ priceId: `price_${LIFE}_monthly`, category: LIFE });
  });

  test("a cancelled checkout is not a sale, anywhere", async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing?category=${LIFE}&canceled=true`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("card-checkout-canceled")).toBeVisible();

    expect(await conversions(page)).toHaveLength(0);
    expect(named(state, "subscription_completed")).toHaveLength(0);
    expect(state.syncCalls).toBe(0);
  });
});

test.describe("the pricing auth wall keeps attribution", () => {
  test("first-touch attribution survives the redirect to sign-up", async ({ page }) => {
    await page.goto(`${stub.baseURL}/pricing?category=${LIFE}&utm_source=partnerad&utm_campaign=aug`, {
      waitUntil: "networkidle",
    });
    await page.getByTestId("button-subscribe").click();
    await page.waitForURL(/\/signup/);

    // The envelope was written on arrival and the SPA navigation must not
    // have cost it - it is what later ties the subscription to its source.
    const envelope = await page.evaluate(() => sessionStorage.getItem("myeasypass:first-touch:v1"));
    expect(envelope).toBeTruthy();
    const parsed = JSON.parse(envelope!);
    expect(parsed.utm_source).toBe("partnerad");
    expect(parsed.utm_campaign).toBe("aug");
  });
});

test.describe("the moment after payment", () => {
  test.beforeEach(() => {
    state.signedIn = true;
  });

  test("a slow sync shows the activation state, never the upsell", async ({ page }) => {
    state.sync = "slow-active";
    // domcontentloaded, not load: blocked third-party resources (fonts, the
    // Google tag) can hold the load event past the entire activation window,
    // which would leave nothing to observe by the time goto returns.
    await page.goto(`${stub.baseURL}/dashboard?success=true`, { waitUntil: "domcontentloaded" });

    // While the server is still confirming: an explicit "activating" state...
    await expect(page.getByTestId("card-activation-pending")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("card-activation-pending")).toContainText(/payment received/i);
    // ...and no subscribe messaging sharing the screen with it.
    await expect(page.getByTestId("card-onboarding-subscribe")).toHaveCount(0);

    // Once the server confirms, the state resolves into the real dashboard.
    await expect(page.getByTestId("card-activation-pending")).toHaveCount(0, { timeout: 20_000 });
    await expect.poll(() => state.syncCalls).toBe(1);
  });

  test("the conversion fires exactly once, after the server confirms", async ({ page }) => {
    state.sync = "slow-active";
    await page.goto(`${stub.baseURL}/dashboard?success=true`, { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("card-activation-pending")).toBeVisible({ timeout: 10_000 });
    // Not while activating - the URL saying success proves nothing.
    expect(await conversions(page)).toHaveLength(0);

    await expect(page.getByTestId("card-activation-pending")).toHaveCount(0, { timeout: 20_000 });
    await expect.poll(async () => (await conversions(page)).length).toBe(1);
    await expect.poll(() => named(state, "subscription_completed").length).toBe(1);
  });

  test("a sync that finds nothing yet offers a calm retry, and pays out only when verified", async ({ page }) => {
    state.sync = "none";
    await page.goto(`${stub.baseURL}/dashboard?success=true`);

    const retry = page.getByTestId("card-activation-retry");
    await expect(retry).toBeVisible({ timeout: 10_000 });
    // The payment is never described as failed or lost - it did not.
    await expect(retry).toContainText(/payment went through/i);
    await expect(retry).toContainText(/not lost/i);
    expect(await conversions(page)).toHaveLength(0);

    // Stripe catches up; the student presses the button.
    state.sync = "active";
    await page.getByTestId("button-activation-retry").click();

    await expect(page.getByTestId("card-activation-retry")).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByTestId("card-activation-pending")).toHaveCount(0, { timeout: 20_000 });
    // The retry is still the same purchase: one conversion, not zero, not two.
    await expect.poll(async () => (await conversions(page)).length).toBe(1);
  });

  test("a failed sync request degrades the same way", async ({ page }) => {
    state.sync = "error";
    await page.goto(`${stub.baseURL}/dashboard?success=true`);

    await expect(page.getByTestId("card-activation-retry")).toBeVisible({ timeout: 10_000 });
    expect(await conversions(page)).toHaveLength(0);
  });
});

test.describe("checkout_start means checkout", () => {
  test("the onboarding 'see plans' button is an upgrade click, not a checkout", async ({ page }) => {
    state.signedIn = true;
    state.onboardingReady = true;
    await page.goto(`${stub.baseURL}/dashboard`, { waitUntil: "networkidle" });

    await page.getByTestId("button-onboarding-subscribe").click();
    await page.waitForURL(/\/pricing/);

    await expect.poll(() => named(state, "upgrade_clicked").length).toBe(1);
    // The metric this exists to protect.
    expect(named(state, "checkout_start")).toHaveLength(0);
  });

  test("a real Subscribe click emits the full checkout chain, once each", async ({ page }) => {
    state.signedIn = true;
    await page.goto(`${stub.baseURL}/pricing?category=${LIFE}`, { waitUntil: "networkidle" });

    await page.getByTestId("button-subscribe").click();
    await page.waitForURL(/__checkout/, { timeout: 15_000 });

    await expect.poll(() => named(state, "checkout_start").length).toBe(1);
    await expect.poll(() => named(state, "checkout_session_created").length).toBe(1);
    // Started is not bought.
    expect(named(state, "subscription_completed")).toHaveLength(0);
  });
});
