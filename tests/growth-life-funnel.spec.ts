/**
 * The paid-search funnel for Life Insurance, walked as a stranger walks it.
 *
 * Google → landing page → free diagnostic → result → pricing.
 *
 * What this is really guarding is the exam category. A visitor who clicked an
 * ad for Texas Life Insurance has already told us which exam they want, and
 * every step that asks them again is a step some of them leave at. The
 * category is carried in the URL from the landing CTA through the diagnostic,
 * onto the result card, into pricing, and through the sign-in hand-off - and a
 * break anywhere along that chain is invisible in the UI, because every screen
 * still works. It just quietly asks the question again.
 *
 * The other half is truthfulness. A result page that has been tuned to sell is
 * exactly where a guaranteed-pass claim would appear, so it is asserted
 * against here rather than left to review.
 */

import { test, expect, type Page } from "@playwright/test";
import { requireWritableTarget } from "./helpers/target";

const LIFE = "life_insurance";

/** Claims we must never make, in either language. */
const FORBIDDEN = [
  /guarantee/i,
  /guaranteed to pass/i,
  /pass (?:the exam )?first try/i,
  /100\s*%\s*pass/i,
  /garantiza/i,
  /garantizado/i,
];

/** Answers whichever diagnostic question is on screen, and moves on. */
async function answerCurrentQuestion(page: Page): Promise<void> {
  const option = page.getByTestId("radio-diagnostic-option-0");
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  await page.getByTestId("button-diagnostic-next").click();
}

test.describe("life insurance paid-search funnel", () => {
  test.beforeAll(() => {
    requireWritableTarget(process.env.TEST_BASE_URL);
  });

  test("the landing page leads with the free readiness test", async ({ page }) => {
    await page.goto("/texas-life-insurance-exam-prep");

    const cta = page.getByTestId("button-hero-readiness-cta");
    await expect(cta).toBeVisible();

    // Free before paid: cold traffic is asked to try the product, not to buy
    // it. If this ever inverts, the landing page has changed job.
    const href = await cta.locator("xpath=ancestor-or-self::a").first().getAttribute("href");
    expect(href).toContain("/readiness-check");
  });

  test("the landing CTA carries the exam to the diagnostic", async ({ page }) => {
    await page.goto("/texas-life-insurance-exam-prep");

    const href = await page
      .getByTestId("button-hero-readiness-cta")
      .locator("xpath=ancestor-or-self::a")
      .first()
      .getAttribute("href");

    // The whole point. Without the category the next screen asks a question
    // this visitor has already answered by clicking the ad.
    expect(href).toBe(`/readiness-check?category=${LIFE}`);
  });

  test("the retaker route carries the exam too", async ({ page }) => {
    await page.goto("/texas-life-insurance-exam-prep");

    const retaker = page.getByTestId("button-retaker-plan");
    await expect(retaker).toBeVisible();
    const href = await retaker.locator("xpath=ancestor-or-self::a").first().getAttribute("href");

    // Same funnel as everyone else, not a second one.
    expect(href).toBe(`/readiness-check?category=${LIFE}`);
  });

  test("arriving with the exam chosen starts it rather than asking again", async ({ page }) => {
    await page.goto(`/readiness-check?category=${LIFE}`);

    // Straight into question one; the four-way chooser is never shown.
    await expect(page.getByTestId("radio-diagnostic-option-0")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId(`button-diagnostic-category-${LIFE}`)).toHaveCount(0);
  });

  test("opening the check directly still lets a visitor choose", async ({ page }) => {
    await page.goto("/readiness-check");

    // The direct entry point must not regress into requiring a parameter.
    await expect(page.getByTestId(`button-diagnostic-category-${LIFE}`)).toBeVisible({ timeout: 20_000 });
  });

  test("an unrecognised category falls back to the chooser", async ({ page }) => {
    await page.goto("/readiness-check?category=not_an_exam");

    await expect(page.getByTestId(`button-diagnostic-category-${LIFE}`)).toBeVisible({ timeout: 20_000 });
  });

  test("a guest completes the whole check and sees a score without signing up", async ({ page }) => {
    await page.goto(`/readiness-check?category=${LIFE}`);
    await expect(page.getByTestId("radio-diagnostic-option-0")).toBeVisible({ timeout: 20_000 });

    // Ten questions, no account. Asking for one before the result is the
    // single most expensive thing this funnel could do.
    for (let i = 0; i < 10; i += 1) {
      if (await page.getByTestId("card-diagnostic-result").isVisible().catch(() => false)) break;
      await answerCurrentQuestion(page);
    }

    await expect(page.getByTestId("card-diagnostic-result")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("text-diagnostic-score")).toBeVisible();
    expect(page.url()).not.toContain("/signup");
    expect(page.url()).not.toContain("/login");
  });

  test("the result offers the paid product, aimed at the exam they took", async ({ page }) => {
    await page.goto(`/readiness-check?category=${LIFE}`);
    await expect(page.getByTestId("radio-diagnostic-option-0")).toBeVisible({ timeout: 20_000 });
    for (let i = 0; i < 10; i += 1) {
      if (await page.getByTestId("card-diagnostic-result").isVisible().catch(() => false)) break;
      await answerCurrentQuestion(page);
    }
    await expect(page.getByTestId("card-diagnostic-result")).toBeVisible({ timeout: 20_000 });

    const upgrade = page.getByTestId("button-diagnostic-upgrade");
    await expect(upgrade).toBeVisible();

    const href = await upgrade.locator("xpath=ancestor-or-self::a").first().getAttribute("href");
    expect(href).toBe(`/pricing?category=${LIFE}`);

    // Named, so it reads as the thing they came for rather than "upgrade".
    await expect(upgrade).toContainText(/life insurance/i);
  });

  test("the result keeps its diagnostic disclaimer and promises nothing", async ({ page }) => {
    await page.goto(`/readiness-check?category=${LIFE}`);
    await expect(page.getByTestId("radio-diagnostic-option-0")).toBeVisible({ timeout: 20_000 });
    for (let i = 0; i < 10; i += 1) {
      if (await page.getByTestId("card-diagnostic-result").isVisible().catch(() => false)) break;
      await answerCurrentQuestion(page);
    }
    await expect(page.getByTestId("card-diagnostic-result")).toBeVisible({ timeout: 20_000 });

    const card = await page.getByTestId("card-diagnostic-result").innerText();

    // Still described as a snapshot, not a prediction.
    expect(card).toMatch(/not a pass prediction|no una predicción/i);
    for (const claim of FORBIDDEN) {
      expect(card).not.toMatch(claim);
    }
  });

  test("a visitor who is not ready to buy still has somewhere to go", async ({ page }) => {
    await page.goto(`/readiness-check?category=${LIFE}`);
    await expect(page.getByTestId("radio-diagnostic-option-0")).toBeVisible({ timeout: 20_000 });
    for (let i = 0; i < 10; i += 1) {
      if (await page.getByTestId("card-diagnostic-result").isVisible().catch(() => false)) break;
      await answerCurrentQuestion(page);
    }
    await expect(page.getByTestId("card-diagnostic-result")).toBeVisible({ timeout: 20_000 });

    // Buying is the loudest option, not the only one.
    await expect(page.getByTestId("button-diagnostic-alexi-plan")).toBeVisible();
    await expect(page.getByTestId("button-diagnostic-restart")).toBeVisible();
  });

  test("the exam survives the trip to pricing", async ({ page }) => {
    await page.goto(`/pricing?category=${LIFE}`);

    // Preselected, so a visitor arriving from the result does not choose twice.
    await expect(page.getByTestId(`button-category-${LIFE}`)).toHaveAttribute("aria-checked", "true", {
      timeout: 20_000,
    });
  });

  test("the landing headline only ever comes from the allowlist", async ({ page }) => {
    // An approved key changes the wording.
    await page.goto("/texas-life-insurance-exam-prep?intent=practice_test");
    await expect(page.getByTestId("heading-landing-h1")).toHaveText(/Texas Life Insurance Practice Test/i);

    // Anything else is ignored outright, rather than sanitised and rendered.
    await page.goto("/texas-life-insurance-exam-prep?intent=Guaranteed%20Pass%20First%20Try");
    const heading = await page.getByTestId("heading-landing-h1").innerText();
    expect(heading).not.toMatch(/guarantee/i);
    for (const claim of FORBIDDEN) {
      expect(heading).not.toMatch(claim);
    }
  });
});

test.describe("the funnel on a phone", () => {
  test.beforeAll(() => {
    requireWritableTarget(process.env.TEST_BASE_URL);
  });

  // Paid traffic is mostly mobile, and the narrowest of these is where a CTA
  // pushed below a decorative section stops being reachable with a thumb.
  for (const width of [375, 390, 430]) {
    test(`the readiness CTA is reachable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto("/texas-life-insurance-exam-prep");

      const cta = page.getByTestId("button-hero-readiness-cta");
      await expect(cta).toBeVisible();

      const box = await cta.boundingBox();
      expect(box).not.toBeNull();
      // Comfortably inside the viewport rather than clipped off the side, and
      // tall enough to hit - 44px is the usual floor for a thumb target.
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.height).toBeGreaterThanOrEqual(40);
    });

    test(`the upgrade CTA is reachable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto(`/readiness-check?category=${LIFE}`);
      await expect(page.getByTestId("radio-diagnostic-option-0")).toBeVisible({ timeout: 20_000 });
      for (let i = 0; i < 10; i += 1) {
        if (await page.getByTestId("card-diagnostic-result").isVisible().catch(() => false)) break;
        await answerCurrentQuestion(page);
      }
      await expect(page.getByTestId("card-diagnostic-result")).toBeVisible({ timeout: 20_000 });

      const upgrade = page.getByTestId("button-diagnostic-upgrade");
      await upgrade.scrollIntoViewIfNeeded();
      await expect(upgrade).toBeVisible();

      const box = await upgrade.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.height).toBeGreaterThanOrEqual(40);
    });
  }
});
