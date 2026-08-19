/**
 * Fixing punctuation in questions that are already in the database.
 *
 * WHY THIS IS NOT IN migrations.ts
 *
 * That file is deliberately additive only - "no data rewrite anywhere in this
 * file", and its own note says a change that cannot be expressed additively
 * "needs a considered migration and a human, not this file". This is a data
 * rewrite, so it lives apart, does one narrowly-defined thing, and says out
 * loud in the log exactly what it changed.
 *
 * WHAT IT FIXES
 *
 * Em dashes in what students read. The repo was swept and the seed files
 * corrected, but seeding does not rewrite rows that already exist - so a
 * question written before that sweep still shows an em dash to every student
 * reading it today. The General Lines "aleatory" explanation is the known one.
 *
 * The rewriting itself is in shared/emDash.ts, which turns the dash into the
 * punctuation English actually uses for the job rather than swapping in a
 * hyphen. See there for why that distinction is the whole point.
 *
 * WHAT IT WILL NOT DO
 *
 * Touch anything but the six student-facing text fields on `questions`. No
 * deletes, no answer keys, no student data, nothing outside the question bank.
 * A row whose text is already clean is not written at all, so a healthy
 * database sees zero writes and this costs one SELECT per boot.
 *
 * Idempotent by construction: the output of the rewrite contains no dash, so
 * the second run finds nothing to do.
 */

import { db } from "./db";
import { questions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { normaliseQuestion } from "@shared/emDash";

export interface RepairResult {
  scanned: number;
  repaired: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * Rewrite any question carrying an em dash.
 *
 * Failures are collected rather than thrown: a punctuation fix is not worth
 * stopping a deploy over, and the rest of the bank should still be repaired
 * if one row cannot be.
 */
export async function repairQuestionPunctuation(): Promise<RepairResult> {
  const result: RepairResult = { scanned: 0, repaired: [], failed: [] };

  const rows = await db.select().from(questions);
  result.scanned = rows.length;

  for (const row of rows) {
    const fixed = normaliseQuestion({
      questionTextEn: row.questionTextEn,
      questionTextEs: row.questionTextEs,
      optionsEn: row.optionsEn ?? [],
      optionsEs: row.optionsEs ?? [],
      explanationEn: row.explanationEn,
      explanationEs: row.explanationEs,
    });
    if (!fixed) continue;

    try {
      await db
        .update(questions)
        .set({
          questionTextEn: fixed.questionTextEn,
          questionTextEs: fixed.questionTextEs,
          optionsEn: fixed.optionsEn,
          optionsEs: fixed.optionsEs,
          explanationEn: fixed.explanationEn,
          explanationEs: fixed.explanationEs,
        })
        .where(eq(questions.id, row.id));
      result.repaired.push(row.id);
    } catch (error: any) {
      result.failed.push({ id: row.id, error: error?.message ?? String(error) });
    }
  }

  return result;
}

/**
 * Run it at boot and report.
 *
 * Silent when there was nothing to do, so a healthy deploy log stays readable
 * and a line here always means something actually changed.
 */
export async function repairContentOnBoot(): Promise<void> {
  try {
    const result = await repairQuestionPunctuation();

    if (result.repaired.length > 0) {
      console.log(
        `[content] rewrote em dashes in ${result.repaired.length} of ${result.scanned} questions: ` +
          result.repaired.join(", "),
      );
    }
    for (const failure of result.failed) {
      console.error(`[content] could not rewrite question ${failure.id}: ${failure.error}`);
    }
  } catch (error: any) {
    // Never the reason a deploy does not come up.
    console.error("[content] punctuation repair skipped:", error?.message ?? error);
  }
}
