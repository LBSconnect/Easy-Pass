/**
 * The legacy-bank topic backfill, proven from both ends.
 *
 * The mapping file is the reviewed answer to "which study topic does each of
 * the 795 original production questions belong to". These tests hold it to
 * the rules it was written under: every assigned topic must be a canonical
 * id for the question's own exam, nothing may be double-listed, and the
 * questions that genuinely have no home in the current topic set stay
 * explicitly unmapped rather than being shoved somewhere to make a card
 * render.
 *
 * The database half runs against real Postgres because the thing being
 * tested there is the WHERE clause: topic written only where NULL, an
 * admin's topic never overwritten, and every other column untouched.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { getTopicById, getTopicsByCategory } from "@shared/studyTopics";
import { weakTopics } from "@shared/diagnosticWeakness";
import { readFileSync } from "fs";
import path from "path";

const FILE = path.join(__dirname, "..", "..", "data", "question-topic-backfill.json");

interface Entry { id: string; category: string; topic: string; question: string }
interface BackfillFile {
  version: number;
  mappings: Entry[];
  unmapped: Array<{ id: string; category: string; question: string; reason: string }>;
}

const file = JSON.parse(readFileSync(FILE, "utf8")) as BackfillFile;
const CATEGORIES = ["real_estate", "property_casualty", "life_insurance", "general_lines"] as const;

describe("question-topic mapping file", () => {
  it("assigns every topic from the canonical set, matched to the question's own exam", () => {
    for (const entry of file.mappings) {
      const found = getTopicById(entry.topic);
      expect(found, `${entry.id} uses unknown topic ${entry.topic}`).toBeDefined();
      expect(found!.category.category, `${entry.id}: ${entry.topic} belongs to another exam`).toBe(
        entry.category,
      );
    }
  });

  it("covers the whole legacy bank: every question is mapped or explicitly unmapped", () => {
    // 795 rows in the committed production export. A question missing from
    // both lists would fail silently forever.
    expect(file.mappings.length + file.unmapped.length).toBe(795);
  });

  it("lists no question twice, in either direction", () => {
    const ids = [...file.mappings.map((m) => m.id), ...file.unmapped.map((u) => u.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("maps the entire Life Insurance bank - the exam the defect was found on", () => {
    expect(file.unmapped.filter((u) => u.category === "life_insurance")).toHaveLength(0);
    expect(file.mappings.filter((m) => m.category === "life_insurance").length).toBe(199);
  });

  it("maps the entire Real Estate bank", () => {
    expect(file.unmapped.filter((u) => u.category === "real_estate")).toHaveLength(0);
    expect(file.mappings.filter((m) => m.category === "real_estate").length).toBe(200);
  });

  it("gives every exam every one of its topics, so no weak area is unreachable", () => {
    // A topic no question maps to could never appear on a result card.
    for (const category of CATEGORIES) {
      const used = new Set(file.mappings.filter((m) => m.category === category).map((m) => m.topic));
      for (const topic of getTopicsByCategory(category)) {
        expect(used.has(topic.id), `${category}: no question maps to ${topic.id}`).toBe(true);
      }
    }
  });

  it("leaves unmapped only what the topic set genuinely cannot hold, with a stated reason", () => {
    for (const entry of file.unmapped) {
      expect(entry.reason.length).toBeGreaterThan(20);
      // The known gaps: P&C regulation/insurance-basics questions, and three
      // General Lines personal-auto questions. Nothing else may hide here.
      expect(["property_casualty", "general_lines"]).toContain(entry.category);
    }
  });

  it("produces weak areas that resolve to real display names", () => {
    // The full pipeline in miniature: a miss on any mapped topic must come
    // out the other end as a nameable weak area, in both languages.
    const lookup = (topicId: string) => {
      const found = getTopicById(topicId);
      return found ? { nameEn: found.topic.nameEn, nameEs: found.topic.nameEs } : undefined;
    };
    for (const entry of file.mappings.slice(0, 200)) {
      const areas = weakTopics([{ topic: entry.topic, correct: false }], lookup);
      expect(areas).toHaveLength(1);
      expect(areas[0].nameEn.length).toBeGreaterThan(3);
      expect(areas[0].nameEs.length).toBeGreaterThan(3);
    }
  });
});

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

/** Real rows from the committed production export, verbatim, topic NULL. */
const REAL_ROWS = [
  {
    id: "8d1e2c0c-e941-4665-98e7-0e7d190dfaa0",
    category: "life_insurance",
    textEn: "What is underwriting in life insurance?",
    expectedTopic: "li_policies",
  },
] as const;

describeIfDb("backfillQuestionTopics against a real database", () => {
  let pool: Pool;
  let backfill: typeof import("../../scripts/backfill-question-topics");

  beforeAll(async () => {
    backfill = await import("../../scripts/backfill-question-topics");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM questions WHERE question_text_en LIKE '[backfill-fixture]%'`);
    await pool.query(`DELETE FROM questions WHERE id = $1`, [REAL_ROWS[0].id]);
    await pool.end();
  });

  it("validates the mapping file before touching anything", () => {
    expect(() => backfill.loadAndValidateMapping()).not.toThrow();
  });

  it("writes the reviewed topic onto a real legacy row, and nothing else", async () => {
    const row = REAL_ROWS[0];
    await pool.query(`DELETE FROM questions WHERE id = $1`, [row.id]);
    await pool.query(
      `INSERT INTO questions (id, category, topic, question_text_en, question_text_es,
                              options_en, options_es, correct_answer, explanation_en, explanation_es, is_active)
       VALUES ($1, $2, NULL, $3, 'es', '["a","b","c","d"]', '["a","b","c","d"]', 0, 'expl', 'expl', true)`,
      [row.id, row.category, row.textEn],
    );

    const before = await pool.query(`SELECT * FROM questions WHERE id = $1`, [row.id]);
    const summary = await backfill.backfillQuestionTopics(pool);
    expect(summary.updated).toBeGreaterThanOrEqual(1);

    const after = await pool.query(`SELECT * FROM questions WHERE id = $1`, [row.id]);
    expect(after.rows[0].topic).toBe(row.expectedTopic);

    // Scoring identity: the answer key and content are byte-identical.
    for (const col of [
      "category", "question_text_en", "question_text_es",
      "options_en", "options_es", "correct_answer",
      "explanation_en", "explanation_es", "is_active", "created_at",
    ]) {
      expect(after.rows[0][col], col).toEqual(before.rows[0][col]);
    }
  });

  it("is idempotent: a second run writes nothing new for that row", async () => {
    const first = await pool.query(`SELECT topic, updated_at FROM questions WHERE id = $1`, [REAL_ROWS[0].id]);
    const summary = await backfill.backfillQuestionTopics(pool);
    const second = await pool.query(`SELECT topic, updated_at FROM questions WHERE id = $1`, [REAL_ROWS[0].id]);

    expect(second.rows[0].topic).toBe(first.rows[0].topic);
    expect(second.rows[0].updated_at).toEqual(first.rows[0].updated_at);
    // The mapped-but-already-set bucket absorbs it instead.
    expect(summary.alreadySet).toBeGreaterThanOrEqual(1);
  });

  it("never overwrites a topic an admin has already chosen", async () => {
    // Same production id re-inserted with a deliberate admin decision that
    // disagrees with the mapping. The file must lose.
    const row = REAL_ROWS[0];
    await pool.query(`DELETE FROM questions WHERE id = $1`, [row.id]);
    await pool.query(
      `INSERT INTO questions (id, category, topic, question_text_en, question_text_es,
                              options_en, options_es, correct_answer, explanation_en, explanation_es, is_active)
       VALUES ($1, $2, 'li_regulations', '[backfill-fixture] admin-decided', 'es',
               '["a","b","c","d"]', '["a","b","c","d"]', 0, 'expl', 'expl', true)`,
      [row.id, row.category],
    );

    await backfill.backfillQuestionTopics(pool);

    const after = await pool.query(`SELECT topic FROM questions WHERE id = $1`, [row.id]);
    expect(after.rows[0].topic).toBe("li_regulations");
  });

  it("reports active NULL-topic rows the mapping does not know about", async () => {
    await pool.query(
      `INSERT INTO questions (category, topic, question_text_en, question_text_es,
                              options_en, options_es, correct_answer, explanation_en, explanation_es, is_active)
       VALUES ('life_insurance', NULL, '[backfill-fixture] drift question', 'es',
               '["a","b","c","d"]', '["a","b","c","d"]', 0, 'expl', 'expl', true)`,
    );

    const summary = await backfill.backfillQuestionTopics(pool);
    expect(summary.unexpectedNull).toBeGreaterThanOrEqual(1);
  });
});
