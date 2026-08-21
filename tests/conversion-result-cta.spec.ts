/**
 * The diagnostic result on a phone: the decision right after the verdict.
 *
 * The result card used to place its primary CTA below every supporting
 * section - weak areas, the offer list, the three-step strip, the disclaimer -
 * which on a 390px screen put the next step two to three screens under the
 * score it belongs to. These tests pin the fixed order and the things the fix
 * was NOT allowed to cost: the score still comes first, the weak areas are
 * still shown, and nothing overflows sideways.
 *
 * Real server, real database, real 10-question run at each width - the same
 * way a visitor from an ad actually meets this card.
 */

import { test, expect, type Page } from "@playwright/test";
import { requireWritableTarget } from "./helpers/target";
import { closeJourneyDb, seedQuestionBank } from "./helpers/journey";

const LIFE = "life_insurance";
const LIFE_TOPICS = ["li_policies", "li_annuities", "li_health", "li_regulations"];

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
];

async function completeDiagnostic(page: Page) {
  await page.goto(`/readiness-check?category=${LIFE}`);
  await expect(page.getByTestId("radio-diagnostic-option-0")).toBeVisible({ timeout: 20_000 });

  for (let i = 0; i < 10; i += 1) {
    if (await page.getByTestId("card-diagnostic-result").isVisible().catch(() => false)) break;
    await page.getByTestId("radio-diagnostic-option-0").click();
    await page.getByTestId("button-diagnostic-next").click();
    await page.waitForTimeout(150);
  }

  await expect(page.getByTestId("card-diagnostic-result")).toBeVisible({ timeout: 20_000 });
}

/** Top of an element in document coordinates. */
async function topOf(page: Page, testId: string): Promise<number> {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return Number.NaN;
    return el.getBoundingClientRect().top + window.scrollY;
  }, testId);
}

test.describe("diagnostic result CTA on mobile", () => {
  test.beforeAll(async () => {
    requireWritableTarget(process.env.TEST_BASE_URL);
    await seedQuestionBank({ category: LIFE, topics: LIFE_TOPICS, marker: "[result-cta-fixture]" });
  });

  test.afterAll(async () => {
    await closeJourneyDb();
  });

  for (const vp of VIEWPORTS) {
    test(`at ${vp.name} the decision follows the verdict, not the appendix`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await completeDiagnostic(page);

      const score = await topOf(page, "text-diagnostic-score");
      const band = await topOf(page, "text-readiness-band");
      const cta = await topOf(page, "button-diagnostic-upgrade");
      const weakOrOffer = await page.evaluate(() => {
        // Whichever supporting section renders first for this run - weak
        // areas only appear when questions were missed.
        const el =
          document.querySelector('[data-testid="card-weak-areas"]') ??
          document.querySelector('[data-testid="card-result-offer"]');
        return el ? el.getBoundingClientRect().top + window.scrollY : Number.NaN;
      });

      // Value first, then the ask, then the supporting detail.
      expect(score).toBeLessThan(cta);
      expect(band).toBeLessThan(cta);
      expect(cta).toBeLessThan(weakOrOffer);

      // "Materially earlier" made concrete: the CTA sits within a scroll's
      // reach of the score - under two viewport heights from the top of the
      // page - instead of below four stacked sections.
      expect(cta).toBeLessThan(vp.height * 2);
    });

    test(`at ${vp.name} nothing was lost and nothing overflows`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await completeDiagnostic(page);

      // The result still gives its value: the offer list renders, and weak
      // areas render whenever there is anything to report. (First answer on
      // every question guarantees some misses against this fixture.)
      await expect(page.getByTestId("card-result-offer")).toBeVisible();
      await expect(page.getByTestId("card-weak-areas")).toBeVisible();

      // Nothing this reordering touched may poke out of the viewport.
      const wide = await page.evaluate(() => {
        const w = document.documentElement.clientWidth;
        const clipped = (el: HTMLElement) => {
          let node: HTMLElement | null = el.parentElement;
          while (node && node !== document.body) {
            const o = getComputedStyle(node).overflowX;
            if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") return true;
            node = node.parentElement;
          }
          return false;
        };
        const out: string[] = [];
        document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > w + 1 || r.left < -1) && !clipped(el)) {
            out.push(`${el.tagName}.${String(el.className).slice(0, 60)}`);
          }
        });
        return out.slice(0, 5);
      });
      expect(wide).toEqual([]);
    });
  }
});
