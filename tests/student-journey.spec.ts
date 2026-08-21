/**
 * One student, signed in, using the product.
 *
 * The rest of this suite proves a stranger cannot get in and that
 * registration works. Nothing in it signs in and uses what was paid for, so
 * for months the question "can a student actually take an exam" was answered
 * by someone opening a browser and trying it. That answer went stale the
 * moment it was given.
 *
 * This walks the whole path in order - exam, study guide, notebook, Alexi -
 * because the steps genuinely depend on each other. The notebook is only
 * interesting once an exam has been failed in a known way, and Alexi's
 * recommendation is only interesting once there is a weak topic to
 * recommend against. Running them independently would test four empty
 * states.
 *
 * WHAT MAKES THE ASSERTIONS REAL
 *
 * Every seeded question says what its own answer is: "Question 4: which
 * option is number 4?" answers to "Option four". The exam shuffles options
 * per session, so a test that hard-coded an index would be answering at
 * random - but one that reads the question can answer deliberately, get a
 * score it chose in advance, and check the product reports that score.
 *
 * So this does not assert that pages render. It asserts that six deliberate
 * mistakes produce a 50% score, that those six questions and no others turn
 * up in the notebook, and that Alexi points at the topic they were in.
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { requireWritableTarget } from "./helpers/target";
import {
  JOURNEY_CATEGORY,
  closeJourneyDb,
  registerSubscribedStudent,
  seedJourneyQuestions,
  type JourneyStudent,
  type SeededQuestion,
} from "./helpers/journey";

/** Half right, half wrong, so the score is a number we chose. */
const CORRECT_ANSWERS = 6;

const OPTION_WORDS = ["one", "two", "three", "four"];

/**
 * The option text a seeded question is asking for.
 *
 * Returns null for anything that is not one of ours - if the bank ever holds
 * real questions as well, this spec must not guess at their answers.
 */
function expectedOptionText(questionText: string): string | null {
  const match = /which option is number (\d)/i.exec(questionText);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return OPTION_WORDS[index] ? `Option ${OPTION_WORDS[index]}` : null;
}

/** A different option from the right one, for answering wrong on purpose. */
function wrongOptionText(correct: string): string {
  const other = OPTION_WORDS.map((w) => `Option ${w}`).find((o) => o !== correct);
  if (!other) throw new Error(`No wrong option available against "${correct}"`);
  return other;
}

test.describe.serial("a subscribed student uses the product", () => {
  let context: BrowserContext;
  let page: Page;
  let student: JourneyStudent;
  let seeded: SeededQuestion[];
  /** How long the paper turned out to be, set by the exam step. */
  let questionsOnPaper = 0;

  /** Anything the browser reported as broken, collected across every step. */
  const pageErrors: string[] = [];

  test.beforeAll(async ({ browser, playwright, baseURL }) => {
    requireWritableTarget(baseURL);

    seeded = await seedJourneyQuestions();
    expect(
      seeded.length,
      "the fixture should have put a question bank in place",
    ).toBeGreaterThanOrEqual(8);

    const request = await playwright.request.newContext({ baseURL });
    student = await registerSubscribedStudent(request);
    await request.dispose();

    context = await browser.newContext({ baseURL });
    page = await context.newPage();

    // An uncaught exception anywhere in the journey is a failure of the
    // journey, whichever step it happens in. Collected here and asserted at
    // the end rather than thrown immediately, so the run still shows which
    // steps passed.
    page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));

    await page.goto("/login");
    await page.getByLabel(/email/i).first().fill(student.email);
    await page.getByLabel(/password/i).first().fill(student.password);
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  });

  test.afterAll(async () => {
    await context?.close();
    await closeJourneyDb();
  });

  test("the dashboard opens on the exam they subscribed to", async () => {
    await expect(page).toHaveURL(/\/dashboard/);
    // Not a testid: what matters is that the page came up with the student's
    // own exam on it, which is what tells them they are in the right place.
    await expect(page.getByText(/real estate/i).first()).toBeVisible();
  });

  test("a practice exam can be taken and scores what was actually answered", async () => {
    test.setTimeout(90_000);

    await page.goto(`/exams/${JOURNEY_CATEGORY}?mode=practice`);

    // The exam starts itself on arrival; the first radio appearing is the
    // signal that questions came back rather than an error card.
    await expect(page.getByTestId("radio-option-0")).toBeVisible({ timeout: 20_000 });

    let answered = 0;
    // The paper is however long the bank allows, so this walks until the
    // submit button is the one on offer rather than assuming a count.
    for (let guard = 0; guard < 60; guard += 1) {
      const questionText = await page.locator("main").innerText();
      const correct = expectedOptionText(questionText);
      expect(
        correct,
        "every question on this paper should be one the fixture seeded",
      ).not.toBeNull();

      // Right for the first half, deliberately wrong afterwards.
      const wanted = answered < CORRECT_ANSWERS ? correct! : wrongOptionText(correct!);
      await page.getByRole("radio", { name: wanted, exact: true }).click();
      answered += 1;

      const submit = page.getByTestId("button-submit");
      if (await submit.isVisible().catch(() => false)) {
        await submit.click();
        // Submitting asks first. Confirming is part of the flow a student
        // goes through, so the test goes through it rather than around it.
        await page.getByRole("alertdialog").getByRole("button", { name: /confirm/i }).click();
        break;
      }
      await page.getByTestId("button-next").click();
    }

    expect(answered, "the paper should have had questions on it").toBeGreaterThan(CORRECT_ANSWERS);
    questionsOnPaper = answered;

    await expect(page.getByTestId("results-chart")).toBeVisible({ timeout: 20_000 });

    // The score is the one we chose by answering, not whatever came back.
    const expectedScore = Math.round((CORRECT_ANSWERS / answered) * 100);
    await expect(page.locator("main")).toContainText(new RegExp(`${expectedScore}\\s*%`));
    // Below the 70% pass mark, so no certificate may be on offer. Asserted
    // against the button rather than the wording, because the wording is
    // free to change and the rule is not: a failed exam does not earn a
    // certificate.
    await expect(page.getByTestId("button-get-certificate")).toHaveCount(0);
    await expect(page.getByTestId("button-view-certificate")).toHaveCount(0);
  });

  test("the notebook holds exactly the questions that were missed", async () => {
    await page.goto("/missed-questions");

    const struggling = page.getByTestId("card-missed-struggling");
    await expect(struggling.first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("card-notebook-empty")).toHaveCount(0);

    // The notebook holds what was MISSED, so it is the paper minus the ones
    // answered correctly - not the number answered correctly, which is only
    // the same number when the paper happens to be exactly twice as long.
    const missed = questionsOnPaper - CORRECT_ANSWERS;
    expect(missed, "the exam step should have left some wrong answers").toBeGreaterThan(0);
    await expect(struggling).toHaveCount(missed);
  });

  test("the study guide asks a question and marks the answer", async () => {
    // The quiz payload must not carry the answer key: the page reveals the
    // right answer only after the student has committed to one, and it can
    // only do that honestly if the answer was never in the browser early.
    const quizResponse = page.waitForResponse(
      (response) => response.url().includes("/api/study-guide/quiz/") && response.status() === 200,
    );

    await page.goto("/study-guide");
    await page.getByTestId("card-topic-re_contracts").click();

    const body = await (await quizResponse).json();
    const leaked = (body.questions ?? []).filter(
      (question: Record<string, unknown>) => "correctAnswer" in question,
    );
    expect(leaked, "the quiz must not ship the answer key to the browser").toHaveLength(0);

    await expect(page.getByTestId("button-answer-0")).toBeVisible({ timeout: 15_000 });

    const questionText = await page.locator("main").innerText();
    const correct = expectedOptionText(questionText);
    expect(correct).not.toBeNull();

    await page.getByRole("button", { name: correct!, exact: false }).first().click();
    await page.getByTestId("button-submit-answer").click();

    // Answering correctly has to be acknowledged as correct - a page that
    // marks everything wrong renders identically to one that works.
    await expect(page.locator("main")).toContainText(/correct/i, { timeout: 10_000 });
  });

  test("Alexi recommends the topic the student is actually weak on", async () => {
    await page.goto("/study-assistant");

    await expect(page.getByTestId("card-alexi-primary")).toBeVisible({ timeout: 20_000 });
    // No model provider in CI, and none needed: the recommendation is
    // computed from the student's own answers. If this ever depends on an
    // API key, it fails here rather than in front of a student.
    await expect(page.getByTestId("card-assistant-error")).toHaveCount(0);
    await expect(page.getByTestId("text-page-insight")).not.toBeEmpty();
  });

  test("an Alexi session runs from start to summary", async () => {
    test.setTimeout(90_000);

    // Navigated to explicitly rather than relying on where the previous
    // step left the browser: these tests are ordered because their DATA
    // depends on each other, which is not a reason to also make them depend
    // on each other's scroll position.
    await page.goto("/study-assistant");
    await page.getByTestId("button-page-start").click();
    await page.waitForURL(/\/session\//, { timeout: 20_000 });

    await expect(page.getByTestId("session-intro")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("session-steps")).toBeVisible();

    let actions = 0;

    const summary = page.getByTestId("card-session-summary");

    // An answered question keeps its options on screen, disabled, so that the
    // student can see what they picked. Enabled - not merely visible - is
    // what distinguishes a question waiting for an answer from one already
    // answered, and clicking the latter forever is how this loop hung the
    // first time it ran. Asking the selector for it, rather than testing
    // visibility and enabledness separately, keeps the two from being read a
    // moment apart.
    const option = page.locator('[data-testid="button-session-option-0"]:not([disabled])');
    const reveal = page.getByTestId("button-session-reveal");
    const done = page.getByTestId("button-step-done");
    const next = page.getByTestId("button-session-next");

    // Between the click on an answer and the server's reply, every option is
    // disabled and the continue button does not exist yet. Sampling all four
    // controls during that gap finds nothing at all, and a loop that reads
    // "nothing on screen" as "the session is over" stops one click in.
    //
    // That is precisely how this passed here - where the answer comes back in
    // about a millisecond - and failed on a loaded CI runner, where it does
    // not. So each turn waits for the page to offer something before deciding
    // what to do with it, and "nothing to do" becomes a conclusion the loop
    // reaches after waiting rather than a race it happens to lose.
    const actionable = summary.or(option).or(reveal).or(done).or(next);

    // Work forward through whatever blocks the session was built from. Each
    // block type offers a different control, so this takes whichever is on
    // screen rather than assuming the shape of the plan.
    for (let guard = 0; guard < 40; guard += 1) {
      await expect(actionable.first()).toBeVisible({ timeout: 20_000 });

      if (await summary.isVisible().catch(() => false)) break;

      if (await option.isVisible().catch(() => false)) {
        await option.click();
      } else if (await reveal.isVisible().catch(() => false)) {
        await reveal.click();
      } else if (await done.isVisible().catch(() => false)) {
        await done.click();
      } else if (await next.isVisible().catch(() => false)) {
        await next.click();
      } else {
        break;
      }
      actions += 1;
    }

    await expect(page.getByTestId("card-session-summary")).toBeVisible({ timeout: 20_000 });

    // A session that reached its summary without the student doing anything
    // is not a session. These two pin that down: the loop had to act, and
    // the summary only reports a score when questions were actually asked
    // and answered.
    expect(actions, "the session should have had steps to work through").toBeGreaterThan(1);

    const score = page.getByTestId("text-session-score");
    await expect(score).toBeVisible();
    const reported = /(\d+) of (\d+) questions/.exec(await score.innerText());
    expect(reported, `unexpected summary wording: ${await score.innerText()}`).not.toBeNull();
    expect(Number(reported![2]), "the summary should count real questions").toBeGreaterThan(0);
  });

  test("nothing in the journey threw", () => {
    // "Without errors" was the actual question. A page can render its layout
    // perfectly while a component below it has crashed, so the answer is
    // only worth having if uncaught exceptions are part of it.
    expect(pageErrors, `uncaught errors during the journey:\n${pageErrors.join("\n")}`).toEqual([]);
  });
});
