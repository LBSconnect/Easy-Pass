/**
 * Backfill canonical study-topic ids onto the legacy question bank.
 *
 * WHY THIS EXISTS
 *
 * The original 795-question production bank predates the study-topic system:
 * every row was imported with topic = NULL. The diagnostic's weak-area
 * feature attributes missed questions to topics, and it deliberately refuses
 * to show a topic it cannot name - so in production the "Focus next on" card
 * has never rendered, for any exam. This applies the reviewed mapping in
 * data/question-topic-backfill.json.
 *
 * WHAT IT WILL NEVER DO
 *
 * - Touch question text, options, answers, explanations, or activity.
 *   The single column written is `topic` (plus updated_at).
 * - Overwrite a topic somebody has already set: every UPDATE is guarded by
 *   `topic IS NULL`, so an admin's later correction always wins over this
 *   file, including on re-runs.
 * - Invent topics. Each mapping is validated against shared/studyTopics.ts
 *   for the exact category the row carries; a mismatch aborts before any
 *   write. The 62 questions with no honest home in the current topic set
 *   (P&C regulation/insurance-basics, three General Lines auto questions)
 *   are listed in the file's `unmapped` section and deliberately left NULL.
 *
 * Run explicitly, like prospects:import - never on boot:
 *
 *   npm run questions:backfill-topics
 *
 * Idempotent: a second run reports zero updates.
 */

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { getTopicById } from "../shared/studyTopics";

interface MappingEntry {
  id: string;
  category: string;
  topic: string;
  question: string;
}

interface BackfillFile {
  version: number;
  mappings: MappingEntry[];
  unmapped: Array<{ id: string; category: string; question: string; reason: string }>;
}

export interface BackfillSummary {
  updated: number;
  /** Mapped rows whose topic was already set - left alone by design. */
  alreadySet: number;
  /** Mapped ids not present in this database at all. */
  missingFromDb: number;
  /** Rows still NULL after the run that the mapping does not cover
   *  (the file's own unmapped list, plus any drift the DB has grown). */
  stillNull: number;
  /** Still-NULL rows that are NOT in the file's unmapped list - real drift. */
  unexpectedNull: number;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.join(HERE, "..", "data", "question-topic-backfill.json");

export function loadAndValidateMapping(filePath: string = DEFAULT_FILE): BackfillFile {
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as BackfillFile;

  const seen = new Set<string>();
  for (const entry of parsed.mappings) {
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate mapping for question ${entry.id}`);
    }
    seen.add(entry.id);

    const found = getTopicById(entry.topic);
    if (!found) {
      throw new Error(`Mapping for ${entry.id} uses unknown topic "${entry.topic}"`);
    }
    if (found.category.category !== entry.category) {
      throw new Error(
        `Mapping for ${entry.id} assigns ${entry.topic} (a ${found.category.category} topic) ` +
          `to a ${entry.category} question`,
      );
    }
  }
  for (const entry of parsed.unmapped) {
    if (seen.has(entry.id)) {
      throw new Error(`Question ${entry.id} appears in both mappings and unmapped`);
    }
  }
  return parsed;
}

export async function backfillQuestionTopics(
  pool: Pool,
  filePath: string = DEFAULT_FILE,
): Promise<BackfillSummary> {
  const file = loadAndValidateMapping(filePath);

  let updated = 0;
  let alreadySet = 0;
  let missingFromDb = 0;

  for (const entry of file.mappings) {
    // Guarded three ways: the id must exist, its topic must still be NULL
    // (never fight an admin), and the row's category must match what the
    // mapping was reviewed against.
    const result = await pool.query(
      `UPDATE questions
          SET topic = $2, updated_at = now()
        WHERE id = $1 AND topic IS NULL AND category = $3`,
      [entry.id, entry.topic, entry.category],
    );

    if ((result.rowCount ?? 0) > 0) {
      updated += 1;
      continue;
    }

    const existing = await pool.query<{ topic: string | null }>(
      `SELECT topic FROM questions WHERE id = $1 AND category = $2`,
      [entry.id, entry.category],
    );
    if (existing.rowCount === 0) missingFromDb += 1;
    else alreadySet += 1;
  }

  // What the database still cannot attribute, so nothing stays silently dark.
  const knownUnmapped = new Set(file.unmapped.map((u) => u.id));
  const stillNullRows = await pool.query<{ id: string; category: string }>(
    `SELECT id, category FROM questions WHERE topic IS NULL AND is_active = true`,
  );
  const unexpected = stillNullRows.rows.filter((row) => !knownUnmapped.has(row.id));

  return {
    updated,
    alreadySet,
    missingFromDb,
    stillNull: stillNullRows.rowCount ?? 0,
    unexpectedNull: unexpected.length,
  };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 2 });
  try {
    const summary = await backfillQuestionTopics(pool);
    console.log("[backfill-question-topics]");
    console.log(`  topics written:          ${summary.updated}`);
    console.log(`  already had a topic:     ${summary.alreadySet}`);
    console.log(`  mapped but not in DB:    ${summary.missingFromDb}`);
    console.log(`  still NULL (known gap):  ${summary.stillNull - summary.unexpectedNull}`);
    console.log(`  still NULL (unexpected): ${summary.unexpectedNull}`);
    if (summary.unexpectedNull > 0) {
      console.log(
        "  Unexpected NULLs are active questions added since the mapping was " +
          "reviewed. They keep working; they just cannot appear as weak areas " +
          "until they are given a topic (admin panel or a mapping update).",
      );
    }
  } finally {
    await pool.end();
  }
}

// Import-safe: tests import the functions; only direct execution runs main.
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  });
}
