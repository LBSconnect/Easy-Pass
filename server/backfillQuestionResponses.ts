/**
 * Backfills question_responses from completed exam_sessions.
 *
 * Response history only starts accumulating once the submit route began
 * writing it, so without this every existing student would show zero mastery
 * and a meaningless EasyPass Score. Completed sessions already carry
 * everything needed to reconstruct history: the question ids, the submitted
 * answers, and the per-session shuffled answer order.
 *
 * Safe to re-run. Inserts rely on the (session_id, question_id) unique index
 * and onConflictDoNothing, so a second pass inserts nothing. Reads and inserts
 * only - no existing row is modified or deleted.
 *
 * Usage: npx tsx server/backfillQuestionResponses.ts [--dry-run] [--batch=N]
 */
import { db } from "./db";
import { storage } from "./storage";
import { examSessions } from "@shared/schema";
import { gradePaper } from "./examScoring";
import { eq } from "drizzle-orm";
import type { InsertQuestionResponse } from "@shared/schema";

export interface BackfillSummary {
  sessionsScanned: number;
  sessionsSkipped: number;
  responsesBuilt: number;
  responsesInserted: number;
}

export async function backfillQuestionResponses(
  options: { dryRun?: boolean; batchSize?: number } = {},
): Promise<BackfillSummary> {
  const { dryRun = false, batchSize = 200 } = options;

  const summary: BackfillSummary = {
    sessionsScanned: 0,
    sessionsSkipped: 0,
    responsesBuilt: 0,
    responsesInserted: 0,
  };

  const completed = await db
    .select()
    .from(examSessions)
    .where(eq(examSessions.isCompleted, true))
    .orderBy(examSessions.completedAt);

  let pending: InsertQuestionResponse[] = [];

  const flush = async () => {
    if (pending.length === 0) return;
    if (!dryRun) {
      summary.responsesInserted += await storage.recordQuestionResponses(pending);
    }
    pending = [];
  };

  for (const session of completed) {
    summary.sessionsScanned++;

    const answers = session.answers as Record<string, number> | null;
    // A completed session with no answer map has nothing to reconstruct.
    if (!answers || Object.keys(answers).length === 0) {
      summary.sessionsSkipped++;
      continue;
    }

    const questionIds = session.questionIds as string[];
    const answerOrder = session.answerOrder as Record<string, number> | null;

    const bankRows = await storage.getQuestionsByIds(questionIds);
    const questionsById = new Map(bankRows.map((q) => [q.id, q]));

    const { responses } = gradePaper(questionIds, questionsById, answers, answerOrder);
    summary.responsesBuilt += responses.length;

    for (const r of responses) {
      pending.push({
        ...r,
        userId: session.userId,
        category: session.category,
        source: "exam",
        sessionId: session.id,
        // Preserve when this actually happened so recency-weighted scoring
        // does not treat every historical answer as brand new activity.
        answeredAt: session.completedAt ?? session.startedAt,
      });
    }

    if (pending.length >= batchSize) await flush();
  }

  await flush();
  return summary;
}

const isMain = process.argv[1]?.endsWith("backfillQuestionResponses.ts");

if (isMain) {
  const dryRun = process.argv.includes("--dry-run");
  const batchArg = process.argv.find((a) => a.startsWith("--batch="));
  const batchSize = batchArg ? Number(batchArg.split("=")[1]) : undefined;

  backfillQuestionResponses({ dryRun, batchSize })
    .then((s) => {
      console.log(dryRun ? "[backfill] DRY RUN - nothing written" : "[backfill] complete");
      console.log(`  sessions scanned:    ${s.sessionsScanned}`);
      console.log(`  sessions skipped:    ${s.sessionsSkipped} (no answers recorded)`);
      console.log(`  responses built:     ${s.responsesBuilt}`);
      console.log(`  responses inserted:  ${dryRun ? "-" : s.responsesInserted}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[backfill] failed:", err);
      process.exit(1);
    });
}
