/**
 * Setup for the signed-in student journey.
 *
 * The rest of the suite tests what a stranger can reach: pages that render
 * without a session, endpoints that must answer 401, registration itself.
 * None of it signs in and uses the product, so nothing catches a signed-in
 * student meeting a broken exam, an empty study guide or a dead notebook.
 *
 * That gap exists because two things are missing from the CI environment by
 * design - Stripe, and any questions at all. A fresh `db:push` leaves the
 * bank empty and no webhook has ever run, so a student who registers is
 * subscribed to nothing and there is nothing to answer.
 *
 * This module supplies both, and it does so by writing to the database
 * directly rather than by calling the app.
 *
 * WHY DIRECT SQL, AND NOT THE ADMIN ROUTES
 *
 * The app has routes that would do this: POST /api/admin/questions writes a
 * question, POST /api/admin/users/:id/comp-access grants a subscription
 * without Stripe. Using them would be more faithful. It would also mean the
 * journey spec goes red whenever an unrelated change breaks an admin route,
 * reporting "the student journey is broken" when the student journey is
 * fine. Setup should fail only when setup is wrong.
 *
 * So the fixture writes the state the app would have arrived at, and every
 * step the STUDENT takes afterwards goes through the real UI and the real
 * API. The line is: arranging the world is SQL, using the product is not.
 */

import { Pool } from "pg";
import type { APIRequestContext } from "@playwright/test";

/** Categories are a Postgres enum; this is the one the journey uses. */
export const JOURNEY_CATEGORY = "real_estate";

/**
 * A topic id from shared/studyTopics.ts, and the one the seeded questions
 * carry. The study guide resolves a topic id to its category, so a quiz on
 * this topic draws from the questions below.
 */
export const JOURNEY_TOPIC = "re_contracts";

/**
 * Enough questions to be a bank, few enough to seed in one statement.
 *
 * The exam asks for 50 and settles for what exists, so the count only needs
 * to be big enough that a paper has several distinct questions on it. Two
 * topics rather than one, because the notebook and Alexi both group by
 * topic and a single-topic bank would let a grouping bug pass unnoticed.
 */
const SEED_COUNT = 12;

export interface SeededQuestion {
  id: string;
  correctAnswer: number;
  questionTextEn: string;
  topic: string;
}

export interface JourneyStudent {
  email: string;
  password: string;
  userId: string;
}

let pool: Pool | null = null;

/**
 * The fixture's own connection, separate from the server's.
 *
 * server/db.ts is not imported on purpose: it builds a pool at module scope,
 * logs on load and throws when DATABASE_URL is absent. A test helper that
 * does all three when merely imported is a helper that fails specs it has
 * nothing to do with.
 */
export function journeyDb(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "The student-journey spec needs DATABASE_URL to arrange its fixtures. " +
        "CI sets it; locally, point it at a throwaway database - never a real one.",
    );
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  }
  return pool;
}

export async function closeJourneyDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Put a known bank in the database, and return what was written.
 *
 * The correct answers are returned because the journey needs to answer
 * deliberately - some right, some wrong - so that what the notebook and the
 * score report say afterwards can be checked against what actually happened.
 * Answering at random would only prove the pages render.
 *
 * Idempotent by marker text: re-running against a database that already has
 * these returns the existing rows rather than doubling the bank.
 */
export async function seedJourneyQuestions(): Promise<SeededQuestion[]> {
  const db = journeyDb();
  const marker = "[journey-fixture]";

  const existing = await db.query<{
    id: string;
    correct_answer: number;
    question_text_en: string;
    topic: string;
  }>(
    `SELECT id, correct_answer, question_text_en, topic
       FROM questions
      WHERE question_text_en LIKE $1
      ORDER BY question_text_en`,
    [`${marker}%`],
  );

  if (existing.rows.length >= SEED_COUNT) {
    return existing.rows.map(toSeededQuestion);
  }

  const values: string[] = [];
  const params: unknown[] = [];
  for (let i = 0; i < SEED_COUNT; i += 1) {
    // Two topics, alternating, so topic grouping has something to group.
    const topic = i % 2 === 0 ? JOURNEY_TOPIC : "re_financing";
    // The correct option moves around rather than sitting at 0, so a bug
    // that always reports index 0 as correct cannot pass.
    const correct = i % 4;
    const base = params.length;
    values.push(
      `($${base + 1}::exam_category, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::jsonb, $${base + 6}::jsonb, $${base + 7}, $${base + 8}, $${base + 9}, true)`,
    );
    params.push(
      JOURNEY_CATEGORY,
      topic,
      `${marker} Question ${i + 1}: which option is number ${correct + 1}?`,
      // Both languages are NOT NULL on this table, and rightly so: half a
      // bilingual question is a blank where a Spanish-speaking student
      // expects one.
      `${marker} Pregunta ${i + 1}: ¿cuál opción es la número ${correct + 1}?`,
      JSON.stringify(["Option one", "Option two", "Option three", "Option four"]),
      JSON.stringify(["Opción uno", "Opción dos", "Opción tres", "Opción cuatro"]),
      correct,
      `Option ${correct + 1} is the one this question asks for.`,
      `La opción ${correct + 1} es la que pide esta pregunta.`,
    );
  }

  await db.query(
    `INSERT INTO questions
       (category, topic, question_text_en, question_text_es, options_en,
        options_es, correct_answer, explanation_en, explanation_es, is_active)
     VALUES ${values.join(", ")}`,
    params,
  );

  const seeded = await db.query<{
    id: string;
    correct_answer: number;
    question_text_en: string;
    topic: string;
  }>(
    `SELECT id, correct_answer, question_text_en, topic
       FROM questions
      WHERE question_text_en LIKE $1
      ORDER BY question_text_en`,
    [`${marker}%`],
  );
  return seeded.rows.map(toSeededQuestion);
}

function toSeededQuestion(row: {
  id: string;
  correct_answer: number;
  question_text_en: string;
  topic: string;
}): SeededQuestion {
  return {
    id: row.id,
    correctAnswer: row.correct_answer,
    questionTextEn: row.question_text_en,
    topic: row.topic,
  };
}

/**
 * A student who registered normally and then subscribed.
 *
 * Registration goes through the real endpoint - that path has its own spec
 * and this one depends on it working. The subscription is written directly,
 * because the only thing that writes it in production is a Stripe webhook
 * and CI has no Stripe.
 *
 * What gets written is exactly what checkSubscriptionActive() reads: a
 * status it accepts, and the category in allowedCategories. Nothing else in
 * the profile is touched, so a student here looks like a student who paid.
 */
export async function registerSubscribedStudent(
  request: APIRequestContext,
  options: { categories?: string[]; language?: "en" | "es" } = {},
): Promise<JourneyStudent> {
  const categories = options.categories ?? [JOURNEY_CATEGORY];
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `journey-${stamp}@example.com`;
  const password = "JourneyStudent1!";

  const response = await request.post("/api/register", {
    data: { email, password, firstName: "Journey", lastName: "Student" },
  });

  if (!response.ok()) {
    throw new Error(
      `Could not register the journey student (${response.status()}): ${await response.text()}`,
    );
  }

  const { id: userId } = (await response.json()) as { id?: string };
  if (!userId) {
    throw new Error(`Registered ${email} but the response carried no user id.`);
  }

  await grantSubscription(userId, categories, options.language ?? "en");

  return { email, password, userId };
}

/**
 * What the invoice.paid webhook would have left behind.
 *
 * subscriptionType follows the same rule the comp-access route uses: all
 * four categories is a bundle, fewer is a single.
 */
export async function grantSubscription(
  userId: string,
  categories: string[] = [JOURNEY_CATEGORY],
  language: "en" | "es" = "en",
): Promise<void> {
  const db = journeyDb();
  const type = categories.length >= 4 ? "bundle" : "single";

  // Registration creates the user but no profile, so this inserts one. The
  // enum casts are explicit because every one of these columns is a Postgres
  // enum and a bare text parameter will not coerce itself.
  await db.query(
    `INSERT INTO user_profiles (user_id, preferred_language, role,
                                subscription_status, subscription_type,
                                allowed_categories)
     VALUES ($1, $4::language, 'user'::user_role,
             'active'::subscription_status, $2::subscription_type, $3::jsonb)
     ON CONFLICT (user_id) DO UPDATE
        SET subscription_status = 'active'::subscription_status,
            subscription_type   = $2::subscription_type,
            allowed_categories  = $3::jsonb,
            preferred_language  = $4::language`,
    [userId, type, JSON.stringify(categories), language],
  );
}
