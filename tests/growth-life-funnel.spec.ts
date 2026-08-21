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
import { closeJourneyDb, seedQuestionBank } from "./helpers/journey";
import { journeyDb } from "./helpers/journey";
import type { Pool } from "pg";
import { backfillQuestionTopics } from "../scripts/backfill-question-topics";

const LIFE = "life_insurance";

/**
 * Life Insurance topics from shared/studyTopics.ts.
 *
 * Four of them so the result page's weak areas have somewhere to differ, and
 * so a run that misses everything still produces a capped list rather than a
 * single entry.
 */
const LIFE_TOPICS = ["li_policies", "li_annuities", "li_health", "li_regulations"];

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
  test.beforeAll(async () => {
    requireWritableTarget(process.env.TEST_BASE_URL);
    // CI starts with an empty questions table, so the diagnostic 404s on
    // every exam until something seeds one. Verifying this funnel against a
    // bank that happened to exist locally is exactly how it passed here and
    // failed there.
    await seedQuestionBank({ category: LIFE, topics: LIFE_TOPICS, marker: "[life-funnel-fixture]" });
  });

  test.afterAll(async () => {
    await closeJourneyDb();
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
  test.beforeAll(async () => {
    requireWritableTarget(process.env.TEST_BASE_URL);
    await seedQuestionBank({ category: LIFE, topics: LIFE_TOPICS, marker: "[life-funnel-fixture]" });
  });

  test.afterAll(async () => {
    await closeJourneyDb();
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


/* =========================================================================
 * Weak areas on a production-shaped bank.
 *
 * Lives in this file rather than its own spec because several suites share
 * the life_insurance question bank and Playwright runs files in parallel.
 * The convention here is ADDITIVE seeding - nobody deletes the category -
 * so this describe follows it: it inserts ten REAL rows from the committed
 * production export (ids verbatim), resets only those ten to production's
 * defining state (topic NULL), applies the backfill, and cleans up only
 * what it inserted.
 * ========================================================================= */

/** The ten export rows this describe owns, by their real production ids. */
let exportIds: string[] = [];

async function insertProductionShapedRows(db: Pool): Promise<void> {
  const { readFileSync } = await import("fs");
  const sql = readFileSync("questions_export.sql", "utf8");
  const lifeInserts = sql
    .split("\n")
    .filter((line) => line.includes("'life_insurance'") && line.startsWith("INSERT INTO questions"))
    .slice(0, 10);
  if (lifeInserts.length < 10) throw new Error("expected 10 life rows in the export");

  exportIds = lifeInserts.map((line) => {
    const m = line.match(/VALUES \('([0-9a-f-]{36})'/);
    if (!m) throw new Error("could not read id from export row");
    return m[1];
  });

  for (const statement of lifeInserts) {
    await db.query(statement); // ON CONFLICT (id) DO NOTHING - re-runs are safe
  }
  // Production's defining state for these rows, whatever a previous run left.
  await db.query(`UPDATE questions SET topic = NULL WHERE id = ANY($1)`, [exportIds]);
}

test.describe("weak areas on a production-shaped bank", () => {
  test.beforeAll(async () => {
    requireWritableTarget(process.env.TEST_BASE_URL);
  });

  test.afterAll(async () => {
    if (exportIds.length > 0) {
      await journeyDb().query(`DELETE FROM questions WHERE id = ANY($1)`, [exportIds]);
    }
    await closeJourneyDb();
  });

  test("the backfill gives the real export rows their topics, and the result card can finally name them", async ({ page }) => {
    test.setTimeout(90_000);
    const db = journeyDb();
    await insertProductionShapedRows(db);

    // BEFORE: the production defect, held at the layer that owns it. With
    // topic NULL the mapper refuses to attribute a miss - correctly - so
    // these rows can never surface as weak areas.
    const before = await db.query<{ topic: string | null }>(
      `SELECT topic FROM questions WHERE id = ANY($1)`,
      [exportIds],
    );
    expect(before.rows).toHaveLength(10);
    expect(before.rows.every((r) => r.topic === null)).toBe(true);

    // THE FIX, exactly as `npm run questions:backfill-topics` applies it.
    const summary = await backfillQuestionTopics(db);
    expect(summary.updated).toBeGreaterThanOrEqual(10);

    const after = await db.query<{ topic: string | null }>(
      `SELECT topic FROM questions WHERE id = ANY($1)`,
      [exportIds],
    );
    // Every one of the ten real rows now carries a canonical life topic.
    expect(after.rows.every((r) => r.topic !== null && r.topic.startsWith("li_"))).toBe(true);

    // AFTER, in the browser at phone width: a diagnostic over the (shared,
    // additive) life bank now attributes misses to nameable topics.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/readiness-check?category=${LIFE}`);
    await expect(page.getByTestId("radio-diagnostic-option-0")).toBeVisible({ timeout: 20_000 });

    for (let i = 0; i < 10; i += 1) {
      if (await page.getByTestId("card-diagnostic-result").isVisible().catch(() => false)) break;
      // Same displayed option every time; options are shuffled per attempt,
      // so this yields a mostly-wrong sheet - the production shape.
      await page.getByTestId("radio-diagnostic-option-1").click();
      await page.getByTestId("button-diagnostic-next").click();
      await page.waitForTimeout(150);
    }
    await expect(page.getByTestId("card-diagnostic-result")).toBeVisible({ timeout: 20_000 });
    const score = Number.parseInt(await page.getByTestId("text-diagnostic-score").innerText(), 10);

    if (score === 100) {
      // A perfect run must not invent weaknesses (odds ~1e-6 with shuffled
      // options; if it happens this is still the right assertion).
      await expect(page.getByTestId("card-weak-areas")).toHaveCount(0);
      return;
    }

    const card = page.getByTestId("card-weak-areas");
    await expect(card).toBeVisible();
    // Human-readable life topics, honest counts, never a raw slug.
    await expect(card).toContainText(
      /Life Insurance Policies|Annuities|Health Insurance Basics|Texas Insurance Regulations/,
    );
    await expect(card).toContainText(/missed \d+ of \d+/);
    expect(await card.innerText()).not.toMatch(/li_[a-z]+/);

    // Scoring identity: the mapping names topics; the score is untouched
    // arithmetic over the same answer sheet, as the server recorded it.
    const attempt = await db.query(
      `SELECT score, correct_answers, total_questions FROM diagnostic_attempts
        WHERE category = $1 AND completed_at IS NOT NULL
        ORDER BY completed_at DESC LIMIT 1`,
      [LIFE],
    );
    expect(attempt.rows[0].score).toBe(score);
    expect(attempt.rows[0].score).toBe(
      Math.round((attempt.rows[0].correct_answers / attempt.rows[0].total_questions) * 100),
    );

    // Phone width introduced no sideways overflow.
    const overflow = await page.evaluate(() => {
      (globalThis as unknown as { __name?: unknown }).__name ??= (f: unknown) => f;
      const w = document.documentElement.clientWidth;
      const clipped = (el: HTMLElement) => {
        let n: HTMLElement | null = el.parentElement;
        while (n && n !== document.body) {
          const o = getComputedStyle(n).overflowX;
          if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") return true;
          n = n.parentElement;
        }
        return false;
      };
      let count = 0;
      document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > w + 1 || r.left < -1) && !clipped(el)) count += 1;
      });
      return count;
    });
    expect(overflow).toBe(0);
  });
});
